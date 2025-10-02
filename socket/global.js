import { verifyToken } from "./middlewares.js";
import { addUserSocket, removeUserSocket, onlineUsers } from "./onlineUser.js";
export default function GlobalSocket(io) {
    io.use(verifyToken);

    io.on("connection", (socket) => {
        const userId = socket.user.id;
        addUserSocket(userId, socket.id);
        const userName = socket.user.full_name;
        io.emit("global:user_online", { userName });


        socket.on("disconnect", () => {
            const wasOnline = onlineUsers.has(userId);
            removeUserSocket(userId, socket.id);
            const isStillOnline = onlineUsers.has(userId);

            if (wasOnline && !isStillOnline) {
                io.emit("global:user_offline", { userName });
            }
        });
    });
}