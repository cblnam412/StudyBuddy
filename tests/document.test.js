import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import * as dbHelper from "./dbHelper.js";
import { User, Document } from "../models/index.js";

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockFrom = jest.fn();

jest.unstable_mockModule("../supabaseClient.js", () => ({
    supabase: { storage: { from: mockFrom } },
}));

let app;
const fakeRoomId = "60c72b9a9b1d8e001f8e8b8b";
let user, userToken;

beforeAll(async () => {
    const mod = await import("../app.js"); // 👈 import sau mock
    app = mod.app;
    await dbHelper.connect();
});

afterEach(async () => {
    await dbHelper.clearDatabase();
    jest.clearAllMocks();
});
afterAll(async () => await dbHelper.closeDatabase());

beforeEach(async () => {
    user = await User.create({
        full_name: "File Uploader",
        email: "uploader@example.com",
        password: "123456",
        faculty: "CS",
        status: "active",
    });
    userToken = jwt.sign({ id: user._id, role: user.system_role }, process.env.JWT_SECRET);

    mockFrom.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
    });
    mockUpload.mockResolvedValue({ data: {}, error: null });
    mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: `http://fake-supabase.com/uploads/${Date.now()}_fake_file.txt` },
    });
});

describe("Document API (/document/upload)", () => {
    it("UF001 - Upload file thành công", async () => {
        const res = await request(app)
            .post("/document/upload")
            .set("Authorization", `Bearer ${userToken}`)
            .field("roomId", fakeRoomId)
            .attach("file", Buffer.from("abc"), "test.txt");

        expect(res.statusCode).toBe(200);
        expect(mockFrom).toHaveBeenCalledWith("uploads");
        expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it("UF002 - Thất bại (400) khi không đính kèm file", async () => {
        const response = await request(app)
            .post("/document/upload")
            .set("Authorization", `Bearer ${userToken}`)
            .field("roomId", fakeRoomId);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Thiếu file");
        expect(mockUpload).not.toHaveBeenCalled();
    });

    it("UF003 - Thất bại (400) khi file vượt quá 20MB", async () => {
        const largeBuffer = Buffer.alloc(21 * 1024 * 1024, "a");

        const response = await request(app)
            .post("/document/upload")
            .set("Authorization", `Bearer ${userToken}`)
            .field("roomId", fakeRoomId)
            .attach("file", largeBuffer, "largefile.txt");

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Dung lượng file tối đa 20MB");
        expect(mockUpload).not.toHaveBeenCalled();
    });

    it("UF004 - Upload file thành công", async () => {
        const res = await request(app)
            .post("/document/upload")
            .set("Authorization", `Bearer ${userToken}`)
            .field("roomId", fakeRoomId)
            .attach("file", Buffer.from("abc"), "test.txt");

        expect(res.statusCode).toBe(200);
        expect(mockFrom).toHaveBeenCalledWith("uploads");
        expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it("UF005 - Thất bại (400) khi thiếu roomId", async () => {
        const response = await request(app)
            .post("/document/upload")
            .set("Authorization", `Bearer ${userToken}`)
            .attach("file", Buffer.from("content"), "testfile.txt");

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe("Thiếu room_id");
        expect(mockUpload).not.toHaveBeenCalled();
    });

    it("UF006 - Lỗi khi Document.create thất bại", async () => {
        jest.spyOn(Document, "create").mockRejectedValueOnce(new Error("Lỗi tạo Document mô phỏng!"));
        const res = await request(app)
            .post("/document/upload")
            .set("Authorization", `Bearer ${userToken}`)
            .field("roomId", fakeRoomId)
            .attach("file", Buffer.from("abc"), "test.txt");

        expect(res.statusCode).toBe(500);
        expect(mockUpload).toHaveBeenCalledTimes(1);
    });
});
