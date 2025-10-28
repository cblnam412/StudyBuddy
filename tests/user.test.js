import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";

// Mock bcrypt module
jest.mock("bcrypt", () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

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
const bcryptMock = await import("bcrypt");

describe("User Controller API: Test changePassword function", () => {
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
        jest.clearAllMocks();
        // Reset bcrypt mocks to default behavior
        bcryptMock.compare.mockReset();
        bcryptMock.hash.mockReset();
    });

    // TC01: Không tìm thấy người dùng
    it("UTCID01: should return 404 if user (find by ID) not found", async () => {
        const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "123456", newPassword: "abcdef" });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy người dùng.");
    });

    // TC02: Mật khẩu cũ không đúng
    it("UTCID02: should return 400 if old password is incorrect", async () => {
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

    // TC03: Đổi mật khẩu thành công
    it("UTCID03: should change password successfully", async () => {

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

    // TC04: bcrypt.compare throws error
    it("UTCID04: should return 500 if bcrypt.compare throws error", async () => {
    const hashed = await bcrypt.hash("oldpass", 10);
    await User.create({
        _id: userId,
        email: "compareerror@example.com",
        password: hashed,
        full_name: "User Compare Error",
        faculty: "IS"
    });

    bcryptMock.compare.mockRejectedValue(new Error("Compare failed"));

    const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "oldpass", newPassword: "newpass123" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server");

    bcryptMock.compare.mockRestore();
    });


    // TC05: bcrypt.hash throws error
    it("UTCID05: should return 500 if bcrypt.hash throws error", async () => {
    const hashed = await bcrypt.hash("oldpass", 10);
    await User.create({
        _id: userId,
        email: "hasherror@example.com",
        password: hashed,
        full_name: "User Hash Error",
        faculty: "SE"
    });

    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.hash.mockRejectedValue(new Error("Hash failed"));

    const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "oldpass", newPassword: "newpass123" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server");

    bcryptMock.hash.mockRestore();
    });


    // TC06: user.save throws error
    it("UTCID06: should return 500 if user.save throws error", async () => {
    const hashed = await bcrypt.hash("oldpass", 10);
    const user = await User.create({
        _id: userId,
        email: "saveerror@example.com",
        password: hashed,
        full_name: "User Save Error",
        faculty: "CS"
    });

    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.hash.mockResolvedValue("newhashedpassword");

    // Mock luôn chain findById().select()
    const mockSelect = jest.fn().mockResolvedValue({
        ...user.toObject(),
        save: jest.fn().mockRejectedValue(new Error("Save failed")),
    });
    jest.spyOn(User, "findById").mockReturnValue({ select: mockSelect });

    const res = await request(app)
        .put("/user/change-password")
        .send({ oldPassword: "oldpass", newPassword: "newpass123" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server");

    jest.restoreAllMocks();
    });

});


