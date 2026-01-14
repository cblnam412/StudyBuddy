import { JoinRequest, Room, RoomInvite, RoomUser, TagRoom, Tag, Notification, Poll } from "../models/index.js";
import { RoomService } from "../service/roomService.js"; 
import { RequestFactory } from "../requests/requestFactory.js";
import { emitToUser } from "../socket/onlineUser.js";

export const joinRoomRequest = async (req, res) => {
    try {
        // 1. QUAN TRỌNG: Clone dữ liệu ra biến mới, KHÔNG sửa trực tiếp req.body
        const payload = { ...req.body };

        // 2. Logic tìm room_id từ token (nếu frontend chưa gửi room_id)
        if (payload.invite_token && !payload.room_id) {
            const invite = await RoomInvite.findOne({
                token: payload.invite_token,
                expires_at: { $gt: new Date() }
            });

            if (!invite) {
                return res.status(400).json({ message: "Link mời không hợp lệ hoặc đã hết hạn." });
            }

            // Gán room_id vào biến payload (biến cục bộ, an toàn tuyệt đối)
            payload.room_id = invite.room_id.toString();

            console.log("--> Đã tìm thấy Room ID:", payload.room_id);
        }

        // 3. Kiểm tra lại lần cuối
        if (!payload.room_id) {
             return res.status(400).json({ message: "Lỗi: Không xác định được phòng (thiếu room_id)." });
        }

        const factory = new RequestFactory({ JoinRequest, Room, Notification, RoomUser, RoomInvite });

        // 4. TRUYỀN BIẾN 'payload' VÀO FACTORY (Thay vì req.body)
        const handler = factory.create("join_room", req.user.id, payload);

        await handler.validate();
        const result = await handler.saveRequest();

        res.status(201).json({
            message: "Yêu cầu tham gia phòng đã được gửi",
            data: result
        });

    } catch (err) {
        console.error("Join Room Error:", err);
        // Bắt các lỗi validate từ JoinRoomRequest ném ra
        const status = err.message.includes("Chưa nhập") || err.message.includes("không hợp lệ") || err.message.includes("bỏ trống") || err.message.includes("message phải là") ? 400 : 500;
        res.status(status).json({ message: err.message });
    }
};

export const approveJoinRequest = async (req, res) => {
    try {
        const request = await JoinRequest.findById(req.params.id);
        if (!request) throw new Error("Không tìm thấy yêu cầu");

        const factory = new RequestFactory({ JoinRequest, Room, Notification, RoomUser, RoomInvite });
        const handler = factory.create("join_room", request.user_id, request);
        handler.request = request;

        const { membership, notification } = await handler.approve(req.user.id);

        emitToUser(
            req.app.get("io"),
            request.user_id.toString(),
            "user:approve_join_request",
            { notification }
        );

        res.status(200).json({
            message: "Đã duyệt yêu cầu tham gia phòng",
            data: membership
        });

    } catch (err) {
        const status = err.message.includes("Không tìm thấy") ? 404 : 400;
        res.status(status).json({ message: err.message });
    }
};


export const rejectJoinRequest = async (req, res) => {
    try {
        const request = await JoinRequest.findById(req.params.id);
        if (!request) throw new Error("Không tìm thấy yêu cầu");

        const factory = new RequestFactory({ JoinRequest, Room, Notification, RoomUser, RoomInvite });
        const handler = factory.create("join_room", request.user_id, request);
        handler.request = request;

        const { updatedReq, notification } = await handler.reject(req.user.id, req.body.reason);

        emitToUser(
            req.app.get("io"),
            request.user_id.toString(),
            "user:reject_join_request",
            { notification }
        );

        res.status(200).json({
            message: "Đã từ chối yêu cầu tham gia phòng",
            data: updatedReq
        });

    } catch (err) {
        const status = err.message.includes("Không tìm thấy") ? 404 : 400;
        res.status(status).json({ message: err.message });
    }
};

