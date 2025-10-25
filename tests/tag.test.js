import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const moderatorId = new mongoose.Types.ObjectId();
console.log("MODERATOR ID: ", moderatorId);

// Mô phỏng middleware xác thực để test
await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  verifyToken: jest.fn((req, res, next) => {
    console.log("MOCK AUTH RUNNING");
    req.user = { id: moderatorId, system_role: "moderator" };
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

const { Tag, TagRoom, Room } = await import("../models/index.js");
const app = (await import("../app.js")).default;

describe("Tag Controller API", () => {
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
        await Room.deleteMany({});
        await TagRoom.deleteMany({});
        await Tag.deleteMany({});
    });

    // TEST hàm createTag -> Tạo thêm tag chung cho hệ thống
    it("should allow moderator to create tag", async () => {

        const res = await request(app)
        .post("/tag")
        .send({ tagName: "ctdlvgt"});
        
        console.log("RESPONSE:", res.status, res.body);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Tag đã được thêm thành công.");

        const found = await Tag.findOne({ tagName: "ctdlvgt" });
        expect(found).not.toBeNull();
    });

    it("should reject if tag name is null", async () => {
        const res = await request(app)
        .post("/tag")
        .send({});

        console.log("RESPONSE:", res.status, res.body);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Thiếu tên Tag");
    });

    it("should reject if tag already exists", async () => {
        await Tag.create({ tagName: "nodejs" });

        const res = await request(app).post("/tag").send({ tagName: "NodeJS" });
        
        console.log("RESPONSE:", res.status, res.body);

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("Đã có Tag này");
    });

    it("should return 500 if database error occurs", async () => {
        // giả lập lỗi từ Tag.findOne
        jest.spyOn(Tag, "findOne").mockRejectedValue(new Error("DB connection failed"));

        const res = await request(app).post("/tag").send({ tagName: "network" });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Lỗi server");
        expect(res.body.error).toBe("DB connection failed");
    });
});

