import { Event, EventUser, RoomUser} from "../models/index.js";

export const createEvent = async (req, res) => {
    try {
        const { room_id, title, description, start_time, end_time, max_participants } = req.body;

        if (!room_id || !title || !start_time || !end_time) {
            return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
        }

        const start = new Date(start_time);
        const end = new Date(end_time);
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ message: "Thời gian không hợp lệ" });
        }

        if (end <= start) {
            return res.status(400).json({ message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
        }

        const event = await Event.create({
            room_id,
            user_id: req.user.id,
            title,
            description,
            start_time: start,
            end_time: end,
            max_participants: Number(max_participants),
        });

        await EventUser.create({
            event_id: event._id,
            user_id: req.user.id,
        });

        return res.status(201).json({ message: "Tạo sự kiện thành công", event });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi tạo sự kiện", error: error.message });
    }
};

export const cancelEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findByIdAndUpdate(
            id,
            { status: "cancelled" },
            { new: true }
        );

        if (!event) return res.status(404).json({ message: "Không tìm thấy sự kiện" });

        return res.status(200).json({ message: "Sự kiện đã được huỷ", event });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi khi huỷ sự kiện", error: error.message });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện" });
        }

        if (event.status === "cancelled") {
            return res.status(400).json({ message: "Không thể chỉnh sửa sự kiện đã bị huỷ" });
        }

        if (updateData.start_time || updateData.end_time) {
            const start = new Date(updateData.start_time || event.start_time);
            const end = new Date(updateData.end_time || event.end_time);

            if (isNaN(start) || isNaN(end)) {
                return res.status(400).json({ message: "Thời gian không hợp lệ" });
            }

            if (end <= start) {
                return res.status(400).json({ message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
            }

            updateData.start_time = start;
            updateData.end_time = end;
        }

        if (updateData.title === "")
            return res.status(400).json({ message: "Không được để trống tiêu đề" });

        const allowedFields = [
            "title",
            "description",
            "start_time",
            "end_time",
            "max_participants",
        ];
        const filteredData = Object.fromEntries(
            Object.entries(updateData).filter(([key]) => allowedFields.includes(key))
        );

        await Event.findByIdAndUpdate(id, filteredData, { new: true });

        return res.status(200).json({
            message: "Cập nhật sự kiện thành công",
        });
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật sự kiện:", error);
        return res.status(500).json({
            message: "Lỗi khi cập nhật sự kiện",
            error: error.message,
        });
    }
};

export const registerEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { room_id, event_id } = req.body;

        if (!room_id || !event_id) {
            return res.status(400).json({ message: "Thông tin" });
        }

        const isMember = await RoomUser.findOne({ user_id: userId, room_id });
        if (!isMember) {
            return res.status(403).json({ message: "Bạn không phải thành viên của phòng này" });
        }

        const event = await Event.findById(event_id);
        if (!event) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện" });
        }

        if (Date.now() > new Date(event.start_time).getTime()) {
            return res.status(400).json({ message: "Đã hết thời gian đăng ký" });
        }

        if (event.status === "cancelled") {
            return res.status(400).json({ message: "Sự kiện đã bị huỷ, không thể đăng ký" });
        }

        const existing = await EventUser.findOne({ event_id, user_id: userId });
        if (existing) {
            return res.status(400).json({ message: "Bạn đã đăng ký sự kiện này rồi" });
        }

        if (event.max_participants > 0) {
            const count = await EventUser.countDocuments({ event_id });
            if (count >= event.max_participants) {
                return res.status(400).json({ message: "Sự kiện đã đủ người tham gia" });
            }
        }

        const record = await EventUser.create({
            event_id,
            user_id: userId,
        });

        return res.status(201).json({
            message: "Đăng ký tham gia thành công",
            record,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi đăng ký sự kiện",
            error: error.message,
        });
    }
};
