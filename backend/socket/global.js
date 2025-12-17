import { verifyToken } from "./middlewares.js";
import { addUserSocket, removeUserSocket, onlineUsers } from "./onlineUser.js";
export default function GlobalSocket(io) {
    io.use(verifyToken);

    io.on("connection", (socket) => {
        const userId = socket.user.id;
        addUserSocket(userId, socket.id);

        const userName = socket.user.full_name;
        io.emit("global:user_online", { userName });

         socket.on("notification:mark_read", async (notificationId) => {
            try {
                await notificationService.markAsRead(notificationId, userId);
                socket.emit("notification:marked_read", { notificationId });
            } catch (error) {
                socket.emit("notification:error", { message: error.message });
            }
        });

        socket.on("notification:mark_all_read", async () => {
            try {
                await notificationService.markAllAsRead(userId);
                socket.emit("notification:all_marked_read");
            } catch (error) {
                socket.emit("notification:error", { message: error.message });
            }
        });

        socket.on("notification:get_unread", async () => {
            try {
                const result = await notificationService.getUserNotifications(userId, { 
                    limit: 50, 
                    unreadOnly: true 
                });
                socket.emit("notification:unread_list", result.notifications);
            } catch (error) {
                socket.emit("notification:error", { message: error.message });
            }
        }); 

        socket.on("disconnect", () => {
            removeUserSocket(userId, socket.id);
            const isStillOnline = onlineUsers.has(userId);

            if (!isStillOnline) {
                io.emit("global:user_offline", { userName });
            }
        });
    });
}