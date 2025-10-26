import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const userId = new mongoose.Types.ObjectId();

await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  verifyToken: jest.fn((req, res, next) => {
    console.log("MOCK AUTH RUNNING");
    req.user = { _id: userId, system_role: "moderator" };
    next();
  }),
  isModerator: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next()),
  verifyTokenForProfile: jest.fn((req, res, next) => next()),
}));

const { User, Report } = await import("../models/index.js");
const app = (await import("../app.js")).default;

describe("Report Controller API - Test reviewReport function", () => {
    let mongoServer;

    // Khởi tạo DB memory
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    // ngắt kết nối sau khi test
    afterAll(async () => {
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    // Dọn dữ liệu sau mỗi test
    afterEach(async () => {
        await User.deleteMany({});
        await Report.deleteMany({});
        jest.clearAllMocks();
    });

    // TC02: report not found
    it("TC02: should return 404 if report not found", async () => {
        let res = await request(app)
        .post("/report/507f1f77bcf86cd799439011/review")
        .send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy yêu cầu");
    });

    // TC03, TC04: report's status is not pending
    it("TC03-TC04: should return 404 if report'status not pending", async () => {
        const report = await Report.create({
            title: "Something",
            description: "Test report",
            status: "reviewed",
            report_type: "spam",
            reported_item_type: "message",
            reporter_id: new mongoose.Types.ObjectId(), 
            reported_item_id: new mongoose.Types.ObjectId()
        });

        res = await request(app)
        .post(`/report/${report._id}/review`)
        .send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy yêu cầu");
    });

    // TC01: Xem xét báo cáo thành công
    it("TC01: should update report status and reviewer_id successfully", async () => {
        const report = await Report.create({
            title: "Device issue",
            description: "Broken chair",
            status: "pending",
            report_type: "spam",
            reported_item_type: "message",
            reporter_id: new mongoose.Types.ObjectId(), 
            reported_item_id: new mongoose.Types.ObjectId()
        });

        const res = await request(app)
        .post(`/report/${report._id}/review`)
        .send();

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đã xem xét báo cáo");

        const updated = await Report.findById(report._id);
        expect(updated.status).toBe("reviewed");
        expect(updated.reviewer_id).toBeDefined();
    });

    // TC05: simulate update error (error when assigning fields)
    it("TC05: should return 500 if error occurs while updating fields", async () => {
        const mockReport = {
        status: "pending",
        save: jest.fn(),
        };

        // Mock the property assignment to throw an error
        const originalStatus = mockReport.status;
        Object.defineProperty(mockReport, "status", {
        get: () => originalStatus,
        set: () => {
            throw new Error("Update error");
        },
        configurable: true
        });

        const mockFind = jest
        .spyOn(Report, "findById")
        .mockResolvedValue(mockReport);

        const res = await request(app)
        .post("/report/507f1f77bcf86cd799439011/review")
        .send();

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");

        mockFind.mockRestore();
    });

    // TC06: simulate save error (error when saving to DB)
    it("TC06: should return 500 if error occurs while saving report", async () => {
        const mockReport = {
        status: "pending",
        reviewer_id: null,
        save: jest.fn().mockRejectedValue(new Error("Save error")),
        };

        const mockFind = jest
        .spyOn(Report, "findById")
        .mockResolvedValue(mockReport);

        const res = await request(app)
        .post("/report/507f1f77bcf86cd799439011/review")
        .send();

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");

        mockFind.mockRestore();
    });
});

