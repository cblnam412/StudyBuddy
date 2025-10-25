import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";

// Mô phỏng middleware xác thực để test
const userId = new mongoose.Types.ObjectId();

await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  verifyTokenForProfile: jest.fn((req, res, next) => {
    console.log("MOCK AUTH RUNNING");
    req.user = { _id: userId };
    next();
  }),
  isModerator: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next()),
  verifyToken: jest.fn((req, res, next) => next()),
}));

const { User } = await import("../models/index.js");
const app = (await import("../app.js")).default;

describe("User Controller API", () => {
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
    });

    it("should return 404 if user not found", async () => {
        const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "123456", newPassword: "abcdef" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy người dùng.");
    });

    it("should return 400 if old password is incorrect", async () => {
        const hashed = await bcrypt.hash("correctOldPassword", 10);

        await User.create({
            _id: userId,
            username: "testuser",
            password: hashed,
            full_name: "john wick",
            faculty: "CE"
        });

        const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "wrongOldPassword", newPassword: "newPass123" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Mật khẩu cũ không đúng.");
    });

    it("should change password successfully", async () => {

        const hashed = await bcrypt.hash("oldpass123", 10);

        await User.create({
            _id: userId,
            username: "testuser",
            password: hashed,
            full_name: "harry potter",
            faculty: "IS"
        });

        const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "oldpass123", newPassword: "newpass456" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đổi mật khẩu thành công.");

        const updatedUser = await User.findById(userId).select("+password");
        const isMatch = await bcrypt.compare("newpass456", updatedUser.password);
        expect(isMatch).toBe(true);
    });
});

