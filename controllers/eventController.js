import { Event, EventUser } from "../models/index.js";

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
