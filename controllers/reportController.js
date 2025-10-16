import { Report } from "../models/index.js";

export const createReport = async (req, res) => {
    try {
        const {
            reported_item_id,
            reported_item_type,
            report_type,
            content,
            proof_url
        } = req.body;

        const reporter_id = req.user.id;

        if (!reported_item_id || !reported_item_type || !report_type) {
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: Người report, loại report, item report.",
            });
        }

        const report = new Report({
            reporter_id,
            reported_item_id,
            reported_item_type,
            report_type,
            content,
            proof_url,
        });

        await report.save();

        res.status(201).json({
            message: "Gửi báo cáo thành công.",
            report,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
};

export const reviewReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report || report.status !== "pending")
            return res.status(404).json({ message: "Không tìm thấy yêu cầu" });

        report.status = "reviewed";
        report.reviewer_id = req.user._id;
        await report.save();

        res.json({ message: "Đã xem xét báo cáo" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server" });
    }
}