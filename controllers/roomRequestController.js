import { RoomRequest, Room, Tag, Notification } from "../models/index.js";

export const createRoomRequest = async (req, res) => {
    try {
        const { room_name, description, tags, reason } = req.body;

        const validTags = await Tag.find({ tagName: { $in: tags } });
        if (validTags.length !== tags.length) {
            return res.status(400).json({
                message: "Một số tag không hợp lệ!",
            });
        }
        console.log("req.user:", req.user);


        const newRequest = await RoomRequest.create({
            requester_id: req.user.id,
            room_name,
            description,
            tags,
            reason,
        });

        res.status(201).json({ message: "Yêu cầu tạo phòng đã được gửi", data: newRequest });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi gửi yêu cầu", error: err.message });
    }
};

export const rejectRoomRequest = async (req, res) => {
    try {
        const { reason } = req.body;
        const request = await RoomRequest.findById(req.params.id);
        if (!request || request.status !== "pending")
            return res.status(404).json({ message: "Không tìm thấy yêu cầu" });

        request.status = "rejected";
        request.approver_id = req.user._id;
        request.reason = reason || request.reason;
        await request.save();

        await Notification.create({
            user_id: request.requester_id,
            title: "Yêu cầu tạo phòng bị từ chối",
            content: `Phòng "${request.room_name}" đã bị từ chối. Lý do: ${reason || "Không rõ"}`,
        });

        res.json({ message: "Đã từ chối yêu cầu" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi từ chối yêu cầu", error: err.message });
    }
};