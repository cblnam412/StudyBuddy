import { Report } from "../models/index.js";

export class ReportService {
    constructor(reportModel) {
        this.Report = reportModel;
    }
    async createReport(data, reporterId) {
        const {
            reported_item_id,
            reported_item_type,
            report_type,
            content,
            proof_url
        } = data;

        if (!reported_item_id || !reported_item_type || !report_type) {
            throw new Error("Thiếu thông tin bắt buộc: Người report, loại report, item report.");
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
        const report = await this.Report.findById(reportId);

        if (!report || report.status !== "pending") {
            throw new Error("Không tìm thấy yêu cầu");
        }

        report.status = "reviewed";
        report.reviewer_id = reviewerId;
        await report.save();

        return report;
    }
}