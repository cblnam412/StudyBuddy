import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const leaderId = new mongoose.Types.ObjectId();
console.log("LEADER ID: ", leaderId);

// Mô phỏng middleware xác thực để test
await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  verifyToken: jest.fn((req, res, next) => {
    console.log("MOCK AUTH RUNNING");
    req.user = { id: leaderId, system_role: "user" };
    next();
  }),
  isModerator: jest.fn((req, res, next) => next()),
  isAdmin: jest.fn((req, res, next) => next()),
  verifyTokenForProfile: jest.fn((req, res, next) => next()),
}));

await jest.unstable_mockModule("../middlewares/roomMiddleware.js", () => ({
  isRoomLeader: jest.fn((req, res, next) => next()),
  isArchive: jest.fn((req, res, next) => next()),
  isSafeMode: jest.fn((req, res, next) => next()),
  safeModeAndArchive: jest.fn((req, res, next) => next()),
}));


const { Room, RoomUser, JoinRequest, RoomInvite } = await import("../models/index.js");
const app = (await import("../app.js")).default;

describe("Room Controller API", () => {
    let mongoServer;
    let room;
    let joinRequest;
    let userId = new mongoose.Types.ObjectId().toString();

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
        await Room.deleteMany({});
        await RoomUser.deleteMany({});
        await JoinRequest.deleteMany({});
    });

    // TEST hàm joinRoomRequest -> Tạo yêu cầu tham gia phòng học
    it("should allow a user to send join request", async () => {
        room = await Room.create({
        room_name: "Test Room A",
        status: "public",
        });

        const res = await request(app)
        .post("/room/join-room")
        .send({ room_id: room._id, message: "I want to join this room!!!"});
        
        console.log("RESPONSE:", res.status, res.body);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Yêu cầu tham gia đã được gửi");

        const found = await JoinRequest.findOne({ room_id: room._id });
        expect(found).not.toBeNull();
    });

    it("should reject if room not found", async () => {
        const res = await request(app)
        .post("/room/join-room")
        .send({ room_id: new mongoose.Types.ObjectId() });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Không tìm thấy phòng");
    });

    // it("should reject if already a member", async () => {
    //     const room = await Room.create({ room_name: "Test Room B", status: "public" });
        
    //     await RoomUser.create({ user_id: userId, room_id: room._id });

    //     const res = await request(app)
    //     .post("/room/join-room")
    //     .send({ room_id: room._id });

    //     expect(res.status).toBe(400);
    //     expect(res.body.message).toBe("Bạn đã là thành viên của phòng này");
    // });

    it("should reject if room is in safe-mode", async () => {
        const room = await Room.create({ room_name: "Test Room C", status: "safe-mode" });

        const res = await request(app)
        .post("/room/join-room")
        .send({ room_id: room._id });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Bây giờ không thể tham gia nhóm");
    });

    //  it("should reject if existing pending request", async () => {
    //     const room = await Room.create({ room_name: "Test Room D", status: "public" });
        
    //     await JoinRequest.create({
    //         user_id: userId,
    //         room_id: room._id,
    //         status: "pending",
    //         expires_at: new Date(Date.now() + 86400000),
    //     });

    //     const res = await request(app)
    //     .post("/room/join-room")
    //     .send({ room_id: room._id });

    //     expect(res.status).toBe(400);
    //     expect(res.body.message).toBe("Bạn đã gửi yêu cầu tham gia và đang chờ duyệt");
    // });


    // it("should reject if existing approved request", async () => {
    //     const room = await Room.create({ room_name: "Test Room E", status: "public" });
        
    //     await JoinRequest.create({
    //         user_id: userId,
    //         room_id: room._id,
    //         status: "approved",
    //         expires_at: new Date(Date.now() + 86400000),
    //     });

    //     const res = await request(app)
    //     .post("/room/join-room")
    //     .send({ room_id: room._id });

    //     expect(res.status).toBe(400);
    //     expect(res.body.message).toBe("Bạn đã là thành viên của phòng này");
    // });

    it("should reject private room without invite_token", async () => {
        const room = await Room.create({ room_name: "Test Room F", status: "private" });

        const res = await request(app)
        .post("/room/join-room")
        .send({ room_id: room._id });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Cần có link mời để tham gia phòng private");
    });

    it("should reject invalid or expired invite token", async () => {
        const room = await Room.create({ room_name: "Test Room G", status: "private" });

        const res = await request(app)
        .post("/room/join-room")
        .send({ room_id: room._id, invite_token: "wrongtoken" });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Link mời không hợp lệ, đã hết hạn hoặc đã được dùng");
    });

    it("should allow join private room with valid invite token", async () => {
        const room = await Room.create({ room_name: "Test Room H", status: "private" });
        
        const invite = await RoomInvite.create({
            room_id: room._id,
            token: "validtoken",
            uses: 0,
            expires_at: new Date(Date.now() + 86400000),
        });

        const res = await request(app)
        .post("/room/join-room")
        .send({ room_id: room._id, invite_token: "validtoken" });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Yêu cầu tham gia đã được gửi");
    });

    // TEST hàm approveJoinRequest -> Leader chấp thuận Yêu cầu tham gia phòng
    it("should approve join request successfully", async () => {
        room = await Room.create({
        room_name: "Room A",
        status: "public",
        });

        joinRequest = await JoinRequest.create({
        room_id: room._id,
        user_id: userId,
        status: "pending",
        });

        const res = await request(app)
        .post(`/room/${joinRequest._id}/approve`)
        .send();

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đã duyệt yêu cầu tham gia");

        const updated = await JoinRequest.findById(joinRequest._id);
        expect(updated.status).toBe("approved");

        const newMember = await RoomUser.findOne({ room_id: room._id, user_id: userId });
        expect(newMember).not.toBeNull();
    });

    it("should return 404 if join request not found", async () => {
        const res = await request(app)
        .post(`/room/${new mongoose.Types.ObjectId()}/approve`)
        .send();

        expect(res.status).toBe(404);
    });

    // TEST hàm kickUser -> Leader kick student ra khỏi phòng
    it("should remove a user from the room", async () => {
        room = await Room.create({
        room_name: "Kick test",
        status: "public",
        });   

        const targetUserId = new mongoose.Types.ObjectId();

        await RoomUser.create({ room_id: room._id, user_id: leaderId, room_role: "leader" });
        await RoomUser.create({ room_id: room._id, user_id: targetUserId });

        const res = await request(app)
        .post("/room/kick-user")
        .send({
            room_id: room._id,
            user_id: targetUserId,
        });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Đã đuổi thành viên khỏi phòng");

        const member = await RoomUser.findOne({ room_id: room._id, user_id: targetUserId });
        expect(member).toBeNull();
    });

    it("should not allow leader to kick themselves", async () => {
        room = await Room.create({ 
            room_name: "SelfKick", 
            status: "public" 
        });

        // thêm leader vào RoomUser
        await RoomUser.create({ room_id: room._id, user_id: leaderId, room_role: "leader" });

        const res = await request(app)
        .post("/room/kick-user")
        .send({
            room_id: room._id,
            user_id: leaderId.toString(),
        });

        console.log("RESPONSE: ", res.status, res.body);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Không thể tự đuổi bản thân");
    });
});

