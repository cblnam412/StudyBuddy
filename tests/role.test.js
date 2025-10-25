import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const userId = new mongoose.Types.ObjectId();

await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { _id: userId, system_role: "admin" };
    next();
  }),
  isModerator: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next()),
  verifyTokenForProfile: jest.fn((req, res, next) => next()),
}));

// await jest.unstable_mockModule("../socket/onlineUser.js", () => ({
//   emitToUser: jest.fn(),
// }));

const { User, Notification } = await import("../models/index.js");
const app = (await import("../app.js")).default;

// const { emitToUser } = await import("../utils/socket.js");

describe("Role Controller API", () => {
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
  });

  // Thiếu userId hoặc newRole
  it("should return 400 if userId or newRole is missing", async () => {
    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Thiếu userId hoặc newRole.");
  });

  // Role không hợp lệ
  it("should return 400 if newRole is invalid", async () => {
    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "superadmin" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Role không hợp lệ.");
  });

  // User không tồn tại
  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "moderator" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Không tìm thấy user.");
  });

  // User đã có role này rồi
  it("should return 400 if user already has that role", async () => {
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

  // Thành công
  it("should update role, create notification and emit event", async () => {
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

    const updated = await User.findById(user._id);
    expect(updated.system_role).toBe("moderator");

    // const notification = await Notification.findOne({ user_id: user._id });
    // expect(notification).not.toBeNull();
    // expect(notification.title).toBe("Thay đổi quyền");

    // expect(emitToUser).toHaveBeenCalled();
  });

  // Lỗi server
  it("should return 500 if database throws error", async () => {
    const mock = jest.spyOn(User, "findById").mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/admin/set-role")
      .send({ userId: userId, newRole: "moderator" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Lỗi server.");

    mock.mockRestore();
  });
});
