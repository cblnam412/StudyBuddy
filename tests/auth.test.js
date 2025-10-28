import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Mock bcrypt module
jest.mock("bcrypt", () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

// Mock the sendResetPasswordEmail function
const sendResetPasswordEmail = jest.fn();
await jest.unstable_mockModule("../utils/sendEmail.js", () => ({
    sendResetPasswordEmail,
    default: jest.fn()
}));

const { User } = await import("../models/index.js");
const app = (await import("../app.js")).default;
const bcryptMock = await import("bcrypt");

describe("Auth Controller API - Test forgotPassword logic", () => {
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

    // Set up default mock behavior before each test
    beforeEach(async () => {
        // Set up default bcrypt behavior
        bcryptMock.compare.mockImplementation((password, hash) => bcrypt.compare(password, hash));
        bcryptMock.hash.mockImplementation((password, rounds) => bcrypt.hash(password, rounds));
    });

    // Dọn dữ liệu sau mỗi test
    afterEach(async () => {
        await User.deleteMany({});
        jest.restoreAllMocks();
        jest.clearAllMocks();
        // Reset bcrypt mocks to default behavior
        bcryptMock.compare.mockReset();
        bcryptMock.hash.mockReset();
    });

    // TEST hàm forgotPassword -> Quên mật khẩu
    // TC02: email not found
    it("UTCID02: should return 404 if email not found", async () => {
        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "notfound@example.com" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy email.");
    });

    // TC01: send email successfully
    it("UTCID01: should generate token, save user, and send reset password email successfully", async () => {
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

    // TC03: simulate token error
    it("UTCID03: should return 500 if token generation fails", async () => {
        const user = await User.create({
            email: "tokenerror@example.com",
            password: "123456",
            full_name: "Test User",
            faculty: "SE"
        });

        jest
        .spyOn(crypto, "randomBytes")
        .mockImplementation(() => {
            throw new Error("Token generation failed");
        });

        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: user.email });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        expect(res.body.error).toBe("Token generation failed");
    });

    // TC04: simulate save error
    it("UTCID04: should return 500 if user.save() fails", async () => {
        const user = await User.create({
            email: "saveerror@example.com",
            password: "123456",
            full_name: "Test User",
            faculty: "SE"
        });

        jest.spyOn(User.prototype, "save").mockRejectedValue(new Error("Save failed"));

        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: user.email });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        expect(res.body.error).toBe("Save failed");
    });

    // TC05: simulate send email error
    it("UTCID05: should return 500 if sendResetPasswordEmail fails", async () => {
        const user = await User.create({
            email: "sendmailerror@example.com",
            password: "123456",
            full_name: "Test User",
            faculty: "SE"
        });

        sendResetPasswordEmail.mockRejectedValueOnce(
        new Error("Email sending failed")
        );

        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: user.email });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        expect(res.body.error).toBe("Email sending failed");
    });

    // TC06: simulate expired link error
    it("UTCID06: should handle expired token properly", async () => {
        const user = await User.create({
            email: "expired@example.com",
            password: "123456",
            full_name: "Test User",
            faculty: "SE"
        });

        const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: user.email });

        expect(res.status).toBe(200);

        // Giả lập token hết hạn trong DB
        const updated = await User.findOne({ email: user.email });
        updated.resetPasswordExpires = Date.now() - 1000; // expired
        await updated.save();

        // Kiểm tra lại
        const expired = await User.findOne({ email: user.email });
        expect(expired.resetPasswordExpires.getTime()).toBeLessThan(Date.now());
    });
});

describe("Auth Controller API - Test resetPassword logic", () => {
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

    // Set up default mock behavior before each test
    beforeEach(async () => {
        // Set up default bcrypt behavior
        bcryptMock.compare.mockImplementation((password, hash) => bcrypt.compare(password, hash));
        bcryptMock.hash.mockImplementation((password, rounds) => bcrypt.hash(password, rounds));
    });

    // Dọn dữ liệu sau mỗi test
    afterEach(async () => {
        await User.deleteMany({});
        jest.restoreAllMocks();
        jest.clearAllMocks();
        // Reset bcrypt mocks to default behavior
        bcryptMock.compare.mockReset();
        bcryptMock.hash.mockReset();
    });

    //TEST hàm resetPassword -> Đặt lại mật khẩu
    // TC02: invalid token or expired
    it("UTCID02: should return 400 if token is invalid or expired", async () => {
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

    // TC01: reset password successfully
    it("UTCID01: should reset password successfully when token is valid", async () => {
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

    // TC03: simulate hash error
    it("UTCID03: should return 500 if bcrypt.hash throws error", async () => {
        const user = await User.create({
            email: "hasherror@example.com",
            password: "oldpass",
            faculty: "SE",
            full_name: "Ron",
            resetPasswordToken: "hasherror",
            resetPasswordExpires: Date.now() + 10000,
        });

        bcryptMock.hash.mockRejectedValue(new Error("Hash failed"));

        const res = await request(app)
            .post("/auth/reset-password")
            .send({ token: "hasherror", newPassword: "newpass" });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        expect(res.body.error).toBe("Hash failed");

        bcryptMock.hash.mockRestore();
    });


    // TC04: simulate save error
    it("UTCID04: should return 500 if user.save() throws error", async () => {
        const user = await User.create({
            email: "saveerror@example.com",
            password: "oldpass",
            faculty: "SE",
            full_name: "Harry",
            resetPasswordToken: "saveerror",
            resetPasswordExpires: Date.now() + 10000,
        });

        const mockHash = jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedPassword");
        const mockSave = jest
            .spyOn(User.prototype, "save")
            .mockRejectedValue(new Error("Save failed"));

        const res = await request(app)
            .post("/auth/reset-password")
            .send({ token: "saveerror", newPassword: "newpass" });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        expect(res.body.error).toBe("Save failed");

        mockHash.mockRestore();
        mockSave.mockRestore();
    });


    // TC05: simulate undefined token
    it("UTCID05: should return 400 if token is undefined", async () => {
        const res = await request(app)
            .post("/auth/reset-password")
            .send({ newPassword: "whatever" }); // no token

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Token không hợp lệ hoặc đã hết hạn.");
    });
});



