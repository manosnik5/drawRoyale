import { prisma } from '../lib/prisma.js'

const roomTimers = new Map()
const roomStates = new Map()
const votingStates = new Map()
const userSockets = new Map() 

export const VOTE_OPTIONS = ['fire', 'love', 'laugh', 'wow', 'trash']

export const registerRoomHandlers = (io, socket) => {
    const userId = socket.handshake.auth.userId
    if (!userId) return

    userSockets.set(userId, socket)

    socket.on('disconnect', () => {
        userSockets.delete(userId)
    })

    socket.on('room:join', async ({ roomCode, playerName, avatarColor }) => {
        try {
            const room = await prisma.room.findUnique({
                where: { code: roomCode },
                include: {
                    roomPlayers: {
                        include: {
                            player: { select: { id: true, fullName: true, imageUrl: true } }
                        }
                    }
                }
            })

            if (!room) {
                socket.emit('room:error', { message: 'Room not found' })
                return
            }

            await socket.join(roomCode)

         
            const userPlayer = await prisma.player.findUnique({
                where: { id: userId },
                select: { fullName: true, imageUrl: true }
            })

            if (!roomStates.has(roomCode)) {
                roomStates.set(roomCode, {
                    phase: room.phase,
                    roomId: room.id,
                    connectedPlayers: new Map(),
                    drawingStatus: new Map(),
                    themeVotes: new Map(),
                    themeOptions: [],
                    votedPlayers: new Set(),
                })
            }

            const state = roomStates.get(roomCode)
      
            const displayName = userPlayer?.fullName || playerName
            const imageUrl = userPlayer?.imageUrl || null
            state.connectedPlayers.set(userId, { 
                userId, 
                playerName: displayName, 
                avatarColor, 
                imageUrl,
                socketId: socket.id 
            })

            io.to(roomCode).emit('room:playerJoined', {
                userId,
                playerName: displayName,
                avatarColor,
                imageUrl,
                connectedPlayers: Array.from(state.connectedPlayers.values()),
            })

            socket.emit('room:state', {
                room,
                phase: state.phase,
                connectedPlayers: Array.from(state.connectedPlayers.values()),
            })

        } catch (error) {
            console.error('room:join error:', error)
            socket.emit('room:error', { message: 'Failed to join room' })
        }
    })

    socket.on('room:leave', async ({ roomCode }) => {
        await socket.leave(roomCode)
        removePlayer(io, roomCode, userId)
    })

    socket.on('room:startGame', async ({ roomCode }) => {
        try {
            const state = roomStates.get(roomCode)
            if (!state) return

            const room = await prisma.room.findUnique({ where: { code: roomCode } })
            if (!room) return

            if (room.hostId !== userId) {
                socket.emit('room:error', { message: 'Only the host can start the game' })
                return
            }

            if (state.connectedPlayers.size < 2) {
                socket.emit('room:error', { message: 'Need at least 2 players to start' })
                return
            }

           
            await prisma.drawing.deleteMany({ where: { roomId: state.roomId } })
            await prisma.ranking.deleteMany({ where: { roomId: state.roomId } })

            await transitionPhase(io, roomCode, 'theme_vote')

        } catch (error) {
            console.error('room:startGame error:', error)
            socket.emit('room:error', { message: 'Failed to start game' })
        }
    })

    socket.on('theme:options', async ({ roomCode, themes }) => {
        try {
            const room = await prisma.room.findUnique({ where: { code: roomCode } })
            if (!room || room.hostId !== userId) return

            const state = roomStates.get(roomCode)
            if (!state) return

            state.themeOptions = themes
            state.themeVotes = new Map(themes.map(t => [t, 0]))
            state.votedPlayers = new Set()

            io.to(roomCode).emit('theme:options', { themes })

        } catch (error) {
            console.error('theme:options error:', error)
        }
    })

    socket.on('theme:vote', async ({ roomCode, theme }) => {
        try {
            const state = roomStates.get(roomCode)
            if (!state) return

            if (state.votedPlayers.has(userId)) return
            state.votedPlayers.add(userId)

            const current = state.themeVotes.get(theme) ?? 0
            state.themeVotes.set(theme, current + 1)

            const votesObj = Object.fromEntries(state.themeVotes)
            io.to(roomCode).emit('theme:vote_update', { votes: votesObj })

            const totalVotes = Array.from(state.themeVotes.values()).reduce((a, b) => a + b, 0)

            if (totalVotes >= state.connectedPlayers.size) {
                const winner = Array.from(state.themeVotes.entries())
                    .sort((a, b) => b[1] - a[1] || Math.random() - 0.5)[0][0]

                await prisma.room.update({
                    where: { code: roomCode },
                    data: { theme: winner }
                })

                io.to(roomCode).emit('theme:final', { theme: winner })
                io.to(roomCode).emit('room:theme_selected', { theme: winner })

                setTimeout(async () => {
                    const room = await prisma.room.findUnique({ where: { code: roomCode } })
                    await transitionPhase(io, roomCode, 'drawing', room?.drawTimeSeconds ?? 90)
                }, 2000)
            }

        } catch (error) {
            console.error('theme:vote error:', error)
        }
    })

    socket.on('drawing:stroke', ({ roomCode, stroke }) => {
        socket.to(roomCode).emit('drawing:stroke', { userId, stroke })
    })

    socket.on('drawing:submit', async ({ roomCode, playerName, strokes }) => {
    try {
        const state = roomStates.get(roomCode)
        if (!state) return

        if (state.phase !== 'drawing') {
            console.log(`drawing:submit ignored — phase is ${state.phase}`)
            return
        }

        if (state.drawingStatus.has(userId)) {
            console.log(`drawing:submit ignored — ${userId} already submitted`)
            return
        }

   
        state.drawingStatus.set(userId, 'pending')

        const drawing = await prisma.drawing.create({
            data: {
                roomId: state.roomId,
                playerId: userId,
                playerName,
                strokes: strokes ?? [],
            }
        })


        state.drawingStatus.set(userId, drawing.id)

        console.log(`drawing:submit — ${state.drawingStatus.size}/${state.connectedPlayers.size}`)

        io.to(roomCode).emit('drawing:submitted', {
            userId,
            drawingId: drawing.id,
            totalSubmitted: state.drawingStatus.size,
            totalPlayers: state.connectedPlayers.size,
        })

        if (state.drawingStatus.size >= state.connectedPlayers.size) {
            console.log('all drawings submitted → voting')
            clearRoomTimer(roomCode)
            await transitionPhase(io, roomCode, 'voting')
        }

    } catch (error) {
       
        state?.drawingStatus.delete(userId)
        console.error('drawing:submit error:', error)
        socket.emit('room:error', { message: 'Failed to submit drawing' })
    }
})

    socket.on('voting:vote', ({ roomCode, drawingId, reaction }) => {
        const vs = votingStates.get(roomCode)
        if (!vs) return

        const entry = vs.votes.get(drawingId)
        if (!entry) return

        if (entry.voters.has(userId)) return
        entry.voters.add(userId)

        if (VOTE_OPTIONS.includes(reaction)) {
            entry.reactions[reaction] = (entry.reactions[reaction] ?? 0) + 1
        }

        io.to(roomCode).emit('voting:update', {
            drawingId,
            reactions: { ...entry.reactions },
            totalVotes: entry.voters.size,
        })
    })

    socket.on('room:invite', ({ friendId, roomCode, senderName }) => {
        const friendSocket = userSockets.get(friendId)
        if (friendSocket) {
            friendSocket.emit('room:invite', {
                roomCode,
                senderName,
                senderId: userId
            })
        }
    })

    socket.on('disconnecting', () => {
        for (const roomCode of socket.rooms) {
            if (roomCode === socket.id) continue
            removePlayer(io, roomCode, userId)
        }
    })
}


