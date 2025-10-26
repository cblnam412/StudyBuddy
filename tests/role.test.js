import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const userId = new mongoose.Types.ObjectId();
const adminUserId = new mongoose.Types.ObjectId();

// Mock authentication middleware
await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { _id: adminUserId, system_role: "admin" };
    next();
  }),
  isModerator: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next()),
  verifyTokenForProfile: jest.fn((req, res, next) => next()),
}));

// Mock socket functionality
const mockEmitToUser = jest.fn();
await jest.unstable_mockModule("../socket/onlineUser.js", () => ({
  emitToUser: mockEmitToUser,
  onlineUsers: new Map(),
}));

const { User, Notification } = await import("../models/index.js");
const app = (await import("../app.js")).default;

describe("Role Controller API - Test setRole function", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Notification.deleteMany({});
    jest.clearAllMocks();
    mockEmitToUser.mockClear();
  });

  // TC02: Both userId and newRole missing
  it("TC02: should return 400 if both userId and newRole are missing", async () => {
    const res = await request(app)
      .post("/admin/set-role")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Thiếu userId hoặc newRole.");
  });

  // TC03: Invalid role - not in allowed list
  it("TC03: should return 400 if newRole is invalid", async () => {
    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "superadmin" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Role không hợp lệ.");
  });

  // TC05: User ID not found
  it("TC05: should return 404 if user not found", async () => {
    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "moderator" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy user.");
  });

  // TC04: User already has the same role
  it("TC04: should return 400 if user already has indicated role", async () => {
    await User.create({
      _id: userId,
      username: "testuser",
      password: "123",
      faculty: "SE",
      full_name: "john wick",
      system_role: "moderator",
    });

    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "moderator" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User đã là moderator.");
  });

  // TC01: succesfully update role from User to Moderator
  it("TC01: should successfully change user role", async () => {
    const user = await User.create({
      _id: userId,
      username: "jwick",
      password: "123",
      faculty: "SE",
      full_name: "john wick",
      system_role: "user",
    });

    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: user._id, newRole: "moderator" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã nâng quyền user thành moderator.");

    // Verify user role was updated
    const updated = await User.findById(user._id);
    expect(updated.system_role).toBe("moderator");

    // Verify notification was created
    const notification = await Notification.findOne({ user_id: user._id });
    expect(notification).not.toBeNull();
    expect(notification.title).toBe("Thay đổi quyền");
    expect(notification.content).toBe("Quyền hệ thống của bạn đã được đổi thành moderator.");

    // Verify socket emission
    expect(mockEmitToUser).toHaveBeenCalledWith(
      undefined, // io object (undefined in test environment)
      user._id.toString(),
      "user:role_updated",
      { notification: expect.objectContaining({
        title: "Thay đổi quyền",
        content: "Quyền hệ thống của bạn đã được đổi thành moderator."
      })}
    );
  });

  // TC06: Database error during user lookup
  it("TC06: should return 500 if there's error in finding user", async () => {
    const mock = jest.spyOn(User, "findById").mockRejectedValue(new Error("Database connection failed"));

    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "moderator" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server.");

    mock.mockRestore();
  });

  // TC07: Database error during user save
  it("TC07: should return 500 if user.save() throws error", async () => {
    const user = await User.create({
      _id: userId,
      username: "jwick",
      password: "123",
      faculty: "SE",
      full_name: "john wick",
      system_role: "user",
    });

    const mockSave = jest.spyOn(User.prototype, "save").mockRejectedValue(new Error("Save failed"));

    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: user._id, newRole: "moderator" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server.");

    mockSave.mockRestore();
  });

  // TC08: Database error during notification creation
  it("TC08: should return 500 if Notification.create throws error", async () => {
    const user = await User.create({
      _id: userId,
      username: "jwick",
      password: "123",
      faculty: "SE",
      full_name: "john wick",
      system_role: "user",
    });

    const mockNotification = jest.spyOn(Notification, "create").mockRejectedValue(new Error("Notification creation failed"));

    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: user._id, newRole: "moderator" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server.");

    mockNotification.mockRestore();
  });
});
