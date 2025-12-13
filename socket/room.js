import { verifyRoom } from "./middlewares.js";
import { Message, RoomUser, Notification }  from "../models/index.js";
import { emitToUser, getUserSockets } from "./onlineUser.js";
import { handleSlashCommand } from "./handleSlashCommand.js"
import { checkSocketFeature, checkChatRateLimit } from "../middlewares/authMiddleware.js";
import mongoose from "mongoose";

import { MessageService } from "../service/messageService.js";

const messageService = new MessageService(Message, RoomUser);

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

        socket.on("room:message", async ({ roomId, content, reply_to = null, eventId = null}) => {
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

                const message = await messageService.sendMessage(roomId, socket.user.id, content, reply_to, eventId);

                io.to(roomId).emit("room:new_message", {
                    _id: message._id,
                    user_id: message.user_id._id,
                    user_name: message.user_id.full_name,
                    user_avatar: message.user_id.avatarUrl,
                    room_id: roomId,
                    event_id: message.event_id || null,
                    content: message.content,
                    reply_to: message.reply_to,
                    status: message.status,
                    created_at: message.created_at,
                    updated_at: message.updated_at
                });

                (async () => {
                    try {
                        const members = await RoomUser.find({ room_id: roomId }).lean();
                        const roomSockets = io.sockets.adapter.rooms.get(roomId) || new Set();

                        for (const m of members) {
                            const memberId = m.user_id.toString();
                            if (memberId === socket.user.id.toString()) continue;

                            const userSockets = getUserSockets(memberId);

                            if (!userSockets || userSockets.size === 0) {
                                continue;
                            }

                            let hasSocketInRoom = false;
                            for (const sId of userSockets) {
                                const sock = io.sockets.sockets.get(sId);
                                if (sock && sock.rooms && sock.rooms.has(roomId)) {
                                    hasSocketInRoom = true;
                                    break;
                                }
                            }

                            if (!hasSocketInRoom) {
                                try {
                                    const notif = await Notification.create({
                                        user_id: memberId,
                                        type: 'message',
                                        title: 'Tin nhắn mới',
                                        content: `${message.user_id.full_name}: ${message.content}`,
                                        metadata: { room_id: roomId, message_id: message._id }
                                    });
                                    emitToUser(io, memberId, 'room:notify_message', {
                                        notification: notif,
                                        message: {
                                            _id: message._id,
                                            user_id: message.user_id._id,
                                            user_name: message.user_id.full_name,
                                            room_id: roomId,
                                            content: message.content,
                                            reply_to: message.reply_to,
                                            status: message.status,
                                            created_at: message.created_at,
                                        }
                                    });
                                } catch (nerr) {
                                    console.error('Notify user error:', nerr);
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error notifying offline-room members:', err);
                    }
                })();

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
                    user_avatar: message.user_id.avatarUrl,
                    room_id: roomId,
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