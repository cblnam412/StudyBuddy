import mongoose from "mongoose";
import mammoth from 'mammoth';
import groq from '../config/groqClient.js';

const MAX_TITLE = 255;
const MAX_DESCRIPTION = 3000;
const MIN_PARTICIPANTS = 1;
const MAX_PARTICIPANTS = 100;
export class EventService {
    constructor(eventModel, eventUserModel, roomUserModel, documentModel) {
        this.Event = eventModel;
        this.EventUser = eventUserModel;
        this.RoomUser = roomUserModel;
        this.Document = documentModel;
    }

    async getEvent(eventId, userId) {
        const event = await this.Event.findById(eventId)
            .populate("user_id", "full_name") 


        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        const participants = await this.EventUser.find({ event_id: eventId })
            .populate("user_id", "full_name");

        //console.log(participants);

        const totalRegistered = participants.length;
        const totalAttended = participants.filter(p => p.is_attended).length;

        const userRegistration = participants.find(
            (p) => p.user_id._id === userId
        );
        //console.log(event);


        const isRegistered = !!userRegistration;
        const isAttended = userRegistration ? userRegistration.is_attended : false;
        const isHost = event.user_id;


        return {
            ...event.toObject(), 
            creator: event.user_id, 
            participants, 
            stats: {
                totalRegistered,
                totalAttended,
                maxParticipants: event.max_participants,
            },
            userStatus: { 
                isRegistered,
                isAttended,
                isHost,
            },
        };
    }

    async findEvents(filters = {}, options = {}) {
        const query = {};
        const { room_id, status, created_by, registered_by } = filters;

        if (room_id) {
            query.room_id = room_id;
        }
        if (status) {
            if (Array.isArray(status)) {
                query.status = { $in: status };
            } else if (typeof status === 'string' && status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }
        if (created_by) { 
            query.user_id = created_by;
        }

        if (registered_by) {
            const userRegistrations = await this.EventUser.find({ user_id: registered_by }).select("event_id");
            const eventIds = userRegistrations.map(r => r.event_id);

            query._id = { $in: eventIds };
        }

        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 20;
        const skip = (page - 1) * limit;
        const sort = options.sort || { start_time: 1 }; 

        const events = await this.Event.find(query)
            .populate("user_id", "user_name avatar") 
            .populate("room_id", "room_name")
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const totalEvents = await this.Event.countDocuments(query);
        const totalPages = Math.ceil(totalEvents / limit);

        return {
            data: events,
            pagination: {
                total: totalEvents,
                totalPages,
                currentPage: page,
                limit,
            },
        };
    }

    // Thêm vào trong class EventService

    async unregisterEvent(data, userId) {
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
        if (event.status === "cancelled" || event.status === "completed") {
            throw new Error("Sự kiện đã bị huỷ hoặc đã kết thúc, không thể huỷ đăng ký");
        }

        if (event.user_id.toString() === userId.toString()) {
            throw new Error("Chủ sự kiện không thể huỷ đăng ký");
        }
        const existing = await this.EventUser.findOne({ event_id, user_id: userId });
        if (!existing) {
            throw new Error("Bạn chưa đăng ký sự kiện này");
        }
        if (existing.is_attended) {
            throw new Error("Bạn đã điểm danh tham gia, không thể huỷ đăng ký");
        }

        await this.EventUser.deleteOne({ _id: existing._id });
        return true; 
    }

    async createEvent(data, userId) {
        try {
            const { room_id, title, description, start_time, end_time, max_participants } = data;

            if (!room_id || !title || !start_time || !end_time || !description) {
                throw new Error("Thiếu thông tin cần thiết");
            }

            if (title.trim().length === 0) {
                throw new Error("Tên sự kiện không được để trống.");
            }
            if (title.length > MAX_TITLE) {
                throw new Error(`Tên sự kiện không được dài quá ${MAX_TITLE} ký tự.`);
            }

            if (description.length > MAX_DESCRIPTION) {
                throw new Error(`Mô tả sự kiện không được dài quá ${MAX_DESCRIPTION} ký tự.`);
            }

            const start = new Date(start_time);
            const end = new Date(end_time);
            const now = new Date();

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw new Error("Thời gian bắt đầu hoặc kết thúc không hợp lệ.");
            }

            if (start <= now) {
                throw new Error("Thời gian bắt đầu phải ở tương lai.");
            }

            if (end <= start) {
                throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
            }

            const participants = Number(max_participants);
            if (isNaN(participants) || participants < MIN_PARTICIPANTS || participants > MAX_PARTICIPANTS) {
                throw new Error(`Số lượng thành viên phải là một số trong khoảng ${MIN_PARTICIPANTS} đến ${MAX_PARTICIPANTS}.`);
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
                max_participants: participants,
            });

            await this.EventUser.create({
                event_id: event._id,
                user_id: userId,
            });

            return event;
        } catch (error) {
            throw error;
        }
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

