import { Event, EventUser, Message } from "../models/index.js";
import { verifyToken } from "./middlewares.js";
import { mediasoupConfig } from "../config/mediasoup.js";

const eventRooms = new Map();

const verifyEventAccess = async (socket, eventId) => {
        const userId = socket.user.id;

        const event = await Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        if (event.status !== "ongoing") {
            throw new Error("Sự kiện không đang diễn ra");
        }

        const registration = await EventUser.findOne({
            event_id: eventId,
            user_id: userId
        });

        if (!registration) {
            throw new Error("Bạn chưa đăng ký tham gia sự kiện này");
        }


        if (!registration.is_attended) {
            registration.is_attended = true;
            registration.attended_at = new Date();
            await registration.save();
        }

        return event;
};

export default function EventSocket(io, getMediasoupWorker) {
    io.on("connection", (socket) => {
        socket.on("event:join", async ({ eventId }) => {
            try {
                await verifyToken(socket, () => { });
                const event = await verifyEventAccess(socket, eventId);

                const eventRoomName = `event:${eventId}`;
                socket.join(eventRoomName);

                const worker = getMediasoupWorker();
                let room = eventRooms.get(eventId);

                if (!room) {
                    const router = await worker.createRouter({
                        mediaCodecs: mediasoupConfig.router.mediaCodecs
                    });
                    room = { router, users: new Map() };
                    eventRooms.set(eventId, room);
                }

                room.users.set(socket.id, { socket });

                socket.to(eventRoomName).emit("event:user_joined", {
                    userId: socket.user.id,
                    fullName: socket.user.full_name
                });

                socket.emit("event:join_success", { eventId: event._id, title: event.title });

            } catch (err) {
                socket.emit("event:error", { message: err.message });
            }
        });

        socket.on("event:message", async ({ eventId, content }) => {
            try {
                await verifyToken(socket, () => { });

                const event = await Event.findById(eventId);
                if (!event || event.status !== "ongoing") {
                    throw new Error("Không thể gửi tin nhắn. Sự kiện không đang diễn ra.");
                }

                const message = await Message.create({
                    user_id: socket.user.id,
                    room_id: event.room_id,
                    content,
                    status: "sent"
                });

                await message.populate("user_id", "full_name");

                io.to(`event:${eventId}`).emit("event:new_message", {
                    _id: message._id,
                    user_id: message.user_id._id,
                    user_name: message.user_id.full_name,
                    content: message.content,
                    created_at: message.created_at,
                });

            } catch (err) {
                socket.emit("event:error", { message: err.message });
            }
        });

        socket.on("event:leave", ({ eventId }) => {
            const eventRoomName = `event:${eventId}`;
            socket.leave(eventRoomName);

            const room = eventRooms.get(eventId);
            if (room) {
                room.users.delete(socket.id);
                //cần dọn dẹp transports và producers của user
            }

            if (socket.user) {
                socket.to(eventRoomName).emit("event:user_left", {
                    userId: socket.user.id,
                    fullName: socket.user.full_name
                });
            }
        });

        socket.on("disconnect", () => {
            //cần lặp qua tất cả eventRooms để xóa user
            console.log(`Socket ${socket.id} disconnected`);
            // Dọn dẹp user khỏi tất cả các phòng
        });

        socket.on("getRouterRtpCapabilities", ({ eventId }, callback) => {
            const room = eventRooms.get(eventId);
            if (!room) {
                return callback({ error: "Sự kiện không tồn tại trên media server" });
            }
            callback(room.router.rtpCapabilities);
        });

        socket.on("createWebRtcTransport", async ({ eventId, type }, callback) => {
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");

                const transport = await room.router.createWebRtcTransport(
                    mediasoupConfig.webRtcTransport
                );

                // Lưu transport (Dùng map quản lý transport)
                // transports.set(transport.id, transport); 

                // Lưu transport vào user
                const user = room.users.get(socket.id);
                if (type === 'producer') {
                    user.producerTransport = transport;
                } else {
                    user.consumerTransport = transport;
                }

                callback({
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters
                });

            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("connectWebRtcTransport", async ({ eventId, transportId, dtlsParameters }, callback) => {
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");

                const user = room.users.get(socket.id);
                // Tìm đúng transport (producer hoặc consumer)
                const transport = user.producerTransport?.id === transportId
                    ? user.producerTransport
                    : user.consumerTransport;

                if (!transport) throw new Error("Transport không tồn tại");

                await transport.connect({ dtlsParameters });
                callback({ connected: true });

            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("produce", async ({ eventId, kind, rtpParameters }, callback) => {
            try {
                const room = eventRooms.get(eventId);
                const user = room.users.get(socket.id);
                const transport = user.producerTransport;

                if (!transport) throw new Error("Chưa tạo producer transport");

                const producer = await transport.produce({ kind, rtpParameters });

                user.producer = producer;

                // Thông báo cho MỌI NGƯỜI KHÁC
                socket.to(`event:${eventId}`).emit("newProducer", {
                    producerId: producer.id,
                    userId: socket.user.id,
                    fullName: socket.user.full_name
                });

                callback({ id: producer.id }); 

            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("consume", async ({ eventId, producerId, rtpCapabilities }, callback) => {
            try {
                const room = eventRooms.get(eventId);
                const user = room.users.get(socket.id);

                if (!user.consumerTransport) {
                    throw new Error("Chưa tạo consumer transport. Hãy gọi 'createWebRtcTransport' với type='consumer' trước.");
                }

                if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                    throw new Error("Không thể consume producer này");
                }

                const consumer = await user.consumerTransport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true 
                });

                callback({
                    id: consumer.id,
                    producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters
                });

            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("resumeConsumer", async ({ consumerId }, callback) => {
            // tìm consumer theo id và gọi consumer.resume()
            callback({ resumed: true });
        });
    });
}