import { Event, EventUser, Message } from "../models/index.js";
import { verifyToken } from "./middlewares.js";
import { mediasoupConfig } from "../config/mediasoup.js";

const eventRooms = new Map();

const cleanupUserResources = (room, socketId) => {
    const user = room.users.get(socketId);
    if (!user) return;


    user.producers.forEach(producer => {
        try {
            producer.close();
        } catch (e) {

        }
    });

    user.consumers.forEach(consumer => {
        try {
            consumer.close();
        } catch (e) {
        }
    });

    if (user.producerTransport) {
        try {
            user.producerTransport.close();
        } catch (e) {

        }
    }
    if (user.consumerTransport) {
        try {
            user.consumerTransport.close();
        } catch (e) {

        }
    }

    room.users.delete(socketId);
};

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
        let currentEventId = null;
        socket.on("event:join", async ({ eventId }) => {
            try {
                await verifyToken(socket, () => { });
                const event = await verifyEventAccess(socket, eventId);
                currentEventId = eventId; 

                const eventRoomName = `event:${eventId}`;
                socket.join(eventRoomName);

                const worker = getMediasoupWorker();
                let room = eventRooms.get(eventId);

                if (!room) {
                    const router = await worker.createRouter({ mediaCodecs: mediasoupConfig.router.mediaCodecs });
                    room = { router, users: new Map() };
                    eventRooms.set(eventId, room);
                }

                room.users.set(socket.id, {
                    socket,
                    producers: new Map(),
                    consumers: new Map()
                });
               
                socket.to(eventRoomName).emit("event:user_joined", {
                    userId: socket.user.id,
                    socketId: socket.id, 
                    fullName: socket.user.full_name
                });

                const existingProducers = [];
                room.users.forEach((userData, userSocketId) => {
                    if (userSocketId !== socket.id) {
                        userData.producers.forEach(producer => {
                            existingProducers.push({
                                producerId: producer.id,
                                userId: userData.socket.user.id,
                                fullName: userData.socket.user.full_name 
                            });
                        });
                    }
                });

                socket.emit("event:join_success", {
                    eventId: event._id,
                    title: event.title,
                    existingProducers
                });

            } catch (err) {
                socket.emit("event:error", { message: err.message });
                currentEventId = null;
            }
        });

        socket.on("event:message", async ({ eventId, content }) => {
            try {
                if (currentEventId !== eventId) throw new Error("Invalid event context for message");
                await verifyToken(socket, () => { });

                const event = await Event.findById(eventId);
                if (!event || event.status !== "ongoing") {
                    throw new Error("Không thể gửi tin nhắn. Sự kiện không đang diễn ra.");
                }

                const message = await Message.create({
                    user_id: socket.user.id,
                    room_id: event.room_id,
                    event_id: eventId,
                    content,
                    status: "sent"
                });

                await message.populate("user_id", "full_name");

                io.to(`event:${eventId}`).emit("event:new_message", {
                    _id: message._id,
                    user_id: message.user_id._id,
                    user_name: message.user_id.full_name,
                    event_id: eventId,
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
            currentEventId = null;

            const room = eventRooms.get(eventId);
            if (room) {
                cleanupUserResources(room, socket.id);
                //cần dọn dẹp transports và producers của user
            }

            if (socket.user) {
                io.to(eventRoomName).emit("event:user_left", {
                    userId: socket.user.id,
                    socketId: socket.id,
                    fullName: socket.user.full_name
                });
            }
        });

        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);
            if (currentEventId) {
                const room = eventRooms.get(currentEventId);
                if (room) {
                    if (socket.user) {
                        io.to(`event:${currentEventId}`).emit("event:user_left", {
                            userId: socket.user.id,
                            socketId: socket.id,
                            fullName: socket.user.full_name
                        });
                    }
                    cleanupUserResources(room, socket.id);

                    if (room.users.size === 0) {
                        try {
                            room.router.close();
                        } catch (e) { console.warn(`Error closing router: ${e.message}`) }
                        eventRooms.delete(currentEventId);
                    }
                }
            }
            currentEventId = null; 
        });

        socket.on("getRouterRtpCapabilities", ({ eventId }, callback) => {
            if (currentEventId !== eventId) return callback({ error: "Invalid event context" });
            const room = eventRooms.get(eventId);
            if (!room) return callback({ error: "Sự kiện không tồn tại trên media server" });

            try {
                callback(room.router.rtpCapabilities);
            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("createWebRtcTransport", async ({ eventId, type }, callback) => {
            if (currentEventId !== eventId) return callback({ error: "Invalid event context" });
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");

                const transport = await room.router.createWebRtcTransport(mediasoupConfig.webRtcTransport);
                const user = room.users.get(socket.id);

                transport.on('dtlsstatechange', (dtlsState) => {
                    if (dtlsState === 'closed') {
                        //đóng
                    }
                });
                // transport.observer.on('close', () => { ... }); // Cách khác

                if (type === 'producer') {
                    if (user.producerTransport) user.producerTransport.close();
                    user.producerTransport = transport;
                } else if (type === 'consumer') {
                    if (user.consumerTransport) user.consumerTransport.close();
                    user.consumerTransport = transport;
                } else {
                    throw new Error("Invalid transport type");
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
            if (currentEventId !== eventId) return callback({ error: "Invalid event context" });
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");
                const user = room.users.get(socket.id);

                const transport = user.producerTransport?.id === transportId
                    ? user.producerTransport
                    : user.consumerTransport?.id === transportId
                        ? user.consumerTransport
                        : null;

                if (!transport) throw new Error(`Transport ${transportId} không tồn tại cho user`);

                await transport.connect({ dtlsParameters });
                callback({ connected: true });

            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("produce", async ({ eventId, kind, rtpParameters, appData }, callback) => {
            if (currentEventId !== eventId) return callback({ error: "Invalid event context" });
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");
                const user = room.users.get(socket.id);
                const transport = user.producerTransport;

                if (!transport) throw new Error("Chưa tạo producer transport");

                const producer = await transport.produce({ kind, rtpParameters, appData }); 
                user.producers.set(producer.id, producer);

                producer.on('transportclose', () => {
                    user.producers.delete(producer.id);
                    io.to(`event:${eventId}`).emit("producerClosed", { producerId: producer.id, userId: socket.user.id });
                });

                socket.to(`event:${eventId}`).emit("newProducer", {
                    producerId: producer.id,
                    userId: socket.user.id,
                    socketId: socket.id,
                    fullName: socket.user.full_name,
                    kind: producer.kind,
                    appData: producer.appData
                });

                callback({ id: producer.id });

            } catch (err) {
                callback({ error: err.message });
            }
        });

        socket.on("consume", async ({ eventId, producerId, rtpCapabilities }, callback) => {
            if (currentEventId !== eventId) return callback({ error: "Invalid event context" });
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");
                const user = room.users.get(socket.id);

                if (!user.consumerTransport) {
                    throw new Error("Chưa tạo consumer transport.");
                }

                let producerToConsume = null;
                room.users.forEach(userData => {
                    const producer = userData.producers.get(producerId);
                    if (producer) producerToConsume = producer;
                });

                if (!producerToConsume || producerToConsume.closed) {
                    throw new Error(`Producer ${producerId} không tồn tại hoặc đã đóng`);
                }

                if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                    throw new Error(`Client không thể consume producer ${producerId}`);
                }

                const consumer = await user.consumerTransport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true 
                });
                user.consumers.set(consumer.id, consumer);

                consumer.on('transportclose', () => {
                    user.consumers.delete(consumer.id);
                });
                consumer.on('producerclose', () => {
                    user.consumers.delete(consumer.id);
                    socket.emit("consumerClosed", { consumerId: consumer.id });
                });
                // consumer.observer.on('close', () => { ... });

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

        socket.on("resumeConsumer", async ({ eventId, consumerId }, callback) => {
            if (currentEventId !== eventId) return callback({ error: "Invalid event context" });
            try {
                const room = eventRooms.get(eventId);
                if (!room) throw new Error("Phòng không tồn tại");
                const user = room.users.get(socket.id);
                const consumer = user.consumers.get(consumerId);

                if (!consumer) throw new Error(`Consumer ${consumerId} không tồn tại`);
                if (consumer.closed) throw new Error(`Consumer ${consumerId} đã đóng`);

                await consumer.resume();
                callback({ resumed: true });
            } catch (err) {
                callback({ error: err.message });
            }
        });
    });
}