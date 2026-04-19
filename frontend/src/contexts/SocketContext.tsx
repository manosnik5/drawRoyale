import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo
} from 'react'
import type { ReactNode } from 'react'
import { useAuth0 } from "@auth0/auth0-react"
import { io, Socket } from 'socket.io-client'

export type Phase = 'lobby' | 'theme_vote' | 'drawing' | 'voting' | 'results'

export interface ConnectedPlayer {
    userId: string
    playerName: string
    avatarColor: string
    imageUrl?: string
}

export interface VotingDrawing {
    drawingId: string
    playerId: string
    playerName: string
    strokes: any[]
    current: number
    total: number
}

export interface VotingUpdate {
    drawingId: string
    reactions: Record<string, number>
    totalVotes: number
}

export interface VotingResult {
    drawingId: string
    reactions: Record<string, number>
    totalVotes: number
}

export interface ResultEntry {
    playerId: string
    playerName: string
    drawingId: string
    strokes: any[]
    reactions: Record<string, number>
    totalVotes: number
    score: number
}

export interface RoomState {
    phase: Phase
    connectedPlayers: ConnectedPlayer[]
    selectedTheme: string
    timeLeft: number
    themeOptions: string[]
    themeVotes: Record<string, number>
    votingDrawing: VotingDrawing | null
    votingTimeLeft: number
    votingVotes: Record<string, { reactions: Record<string, number>; totalVotes: number }>
    votingResult: VotingResult | null
    results: ResultEntry[]
}

const defaultRoomState: RoomState = {
    phase: 'lobby',
    connectedPlayers: [],
    selectedTheme: '',
    timeLeft: 0,
    themeOptions: [],
    themeVotes: {},
    votingDrawing: null,
    votingTimeLeft: 10,
    votingVotes: {},
    votingResult: null,
    results: [],
}

interface Invite {
    id: string
    roomCode: string
    senderName: string
    senderId: string
}

interface SocketContextValue {
    socket: Socket | null
    isConnected: boolean
    onlineUsers: Set<string>
    isOnline: (userId: string) => boolean
    roomState: RoomState
    currentRoomCode: string | null
    pendingInvites: Invite[]

    joinRoom: (roomCode: string, playerName: string, avatarColor: string) => void
    leaveRoom: (roomCode: string) => void
    startGame: (roomCode: string) => void
    submitThemeOptions: (roomCode: string, themes: string[]) => void
    voteTheme: (roomCode: string, theme: string) => void
    broadcastStroke: (roomCode: string, stroke: any) => void
    submitDrawing: (roomCode: string, playerName: string, strokes: any[]) => void
    castVote: (roomCode: string, drawingId: string, reaction: string) => void
    acceptRoomInvite: (inviteId: string) => void
    rejectRoomInvite: (inviteId: string) => void
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
    onlineUsers: new Set(),
    isOnline: () => false,
    roomState: defaultRoomState,
    currentRoomCode: null,
    pendingInvites: [],
    joinRoom: () => {},
    leaveRoom: () => {},
    startGame: () => {},
    submitThemeOptions: () => {},
    voteTheme: () => {},
    broadcastStroke: () => {},
    submitDrawing: () => {},
    castVote: () => {},
    acceptRoomInvite: () => {},
    rejectRoomInvite: () => {},
})

