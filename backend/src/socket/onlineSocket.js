const onlineUsers = new Map()

export const registerPresenceHandlers = (io, socket) => {
    const userId = socket.handshake.auth.userId

    console.log('registerPresenceHandlers - userId:', userId)

    if (!userId) {
        console.log('no userId in handshake, skipping')
        return
    }

    onlineUsers.set(userId, socket.id)
    socket.broadcast.emit('presence:update', { userId, online: true })

    socket.on('presence:get_online_users', () => {
        console.log('sending online users to:', userId, Array.from(onlineUsers.keys()))
        socket.emit('presence:online_users', Array.from(onlineUsers.keys()))
    })

    socket.on('disconnect', () => {
        onlineUsers.delete(userId)
        io.emit('presence:update', { userId, online: false })
    })
}

export const getOnlineUsers = () => Array.from(onlineUsers.keys())