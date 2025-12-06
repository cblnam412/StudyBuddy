import { beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import { ReportService } from "../../service/reportService.js";

//------ TEST hàm createReport() ------//
describe("TEST createReport() function", () => {
    let service;
    let mockDocument, mockMessage, mockUser, mockReport;

    beforeEach(() => {
        mongoose.Types.ObjectId.isValid = jest.fn();

        mockDocument = { findById: jest.fn() };
        mockMessage = { findById: jest.fn() };
        mockUser = { findById: jest.fn() };
        mockReport = function (data) {
            return {
                ...data,
                save: jest.fn().mockResolvedValue(data),
            };
        };

        service = new ReportService();
        service.Document = mockDocument;
        service.Message = mockMessage;
        service.User = mockUser;
        service.Report = mockReport;

        jest.clearAllMocks();
    });

    test("TC02: throw lỗi nếu thiếu reported_item_type hoặc report_type", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "",
            report_type: "",
            content: "Hello World",
            proof_url: "url"
        };

        await expect(service.createReport(data, "507f1f77bcf86cd799439011"))
            .rejects
            .toThrow("Thiếu thông tin bắt buộc: Người report/ loại report/ item report/ nội dung hoặc minh chứng.");
    });

    test("TC06: throw lỗi nếu thiếu reported_item_id hoặc reporter_id", async () => {
        const data = {
            reported_item_id: "",
            reported_item_type: "message",
            report_type: "offense",
            content: "Offense content",
            proof_url: "url"
        };

        await expect(service.createReport(data, ""))
            .rejects
            .toThrow("Thiếu thông tin bắt buộc: Người report/ loại report/ item report/ nội dung hoặc minh chứng.");
    });

    test("TC08: throw lỗi nếu reported_item_id không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValueOnce(false);

        const data = {
            reported_item_id: "123",
            reported_item_type: "document",
            report_type: "spam",
            content: "test",
            proof_url: "url"
        };

        await expect(service.createReport(data, "validReporterId"))
            .rejects
            .toThrow("reported_item_id không hợp lệ.");
    });

    test("TC09: throw lỗi nếu reporterId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid
            .mockReturnValueOnce(true)   // reported_item_id valid
            .mockReturnValueOnce(false); // reporterId invalid

        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "document",
            report_type: "spam",
            content: "test",
            proof_url: "url"
        };

        await expect(service.createReport(data, "xxx"))
            .rejects
            .toThrow("reporterId không hợp lệ.");
    });

    test("TC03: throw lỗi nếu reported_item_type không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        const validItemTypes = ["document", "message", "user"];
        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "invalid",
            report_type: "spam",
            content: "hello",
            proof_url: "url"
        };

        await expect(service.createReport(data, "507f1f77bcf86cd799439011"))
            .rejects
            .toThrow(`reported_item_type không hợp lệ. Phải thuộc các giá trị: ${validItemTypes.join(", ")}`);
    });

    test("TC04: throw lỗi nếu report_type không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        const validReportTypes = ["spam", "violated", "infected_file", "offense", "misuse_authority", "other"];

        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "document",
            report_type: "xxx",
            content: "hello",
            proof_url: "url"
        };

        await expect(service.createReport(data, "507f1f77bcf86cd799439011"))
            .rejects
            .toThrow(`report_type không hợp lệ. Phải thuộc các giá trị: ${validReportTypes.join(", ")}`);
    });

    test("TC05: throw lỗi nếu thiếu content hoặc proof_url", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "document",
            report_type: "spam",
            content: "",
            proof_url: ""
        };

        await expect(service.createReport(data, "507f1f77bcf86cd799439011"))
            .rejects
            .toThrow("Thiếu thông tin bắt buộc: Người report/ loại report/ item report/ nội dung hoặc minh chứng.");
    });

    test("TC07: throw lỗi nếu item không tồn tại", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        mockDocument.findById.mockResolvedValue(null);

        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "document",
            report_type: "spam",
            content: "Hello",
            proof_url: "url"
        };

        await expect(service.createReport(data, "507f1f77bcf86cd799439011"))
            .rejects
            .toThrow(`Không tìm thấy document với ID được cung cấp.`);
    });

    test("TC01: Tạo report thành công", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        mockDocument.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });

        const data = {
            reported_item_id: "507f1f77bcf86cd799439011",
            reported_item_type: "document",
            report_type: "spam",
            content: "Vi phạm lỗi gửi tài liệu nhiều lần.",
            proof_url: "http://localhost:3000/proof"
        };

        const result = await service.createReport(data, "507f1f77bcf86cd799439022");

        expect(result.report_type).toBe("spam");
        expect(result.content).toBe("Vi phạm lỗi gửi tài liệu nhiều lần.");
        expect(result.proof_url).toBe("http://localhost:3000/proof");
    });
});

