import mongoose from "mongoose";
import mammoth from 'mammoth';
import groq from '../config/groqClient.js';

const MAX_TITLE = 255;
const MAX_DESCRIPTION = 3000;
const MIN_PARTICIPANTS = 1;
const MAX_PARTICIPANTS = 100;
export class EventService {
    constructor(eventModel, eventUserModel, roomUserModel, documentModel, roomModel, messageModel, userModel) {
        this.Event = eventModel;
        this.EventUser = eventUserModel;
        this.RoomUser = roomUserModel;
        this.Document = documentModel;
        this.Room = roomModel;
        this.Message = messageModel;
        this.User = userModel;
    }

    async getEvent(eventId, userId) {
        if (!userId)
            throw new Error("Thiếu user id");

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

    async findEvents(filters = {}, options = {}, userId = null) {
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

        if (Number.isNaN(page) || Number.isNaN(limit))
            throw new Error("Số trang và giới hạn phải là số!");

        if (page < 1 || limit < 1)
            throw new Error ("Số trang và giới hạn phải lớn hơn hoặc bằng 1!");

        const events = await this.Event.find(query)
            .populate("user_id", "user_name avatar") 
            .populate("room_id", "room_name")
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Lấy thông tin đăng ký của user nếu có userId
        let userRegistrations = {};
        if (userId) {
            const registrations = await this.EventUser.find({
                event_id: { $in: events.map(e => e._id) },
                user_id: userId
            });
            userRegistrations = registrations.reduce((acc, reg) => {
                acc[reg.event_id.toString()] = reg;
                return acc;
            }, {});
        }

        // Thêm thông tin đăng ký vào mỗi event
        const enrichedEvents = events.map(event => {
            const eventObj = event.toObject ? event.toObject() : event;
            return {
                ...eventObj,
                isUserRegistered: !!userRegistrations[event._id.toString()]
            };
        });

        const totalEvents = await this.Event.countDocuments(query);
        const totalPages = Math.ceil(totalEvents / limit);
        return {
            data: enrichedEvents,
            pagination: {
                total: totalEvents,
                totalPages,
                currentPage: page,
                limit,
            },
        };
    }

    async unregisterEvent(data, userId) {
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

            if (!room_id || !title || !start_time || !end_time || !description || !max_participants) {
                throw new Error("Thiếu thông tin cần thiết.");
            }

            const room = await this.Room.findById(room_id);
            if (!room)
                throw new Error("Không tìm thấy phòng.");

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
1
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

        // TODO
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

        if (event.status === "upcoming")
            throw new Error("Sự kiện chưa diễn ra.");

        if (event.status === "completed")
            throw new Error("Sự kiện đã hoàn thành từ trước.");

        if (event.status === "cancelled")
            throw new Error("Sự kiện đã bị hủy từ trước.");

        event.status = "completed";
        await event.save();

        return event;
    }


    async isUserRegistered(eventId, userId) {
        if (!eventId || !userId) {
            throw new Error("Thiếu eventId hoặc userId");
        }

        const registration = await this.EventUser.findOne({
            event_id: eventId,
            user_id: userId
        });

        return !!registration;
    }

    async getParticipantCount(eventId) {
        if (!eventId) 
            throw new Error("Thiếu eventId.");

        const count = await this.EventUser.countDocuments({ 
            event_id: eventId,
            is_attended: true
        });

        return count;
    }

    async getEventAttendanceRate(eventId) {
        if (!eventId) 
            throw new Error("Thiếu eventId.");

        const totalRegistered = await this.EventUser.countDocuments({ event_id: eventId });

        const totalAttended = await this.EventUser.countDocuments({
            event_id: eventId,
            is_attended: true
        });

        const attendanceRate = totalRegistered === 0
            ? 0 : (totalAttended / totalRegistered) * 100;

        return {
            registered: totalRegistered,
            attended: totalAttended,
            rate: Number(attendanceRate.toFixed(2))
        };
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

    async getEventReport(eventId) {
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            throw new Error("ID sự kiện không hợp lệ");
        }

        const event = await this.Event.findById(eventId).populate('user_id', 'full_name email');
        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        const messageStats = await this.getMessageStatistics(eventId);
        
        const documentStats = await this.getDocumentStatistics(eventId);

        return {
            event: {
                id: event._id,
                title: event.title,
                description: event.description,
                creator: event.user_id,
                startDate: event.start_time,
                endDate: event.end_time,
                status: event.status,
                createdAt: event.createdAt
            },
            messages: messageStats,
            documents: documentStats,
            summary: {
                totalMessages: messageStats.count,
                totalDocuments: documentStats.count,
                uniqueMessageSenders: messageStats.uniqueSenders,
                totalDocumentSize: documentStats.totalSize
            }
        };
    }

    async getMessageStatistics(eventId) {
        const messages = await this.Message.find({
            event_id: eventId,
            status: 'sent'
        })
        .populate('user_id', 'full_name email avatarUrl')
        .sort({ created_at: 1 });

        const senderStats = {};
        messages.forEach(msg => {
            const userId = msg.user_id._id.toString();
            if (!senderStats[userId]) {
                senderStats[userId] = {
                    userId: msg.user_id._id,
                    userName: msg.user_id.full_name,
                    userEmail: msg.user_id.email,
                    userAvatar: msg.user_id.avatarUrl,
                    messageCount: 0
                };
            }
            senderStats[userId].messageCount++;
        });

        return {
            count: messages.length,
            uniqueSenders: Object.keys(senderStats).length,
            senderDetails: Object.values(senderStats),
            messages
        };
    }

    async getDocumentStatistics(eventId) {
        const documents = await this.Document.find({
            event_id: eventId,
            status: 'active'
        })
        .populate('uploader_id', 'full_name email avatarUrl')
        .sort({ created_at: -1 });

        let totalSize = 0;
        const uploaderStats = {};

        documents.forEach(doc => {
            totalSize += doc.file_size || 0;

            const userId = doc.uploader_id._id.toString();
            if (!uploaderStats[userId]) {
                uploaderStats[userId] = {
                    userId: doc.uploader_id._id,
                    userName: doc.uploader_id.full_name,
                    userEmail: doc.uploader_id.email,
                    userAvatar: doc.uploader_id.avatarUrl,
                    documentCount: 0,
                    totalSize: 0
                };
            }
            uploaderStats[userId].documentCount++;
            uploaderStats[userId].totalSize += doc.file_size || 0;
        });

        const fileTypeStats = {};
        documents.forEach(doc => {
            if (!fileTypeStats[doc.file_type]) {
                fileTypeStats[doc.file_type] = 0;
            }
            fileTypeStats[doc.file_type]++;
        });

        return {
            count: documents.length,
            totalSize,
            fileTypeBreakdown: fileTypeStats,
            uploaderDetails: Object.values(uploaderStats),
            documents: documents.map(doc => ({
                id: doc._id,
                fileName: doc.file_name,
                fileUrl: doc.file_url,
                fileSize: doc.file_size,
                fileType: doc.file_type,
                uploader: {
                    id: doc.uploader_id._id,
                    name: doc.uploader_id.full_name,
                    email: doc.uploader_id.email
                },
                downloadCount: doc.download_count || 0,
                uploadedAt: doc.created_at
            }))
        };
    }

    async getAllEventsReport(filters = {}) {
        const mongoQuery = {};
        
        if (filters.status) {
            mongoQuery.status = filters.status;
        }

        const events = await this.Event.find(mongoQuery)
            .populate('user_id', 'full_name email')
            .sort({ createdAt: -1 });

        if (!events || events.length === 0) {
            return { events: [], totalEvents: 0, report: [] };
        }

        const report = await Promise.all(
            events.map(async (event) => {
                const messageCount = await this.Message.countDocuments({
                    event_id: event._id,
                    status: 'sent'
                });

                const documentCount = await this.Document.countDocuments({
                    event_id: event._id,
                    status: 'active'
                });

                const documents = await this.Document.aggregate([
                    {
                        $match: {
                            event_id: event._id,
                            status: 'active'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalSize: { $sum: '$file_size' }
                        }
                    }
                ]);

                return {
                    eventId: event._id,
                    eventTitle: event.title,
                    creator: event.user_id.full_name,
                    status: event.status,
                    startDate: event.start_time,
                    endDate: event.end_time,
                    messageCount,
                    documentCount,
                    totalDocumentSize: documents.length > 0 ? documents[0].totalSize : 0
                };
            })
        );

        return {
            totalEvents: events.length,
            report
        };
    }

    async exportEventReport(eventId) {
        const fullReport = await this.getEventReport(eventId);
        
        return {
            ...fullReport,
            exportDate: new Date(),
            exportFormat: 'json'
        };
    }
}

