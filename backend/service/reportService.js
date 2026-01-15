import { Report } from "../models/index.js";
import mongoose from "mongoose";

// điểm phạt theo mức độ vi phạm
const VIOLATION_POINTS = {
    1: 1,
    2: 3,
    3: 10
};

// các tính năng cơ bản bị khóa cho vi phạm mức 2
const BASIC_FEATURES = [
    "send_message",
    "chat_rate_limit",
    "upload_document",
    "create_event",
    "kick_user",
    "update_room",
    "delete_poll",
    "update_poll",
    "create_poll"
];

export class ReportService {
    constructor(reportModel, documentModel, messageModel, userWarningModel, userModel, roomUserModel, moderatorActivityModel = null, notificationModel) {
        this.Report = reportModel;
        this.Document = documentModel;
        this.Message = messageModel;
        this.UserWarning = userWarningModel;
        this.User = userModel;
        this.RoomUser = roomUserModel;
        this.ModeratorActivity = moderatorActivityModel;
        this.Notification = notificationModel;

        this.VIOLATION_POINTS = VIOLATION_POINTS;
        this.BASIC_FEATURES = BASIC_FEATURES;
    }
    async createReport(data, reporterId) {
        const {
            reported_item_id, reported_item_type, report_type, 
            content, proof_url } = data;

        if (!reported_item_id || !reported_item_type || !report_type) {
            throw new Error("Thiếu thông tin bắt buộc: Người report/ loại report/ item report.");
        }

        if (!mongoose.Types.ObjectId.isValid(reported_item_id)) {
            throw new Error("reported_item_id không hợp lệ.");
        }

        if (!mongoose.Types.ObjectId.isValid(reporterId)) {
            throw new Error("reporterId không hợp lệ.");
        }

        const validItemTypes = ["document", "message", "user"];
        if (!validItemTypes.includes(reported_item_type)) {
            throw new Error(`reported_item_type không hợp lệ. Phải thuộc các giá trị: ${validItemTypes.join(", ")}`);
        }

        const validReportTypes = ["spam", "violated_content", "infected_file", "offense", "misuse_authority", "other"];
        if (!validReportTypes.includes(report_type)) {
            throw new Error(`report_type không hợp lệ. Phải thuộc các giá trị: ${validReportTypes.join(", ")}`);
        }

        let targetModel;
        switch (reported_item_type) {
            case "document":
                targetModel = this.Document;
                break;
            case "message":
                targetModel = this.Message;
                break;
            case "user":
                targetModel = this.User;
                break;
        }

        const targetItem = await targetModel.findById(reported_item_id);
        if (!targetItem) {
            throw new Error(`Không tìm thấy ${reported_item_type} với ID được cung cấp.`);
        }

        const report = new this.Report({
            reporter_id: reporterId,
            reported_item_id,
            reported_item_type,
            report_type,
            content,
            proof_url,
        });

        await report.save();
        return report;
    }

    async reviewReport(reportId, reviewerId) {
        if (!reportId || !reviewerId) 
            throw new Error("Thiếu reportId và reviewerId.");

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            throw new Error("reportId không hợp lệ.");
        }

        if (!mongoose.Types.ObjectId.isValid(reviewerId)) {
            throw new Error("reviewerId không hợp lệ.");
        }

        const report = await this.Report.findById(reportId);

        if (!report) {
            throw new Error("Không tìm thấy báo cáo.");
        }

        if (report.status !== "pending") {
            let msg = "Yêu cầu không ở trạng thái pending.";

            if (report.status === "reviewed") msg = "Yêu cầu đã được xem xét.";
            if (report.status === "dismissed") msg = "Yêu cầu đã bị bác bỏ.";
            if (report.status === "action_taken") msg = "Yêu cầu đã được xử lý.";

            throw new Error(msg);
        }

        if (report.reported_item_type === "message") {
        const message = await this.Message.findById(report.reported_item_id);

        if (message) {
                message.status = "deleted";
                message.deleted_at = Date.now();
                await message.save(); 
            }
        }

        report.status = "reviewed";
        report.reviewer_id = reviewerId;
        await report.save();

        // log moderator activity
        if (this.ModeratorActivity) {
            try {
                await this.ModeratorActivity.create({
                    moderator_id: reviewerId,
                    action: "approve_report",
                    report_id: report._id,
                    target_type: "report",
                    decision: "approved",
                    details: `Report ${report._id} reviewed and approved`
                });
            } catch (err) {
                console.error('ModeratorActivity log error (review):', err);
            }
        }

