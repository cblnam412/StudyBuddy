import { JoinRequest, Room} from "../models/index.js";

export const joinRoomRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { room_id, message } = req.body;

        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        if (room.status === "private") {
            if (!req.body.invite_token) {
                return res.status(403).json({ message: "Cần có link mời để tham gia phòng private" });
            }
            //Xử lí sau
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