//------ TEST hàm reviewReport() ------//
describe("TEST reviewReport() function", () => {
    let service;

    beforeEach(() => {
        mongoose.Types.ObjectId.isValid = jest.fn();
        service = new ReportService();

        fakeReport = {
            _id: "507f1f77bcf86cd799439011",
            status: "pending",
            save: jest.fn().mockResolvedValue(true),
        };
        
        service.Document = { findById: jest.fn() };
        service.Message = { findById: jest.fn() };
        service.User = { findById: jest.fn() };
        service.Report = { findById: jest.fn().mockResolvedValue(fakeReport) };

        jest.resetAllMocks();
    });

    test("TC05: throw lỗi nếu thiếu reportId hoặc reviewerId", async () => {
        await expect(service.reviewReport(null, "someId"))
        .rejects
        .toThrow("Thiếu reportId và reviewerId.");

        await expect(service.reviewReport("someId", null))
        .rejects
        .toThrow("Thiếu reportId và reviewerId.");
    });

    test("TC07: throw lỗi nếu reviewerId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid
        .mockReturnValueOnce(true)  // reportId valid
        .mockReturnValueOnce(false); // reviewerId invalid

        await expect(service.reviewReport("507f1f77bcf86cd799439011", "badId"))
        .rejects
        .toThrow("reviewerId không hợp lệ.");
    });

    test("TC08: throw lỗi nếu reportId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid
        .mockReturnValueOnce(false)     // reportId invalid
        .mockReturnValueOnce(true);     // reviewerId valid

        await expect(service.reviewReport("badReportId", "507f1f77bcf86cd799439022"))
        .rejects
        .toThrow("reportId không hợp lệ.");
    });

    test("TC06: throw lỗi nếu không tìm thấy báo cáo", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        service.Report.findById.mockResolvedValue(null);

        await expect(service.reviewReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022"))
        .rejects
        .toThrow("Không tìm thấy báo cáo.");
    });

    test("TC02: throw lỗi nếu report.status không phải pending (là reviewed)", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        fakeReport.status = "reviewed";
        service.Report.findById.mockResolvedValue(fakeReport);

        await expect(service.reviewReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022"))
            .rejects
            .toThrow("Yêu cầu đã được xem xét.");
    });

    test("TC03: throw lỗi nếu report.status không phải pending (là dismissed)", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        fakeReport.status = "dismissed";
        service.Report.findById.mockResolvedValue(fakeReport);

        await expect(service.reviewReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022"))
            .rejects
            .toThrow("Yêu cầu đã bị bác bỏ.");
    });

    test("TCO4: throw lỗi nếu report.status không phải pending (là action_taken)", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        fakeReport.status = "action_taken";
        service.Report.findById.mockResolvedValue(fakeReport);

        await expect(service.reviewReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022"))
            .rejects
            .toThrow("Yêu cầu đã được xử lý.");
    });

    test("TC01: Xem xét báo cáo thành công", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        fakeReport.status = "pending";
        service.Report.findById.mockResolvedValue(fakeReport);

        const result = await service.reviewReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022");

        expect(result.status).toBe("reviewed");
        expect(result.reviewer_id).toBe("507f1f77bcf86cd799439022");
        expect(fakeReport.save).toHaveBeenCalled();
    });
});