        let reportedItem = null;
        switch (report.reported_item_type) {
            case 'user':
                reportedItem = await this.User.findById(report.reported_item_id);
                if (!reportedItem) throw new Error('Không tìm thấy người dùng.');
                break;
            case 'message':
                const reportedMessage = await this.Message.findById(report.reported_item_id);
                if (!reportedMessage) 
                    throw new Error('Không tìm thấy tin nhắn.');
                reportedItem = await this.User.findById(reportedMessage.user_id);
                if (!reportedItem) 
                    throw new Error('Không tìm thấy người dùng.');
                break;
            case 'document':
                const reportedDocument = await this.Document.findById(report.reported_item_id);
                if (!reportedDocument) 
                    throw new Error('Không tìm thấy tài liệu.');
                reportedItem = await this.User.findById(reportedDocument.uploader_id);
                if (!reportedItem) 
                    throw new Error('Không tìm thấy người dùng.');
                break;
            default:
                throw new Error('Loại mục báo cáo không hợp lệ.');
        }

        // thông báo cho người báo cáo
        const reporterNotification = await this.Notification.create({
            user_id: report.reporter_id,
            type: "REPORT_REVIEWED",
            metadata: { reportId: report._id },
            title: "Báo cáo của bạn đã được xem xét.",
            content: `Báo cáo có ID: ${report._id} của bạn về người dùng ${report.reported_item_id} 
                có tài nguyên ${report.reported_item_type} đã được xem xét.`
        });

        // thông báo cho người bị báo cáo 
        const reportedNotification = await this.Notification.create({
            user_id: reportedItem._id,
            type: "REPORT_REVIEWED",
            metadata: { reportId: report._id },
            title: "Một báo cáo liên quan đến bạn đã được xem xét",
            content: `Báo cáo có ID: ${report._id} liên quan đến bạn về đối tượng ${report.reported_item_id}
             - ${report.reported_item_type} đã được xem xét. Vui lòng chú ý đến điểm danh tiếng của bạn.`
        });

