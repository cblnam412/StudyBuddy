import { throws } from "assert";
import { Report, User, RoomUser, ModeratorApplication, UserWarning, ReputationLog, ReputationScore, EventUser, Document, Message } from "../models/index.js";
import { ReportService } from "../service/reportService.js"; 
import { UserService } from "../service/userService.js"; 
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const userService = new UserService(User, ModeratorApplication, UserWarning, Document, EventUser, supabase, ReputationLog, ReputationScore);
const reportService = new ReportService(Report, Document, Message, UserWarning, User, RoomUser);

export const createReport = async (req, res) => {
    try {
        const report = await reportService.createReport(req.body, req.user.id);

        res.status(201).json({
            message: "Gửi báo cáo thành công.",
            report,
        });
    } catch (error) {
        if (error.message.includes("Thiếu thông tin")) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const reviewReport = async (req, res) => {
    try {
        const report = await reportService.reviewReport(req.params.id, req.user._id);

        // cộng điểm nếu report được review hợp lệ
        await userService.incrementUserReputation(
            report.reporter_id,
            1,
            `Report "${report._id}" reviewed successfully.`,
            "report"
        );

        res.json({ message: "Đã xem xét báo cáo", report });

    } catch (error) {
        if (error.message.includes("không hợp lệ")) {
            return res.status(400).json({ message: error.message });
        }

        if (error.message === "Không tìm thấy yêu cầu.") {
            return res.status(404).json({ message: error.message });
        }

        if (
            error.message.includes("xem xét") ||
            error.message.includes("bác bỏ") ||
            error.message.includes("xử lý") ||
            error.message.includes("pending")
        ) {
            return res.status(400).json({ message: error.message });
        }

        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const rejectReport = async (req, res) => {
    try {
        const reason = req.body.reason;
        const report = await reportService.rejectReport(req.params.id, req.user._id, reason);

        res.json({ message: "Đã từ chối báo cáo", report });

        // TODO: trừ điểm người report nếu report bị từ chối

    } catch (error) {
        if (error.message === "Không tìm thấy yêu cầu") {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const processReport = async (req, res) => {
    try {
        const moderatorId = req.user.id;
        const reportId = req.params.id; 
        const {
            violationLevel,
            actionNote,
            proofUrl,
            ban_days,
            blocked_days
        } = req.body;

        // Validate input cơ bản
        if (!reportId || !violationLevel) {
            return res.status(400).json({
                message: "Thiếu thông tin: reportId hoặc violationLevel."
            });
        }

        // Gọi vào service
        const result = await reportService.processReport({
            reportId,
            moderatorId,
            violationLevel,
            actionNote,
            proofUrl,
            ban_days,
            blocked_days
        });

        const points = result.violated_points;
        const reportedUserId = result.reported_user_id;

        // trừ điểm cho người bị báo cáo
        await userService.incrementUserReputation(
            reportedUserId,
            -points,
            `Report "${reportId}" related to you, has been reviewed and resolved.`,
            "report"
        );

        return res.status(200).json({
            message: "Đã xử lý báo cáo.",
            data: result,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Lỗi xử lý báo cáo."
        });
    }
};
