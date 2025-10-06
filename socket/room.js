import { verifyRoom } from "./middlewares.js";
import { Message }  from "../models/index.js";
import { emitToUser } from "./onlineUser.js";

export default function RoomSocket(io) {

    io.on("connection", (socket) => {
        socket.on("room:message", async ({ roomId, content, reply_to = null}) => {
            try {
                await verifyRoom(socket, roomId);

                const message = await Message.create({
                    user_id: socket.user.id,
                    room_id: roomId,
                    content,
                    reply_to,
                    status: "sent"
                });

                await message.populate("user_id", "full_name");

                io.to(roomId).emit("room:new_message", {
                    _id: message._id,
                    user_id: message.user_id._id,
                    user_name: message.user_id.full_name,
                    room_id: roomId,
                    content: message.content,
                    reply_to: message.reply_to,
                    status: message.status,
                    created_at: message.created_at,
                    updated_at: message.updated_at
                });

            } catch (err) {
                socket.emit("room:error", { message: err.message });
            }
        });

        socket.on("room:typing", async (roomId) => {
            try {
                await verifyRoom(socket, roomId);
                socket.to(roomId).emit("room:user_typing", {
                    user_id: socket.user.id,
                    user_name: socket.user.full_name,
                    room_id: roomId
                });
            } catch (err) {
            }
        });

        socket.on("room:stop_typing", async (roomId) => {
            try {
                await verifyRoom(socket, roomId);
                socket.to(roomId).emit("room:user_stop_typing", {
                    user_id: socket.user.id,
                    user_name: socket.user.full_name,
                    room_id: roomId
                });
            } catch (err) {
            }
        });

        socket.on("room:edit_message", async ({ roomId, message_id, new_content }) => {
            try {
                await verifyRoom(socket, roomId);

                const message = await Message.findOne({
                    _id: message_id,
                    user_id: socket.user.id,
                    room_id: roomId
                });

                if (!message) {
                    throw new Error("Tin nhắn không tồn tại hoặc bạn không có quyền sửa");
                }

                message.content = new_content;
                message.status = "edited";
                await message.save();

                await message.populate("user_id", "full_name");

                io.to(roomId).emit("room:message_edited", {
                    _id: message._id,
                    user_id: message.user_id._id,
                    user_name: message.user_id.full_name,
                    room_id: roomId,
                    content: message.content,
                    status: message.status,
                    updated_at: message.updated_at
                });

            } catch (err) {
                socket.emit("room:error", { message: err.message });
            }
        });

        socket.on("room:delete_message", async ({ roomId, message_id }) => {
            try {
                await verifyRoom(socket, roomId);

                const message = await Message.findOne({
                    _id: message_id,
                    user_id: socket.user.id,
                    room_id: roomId
                });

                if (!message) {
                    throw new Error("Tin nhắn không tồn tại hoặc bạn không có quyền xóa");
                }

                message.status = "deleted";
                message.deleted_at = new Date();
                await message.save();

                io.to(roomId).emit("room:message_deleted", {
                    message_id: message._id,
                    room_id: roomId,
                    deleted_at: message.deleted_at
                });

            } catch (err) {
                socket.emit("room:error", { message: err.message });
            }
        });

        socket.on("disconnect", () => {
        });
    });
}