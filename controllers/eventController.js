import { Event, EventUser, RoomUser, Document} from "../models/index.js";

export const createEvent = async (req, res) => {
    try {
        const { room_id, title, description, start_time, end_time, max_participants } = req.body;

        if (!room_id || !title || !start_time || !end_time || !description) {
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

        const MAX_TITLE = 100, MAX_DESCRIPTION = 3000;

        if (title.length > MAX_TITLE) {
            return res.status(400).json({ message: `Tên sự kiện không được dài quá ${MAX_TITLE} ký tự.` });
        }

        if (description.length > MAX_DESCRIPTION) {
            return res.status(400).json({ message: `Mô tả sự kiện không được dài quá ${MAX_DESCRIPTION} ký tự.` });
        }

        const existingEvent = await Event.findOne({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });

        if (existingEvent) {
            return res.status(409).json({ message: "Đã có sự kiện cùng tên sắp hoặc đang diễn ra." });
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

export const attendedEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;

        const eventRegistration = await EventUser.findOne({
            event_id: eventId,
            user_id: userId,
        });

        if (!eventRegistration) {
            return res.status(404).json({ message: "Bạn chưa đăng ký tham gia sự kiện này." });
        }

        if (eventRegistration.is_attended) {
            return res.status(400).json({ message: "Bạn đã điểm danh tham gia sự kiện này rồi." });
        }

        eventRegistration.is_attended = true;
        eventRegistration.attended_at = new Date(); 
        await eventRegistration.save();

        return res.status(200).json({ message: "Điểm danh thành công!", data: eventRegistration, });

    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error.message, });
    }
};

export const markEventAsCompleted = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện." });
        }

        if (new Date(event.end_time) > new Date()) {
            return res.status(400).json({ message: "Sự kiện chưa kết thúc, không thể đánh dấu hoàn thành." });
        }

        event.status = "completed";
        await event.save();

        return res.status(200).json({
            message: "Đánh dấu sự kiện hoàn thành thành công.",
            event,
        });

    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};


export const getEventReport = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Không tìm thấy sự kiện." });
        }
        if (event.status !== "completed") {
            return res.status(400).json({ message: "Chỉ có thể tạo báo cáo cho sự kiện đã hoàn thành." });
        }

        const participants = await EventUser.find({ event_id: eventId })
            .populate("user_id", "full_name");

        const totalRegistered = participants.length;
        const attendedUsers = participants.filter(p => p.is_attended);
        const totalAttended = attendedUsers.length;
        const attendanceRate = totalRegistered > 0 ? ((totalAttended / totalRegistered) * 100).toFixed(2) : 0;

        const relatedDocuments = await Document.find({
            room_id: event.room_id,
            created_at: {
                $gte: event.start_time,
                $lte: event.end_time
            }
        }).select("file_name _id"); 

        const baseUrl = `${req.protocol}://${req.get('host')}`; 

        const documentLinks = relatedDocuments.map(doc =>
            `- ${doc.file_name}: ${baseUrl}/document/${doc._id}/download`
        ).join('\n');

        const reportContent = `
BÁO CÁO TỔNG KẾT SỰ KIỆN
---------------------------------
- Tên sự kiện: ${event.title}
- Thời gian: ${new Date(event.start_time).toLocaleString('vi-VN')} - ${new Date(event.end_time).toLocaleString('vi-VN')}
- Mô tả: ${event.description || "Không có mô tả"}
---------------------------------
THỐNG KÊ THAM GIA
- Số người đăng ký: ${totalRegistered}
- Số người tham gia: ${totalAttended}
- Tỷ lệ tham gia: ${attendanceRate}%
---------------------------------
DANH SÁCH THAM GIA
${attendedUsers.map((p, index) => `${index + 1}. ${p.user_id.full_name}`).join('\n') || "Không có ai tham gia."}
---------------------------------
TÀI LIỆU LIÊN QUAN 
${documentLinks || "Không có tài liệu nào được chia sẻ trong thời gian này."}
        `.trim();

        const safeFileName = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `bao_cao_${safeFileName}_${event._id}.txt`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        res.send(reportContent);

    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};
