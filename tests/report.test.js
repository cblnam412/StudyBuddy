import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { verifyTokenForProfile } from "../middlewares/authMiddleware.js";

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

describe("Report Controller API", () => {
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

    it("should return 404 if report not found or not pending", async () => {
        // Trường hợp 1: không có report
        let res = await request(app)
        .post("/report/507f1f77bcf86cd799439011/review")
        .send();

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy yêu cầu");

        // Trường hợp 2: report tồn tại nhưng status != pending
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

    it("should update report status and reviewer_id successfully", async () => {
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

    it("should return 500 if server error occurs", async () => {
        const mock = jest
        .spyOn(Report, "findById")
        .mockRejectedValue(new Error("DB error"));

        const res = await request(app)
        .post("/report/507f1f77bcf86cd799439011/review")
        .send();

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");

        mock.mockRestore();
    });
});