        return { report, reporterNotification, reportedNotification };
    }

    async rejectReport(reportId, reviewerId, reason) {
        if (!reportId || !reviewerId || !reason) 
            throw new Error("Thiếu reportId hoặc reviewerId hoặc reason.");

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            throw new Error("reportId không hợp lệ.");
        }

        if (!mongoose.Types.ObjectId.isValid(reviewerId)) {
            throw new Error("reviewerId không hợp lệ.");
        }

        if (typeof reason !== "string" || reason.trim().length < 5) {
            throw new Error("Lý do từ chối phải là chuỗi và không được quá ngắn.");
        }

        const report = await this.Report.findById(reportId);
        if (!report) {
            throw new Error("Không tìm thấy báo cáo.");
        }

        if (report.status !== "pending") {
            throw new Error("Trạng thái không hợp lệ để xem xét.");
        }

        report.status = "dismissed";
        report.processing_action = `Report rejected for reason: ${reason}` || "No reason provided";
        report.reviewer_id = reviewerId;
        await report.save();

        // log moderator activity
        if (this.ModeratorActivity) {
            try {
                await this.ModeratorActivity.create({
                    moderator_id: reviewerId,
                    action: "reject_report",
                    report_id: report._id,
                    target_type: "report",
                    decision: "rejected",
                    reason: reason,
                    details: `Report ${report._id} rejected: ${reason}`
                });
            } catch (err) {
                console.error('ModeratorActivity log error (reject):', err);
            }
        }

        let reportedItem = null;
        switch (report.reported_item_type) {
            case 'user':
                reportedItem = await this.User.findById(report.reported_item_id);
                if (!reportedItem) throw new Error('Không tìm thấy người dùng.');
                break;
            case 'message':
                const reportedMessage = await this.Message.findById(report.reported_item_id);
                if (!reportedMessage) 
                    throw new Error('Không tìm thấy tin nhắn.');
                reportedItem = await this.User.findById(reportedMessage.user_id);
                if (!reportedItem) 
                    throw new Error('Không tìm thấy người dùng.');
                break;
            case 'document':
                const reportedDocument = await this.Document.findById(report.reported_item_id);
                if (!reportedDocument) 
                    throw new Error('Không tìm thấy tài liệu.');
                reportedItem = await this.User.findById(reportedDocument.uploader_id);
                if (!reportedItem) 
                    throw new Error('Không tìm thấy người dùng.');
                break;
            default:
                throw new Error('Loại mục báo cáo không hợp lệ.');
        }

        // thông báo cho người báo cáo
        const reporterNotification = await this.Notification.create({
            user_id: report.reporter_id,
            type: "REPORT_REJECTED",
            metadata: { reportId: report._id },
            title: "Báo cáo của bạn đã bị từ chối.",
            content: `Báo cáo có ID: ${report._id} của bạn về người dùng ${report.reported_item_id} 
                có tài nguyên ${report.reported_item_type} đã bị từ chối với lý do: "${reason}".`
        });

        // thông báo cho người bị báo cáo 
        const reportedNotification = await this.Notification.create({
            user_id: reportedItem._id,
            type: "REPORT_REJECTED",
            metadata: { reportId: report._id },
            title: "Một báo cáo liên quan đến bạn đã bị từ chối (BẠN LIÊM)",
            content: `Báo cáo có ID: ${report._id} liên quan đến bạn về đối tượng ${report.reported_item_id}
             - ${report.reported_item_type} đã bị từ chối. Đừng lo lắng.`
        });

        return { report, reporterNotification, reportedNotification };
    }

    // hàm tính điểm phạt
    async calculatePunishmentPoints(violationLevel, userRole) {
        if (!violationLevel || !userRole)
            throw new Error("Không được thiếu violationLevel hoặc userRole.");

        const base = this.VIOLATION_POINTS[violationLevel];
        if (!base) 
            throw new Error("Mức độ vi phạm không hợp lệ, chỉ có Nhẹ (1) - Trung bình (2) - Nghiêm trọng (3).");

        const validRoles = ["member", "leader", "acting-leader", "co-host", "moderator"];
        if (!validRoles.includes(userRole)) {
            throw new Error(`userRole không hợp lệ. Phải thuộc các giá trị: ${validRoles.join(", ")}`);
        }

        const multiplier = userRole === "member" ? 1 : 1.5;
        return Math.ceil(base * multiplier);
    }

    // cập nhât trạng thái báo cáo
    async updateReportStatus(reportId, moderatorId, status, action) {
        if (!reportId || !moderatorId || !status || !action)
            throw new Error("Không được thiếu reportId hoặc moderatorId hoặc status hoặc action.");

        if (!mongoose.Types.ObjectId.isValid(reportId) || !mongoose.Types.ObjectId.isValid(moderatorId)) {
            throw new Error("reportId hoặc moderatorId không hợp lệ.");
        }

        const report = await this.Report.findById(reportId);
        if (!report) {
            throw new Error("Không tìm thấy báo cáo.");
        }

        const moderator = await this.User.findById(moderatorId);
        if (!moderator) {
            throw new Error("Không tìm thấy người dùng tương ứng.");
        }

        const validStatus = ["pending", "reviewed", "dismissed", "action_taken", "warninged"];
        if (!validStatus.includes(status)) {
            throw new Error(`Trạng thái không hợp lệ. Phải thuộc các giá trị: ${validStatus.join(", ")}`);
        }

        if (typeof action !== "string" || action.trim().length < 5) {
            throw new Error("Action phải là chuỗi và không được quá ngắn.");
        }

        return await this.Report.findByIdAndUpdate(
            reportId,
            {
                reviewer_id: moderatorId,
                status: status,
                processing_action: action
            },
            { new: true }
        );
    }

    // tìm kiếm báo cáo với bộ lọc và phân trang
    async findReport(filters = {}, options = {}, requesterRole = 'moderator') {
        const { page = 1, limit = 20, sort = { created_at: -1 } } = options;

        console.log(page, limit);
        if (page <= 0 || limit <= 0) {
            throw new Error('page hoặc limit không hợp lệ.');
        }

        const q = {};
        if (filters.report_id) q._id = filters.report_id;
        if (filters.status) q.status = filters.status;
        if (filters.reported_item_type) q.reported_item_type = filters.reported_item_type;
        if (filters.reporter_id) q.reporter_id = filters.reporter_id;
        if (filters.reported_item_id) q.reported_item_id = filters.reported_item_id;
        if (filters.report_type) q.report_type = filters.report_type;

        const total = await this.Report.countDocuments(q);
        let reports = await this.Report.find(q)
            .sort(sort)
            .populate('reporter_id', 'full_name')
            .skip((page - 1) * limit)
            .limit(limit);
            //.lean();

        // for (let r of reports) {
        //     if (r.reported_item_type === "message") {
        //         r.reported_item = await this.Message.findById(r.reported_item_id)
        //             .select("content user_id status");
        //     }
        //     else if (r.reported_item_type === "document") {
        //         r.reported_item = await this.Document.findById(r.reported_item_id)
        //             .select("file_name file_url file_type");
        //     }
        //     else if (r.reported_item_type === "user") {
        //         r.reported_item = await this.User.findById(r.reported_item_id)
        //             .select("full_name email avatar");
        //     }
        // }

        if (requesterRole === 'moderator') {
            const filteredReports = [];
            for (const report of reports) {
                try {
                    const reportedUserId = await this.getReportedUserId(report);
                    const reportedUser = await this.User.findById(reportedUserId).select('system_role');
                    
                    if (reportedUser && reportedUser.system_role === 'user') {
                        filteredReports.push(report);
                    }
                } catch (err) {
                    console.error('Error filtering report:', err);
                }
            }
            reports = filteredReports;
        }

        const pages = Math.max(1, Math.ceil(total / limit));
        return { reports, total, page, pages };
    }

    // xem chi tiết một report và mục bị báo cáo (document/message/user)
    async viewReportDetails(reportId) {
        if (!reportId) 
            throw new Error('reportId không được bỏ trống.');
        if (!mongoose.Types.ObjectId.isValid(reportId)) 
            throw new Error('reportId không hợp lệ.');

        const report = await this.Report.findById(reportId);
        if (!report) 
            throw new Error('Không tìm thấy báo cáo.');

        let reportedItem = null;
        switch (report.reported_item_type) {
            case 'user':
                reportedItem = await this.User.findById(report.reported_item_id);
                if (!reportedItem) throw new Error('Không tìm thấy người dùng.');
                break;
            case 'message':
                reportedItem = await this.Message.findById(report.reported_item_id);
                if (!reportedItem) throw new Error('Không tìm thấy tin nhắn.');
                break;
            case 'document':
                reportedItem = await this.Document.findById(report.reported_item_id);
                if (!reportedItem) throw new Error('Không tìm thấy tài liệu.');
                break;
            default:
                throw new Error('Loại mục báo cáo không hợp lệ.');
        }

        return { report, reportedItem };
    }

    // hàm lấy id của người bị báo cáo
    async getReportedUserId(report) {
        if (!report) 
            throw new Error("Không được thiếu báo cáo.");

        switch (report.reported_item_type) {
            case "user":
                return report.reported_item_id;
                
            case "message": {
                const msg = await this.Message.findById(report.reported_item_id);
                if (!msg) 
                    throw new Error("Không tìm thấy tin nhắn.");
                return msg.user_id;   
            }

            case "document": {
                const doc = await this.Document.findById(report.reported_item_id);
                if (!doc) 
                    throw new Error("Không tìm thấy tài liệu.");
                return doc.uploader_id;
            }
            default:
                throw new Error("Loại mục báo cáo không hợp lệ.");
        }
    }

    async checkReportProcessPermission(moderatorId, reportedUserId) {
        const moderator = await this.User.findById(moderatorId).select('system_role');
        if (!moderator) throw new Error("Không tìm thấy moderator.");

        const reportedUser = await this.User.findById(reportedUserId).select('system_role');
        if (!reportedUser) throw new Error("Không tìm thấy người bị báo cáo.");

        if (reportedUser.system_role === 'moderator' || reportedUser.system_role === 'admin') {
            if (moderator.system_role !== 'admin') {
                throw new Error("Chỉ Admin mới có quyền xử lý báo cáo về Moderator hoặc Admin.");
            }
        }

        if (moderator.system_role !== 'admin' && moderator.system_role !== 'moderator') {
            throw new Error("Bạn không có quyền xử lý báo cáo.");
        }

        return true;
    }

    // xử lý báo cáo
    async processReport({ reportId, moderatorId, violationLevel, actionNote, proofUrl, ban_days, blocked_days}) {

        const report = await this.Report.findById(reportId);
        if (!report) 
            throw new Error("Không tìm thấy báo cáo.");

        if (report.status !== "reviewed") {
            throw new Error("Yêu cầu phải được xem xét và chấp nhận hợp lệ trước khi bắt đầu xử lý.")
        }

        if (report.status === "action_taken") {
            throw new Error("Yêu cầu đã được xử lý.")
        }

        const reportedUserId = await this.getReportedUserId(report);

        await this.checkReportProcessPermission(moderatorId, reportedUserId);
        console.log("REPORTED USER ID: ", reportedUserId);
        const reportedUser = await this.User.findById(reportedUserId);
        if (!reportedUser)
            throw new Error("Không tìm thấy người dùng bị báo cáo.");

        const reportedRoomUser = await this.RoomUser.findOne({ user_id: reportedUserId });
        let room_role = "";
        if (!reportedRoomUser)
            room_role = "member";
        else 
            room_role = reportedRoomUser.room_role;
        console.log("ROOM_ROLE: ", room_role);
        // tính điểm phạt
        const points = await this.calculatePunishmentPoints(violationLevel, room_role);

        // log lại bản ghi
        await this.UserWarning.create({
            user_id: reportedUserId,
            moderator_id: moderatorId,
            violation_level: violationLevel,
            punishment_points: points,
            punishment_details: actionNote || `Vi phạm: ${report.report_type}`,
            proof_url: proofUrl
        });

        let action = "";
        
        // xử phạt mức 3, ban tài khoản
        if (violationLevel == 3) {
            const banDays = ban_days || 90;
            action = `Ban tài khoản ${banDays} ngày.`;
            const banEndDate = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);

            // TODO: logic ban user, cho phép admin chọn thời gian ban
            await this.User.findByIdAndUpdate(reportedUserId, {
                status: "banned",
                ban_end_date: banEndDate
            });

            // xử phạt mức 2, giới hạn tính năng cơ bản
        } else if ( violationLevel == 2) {
            const blockDays = blocked_days || 7;
            action = `Tài khoản bị giới hạn các tính năng cơ bản trong vòng ${blockDays} ngày.`;
            const blockEndDate = new Date(Date.now() + blockDays * 24 * 60 * 60 * 1000);
            
            const blocks = this.BASIC_FEATURES.map(f => ({
                feature: f,
                expires_at: blockEndDate,
                reason: "Violation level 2"
            }));

            // dùng addToSet với each để tránh trùng lặp, thay vì push
            await this.User.findByIdAndUpdate(reportedUserId, {
                $addToSet: { blocked_features: { $each: blocks } }
            });
            
            // xử phạt mức 1, cảnh cáo và giới hạn thời gian gửi tin nhắn
        } else if (violationLevel == 1) {
            action = "Giới hạn tính năng: chỉ được gửi 1 tin nhắn mỗi 10 phút.";
            const expiresAt = new Date(Date.now() +  24 * 60 * 60 * 1000);      // 1 ngày

            const blocks = this.BASIC_FEATURES.map(f => ({
                feature: "chat_rate_limit",
                expires_at: expiresAt,
                reason: "Violation level 1"
            }));

            // dùng addToSet với each để tránh trùng lặp, thay vì push
            await this.User.findByIdAndUpdate(reportedUserId, {
                $addToSet: { blocked_features: { $each: blocks } }
            });
        }

        // Update report
        if (violationLevel == 1) {
            await this.updateReportStatus( reportId, moderatorId, "warninged", action );
        } else {
            await this.updateReportStatus( reportId, moderatorId, "action_taken", action );
        }

        // log moderator activity based on violation level
        if (this.ModeratorActivity) {
            try {
                let activityAction = "restrict_chat";
                if (violationLevel == 2) activityAction = "restrict_activity";
                else if (violationLevel == 3) activityAction = "ban";

                const activityData = {
                    moderator_id: moderatorId,
                    action: activityAction,
                    report_id: reportId,
                    target_type: "report",
                    violation_level: violationLevel,
                    details: action
                };

                if (violationLevel == 1) {
                    activityData.blocked_days = 1;
                    activityData.affected_features = ["chat_rate_limit"];
                } else if (violationLevel == 2) {
                    activityData.blocked_days = blocked_days || 7;
                    activityData.affected_features = this.BASIC_FEATURES;
                    activityData.expires_at = new Date(Date.now() + (blocked_days || 7) * 24 * 60 * 60 * 1000);
                } else if (violationLevel == 3) {
                    activityData.ban_days = ban_days || 90;
                    activityData.expires_at = new Date(Date.now() + (ban_days || 90) * 24 * 60 * 60 * 1000);
                }

                await this.ModeratorActivity.create(activityData);
            } catch (err) {
                console.error('ModeratorActivity log error (processReport):', err);
            }
        }

        return {
            message: "Report processed successfully",
            report: report,
            reported_user_id: reportedUserId,
            applied_action: action,
            violated_points: points
        };
    }


}