//------ TEST hàm rejectReport() ------//
describe("TEST rejectReport() function", () => {
    let service;

    beforeEach(() => {
        mongoose.Types.ObjectId.isValid = jest.fn();
        service = new ReportService();

        fakeReport = {
            _id: "507f1f77bcf86cd799439011",
            status: "pending",
            reason: "validReason",
            save: jest.fn().mockResolvedValue(true),
        };
        
        service.Document = { findById: jest.fn() };
        service.Message = { findById: jest.fn() };
        service.User = { findById: jest.fn() };
        service.Report = { findById: jest.fn().mockResolvedValue(fakeReport) };

        jest.resetAllMocks();
    });

    test("TC05: throw lỗi nếu thiếu reportId hoặc reviewerId hoặc reason", async () => {
        await expect(service.rejectReport(null, "someId", "random reason"))
        .rejects
        .toThrow("Thiếu reportId hoặc reviewerId hoặc reason.");

        await expect(service.rejectReport("someId", null, "random reason"))
        .rejects
        .toThrow("Thiếu reportId hoặc reviewerId hoặc reason.");

        await expect(service.rejectReport("someId", "someId again", null))
        .rejects
        .toThrow("Thiếu reportId hoặc reviewerId hoặc reason.");
    });

    test("TC07: throw lỗi nếu reviewerId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid
        .mockReturnValueOnce(true)  // reportId valid
        .mockReturnValueOnce(false); // reviewerId invalid

        await expect(service.rejectReport("507f1f77bcf86cd799439011", "badId", "validReason"))
        .rejects
        .toThrow("reviewerId không hợp lệ.");
    });

    test("TC08: throw lỗi nếu reportId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid
        .mockReturnValueOnce(false)     // reportId invalid
        .mockReturnValueOnce(true);     // reviewerId valid

        await expect(service.rejectReport("badReportId", "507f1f77bcf86cd799439022", "validReason"))
        .rejects
        .toThrow("reportId không hợp lệ.");
    });

    test("TC06: throw lỗi nếu không tìm thấy báo cáo", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        service.Report.findById.mockResolvedValue(null);

        await expect(service.rejectReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "validReason"))
        .rejects
        .toThrow("Không tìm thấy báo cáo.");
    });

    test("TC02: throw lỗi nếu report.status không phải pending", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const statuses = ["reviewed", "dismissed", "action_taken"];
        for (const st of statuses) {
            fakeReport.status = st;
            service.Report.findById.mockResolvedValue(fakeReport);

            await expect(service.rejectReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "validReason"))
                .rejects
                .toThrow("Trạng thái không hợp lệ để xem xét.");
        }
    });

    test("TC03: throw lỗi nếu reason không hợp lệ (không phải chuỗi hoặc quá ngắn)", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        await expect(service.rejectReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", 123))
            .rejects
            .toThrow("Lý do từ chối phải là chuỗi và không được quá ngắn.");

        await expect(service.rejectReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "hi"))
            .rejects
            .toThrow("Lý do từ chối phải là chuỗi và không được quá ngắn.");
    });


    test("TC01: Bác bỏ báo cáo thành công", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        fakeReport.status = "pending";
        service.Report.findById.mockResolvedValue(fakeReport);

        const result = await service.rejectReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "validReason");

        expect(result.status).toBe("dismissed");
        expect(result.reviewer_id).toBe("507f1f77bcf86cd799439022");
        expect(fakeReport.save).toHaveBeenCalled();
    });
});