        if (updateData.max_participants<=0) {
            throw new Error ("Giới hạn tối thiểu là 1 người tham gia");
        }
        if (updateData.max_participants > 0) { 
            const currentParticipants = await this.EventUser.countDocuments({ event_id: eventId });
            if (Number(updateData.max_participants) < currentParticipants) {
                throw new Error(`Không thể đặt giới hạn ${updateData.max_participants}, vì đã có ${currentParticipants} người đăng ký.`);
            }
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
            throw new Error("Thiếu thông tin phòng hoặc sự kiện");
        }

        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id });
        if (!isMember) {
            throw new Error("Bạn không phải thành viên của phòng này");
        }

        const event = await this.Event.findById(event_id);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        if (event.status === "cancelled" || event.status === "completed") {
            throw new Error("Sự kiện đã bị huỷ hoặc đã kết thúc, không thể đăng ký");
        }

        const existing = await this.EventUser.findOne({ event_id, user_id: userId });
        if (existing) {
            throw new Error("Bạn đã đăng ký sự kiện này rồi");
        }

        const session = await mongoose.startSession();
        let record;

        try {
            await session.withTransaction(async () => {
                if (event.max_participants > 0) {
                    const count = await this.EventUser.countDocuments({ event_id }, { session });

                    if (count >= event.max_participants) {
                        throw new Error("Sự kiện đã đủ người tham gia");
                    }
                }

                const createdRecords = await this.EventUser.create(
                    [{ event_id, user_id: userId }],
                    { session }
                );
                record = createdRecords[0];
            });

            return record;

        } catch (error) {
            throw error;
        } finally {
            session.endSession();
        }
    }

    async attendedEvent(eventId, userId) {
        const event = await this.Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện.");
        }

        //Đang suy nghĩ xem xử lí như nào thì hợp lí. Có vẻ là phải thêm chạy ngầm để tự động đổi từ upcoming -> ogging
        if (event.status === "upcoming") {
            throw new Error("Sự kiện chưa bắt đầu, không thể điểm danh.");
        }
        if (event.status === "completed") {
                    throw new Error("Sự kiện đã kết thúc.")
                }
        if (event.status === "cancelled") {
            throw new Error("Sự kiện đã bị hủy.");
        }

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

        const session = await mongoose.startSession(); 
        try {
            await session.withTransaction(async () => {
                eventRegistration.is_attended = true;
                eventRegistration.attended_at = new Date();
                await eventRegistration.save({ session });

                /*const pointsToAdd = 2;
                await this.User.findByIdAndUpdate(
                    userId,
                    { $inc: { reputation_score: pointsToAdd } },
                    { session }
                );

                await this.ReputationLog.create(
                    [{
                        user_id: userId,
                        points_change: pointsToAdd,
                        reason: `Tham gia sự kiện: ${event.title}`,
                    }],
                    { session }
                );*/
            });

            return eventRegistration; 

        } catch (error) {
            throw new Error(`Điểm danh thất bại: ${error.message}`);
        } finally {
            session.endSession();
        }
    }

    async markEventAsCompleted(eventId) {
        const event = await this.Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện.");
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

    // hàm tính điểm reputation từ việc tham gia sự kiện
    // async updateReputationFromEvent(userId) {

    //     // Lấy toàn bộ sự kiện mà user tham gia
    //     const attendedEvents = await EventUser.find({
    //         user_id: userId,
    //         is_attended: true
    //     });

    //     let totalScore = 0;

    //     // Lặp qua từng eventUser
    //     for (const eu of attendedEvents) {
    //         const event = await Event.findById(eu.event_id);
    //         if (!event) continue;

    //         totalScore += 1;
    //         // Nếu user là người tạo event (leader)
    //         if (String(event.user_id) === String(userId)) {
    //             totalScore += 3;
    //         }
    //     }

    //     if(totalScore > 30) totalScore = 30;

    //     const updatedUser = await User.findByIdAndUpdate(
    //         userId,
    //         { $inc: { reputation_score: totalScore } },
    //         { new: true }
    //     );

    //     return updatedUser;
    // }
}

