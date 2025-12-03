import { verifyRoom } from "./middlewares.js";
import { Message }  from "../models/index.js";
import { emitToUser } from "./onlineUser.js";
import { handleSlashCommand } from "./handleSlashCommand.js"
import { checkSocketFeature, checkChatRateLimit } from "../middlewares/authMiddleware.js";
import mongoose from "mongoose";

export default function RoomSocket(io) {

    io.on("connection", (socket) => {

        socket.on("room:join", async (roomId) => {
            try {
                //console.log("server received room:join, roomId:", roomId, "typeof:", typeof roomId);

                await verifyRoom(socket, roomId);
                socket.join(roomId);

            } catch (err) {
                socket.emit("room:error", { message: err.message });
            }
        });

        socket.on("room:leave", async (roomId) => {
            try {
                await verifyRoom(socket, roomId);
                socket.leave(roomId);
            } catch (err) {
                socket.emit("room:error", { message: err.message });
            }
        });

        socket.on("room:message", async ({ roomId, content, reply_to = null}) => {
            try {
                await verifyRoom(socket, roomId);

                // chặn tính năng gửi tin nhắn
                await checkSocketFeature(socket, "send_message");

                // kiểm tra rate limit
                await checkChatRateLimit(socket);

                if (content.startsWith("/")) {
                    await handleSlashCommand(content, socket, io, roomId);
                    return; 
                }

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

                await checkSocketFeature(socket, "send_message");

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
                if (!roomId || !message_id || !new_content) 
                    throw new Error("Không được bỏ trống roomId, message_id và new_content.");

                if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(message_id))
                    throw new Error("roomId hoac message_id không đúng định dạng.");

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

                if (!roomId || !message_id) 
                    throw new Error("Không được bỏ trống roomId và message_id.");

                if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(message_id))
                    throw new Error("roomId hoac message_id không đúng định dạng.");

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