//------ TEST hàm calculatePunishmentPoints() ------//
describe("TEST calculatePunishmentPoints() function", () => {
    let service;

    beforeEach(() => {
        mongoose.Types.ObjectId.isValid = jest.fn();
        service = new ReportService();
        service.VIOLATION_POINTS = { 1: 1, 2: 3, 3: 10 };
        jest.resetAllMocks();
    });

    test("TC01: throw lỗi nếu thiếu violationLevel hoặc userRole", async () => {
        await expect(service.calculatePunishmentPoints(null, "member"))
            .rejects
            .toThrow("Không được thiếu violationLevel hoặc userRole.");

        await expect(service.calculatePunishmentPoints(1, null))
            .rejects
            .toThrow("Không được thiếu violationLevel hoặc userRole.");
    });

    test("TC04: throw lỗi nếu violationLevel không hợp lệ", async () => {
        await expect(service.calculatePunishmentPoints(99, "member"))
            .rejects
            .toThrow("Mức độ vi phạm không hợp lệ, chỉ có Nhẹ (1) - Trung bình (2) - Nghiêm trọng (3).");
    });

    test("TC03: throw lỗi nếu userRole không hợp lệ", async () => {
        await expect(service.calculatePunishmentPoints(1, "other"))
            .rejects
            .toThrow("userRole không hợp lệ. Phải thuộc các giá trị: member, leader, acting-leader, co-host, moderator");
    });

    test("TC01: tính đúng điểm phạt cho useRole = member", async () => {
        const points = await service.calculatePunishmentPoints(2, "member"); // base = 3, multiplier = 1
        expect(points).toBe(3);
    });

    test("TC05: tính đúng điểm phạt cho userRole != member (multiplier = 1.5)", async () => {
        const points = await service.calculatePunishmentPoints(2, "leader"); // base = 3 -> 3 * 1.5 = 4.5 -> ceil = 5
        expect(points).toBe(5);
    });
});