const transitionPhase = async (io, roomCode, phase, drawSeconds = null) => {
    const state = roomStates.get(roomCode)
    if (!state) return

    if (state.phase === phase) {
        console.log(`transitionPhase: already in ${phase}, skipping`)
        return
    }

    console.log(`transitionPhase: ${state.phase} → ${phase}`)

    try {
        await prisma.room.update({ where: { code: roomCode }, data: { phase } })
    } catch (error) {
        console.error(`DB phase update failed for "${phase}":`, error.message)
    }

    state.phase = phase


    if (phase === 'drawing') {
        state.drawingStatus = new Map()
    }

   
    if (phase === 'theme_vote') {
        state.votedPlayers = new Set()
    }

    io.to(roomCode).emit('phase:changed', { phase })

    if (phase === 'drawing' && drawSeconds) {
        startDrawTimer(io, roomCode, drawSeconds)
    }

    if (phase === 'voting') {
        await startVotingRound(io, roomCode)
    }

    if (phase === 'results') {
        await sendResults(io, roomCode)
    }
}


const startDrawTimer = (io, roomCode, seconds) => {
    clearRoomTimer(roomCode)
    let timeLeft = seconds

    io.to(roomCode).emit('timer:tick', { timeLeft })

    const interval = setInterval(async () => {
        timeLeft -= 1
        io.to(roomCode).emit('timer:tick', { timeLeft })

        if (timeLeft <= 0) {
            clearRoomTimer(roomCode)
            const state = roomStates.get(roomCode)
            if (!state) return
      
            if (state.phase === 'drawing') {
                console.log(`timer expired → voting (${state.drawingStatus.size}/${state.connectedPlayers.size} submitted)`)
                await transitionPhase(io, roomCode, 'voting')
            }
        }
    }, 1000)

    roomTimers.set(roomCode, interval)
}



