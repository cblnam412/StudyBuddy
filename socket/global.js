export default function globalHandler(io, socket) {
    socket.on("user:online", () => {
        const userId = socket.user.id; 

        io.emit("global:user_online", { userId });
    });
}