const roomService = new RoomService(Room, RoomUser, RoomInvite, Tag, TagRoom, JoinRequest, Poll);

export const transferLeader = async (req, res) => {
    try {
        const roomId = req.params.room_id;
        const { newLeaderId } = req.body;
        const currentLeaderId = req.user.id;

        const result = await roomService.transferLeader(roomId, currentLeaderId, newLeaderId);
        try {
            await Notification.create({
                user_id: newLeaderId,
                type: 'ROLE_UPDATE',
                title: 'Bạn đã trở thành leader',
                content: `Bạn vừa được chuyển quyền leader của phòng ${roomId}.`,
                metadata: {
                    roomId: roomId
                }
            });

            await Notification.create({
                user_id: currentLeaderId,
                type: 'ROLE_UPDATE',
                title: 'Đã chuyển quyền leader',
                content: `Bạn đã chuyển quyền leader của phòng ${roomId} cho người khác.`,
                metadata: {
                    roomId: roomId
                }
            });
        } catch (nerr) {
            console.error('Notification error:', nerr);
        }

        try {
            emitToUser(req.app.get('io'), newLeaderId, 'room:became_leader', { roomId });
            emitToUser(req.app.get('io'), currentLeaderId, 'room:lost_leader', { roomId });
        } catch (e) {
        }

        res.status(200).json({ message: 'Chuyển quyền leader thành công', result });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const createPoll = async (req, res) => {
    try {
        const roomId = req.params.id;
        const payload = req.body;
        const poll = await roomService.createPoll(roomId, req.user.id, payload);
        res.status(201).json({ message: 'Đã tạo bình chọn thành công', poll });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const listRoomPolls = async (req, res) => {
    try {
        const roomId = req.params.id;
        const { page, limit } = req.query;
        const result = await roomService.listPolls(roomId, { page, limit });
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const getPoll = async (req, res) => {
    try {
        const pollId = req.params.id;
        const poll = await roomService.getPollById(pollId);
        res.status(200).json({ poll });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const updatePoll = async (req, res) => {
    try {
        const pollId = req.params.id;
        const updated = await roomService.updatePoll(pollId, req.user.id, req.body);
        res.status(200).json({ message: 'Cập nhật bình chọn thành công', poll: updated });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const deletePoll = async (req, res) => {
    try {
        const pollId = req.params.id;
        await roomService.deletePoll(pollId, req.user.id);
        res.status(200).json({ message: 'Xóa bình chọn thành công', pollId });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const closePoll = async (req, res) => {
    try {
        const pollId = req.params.id;
        const poll = await roomService.closePoll(pollId, req.user.id);
        res.status(200).json({ message: 'Đã đóng bình chọn', poll });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const votePoll = async (req, res) => {
    try {
        const pollId = req.params.id;
        const { optionIndex } = req.body;
        const poll = await roomService.votePoll(pollId, req.user.id, optionIndex);
        res.status(200).json({ message: 'Bỏ phiếu thành công', poll });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes('Không tìm thấy') ? 404 : 400);
        res.status(status).json({ message: err.message });
    }
};

export const getMyRooms = async (req, res) => {
    try {
        const rooms = await roomService.getMyRooms(req.user.id);
        res.status(200).json({ rooms });
    } catch (err) {
        console.error(" Lỗi getMyRooms:", err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const createRoomInvite = async (req, res) => {
    try {
        const { room_id } = req.body;
        const invite = await roomService.createRoomInvite(room_id, req.user.id);

        res.status(201).json({
            message: "Tạo link mời thành công",
            invite_link: `${process.env.FRONTEND_URL}/invite/${invite.token}`,
            invite,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const kickUser = async (req, res) => {
    try {
        const { room_id, user_id } = req.body;
        const kickedUserId = await roomService.kickUser(req.user.id, room_id, user_id);
        res.json({ message: "Đã đuổi thành viên khỏi phòng", user_id: kickedUserId });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes("Không tìm thấy") || err.message.includes("Người này không phải") ? 404 :
            err.message.includes("Không thể tự đuổi") ? 400 : 500);
        return res.status(status).json({ message: err.message });
    }
};

export const leaveRoom = async (req, res) => {
    try {
        const { room_id } = req.body;
        const result = await roomService.leaveRoom(req.user.id, room_id);

        if (result.disbanded) {
            return res.json({ message: "Phòng đã bị giải tán" });
        }
        res.json({ message: "Bạn đã rời khỏi phòng thành công" });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes("Không tìm thấy") ? 404 :
            err.message.includes("Bạn không phải") || err.message.includes("Bạn không được rời") ? 400 : 500);
        return res.status(status).json({ message: err.message });
    }
};
export const updateRoomInfo = async (req, res) => {
    try {
        const room_id = req.params.id || req.body.room_id;
        const { room_name, description, tags, avatar } = req.body;
        if (!room_id) {
            return res.status(400).json({ message: "Thiếu room_id" });
        }
        const room = await roomService.updateRoomInfo(room_id, {
            room_name,
            description,
            tags,
            avatar
        });

        res.json({ message: "Cập nhật phòng thành công", room });
    } catch (err) {
        console.error(err);
        const status = (err.message.includes("Không tìm thấy") ? 404 : 500);
        res.status(status).json({ message: err.message });
    }
};


export const getAllRooms = async (req, res) => {
    try {
        const currentUserId = req.user ? req.user.id : null;
        const { rooms, totalPages, currentPage } = await roomService.getAllRooms(req.query, currentUserId);
        res.status(200).json({
            rooms,
            totalPages,
            currentPage
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const getJoinRequests = async (req, res) => {
    try {
        const roomId = req.query.room_id || req.params.room_id;
        const requests = await roomService.getJoinRequests(req.user.id, roomId);
        res.json({ requests });
    } catch (err) {
        const status = (err.message.includes("Bạn không có quyền") ? 403 : 500);
        res.status(status).json({ message: err.message });
    }
};

export const getRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const roomData = await roomService.getRoomDetails(id);

        res.status(200).json({
            message: "Lấy thông tin phòng thành công.",
            data: roomData,
        });
    } catch (error) {
        const status = (error.message.includes("Không tìm thấy") ? 404 : 500);
        res.status(status).json({ message: error.message });
    }
};


// export const joinRoomRequest = async (req, res) => {
//     try {
//         const request = await roomService.joinRoomRequest(req.user.id, req.body);
//         return res.status(201).json({
//             message: "Yêu cầu tham gia đã được gửi",
//             request,
//         });
//     } catch (err) {
//         console.error(err);
//         const status = (err.message.includes("Không tìm thấy") ? 404 :
//             err.message.includes("Cần có link mời") || err.message.includes("Link mời không hợp lệ") || err.message.includes("Bây giờ không thể") ? 403 :
//                 400);
//         return res.status(status).json({ message: err.message });
//     }
// };

// export const approveJoinRequest = async (req, res) => {
//     try {
//         const request = await roomService.approveJoinRequest(req.params.id);
//         res.json({ message: "Đã duyệt yêu cầu tham gia", request });
//     } catch (err) {
//         console.error(err);
//         const status = (err.message.includes("Không tìm thấy") || err.message.includes("Yêu cầu không tồn tại") ? 404 :
//             err.message.includes("Bây giờ không thể") ? 403 : 500);
//         return res.status(status).json({ message: err.message });
//     }
// };

// export const rejectJoinRequest = async (req, res) => {
//     try {
//         const { reason } = req.body;
//         const request = await roomService.rejectJoinRequest(req.params.id, reason);
//         res.json({ message: "Đã từ chối yêu cầu tham gia", request });
//     } catch (err) {
//         console.error(err);
//         const status = (err.message.includes("Không tìm thấy") || err.message.includes("Yêu cầu không tồn tại") ? 404 : 500);
//         return res.status(status).json({ message: err.message });
//     }
// };