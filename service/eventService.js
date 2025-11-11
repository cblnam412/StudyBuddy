import { Event, EventUser, RoomUser, Document } from "../models/index.js";

const MAX_TITLE = 100;
const MAX_DESCRIPTION = 3000;

export class EventService {
    constructor(eventModel, eventUserModel, roomUserModel, documentModel) {
        this.Event = eventModel;
        this.EventUser = eventUserModel;
        this.RoomUser = roomUserModel;
        this.Document = documentModel;
    }

    async createEvent(data, userId) {
        const { room_id, title, description, start_time, end_time, max_participants } = data;

        if (!room_id || !title || !start_time || !end_time || !description) {
            throw new Error("Thiếu thông tin cần thiết");
        }

        const start = new Date(start_time);
        const end = new Date(end_time);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error("Thời gian không hợp lệ");
        }

        if (end <= start) {
            throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
        }

        if (title.length > MAX_TITLE) {
            throw new Error(`Tên sự kiện không được dài quá ${MAX_TITLE} ký tự.`);
        }

        if (description.length > MAX_DESCRIPTION) {
            throw new Error(`Mô tả sự kiện không được dài quá ${MAX_DESCRIPTION} ký tự.`);
        }

        const existingEvent = await this.Event.findOne({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });

        if (existingEvent) {
            throw new Error("Đã có sự kiện cùng tên sắp hoặc đang diễn ra.");
        }

        const event = await this.Event.create({
            room_id,
            user_id: userId,
            title,
            description,
            start_time: start,
            end_time: end,
            max_participants: Number(max_participants),
        });

        await this.EventUser.create({
            event_id: event._id,
            user_id: userId,
        });

        return event;
    }

    async cancelEvent(eventId) {
        const event = await this.Event.findByIdAndUpdate(
            eventId,
            { status: "cancelled" },
            { new: true }
        );

        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }
        return event;
    }

    async updateEvent(eventId, updateData) {
        const event = await this.Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        if (event.status === "cancelled") {
            throw new Error("Không thể chỉnh sửa sự kiện đã bị huỷ");
        }

        if (updateData.start_time || updateData.end_time) {
            const start = new Date(updateData.start_time || event.start_time);
            const end = new Date(updateData.end_time || event.end_time);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error("Thời gian không hợp lệ");
            }

            if (end <= start) {
                throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
            }

            updateData.start_time = start;
            updateData.end_time = end;
        }

        if (updateData.title === "") {
            throw new Error("Không được để trống tiêu đề");
        }

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

        const updatedEvent = await this.Event.findByIdAndUpdate(eventId, filteredData, { new: true });
        return updatedEvent;
    }

    async registerEvent(data, userId) {
        const { room_id, event_id } = data;

        if (!room_id || !event_id) {
            throw new Error("Thiếu thông tin room_id hoặc event_id");
        }

        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id });
        if (!isMember) {
            throw new Error("Bạn không phải thành viên của phòng này");
        }

        const event = await this.Event.findById(event_id);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        if (Date.now() > new Date(event.start_time).getTime()) {
            throw new Error("Đã hết thời gian đăng ký");
        }

        if (event.status === "cancelled") {
            throw new Error("Sự kiện đã bị huỷ, không thể đăng ký");
        }

        const existing = await this.EventUser.findOne({ event_id, user_id: userId });
        if (existing) {
            throw new Error("Bạn đã đăng ký sự kiện này rồi");
        }

        if (event.max_participants > 0) {
            const count = await this.EventUser.countDocuments({ event_id });
            if (count >= event.max_participants) {
                throw new Error("Sự kiện đã đủ người tham gia");
            }
        }

        const record = await this.EventUser.create({
            event_id,
            user_id: userId,
        });

        return record;
    }

    async attendedEvent(eventId, userId) {
        const eventRegistration = await this.EventUser.findOne({
            event_id: eventId,
            user_id: userId,
        });

        if (!eventRegistration) {
            throw new Error("Bạn chưa đăng ký tham gia sự kiện này.");
        }

        if (eventRegistration.is_attended) {
            throw new Error("Bạn đã điểm danh tham gia sự kiện này rồi.");
        }

        eventRegistration.is_attended = true;
        eventRegistration.attended_at = new Date();
        await eventRegistration.save();

        return eventRegistration;
    }

    async markEventAsCompleted(eventId) {
        const event = await this.Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện.");
        }

        if (new Date(event.end_time) > new Date()) {
            throw new Error("Sự kiện chưa kết thúc, không thể đánh dấu hoàn thành.");
        }

        event.status = "completed";
        await event.save();

        return event;
    }

    async getEventReport(eventId, baseUrl) {
        const event = await this.Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện.");
        }
        if (event.status !== "completed") {
            throw new Error("Chỉ có thể tạo báo cáo cho sự kiện đã hoàn thành.");
        }

        const participants = await this.EventUser.find({ event_id: eventId })
            .populate("user_id", "full_name");

        const totalRegistered = participants.length;
        const attendedUsers = participants.filter(p => p.is_attended);
        const totalAttended = attendedUsers.length;
        const attendanceRate = totalRegistered > 0 ? ((totalAttended / totalRegistered) * 100).toFixed(2) : 0;

        const relatedDocuments = await this.Document.find({
            room_id: event.room_id,
            created_at: {
                $gte: event.start_time,
                $lte: event.end_time
            }
        }).select("file_name _id");

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

        return { reportContent, fileName };
    }
}