import { JoinRequest, Room, RoomInvite, RoomUser} from "../models/index.js";
import crypto from "crypto";

export const joinRoomRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { room_id, message, invite_token } = req.body;

        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        const isMember = await RoomUser.findOne({ user_id: userId, room_id });
        if (isMember) {
            return res.status(400).json({ message: "Bạn đã là thành viên của phòng này" });
        }

        if (room.status === "safe-mode") {
            return res.status(403).json({ message: "Bây giờ không thể tham gia nhóm" });
        }

        const existingRequest = await JoinRequest.findOne({ user_id: userId, room_id });
        if (existingRequest) {
            if (existingRequest.status === "pending") {
                return res.status(400).json({ message: "Bạn đã gửi yêu cầu tham gia và đang chờ duyệt" });
            }
            if (existingRequest.status === "approved") {
                return res.status(400).json({ message: "Bạn đã là thành viên của phòng này" });
            }
        }

        if (room.status === "private") {
            if (!invite_token) {
                return res.status(403).json({ message: "Cần có link mời để tham gia phòng private" });
            }
            const invite = await RoomInvite.findOneAndUpdate(
                {
                    room_id,
                    token: invite_token,
                    expires_at: { $gt: new Date() },
                    uses: 0,
                },
                { $inc: { uses: 1 } }, 
                { new: true }
            );

            if (!invite) {
                return res.status(403).json({ message: "Link mời không hợp lệ, đã hết hạn hoặc đã được dùng" });
            }
        }


        const newRequest = await JoinRequest.create({
            user_id: userId,
            room_id,
            message: message || null,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 
        });

        return res.status(201).json({
            message: "Yêu cầu tham gia đã được gửi",
            request: newRequest,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const createRoomInvite = async (req, res) => {
    try {
        const { room_id } = req.body;
        const token = crypto.randomBytes(12).toString("hex");

        const invite = await RoomInvite.create({
            room_id,
            token,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            created_by: req.user.id,
        });

        res.status(201).json({
            message: "Tạo link mời thành công",
            invite_link: `${process.env.FRONTEND_URL}/invite/${token}`,
            invite,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};