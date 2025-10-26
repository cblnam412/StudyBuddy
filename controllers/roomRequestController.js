import { RoomRequest, Room, Tag, Notification, TagRoom, RoomUser } from "../models/index.js";
import { emitToUser } from "../socket/onlineUser.js";

export const createRoomRequest = async (req, res) => {
    try {
        const { room_name, description, tags, reason, room_status } = req.body;

        if (!room_name || !room_status) {
            return res.status(400).json({ message: "Chưa nhập tên phòng hoặc trạng thái phòng" });
        }

        const validTags = await Tag.find({ _id: { $in: tags } });
        if (validTags.length !== tags.length) {
            return res.status(400).json({
                message: "Một số tag không hợp lệ!",
            });
        }


        const newRequest = await RoomRequest.create({
            requester_id: req.user.id,
            room_name,
            description,
            tags,
            reason,
            room_status,
        });

        res.status(201).json({ message: "Yêu cầu tạo phòng đã được gửi", data: newRequest });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi gửi yêu cầu", error: err.message });
    }
};

// Cần có phương án xử lí khi quản trị viên xóa tags trong khi có yêu cầu chưa được duyệt vẫn tồn tại tags
// Cách xử lí hiện tại sẽ không cho phê duyệt những yêu cầu có tags đã bị xóa
export const approveRoomRequest = async (req, res) => {
    try {
        const request = await RoomRequest.findById(req.params.id);
        if (!request || request.status !== "pending")
            return res.status(404).json({ message: "Không tìm thấy yêu cầu" });

        const validTags = await Tag.find({ _id: { $in: request.tags } });
        if (validTags.length !== request.tags.length) {
            return res.status(400).json({ message: "Một số tag không hợp lệ." });
        }

        const room = await Room.create({
            room_name: request.room_name,
            description: request.description,
            status: request.room_status,
        });

        const leader = await RoomUser.create({
            room_id: room._id,
            user_id: request.requester_id,
            room_role: "leader"
        });

        const roomTags = request.tags.map((tagId) => ({
            room_id: room._id,
            tag_id: tagId,
        }));
        await TagRoom.insertMany(roomTags);

        request.status = "approved";
        request.approver_id = req.user._id;
        await request.save();

        const notification = await Notification.create({
            user_id: request.requester_id,
            title: "Yêu cầu tạo phòng được thông qua",
            content: `Phòng "${request.room_name}" đã được tạo`,
        });

        emitToUser(req.app.get("io"), request.requester_id.toString(), "user:approve_room_quest", {
            notification,
        });

        res.json({ message: "Đã thông qua yêu cầu tạo phòng" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
}

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

        const notification = await Notification.create({
            user_id: request.requester_id,
            title: "Yêu cầu tạo phòng bị từ chối",
            content: `Phòng "${request.room_name}" đã bị từ chối. Lý do: ${reason || "Không rõ"}`,
        });

        emitToUser(req.app.get("io"), request.requester_id.toString(), "user:reject_room_quest", {
            notification,
        });

        res.json({ message: "Đã từ chối yêu cầu" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi từ chối yêu cầu", error: err.message });
    }
};