const startVotingRound = async (io, roomCode) => {
    console.log(`startVotingRound called for ${roomCode}`)
    const state = roomStates.get(roomCode)
    if (!state) {
        console.log(`startVotingRound — no state for ${roomCode}`)
        return
    }

   
    const drawings = await prisma.drawing.findMany({
        where: { roomId: state.roomId },
        orderBy: { submittedAt: 'asc' },
    })


    const seen = new Map()
    for (const d of drawings) {
        seen.set(d.playerId, d)
    }
    const uniqueDrawings = Array.from(seen.values())

    console.log(`startVotingRound — ${uniqueDrawings.length} unique drawings`)

    if (uniqueDrawings.length === 0) {
        await transitionPhase(io, roomCode, 'results')
        return
    }

    const emptyReactions = Object.fromEntries(VOTE_OPTIONS.map(r => [r, 0]))

    votingStates.set(roomCode, {
        drawings: uniqueDrawings,
        currentIndex: 0,
        votes: new Map(uniqueDrawings.map(d => [d.id, {
            reactions: { ...emptyReactions },
            voters: new Set(),
        }])),
    })

    showNextDrawing(io, roomCode)
}

const showNextDrawing = (io, roomCode) => {
    const vs = votingStates.get(roomCode)
    if (!vs) {
        console.log(`showNextDrawing — no voting state for ${roomCode}`)
        return
    }

    const { drawings, currentIndex } = vs

    if (currentIndex >= drawings.length) {
        console.log(`showNextDrawing — all drawings shown for ${roomCode}`)
        transitionPhase(io, roomCode, 'results')
        return
    }

    const drawing = drawings[currentIndex]

    console.log(`showNextDrawing — emitting voting:drawing for ${roomCode}, drawing ${currentIndex + 1}/${drawings.length}`)

    io.to(roomCode).emit('voting:drawing', {
        drawingId: drawing.id,
        playerId: drawing.playerId,
        playerName: drawing.playerName,
        strokes: drawing.strokes,
        current: currentIndex + 1,
        total: drawings.length,
    })

    let timeLeft = 10
    io.to(roomCode).emit('voting:tick', { timeLeft })

    const interval = setInterval(() => {
        timeLeft -= 1
        io.to(roomCode).emit('voting:tick', { timeLeft })

        if (timeLeft <= 0) {
            clearInterval(interval)
            roomTimers.delete(`${roomCode}_voting`)

            const vote = vs.votes.get(drawing.id)
            io.to(roomCode).emit('voting:result', {
                drawingId: drawing.id,
                reactions: vote?.reactions ?? {},
                totalVotes: vote?.voters.size ?? 0,
            })

            setTimeout(() => {
                vs.currentIndex += 1
                showNextDrawing(io, roomCode)
            }, 2000)
        }
    }, 1000)

    roomTimers.set(`${roomCode}_voting`, interval)
}



const sendResults = async (io, roomCode) => {
    const state = roomStates.get(roomCode)
    const vs = votingStates.get(roomCode)
    if (!state) return

    const drawings = await prisma.drawing.findMany({
        where: { roomId: state.roomId },
        orderBy: { submittedAt: 'asc' },
    })


    const seen = new Map()
    for (const d of drawings) seen.set(d.playerId, d)
    const uniqueDrawings = Array.from(seen.values())

    const scoreWeights = { fire: 5, love: 4, wow: 3, laugh: 2, trash: 1 }

    const results = uniqueDrawings.map(d => {
        const vote = vs?.votes.get(d.id)
        const reactions = vote?.reactions ?? Object.fromEntries(VOTE_OPTIONS.map(r => [r, 0]))
        const score = Object.entries(reactions).reduce((total, [reaction, count]) => {
            return total + (scoreWeights[reaction] ?? 0) * (count)
        }, 0)
        return {
            playerId: d.playerId,
            playerName: d.playerName,
            drawingId: d.id,
            strokes: d.strokes,
            reactions,
            totalVotes: vote?.voters.size ?? 0,
            score,
        }
    }).sort((a, b) => b.score - a.score)

    votingStates.delete(roomCode)
    io.to(roomCode).emit('results:data', results)
}


const clearRoomTimer = (roomCode) => {
    if (roomTimers.has(roomCode)) {
        clearInterval(roomTimers.get(roomCode))
        roomTimers.delete(roomCode)
    }
}

const removePlayer = (io, roomCode, userId) => {
    const state = roomStates.get(roomCode)
    if (!state) return

    state.connectedPlayers.delete(userId)

    io.to(roomCode).emit('room:playerLeft', {
        userId,
        connectedPlayers: Array.from(state.connectedPlayers.values()),
    })

    if (state.connectedPlayers.size === 0) {
        clearRoomTimer(roomCode)
        clearRoomTimer(`${roomCode}_voting`)
        votingStates.delete(roomCode)
        roomStates.delete(roomCode)
    }
}