const onlineUsers = new Map(); 

export function addUserSocket(userId, socketId) {
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socketId);
}

export function removeUserSocket(userId, socketId) {
    if (onlineUsers.has(userId)) {
        const sockets = onlineUsers.get(userId);
        sockets.delete(socketId);
        if (sockets.size === 0) {
            onlineUsers.delete(userId);
        }
    }
}

export function emitToUser(io, userId, event, data) {
    if (onlineUsers.has(userId)) {
        for (const socketId of onlineUsers.get(userId)) {
            io.to(socketId).emit(event, data);
        }
    }
}

export function getUserSockets(userId) {
    return onlineUsers.get(userId) || new Set();
}

export { onlineUsers };
