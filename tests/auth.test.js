import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Mock the sendResetPasswordEmail function
const sendResetPasswordEmail = jest.fn();
await jest.unstable_mockModule("../utils/sendEmail.js", () => ({
    sendResetPasswordEmail,
    default: jest.fn()
}));

const { User } = await import("../models/index.js");
const app = (await import("../app.js")).default;

describe("Auth Controller API", () => {
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
        jest.clearAllMocks();
    });

    // TEST hàm forgotPassword -> Quên mật khẩu
    it("should return 404 if email not found", async () => {
        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "notfound@example.com" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy email.");
    });

    it("should return 400 if email is missing", async () => {
        const res = await request(app)
        .post("/auth/forgot-password")
        .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Phải có email.");
    });

    it("should generate token, save user, and send reset password email successfully", async () => {
        const user = await User.create({
            email: "test@example.com",
            password: "hashedpassword",
            full_name: "Test User",
            faculty: "SE"
        });

        // Mock the crypto.randomBytes to return a predictable value
        const mockRandomBytes = jest.spyOn(crypto, "randomBytes");
        mockRandomBytes.mockReturnValue(Buffer.from("abcd1234", "hex"));

        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "test@example.com" });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đã gửi email đặt lại mật khẩu. Vui lòng check email của bạn!");

        // Verify the user was updated with reset token
        const updatedUser = await User.findById(user._id);
        expect(updatedUser.resetPasswordToken).toBe("abcd1234");
        expect(updatedUser.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());

        // Verify email was sent (mock might not work in this setup, so we'll just verify the token was set)
        expect(sendResetPasswordEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.stringContaining("http://localhost:3000/reset-password?token=abcd1234")
        );

        mockRandomBytes.mockRestore();
    });

    it("should handle internal server error", async () => {
        const mock = jest.spyOn(User, "findOne").mockRejectedValue(new Error("DB error"));

        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "error@example.com" });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        mock.mockRestore();
    });

    //TEST hàm resetPassword -> Đặt lại mật khẩu
    it("should return 400 if token is invalid or expired", async () => {
        await User.create({
        email: "expired@example.com",
        password: "oldpassword",
        faculty: "SE",
        full_name: "hermione",
        resetPasswordToken: "expiredtoken",
        resetPasswordExpires: Date.now() - 10000, // expired
        });

        const res = await request(app)
        .post("/auth/reset-password")
        .send({ token: "expiredtoken", newPassword: "newpass123" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn.");
    });

    it("should reset password successfully when token is valid", async () => {
        const hashed = await bcrypt.hash("oldpassword", 10);
        const user = await User.create({
        email: "valid@example.com",
        password: hashed,
        faculty: "SE",
        full_name: "hermione",
        resetPasswordToken: "validtoken",
        resetPasswordExpires: Date.now() + 10 * 60 * 1000,
        });

        const res = await request(app)
        .post("/auth/reset-password")
        .send({
            token: "validtoken",
            newPassword: "newpassword123",
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đặt lại mật khẩu thành công.");

        // Kiểm tra DB đã update
        const updatedUser = await User.findById(user._id);
        const match = await bcrypt.compare("newpassword123", updatedUser.password);
        expect(match).toBe(true);
        expect(updatedUser.resetPasswordToken).toBeUndefined();
        expect(updatedUser.resetPasswordExpires).toBeUndefined();
    });

    it("should return 500 if server error occurs", async () => {
        const mock = jest
        .spyOn(User, "findOne")
        .mockRejectedValue(new Error("DB error"));

        const res = await request(app)
        .post("/auth/reset-password")
        .send({ token: "something", newPassword: "newpass" });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");

        mock.mockRestore();
    });
});



