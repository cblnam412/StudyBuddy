import { addUserSocket, removeUserSocket } from "./onlineUser.js";
import globalHandler from "./global.js";
import { verifyToken } from "./middlewares.js";

export default function SocketEvents(io) {
    io.use(verifyToken);

    io.on("connection", (socket) => {
        const userId = socket.user.id;
        addUserSocket(userId, socket.id);

        globalHandler(io, socket);

        socket.on("disconnect", () => {
            removeUserSocket(userId, socket.id);
        });
    });
}
