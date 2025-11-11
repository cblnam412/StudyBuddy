import { Report } from "../models/index.js";
import { ReportService } from "../service/reportService.js"; 

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
    } catch (error) {
        if (error.message === "Không tìm thấy yêu cầu") {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
}