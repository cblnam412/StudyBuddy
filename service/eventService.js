import mongoose from "mongoose";
import mammoth from 'mammoth';
import groq from '../config/groqClient.js';
import { StreamClient } from "@stream-io/node-sdk";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, BorderStyle, HeadingLevel, TextRun, AlignmentType } from "docx";
import fs from 'fs';
import path from 'path';

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
        
        // Initialize Stream Client
        this.streamClient = new StreamClient(
            process.env.STREAM_API_KEY,
            process.env.STREAM_SECRET_KEY
        );
    }

    async getEvent(eventId, userId) {
        if (!userId)
            throw new Error("Thiếu user id");

        const event = await this.Event.findById(eventId)
            .populate("user_id", "full_name avatarUrl") 


        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        const participants = await this.EventUser.find({ event_id: eventId })
            .populate("user_id", "full_name avatarUrl");

        //console.log(participants);

        const totalRegistered = participants.length;
        const totalAttended = participants.filter(p => p.is_attended).length;

        const userRegistration = participants.find(
            (p) => p.user_id._id.toString() === userId.toString()
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
        event.end_time = new Date();
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

        const participantStats = await this.getParticipantStatistics(eventId);
        const messageStats = await this.getMessageStatistics(eventId);
        const documentStats = await this.getDocumentStatistics(eventId);
        const examStats = await this.getExamStatistics(eventId);
        
        const duration = (event.end_time - event.start_time) / (1000 * 60); 

        const attendanceRate = participantStats.totalRegistered === 0 
            ? 0 
            : ((participantStats.totalAttended / participantStats.totalRegistered) * 100).toFixed(2);

        const totalInteractions = messageStats.count + documentStats.count + examStats.count;
        const engagementScore = participantStats.totalAttended === 0 
            ? 0 
            : (totalInteractions / participantStats.totalAttended).toFixed(2);

        return {
            event: {
                id: event._id,
                title: event.title,
                description: event.description,
                creator: event.user_id,
                startDate: event.start_time,
                endDate: event.end_time,
                status: event.status,
                createdAt: event.createdAt,
                maxParticipants: event.max_participants
            },
            participants: participantStats,
            timeline: {
                eventDuration: `${duration} phút`,
                createdAt: event.createdAt
            },
            messages: messageStats,
            documents: documentStats,
            exams: examStats,
            performance: {
                attendanceRate: `${attendanceRate}%`,
                engagementScore: parseFloat(engagementScore),
                successIndicator: attendanceRate >= 70 ? "Cao" : attendanceRate >= 50 ? "Trung bình" : "Thấp"
            },
            summary: {
                totalMessages: messageStats.count,
                totalDocuments: documentStats.count,
                totalExams: examStats.count,
                uniqueMessageSenders: messageStats.uniqueSenders,
                totalDocumentSize: documentStats.totalSize,
                totalParticipants: participantStats.totalRegistered,
                totalAttended: participantStats.totalAttended
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

    async getParticipantStatistics(eventId) {
        const participants = await this.EventUser.find({ event_id: eventId })
            .populate('user_id', 'full_name email avatarUrl');

        const totalRegistered = participants.length;
        const totalAttended = participants.filter(p => p.is_attended).length;

        return {
            totalRegistered,
            totalAttended,
            noShows: totalRegistered - totalAttended,
            participantDetails: participants.map(p => ({
                userId: p.user_id._id,
                userName: p.user_id.full_name,
                userEmail: p.user_id.email,
                userAvatar: p.user_id.avatarUrl,
                registered_at: p.createdAt,
                attended_at: p.attended_at,
                is_attended: p.is_attended
            }))
        };
    }

    async getExamStatistics(eventId) {
        const exams = await this.Exam.find({
            event_id: eventId,
            status: 'active'
        })
        .populate('creator_id', 'full_name email avatarUrl')
        .sort({ created_at: -1 });

        let totalQuestions = 0;
        const creatorStats = {};

        exams.forEach(exam => {
            totalQuestions += exam.questions?.length || 0;

            const creatorId = exam.creator_id._id.toString();
            if (!creatorStats[creatorId]) {
                creatorStats[creatorId] = {
                    creatorId: exam.creator_id._id,
                    creatorName: exam.creator_id.full_name,
                    creatorEmail: exam.creator_id.email,
                    creatorAvatar: exam.creator_id.avatarUrl,
                    examCount: 0,
                    totalQuestions: 0
                };
            }
            creatorStats[creatorId].examCount++;
            creatorStats[creatorId].totalQuestions += exam.questions?.length || 0;
        });

        return {
            count: exams.length,
            totalQuestions,
            creatorDetails: Object.values(creatorStats),
            exams: exams.map(exam => ({
                id: exam._id,
                title: exam.title,
                description: exam.description,
                questionsCount: exam.questions?.length || 0,
                duration: exam.duration,
                creator: {
                    id: exam.creator_id._id,
                    name: exam.creator_id.full_name,
                    email: exam.creator_id.email
                },
                createdAt: exam.created_at
            }))
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

    async exportEventReportAsDocx(eventId, outputPath = null) {
        const report = await this.getEventReport(eventId);

        // Tạo các section cho document
        const sections = [];

        // === PHẦN 1: TIÊU ĐỀ ===
        sections.push(
            new Paragraph({
                text: `BÁO CÁO SỰ KIỆN: ${report.event.title}`,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            })
        );

        // === PHẦN 2: THÔNG TIN SỰ KIỆN ===
        sections.push(
            new Paragraph({
                text: "I. THÔNG TIN SỰ KIỆN",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Tiêu đề")], width: { size: 30, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph(report.event.title)] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Mô tả")] }),
                            new TableCell({ children: [new Paragraph(report.event.description || "N/A")] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Người tạo")] }),
                            new TableCell({ children: [new Paragraph(report.event.creator?.full_name || "N/A")] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Ngày bắt đầu")] }),
                            new TableCell({ children: [new Paragraph(new Date(report.event.startDate).toLocaleString('vi-VN'))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Ngày kết thúc")] }),
                            new TableCell({ children: [new Paragraph(new Date(report.event.endDate).toLocaleString('vi-VN'))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Trạng thái")] }),
                            new TableCell({ children: [new Paragraph(report.event.status)] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Số người tối đa")] }),
                            new TableCell({ children: [new Paragraph(String(report.event.maxParticipants))] })
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 3: THỐNG KÊ NGƯỜI THAM GIA ===
        sections.push(
            new Paragraph({
                text: "II. THỐNG KÊ NGƯỜI THAM GIA",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng đăng ký", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.participants.totalRegistered))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng tham dự", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.participants.totalAttended))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Không tham dự", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.participants.noShows))] })
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 4: THÔNG TIN THỜI GIAN ===
        sections.push(
            new Paragraph({
                text: "III. THỐNG KÊ THỜI GIAN",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Thời lượng sự kiện")] }),
                            new TableCell({ children: [new Paragraph(report.timeline.eventDuration)] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Tạo vào")] }),
                            new TableCell({ children: [new Paragraph(new Date(report.timeline.createdAt).toLocaleString('vi-VN'))] })
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 5: THỐNG KÊ TIN NHẮN ===
        sections.push(
            new Paragraph({
                text: "IV. THỐNG KÊ TIN NHẮN",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng tin nhắn", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.messages.count))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Người gửi duy nhất", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.messages.uniqueSenders))] })
                        ]
                    })
                ]
            }),
            new Paragraph({
                text: "Chi tiết người gửi:",
                spacing: { before: 200, after: 100 }
            }),
            this.createSenderDetailsTable(report.messages.senderDetails),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 6: THỐNG KÊ TÀI LIỆU ===
        sections.push(
            new Paragraph({
                text: "V. THỐNG KÊ TÀI LIỆU",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng tài liệu", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.documents.count))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng dung lượng", bold: true })] }),
                            new TableCell({ children: [new Paragraph(`${(report.documents.totalSize / (1024 * 1024)).toFixed(2)} MB`)] })
                        ]
                    })
                ]
            }),
            new Paragraph({
                text: "Loại tệp:",
                spacing: { before: 200, after: 100 }
            }),
            this.createFileTypeBreakdownTable(report.documents.fileTypeBreakdown),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 7: THỐNG KÊ KỲ THI ===
        sections.push(
            new Paragraph({
                text: "VI. THỐNG KÊ KỲ THI",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng kỳ thi", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.exams.count))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng câu hỏi", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.exams.totalQuestions))] })
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 8: HIỆU SUẤT ===
        sections.push(
            new Paragraph({
                text: "VII. HIỆU SUẤT SỰ KIỆN",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tỷ lệ điểm danh", bold: true })] }),
                            new TableCell({ children: [new Paragraph(report.performance.attendanceRate)] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Điểm tương tác", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.performance.engagementScore))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Đánh giá thành công", bold: true })] }),
                            new TableCell({ children: [new Paragraph(report.performance.successIndicator)] })
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 300 } })
        );

        // === PHẦN 9: TÓM TẮT ===
        sections.push(
            new Paragraph({
                text: "VIII. TÓM TẮT",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 200 }
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng tin nhắn", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.summary.totalMessages))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng tài liệu", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.summary.totalDocuments))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng kỳ thi", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.summary.totalExams))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng người tham gia", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.summary.totalParticipants))] })
                        ]
                    }),
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph({ text: "Tổng người tham dự", bold: true })] }),
                            new TableCell({ children: [new Paragraph(String(report.summary.totalAttended))] })
                        ]
                    })
                ]
            }),
            new Paragraph({
                text: `\nBáo cáo được tạo lúc: ${new Date().toLocaleString('vi-VN')}`,
                spacing: { before: 400 }
            })
        );

        // Tạo document
        const docx = new Document({
            sections: [{
                children: sections
            }]
        });

        // Xác định đường dẫn output
        const filePath = outputPath || path.join(process.cwd(), 'uploads', `event_report_${report.event.id}_${Date.now()}.docx`);

        // Đảm bảo thư mục tồn tại
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Lưu file
        const buffer = await Packer.toBuffer(docx);
        fs.writeFileSync(filePath, buffer);

        return {
            success: true,
            filePath,
            fileName: path.basename(filePath),
            exportDate: new Date()
        };
    }

    createSenderDetailsTable(senderDetails) {
        if (!senderDetails || senderDetails.length === 0) {
            return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Không có dữ liệu")] })
                        ]
                    })
                ]
            });
        }

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    cells: [
                        new TableCell({ children: [new Paragraph({ text: "Tên người dùng", bold: true })] }),
                        new TableCell({ children: [new Paragraph({ text: "Email", bold: true })] }),
                        new TableCell({ children: [new Paragraph({ text: "Số tin nhắn", bold: true })] })
                    ]
                }),
                ...senderDetails.map(sender =>
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph(sender.userName)] }),
                            new TableCell({ children: [new Paragraph(sender.userEmail)] }),
                            new TableCell({ children: [new Paragraph(String(sender.messageCount))] })
                        ]
                    })
                )
            ]
        });
    }

    createFileTypeBreakdownTable(fileTypeBreakdown) {
        if (!fileTypeBreakdown || Object.keys(fileTypeBreakdown).length === 0) {
            return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph("Không có dữ liệu")] })
                        ]
                    })
                ]
            });
        }

        return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    cells: [
                        new TableCell({ children: [new Paragraph({ text: "Loại tệp", bold: true })] }),
                        new TableCell({ children: [new Paragraph({ text: "Số lượng", bold: true })] })
                    ]
                }),
                ...Object.entries(fileTypeBreakdown).map(([fileType, count]) =>
                    new TableRow({
                        cells: [
                            new TableCell({ children: [new Paragraph(fileType)] }),
                            new TableCell({ children: [new Paragraph(String(count))] })
                        ]
                    })
                )
            ]
        });
    }

    async generateStreamToken(eventId, userId) {
        // Validate event exists
        const event = await this.Event.findById(eventId);
        if (!event) {
            throw new Error("Không tìm thấy sự kiện");
        }

        // Check if user is registered for the event
        const eventRegistration = await this.EventUser.findOne({
            event_id: eventId,
            user_id: userId
        });

        if (!eventRegistration) {
            throw new Error("Bạn không được phép truy cập sự kiện này");
        }

        // Generate Stream token
        const token = this.streamClient.createToken(userId.toString());

        return token;
    }

    async getEventMessages(eventId) {
        if (!mongoose.isValidObjectId(eventId)) {
            throw new Error("eventId không hợp lệ");
        }

        const messages = await this.Message.find({
            event_id: eventId,
            status: { $ne: "deleted" }
        })
            .populate("user_id", "full_name avatarUrl")
            .populate("reply_to", "content user_id")
            .sort({ created_at: 1 })
            .lean();

        return messages;
    };

    async getEventDocuments(eventId) {
        if (!mongoose.isValidObjectId(eventId)) {
            throw new Error("eventId không hợp lệ");
        }

        const documents = await this.Document.find({
            event_id: eventId,
            status: "active"
        })
            .populate("uploader_id", "full_name avatarUrl")
            .sort({ created_at: 1 })
            .lean();

        return documents;
    };
}