export const useSocketContext = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0()

    const userId = user?.sub ?? null

    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const [roomState, setRoomState] = useState<RoomState>(defaultRoomState)
    const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null)
    const [pendingInvites, setPendingInvites] = useState<Invite[]>([])

    const updateRoomState = useCallback((partial: Partial<RoomState>) => {
        setRoomState(prev => ({ ...prev, ...partial }))
    }, [])

    useEffect(() => {
        if (isLoading || !isAuthenticated || !userId) return

        let s: Socket

        const connectSocket = async () => {
            const token = await getAccessTokenSilently()

            s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
                query: {
                    userId,   
                },
                withCredentials: true,
                transports: ['websocket', 'polling'],
            })

            setSocket(s)

            s.on('connect', () => {
                setIsConnected(true)
                s.emit('presence:get_online_users')
            })

            s.on('disconnect', () => {
                setIsConnected(false)
            })

            s.on('connect_error', (err) => {
                console.error('socket error:', err.message)
                setIsConnected(false)
            })

            s.on('presence:online_users', (users: string[]) => {
                setOnlineUsers(new Set(users))
            })

            s.on('presence:update', ({ userId: uid, online }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev)
                    online ? next.add(uid) : next.delete(uid)
                    return next
                })
            })

            s.on('room:state', ({ phase, connectedPlayers }) => {
                updateRoomState({ phase, connectedPlayers })
            })

            s.on('room:playerJoined', ({ connectedPlayers }) => {
                updateRoomState({ connectedPlayers })
            })

            s.on('room:playerLeft', ({ connectedPlayers }) => {
                updateRoomState({ connectedPlayers })
            })

            s.on('room:invite', (invite) => {
                setPendingInvites(prev => [
                    ...prev,
                    { id: crypto.randomUUID(), ...invite }
                ])
            })

            s.on('phase:changed', ({ phase }) => {
                updateRoomState({
                    phase,
                    votingDrawing: null,
                    votingResult: null,
                    votingVotes: {},
                    votingTimeLeft: 10,
                })
            })

            s.on('theme:options', ({ themes }) => {
                updateRoomState({ themeOptions: themes })
            })

            s.on('theme:vote_update', ({ votes }) => {
                updateRoomState({ themeVotes: votes })
            })

            s.on('theme:final', ({ theme }) => {
                updateRoomState({ selectedTheme: theme })
            })

            s.on('timer:tick', ({ timeLeft }) => {
                updateRoomState({ timeLeft })
            })

            s.on('voting:drawing', (data) => {
                console.log('VOTING DRAWING RAW:', JSON.stringify(data).slice(0, 300))
                updateRoomState({
                    votingDrawing: data,
                    votingResult: null,
                    votingVotes: {},
                    votingTimeLeft: 10,
                })
            })
            s.on('voting:tick', ({ timeLeft }) => {
                updateRoomState({ votingTimeLeft: timeLeft })  // 👈
            })

            s.on('voting:update', ({ drawingId, reactions, totalVotes }) => {
                setRoomState(prev => ({
                    ...prev,
                    votingVotes: {
                        ...prev.votingVotes,
                        [drawingId]: { reactions, totalVotes },
                    },
                }))
            })

            s.on('voting:result', (data) => {
                updateRoomState({ votingResult: data })
            })

            s.on('results:data', (results) => {
                updateRoomState({ results })
            })
        }

        connectSocket()

        return () => {
            s?.disconnect()
            setSocket(null)
            setIsConnected(false)
            setOnlineUsers(new Set())
            setRoomState(defaultRoomState)
        }

    }, [isLoading, isAuthenticated, userId, getAccessTokenSilently, updateRoomState])

    const joinRoom = useCallback((roomCode: string, playerName: string, avatarColor: string) => {
        socket?.emit('room:join', {
            roomCode,
            playerName,
            avatarColor,
        })
        setCurrentRoomCode(roomCode)
    }, [socket])

    const leaveRoom = useCallback((roomCode: string) => {
        socket?.emit('room:leave', { roomCode })
        setCurrentRoomCode(null)
        setRoomState(defaultRoomState)
    }, [socket])

    const startGame = useCallback((roomCode: string) => {
        socket?.emit('room:startGame', { roomCode })
    }, [socket])

    const submitThemeOptions = useCallback((roomCode: string, themes: string[]) => {
        socket?.emit('theme:options', { roomCode, themes })
    }, [socket])

    const voteTheme = useCallback((roomCode: string, theme: string) => {
        socket?.emit('theme:vote', { roomCode, theme })
    }, [socket])

    const broadcastStroke = useCallback((roomCode: string, stroke: any) => {
        socket?.emit('drawing:stroke', { roomCode, stroke })
    }, [socket])

    const submitDrawing = useCallback((roomCode: string, playerName: string, strokes: any[]) => {
        socket?.emit('drawing:submit', { roomCode, playerName, strokes })
    }, [socket])

    const castVote = useCallback((roomCode: string, drawingId: string, reaction: string) => {
        socket?.emit('voting:vote', { roomCode, drawingId, reaction })
    }, [socket])

    const acceptRoomInvite = useCallback((inviteId: string) => {
        const invite = pendingInvites.find(i => i.id === inviteId)

        if (invite && socket) {
            socket.emit('room:join', {
                roomCode: invite.roomCode,
                playerName: user?.name || 'Player',
                avatarColor: '#fff',
            })
        }

        setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    }, [pendingInvites, socket, user])

    const rejectRoomInvite = useCallback((inviteId: string) => {
        setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
    }, [])

    const isOnline = useCallback((uid: string) => onlineUsers.has(uid), [onlineUsers])

    const value = useMemo(() => ({
        socket,
        isConnected,
        onlineUsers,
        isOnline,
        roomState,
        currentRoomCode,
        pendingInvites,
        joinRoom,
        leaveRoom,
        startGame,
        submitThemeOptions,
        voteTheme,
        broadcastStroke,
        submitDrawing,
        castVote,
        acceptRoomInvite,
        rejectRoomInvite,
    }), [
        socket,
        isConnected,
        onlineUsers,
        isOnline,
        roomState,
        currentRoomCode,
        pendingInvites,
        joinRoom,
        leaveRoom,
        startGame,
        submitThemeOptions,
        voteTheme,
        broadcastStroke,
        submitDrawing,
        castVote,
        acceptRoomInvite,
        rejectRoomInvite,
    ])

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    )
}