//------ TEST hàm updateReportStatus() ------//
describe("TEST updateReportStatus() function", () => {
    let service;

    beforeEach(() => {
        mongoose.Types.ObjectId.isValid = jest.fn();
        service = new ReportService();

        fakeReport = {
            _id: "507f1f77bcf86cd799439011",
            status: "pending",
            processing_action: "action",
            save: jest.fn().mockResolvedValue(true),
        };
        
        service.Document = { findById: jest.fn() };
        service.Message = { findById: jest.fn() };
        service.User = { findById: jest.fn() };
        service.Report = { findById: jest.fn().mockResolvedValue(fakeReport), 
            findByIdAndUpdate: jest.fn()
         };

        jest.resetAllMocks();
    });

    test("TC05: throw lỗi nếu thiếu reportId hoặc moderatorId", async () => {
        await expect(service.updateReportStatus(null, "someId", "status", "action"))
        .rejects
        .toThrow("Không được thiếu reportId hoặc moderatorId hoặc status hoặc action.");

        await expect(service.updateReportStatus("someId", null, "status", "action"))
        .rejects
        .toThrow("Không được thiếu reportId hoặc moderatorId hoặc status hoặc action.");
    });

    test("TC04: throw lỗi nếu thiếu status hoặc action", async () => {
        await expect(service.updateReportStatus("someId again", "someId", null, "action"))
        .rejects
        .toThrow("Không được thiếu reportId hoặc moderatorId hoặc status hoặc action.");

        await expect(service.updateReportStatus("someId", "someId again", "status", null))
        .rejects
        .toThrow("Không được thiếu reportId hoặc moderatorId hoặc status hoặc action.");
    });

    test("TC06: throw lỗi nếu reportId hoặc moderatorId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid
        .mockReturnValueOnce(true)  // reportId valid
        .mockReturnValueOnce(false); // moderatorId invalid

        await expect(service.updateReportStatus("507f1f77bcf86cd799439011", "badId", "validStatus", "validAction"))
        .rejects
        .toThrow("reportId hoặc moderatorId không hợp lệ.");
    });

    test("TC07: throw lỗi nếu không tìm thấy báo cáo", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        service.Report.findById.mockResolvedValue(null);

        await expect(service.updateReportStatus("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "validStatus", "validAction"))
        .rejects
        .toThrow("Không tìm thấy báo cáo.");
    });

    test("TC08: throw lỗi nếu không tìm thấy người duyệt tương ứng", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        service.Report.findById.mockResolvedValue({ _id: "report" });
        service.User.findById.mockResolvedValue(null);

        await expect(service.updateReportStatus("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "pending", "validAction"))
        .rejects
        .toThrow("Không tìm thấy người dùng tương ứng.");
    });

    test("TC02: throw lỗi nếu status không thuộc các giá trị", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);
        service.Report.findById.mockResolvedValue({ _id: "report" });
        service.User.findById.mockResolvedValue({ _id: "user" });

        const statuses = ["pending", "reviewed", "dismissed", "action_taken", "warninged"];
        for (const st of statuses) {
            fakeReport.status = st;
            service.Report.findById.mockResolvedValue(fakeReport);

            await expect(service.updateReportStatus("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "other", "validAction"))
                .rejects
                .toThrow(`Trạng thái không hợp lệ. Phải thuộc các giá trị: ${statuses.join(", ")}`);
        }
    });

    test("TC03: throw lỗi nếu action không hợp lệ (không phải chuỗi hoặc quá ngắn)", async () => {
        service.Report.findById.mockResolvedValue({ _id: "report" });
        service.User.findById.mockResolvedValue({ _id: "user" });

        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        await expect(service.updateReportStatus("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "pending", 123))
            .rejects
            .toThrow("Action phải là chuỗi và không được quá ngắn.");

        await expect(service.updateReportStatus("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "pending", "hi"))
            .rejects
            .toThrow("Action phải là chuỗi và không được quá ngắn.");
    });


    test("TC01: Cập nhật báo cáo thành công", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        fakeReport.status = "pending";
        service.Report.findById.mockResolvedValue(fakeReport);

        const result = await service.rejectReport("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439022", "validReason");

        expect(result.status).toBe("dismissed");
        expect(result.reviewer_id).toBe("507f1f77bcf86cd799439022");
        expect(fakeReport.save).toHaveBeenCalled();
    });
});

//------ TEST hàm getReportedUserId() ------//
describe("TEST getReportedUserId() function", () => {
    let service;

    beforeEach(() => {
        mongoose.Types.ObjectId.isValid = jest.fn();

        service = new ReportService();
        service.Report = { findById: jest.fn() };
        service.Message = { findById: jest.fn() };
        service.Document = { findById: jest.fn() };

        jest.resetAllMocks();
    });

    test("TC05: throw lỗi nếu thiếu report", async () => {
        await expect(service.getReportedUserId(null))
            .rejects
            .toThrow("Không được thiếu báo cáo.");
    });

    test("TC02: throw lỗi khi loại report không hợp lệ", async () => {
        const report = {
            reported_item_type: "invalid",
            reported_item_id: "XXX"
        };

        await expect(service.getReportedUserId(report))
            .rejects
            .toThrow("Loại mục báo cáo không hợp lệ.");
    });

    test("TC03: throw lỗi khi không tìm thấy message", async () => {
        const report = {
            reported_item_type: "message",
            reported_item_id: "MSG999"
        };

        service.Message.findById.mockResolvedValue(null);

        await expect(service.getReportedUserId(report))
            .rejects
            .toThrow("Không tìm thấy tin nhắn.");
    });

    test("TC04: throw lỗi khi document không tồn tại", async () => {
        const report = {
            reported_item_type: "document",
            reported_item_id: "DOC999"
        };

        service.Document.findById.mockResolvedValue(null);

        await expect(service.getReportedUserId(report))
            .rejects
            .toThrow("Không tìm thấy tài liệu.");
    });

    test("TC01: trả về user_id khi report.type = user", async () => {
        const report = {
            reported_item_type: "user",
            reported_item_id: "USER123"
        };

        const userId = await service.getReportedUserId(report);
        expect(userId).toBe("USER123");
    });

    test("TC01: trả về user_id từ message", async () => {
        const report = {
            reported_item_type: "message",
            reported_item_id: "MSG123"
        };

        service.Message.findById.mockResolvedValue({
            user_id: "USER_ID_FROM_MESSAGE"
        });

        const userId = await service.getReportedUserId(report);
        expect(userId).toBe("USER_ID_FROM_MESSAGE");
    });

    test("TC01: trả về uploader_id từ document", async () => {
        const report = {
            reported_item_type: "document",
            reported_item_id: "DOC123"
        };

        service.Document.findById.mockResolvedValue({
            uploader_id: "USER_FROM_DOC"
        });

        const userId = await service.getReportedUserId(report);
        expect(userId).toBe("USER_FROM_DOC");
    });
});

