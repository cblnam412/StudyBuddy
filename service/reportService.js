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
];

export class ReportService {
    constructor(reportModel, documentModel, messageModel, userWarningModel, userModel, roomUserModel) {
        this.Report = reportModel;
        this.Document = documentModel;
        this.Message = messageModel;
        this.UserWarning = userWarningModel;
        this.User = userModel;
        this.RoomUser = roomUserModel;

        this.VIOLATION_POINTS = VIOLATION_POINTS;
        this.BASIC_FEATURES = BASIC_FEATURES;
    }
    async createReport(data, reporterId) {
        const {
            reported_item_id, reported_item_type, report_type, 
            content, proof_url } = data;

        if (!reported_item_id || !reported_item_type || !report_type || !content || !proof_url) {
            throw new Error("Thiếu thông tin bắt buộc: Người report/ loại report/ item report/ nội dung hoặc minh chứng.");
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

        const validReportTypes = ["spam", "violated", "infected_file", "offense", "misuse_authority", "other"];
        if (!validReportTypes.includes(report_type)) {
            throw new Error(`report_type không hợp lệ. Phải thuộc các giá trị: ${validReportTypes.join(", ")}`);
        }

        if (typeof content !== "string" || !content.trim()) {
            throw new Error("Nội dung không được rỗng.");
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

        report.status = "reviewed";
        report.reviewer_id = reviewerId;
        await report.save();

        return report;
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

        return report;
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
    async findReport(filters = {}, options = {}) {
        const { page = 1, limit = 20, sort = { created_at: -1 } } = options;

        if (page <= 0 || limit <= 0) {
            throw new Error('page hoặc limit không hợp lệ.');
        }

        const q = {};
        if (filters.status) q.status = filters.status;
        if (filters.reported_item_type) q.reported_item_type = filters.reported_item_type;
        if (filters.reporter_id) q.reporter_id = filters.reporter_id;
        if (filters.reported_item_id) q.reported_item_id = filters.reported_item_id;
        if (filters.report_type) q.report_type = filters.report_type;

        const total = await this.Report.countDocuments(q);
        const reports = await this.Report.find(q)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit);

        const pages = Math.max(1, Math.ceil(total / limit));
        return { reports, total, page, pages };
    }

    // xem chi tiết một report và mục bị báo cáo (document/message/user)
    async viewReportDetails(reportId) {
        if (!reportId) throw new Error('reportId không được bỏ trống.');
        if (!mongoose.Types.ObjectId.isValid(reportId)) throw new Error('reportId không hợp lệ.');

        const report = await this.Report.findById(reportId);
        if (!report) throw new Error('Không tìm thấy báo cáo.');

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

        return {
            message: "Report processed successfully",
            report: report,
            reported_user_id: reportedUserId,
            applied_action: action,
            violated_points: points
        };
    }


}