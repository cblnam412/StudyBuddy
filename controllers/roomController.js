import { JoinRequest, Room, RoomInvite, RoomUser, TagRoom, Tag} from "../models/index.js";
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

        const existingRequest = await JoinRequest.findOne({
            user_id: userId,
            room_id,
            expires_at: { $gt: new Date() },
        });
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

export const approveJoinRequest = async (req, res) => {
    try {
        const request = await JoinRequest.findById(req.params.id);

        if (!request || request.status !== "pending") {
            return res.status(404).json({ message: "Yêu cầu không tồn tại hoặc đã được xử lý" });
        }

        const room = await Room.findById(request.room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        await RoomUser.create({
            room_id: room._id,
            user_id: request.user_id,
        });

        request.status = "approved";
        await request.save();

        res.json({ message: "Đã duyệt yêu cầu tham gia", request });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const rejectJoinRequest = async (req, res) => {
    try {
        const request = await JoinRequest.findById(req.params.id);
        const { reason } = req.body;

        if (!request || request.status !== "pending") {
            return res.status(404).json({ message: "Yêu cầu không tồn tại hoặc đã được xử lý" });
        }

        const room = await Room.findById(request.room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        request.status = "rejected";
        request.reject_reason = reason || null;
        await request.save();

        res.json({ message: "Đã từ chối yêu cầu tham gia", request });
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

export const kickUser = async (req, res) => {
    try {
        const leaderId = req.user.id;
        const { room_id, user_id } = req.body;

        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        if (leaderId === user_id) {
            return res.status(400).json({ message: "Không thể tự đuổi bản thân" });
        }

        const member = await RoomUser.findOne({ room_id, user_id });
        if (!member) {
            return res.status(404).json({ message: "Người này không phải thành viên của phòng" });
        }

        await RoomUser.deleteOne({ _id: member._id });

        res.json({ message: "Đã đuổi thành viên khỏi phòng", user_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const leaveRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { room_id } = req.body;

        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }

        const member = await RoomUser.findOne({ room_id, user_id: userId });
        if (!member) {
            return res.status(400).json({ message: "Bạn không phải là thành viên của phòng này" });
        }

        if (member.room_role === "leader") {
            const anotherMember = await RoomUser.findOne({ room_id, user_id: { $ne: userId } });
            if (anotherMember) {
                return res.status(400).json({ message: "Bạn không được rời phòng khi còn thành viên." });
            } else {
                await Room.deleteOne({ _id: room_id });
                await RoomUser.deleteMany({ room_id });
                await TagRoom.deleteMany({ room_id });
                return res.json({ message: "Phòng đã bị giải tán" });
            }
        }

        await RoomUser.deleteOne({ _id: member._id });

        res.json({ message: "Bạn đã rời khỏi phòng thành công" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const updateRoomInfo = async (req, res) => {
    try {
        const { room_id, room_name, description, tags } = req.body;

        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng." });
        }

        if (room_name) room.room_name = room_name;
        if (description) room.description = description;

        if (tags && Array.isArray(tags)) {
            // Xóa toàn bộ tag cũ của phòng
            await TagRoom.deleteMany({ room_id });
            // Lấy danh sách tag hợp lệ
            const validTags = await Tag.find({ _id: { $in: tags } });
            // Thêm lại toàn bộ tag mới
            const newTagRooms = validTags.map(tag => ({
                room_id,
                tag_id: tag._id
            }));

            if (newTagRooms.length > 0) {
                await TagRoom.insertMany(newTagRooms);
            }
        }

        await room.save();
        res.json({ message: "Cập nhật phòng thành công", room });

    } catch (err) {
        res.status(500).json({ message: "Lỗi server", err: err.message });
    }
};