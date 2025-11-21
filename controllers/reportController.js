import { Report, User, ModeratorApplication, UserWarning, ReputationLog, ReputationScore, EventUser, Document } from "../models/index.js";
import { ReportService } from "../service/reportService.js"; 
import { UserService } from "../service/userService.js"; 
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const userService = new UserService(User, ModeratorApplication, UserWarning, Document, EventUser, supabase, ReputationLog, ReputationScore);
const reportService = new ReportService(Report);

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

        res.json({ message: "Đã xem xét báo cáo", report });

        // cộng điểm nếu report được review hợp lệ
        await userService.incrementUserReputation(
            report.reporter_id,
            1,
            `Report "${report._id}" reviewed successfully.`,
            "report"
        );

    } catch (error) {
        if (error.message === "Không tìm thấy yêu cầu") {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
}