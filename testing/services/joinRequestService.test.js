import { beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import { JoinRoomRequest } from "../../requests/manageJoinRoomRequest.js";

//------ TEST HÀM validateJoinRequest() ------//
describe("TEST ROOMREQ006 - validateJoinRequest() function", () => {
    let basePayload;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "abc123",
            data: {
                room_id: "room123",
                message: "Tin nhắn xin tham gia hợp lệ",
                invite_token: null
            },
            models: {
                RoomUser: { findOne: jest.fn(), findById: jest.fn()},
                Room: { findOne: jest.fn(), findById: jest.fn() },
            }
        };

    });
    
    test("TC08: throw lỗi nếu message không là chuỗi hoặc < 10 ký tự", async () => {
        basePayload.data.message = "abc";

        basePayload.models.Room.findById.mockResolvedValue({ _id: "room123", status: "public" });
        basePayload.models.RoomUser.findOne.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate())
            .rejects
            .toThrow(
            "message phải là chuỗi và tối thiểu 10 ký tự."
        );
    });

    test("TC07: throw lỗi nếu thiếu room_id hoặc message", async () => {
        basePayload.data.room_id = "";
        basePayload.data.message = "";

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate())
            .rejects
            .toThrow("Không được bỏ trống room_id hoặc message.");
    });

    test("TC06: throw lỗi nếu không tìm thấy phòng", async () => {
        basePayload.models.Room.findById.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate())
            .rejects
            .toThrow("Không tìm thấy phòng.");
    });

    test("TC05: throw lỗi nếu invite_token không đúng định dạng", async () => {
        basePayload.data.invite_token = "12345";
        // mock sai format token
        mongoose.Types.ObjectId.isValid.mockReturnValue(false); 

        basePayload.models.Room.findById.mockResolvedValue({ _id: "room123", status: "private" });
        basePayload.models.RoomUser.findOne.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate())
            .rejects
            .toThrow("invite_token không đúng định dạng.");
    });

    test("TC04: throw lỗi nếu phòng private nhưng thiếu invite_token", async () => {
        basePayload.data.invite_token = null;

        basePayload.models.Room.findById.mockResolvedValue({ _id: "room123", status: "private" });
        basePayload.models.RoomUser.findOne.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate())
            .rejects
            .toThrow("Phòng private yêu cầu mã tham gia (invite_token).");
    });

    test("TC03: validate thành công cho phòng private", async () => {
        basePayload.data.invite_token = "507f1f77bcf86cd799439011"; 

        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "private"
        });

        basePayload.models.RoomUser.findOne.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate()).resolves.not.toThrow();
        expect(req.room).toEqual({ _id: "room123", status: "private" });
    });

    test("TC02: throw lỗi nếu phòng có status = safe-mode", async () => {
        basePayload.models.Room.findById.mockResolvedValue({ _id: "room123", status: "safe-mode" });
        basePayload.models.RoomUser.findOne.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate())
            .rejects
            .toThrow("Hiện tại nhóm đang tạm khóa (safe-mode).");
    });

    test("TC01: validate thành công cho phòng public", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "public"
        });

        basePayload.models.RoomUser.findOne.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.validate()).resolves.not.toThrow();
        expect(req.room).toEqual({ _id: "room123", status: "public" });
    });
});

// //------ TEST HÀM saveJoinRequest() ------//
describe("TEST ROOMREQ007 - saveJoinRequest() function", () => {
    let basePayload;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "abc123",
            data: {
                room_id: "room123",
                message: "Tin nhắn xin tham gia hợp lệ",
                invite_token: "VALID_TOKEN_456"
            },
            models: {
                JoinRequest: { findOne: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
                RoomInvite: { findOneAndUpdate: jest.fn() },
                Room: { findById: jest.fn() },
                RoomUser: {exists: jest.fn()},
            }
        };
    });

    test("TC06: tạo yêu cầu tham gia phòng (private) thành công", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "private"
        });

        basePayload.models.RoomInvite.findOneAndUpdate.mockResolvedValue({
            token: "VALID_TOKEN_456",
            uses: 1
        });

        basePayload.models.JoinRequest.findOne.mockResolvedValue(null);
        basePayload.models.JoinRequest.deleteMany.mockResolvedValue({});

        basePayload.models.JoinRequest.create.mockResolvedValue({
            _id: "new_request",
            user_id: "abc123",
            room_id: "room123",
            message: "Tin nhắn xin tham gia hợp lệ",
            status: "pending"
        });

        const req = new JoinRoomRequest(basePayload);

        const result = await req.saveRequest();

        expect(result).toEqual({
            _id: "new_request",
            user_id: "abc123",
            room_id: "room123",
            message: "Tin nhắn xin tham gia hợp lệ",
            status: "pending"
        });
    });

    test("TC05: throw lỗi khi phòng private nhưng invite_token hết hạn", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "private"
        });

        basePayload.models.RoomInvite.findOneAndUpdate.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.saveRequest())
            .rejects
            .toThrow("Invite_token không hợp lệ hoặc đã hết lượt sử dụng.");
    });

    test("TC04: throw lỗi khi phòng private nhưng invite_token hết lượt sử dụng", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "private"
        });

        basePayload.models.RoomInvite.findOneAndUpdate.mockResolvedValue(null);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.saveRequest())
            .rejects
            .toThrow("Invite_token không hợp lệ hoặc đã hết lượt sử dụng.");
    });

    test("TC03: throw lỗi khi user đã là thành viên (approved)", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "public"
        });

        basePayload.models.JoinRequest.findOne.mockResolvedValue({
            status: "approved"
        });

        basePayload.models.RoomUser.exists.mockResolvedValue(true);

        const req = new JoinRoomRequest(basePayload);

        await expect(req.saveRequest())
            .rejects
            .toThrow("Bạn đã là thành viên của phòng này.");
    });

    test("TC02: throw lỗi khi đã có request pending", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "public"
        });

        basePayload.models.JoinRequest.findOne.mockResolvedValue({
            status: "pending"
        });

        const req = new JoinRoomRequest(basePayload);

        await expect(req.saveRequest())
            .rejects
            .toThrow("Bạn đã gửi yêu cầu tham gia và đang chờ duyệt.");
    });

    test("TC01: tạo yêu cầu tham gia phòng (public) thành công", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "public"
        });

        basePayload.models.JoinRequest.findOne.mockResolvedValue(null);
        basePayload.models.JoinRequest.deleteMany.mockResolvedValue({});
        basePayload.models.JoinRequest.create.mockResolvedValue({
            _id: "new_request",
            user_id: "abc123",
            room_id: "room123",
            message: "Tin nhắn xin tham gia hợp lệ",
            status: "pending"
        });

        const req = new JoinRoomRequest(basePayload);

        const result = await req.saveRequest();

        expect(result).toEqual({
            _id: "new_request",
            user_id: "abc123",
            room_id: "room123",
            message: "Tin nhắn xin tham gia hợp lệ",
            status: "pending"
        });
    });
});

//------ TEST HÀM approveJoinRequest() ------//
describe("TEST ROOMREQ008 - approveJoinRequest() function", () => {
    let basePayload, reqInstance;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "abc123",
            data: {
                room_id: "room123",
                message: "Tin nhắn xin tham gia hợp lệ",
                invite_token: "VALID_TOKEN_456"
            },
            models: {
                JoinRequest: { findOne: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
                RoomInvite: { findOneAndUpdate: jest.fn() },
                Room: { findById: jest.fn() },
                RoomUser: { create: jest.fn() },
                Notification: { create: jest.fn() }
            }
        };

        reqInstance = new JoinRoomRequest(basePayload);

        reqInstance.request = {
            _id: "req123",
            user_id: "abc123",
            room_id: "room123",
            message: "Tin nhắn xin tham gia hợp lệ",
            invite_token: "VALID_TOKEN_456",
            status: "pending",
            save: jest.fn()
        };
    });

    test("TC07: throw lỗi nếu thiếu approverId", async () => {
        await expect(reqInstance.approve(""))
            .rejects
            .toThrow("Không được thiếu approverId.");
    });

    test("TC06: throw lỗi nếu approverId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(reqInstance.approve("abc"))
            .rejects.toThrow("approverId không hợp lệ.");
    });

    test("TC05: throw lỗi nếu không tìm thấy phòng", async () => {
        basePayload.models.Room.findById.mockResolvedValue(null);

        await expect(reqInstance.approve("approver123"))
            .rejects.toThrow("Không tìm thấy phòng.");
    });

    test("TC04: throw lỗi nếu không tìm thấy yêu cầu", async () => {
        reqInstance.request = null;

        await expect(reqInstance.approve("approver123"))
            .rejects.toThrow("Yêu cầu không tồn tại.");
    });

    test("TC03: throw lỗi nếu status != pending", async () => {
        reqInstance.request.status = "approved";

        await expect(reqInstance.approve("approver123"))
            .rejects.toThrow("Yêu cầu đã được xử lý.");
    });

    test("TC02: throw lỗi nếu room_status = safe-mode", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "safe-mode"
        });

        await expect(reqInstance.approve("approver123"))
            .rejects.toThrow("Bây giờ không thể thêm thành viên vào nhóm.");
    });

    test("TC01: duyệt(chấp nhận) yêu cầu thành công", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            room_name: "Phòng Test",
            status: "public"
        });

        basePayload.models.RoomUser.create.mockResolvedValue({});
        basePayload.models.Notification.create.mockResolvedValue({ _id: "noti123" });

        const result = await reqInstance.approve("approver123");

        expect(basePayload.models.RoomUser.create).toHaveBeenCalled();
        expect(reqInstance.request.status).toBe("approved");
        expect(reqInstance.request.approver_id).toBe("approver123");
        expect(reqInstance.request.save).toHaveBeenCalled();

        expect(basePayload.models.Notification.create).toHaveBeenCalledWith({
            user_id: "abc123",
            title: "Yêu cầu tham gia phòng đã được duyệt.",
            content: `Bạn đã được thêm vào phòng Phòng Test.`
        });
    });
});

//------ TEST HÀM rejectJoinRequest() ------//
describe("TEST ROOMREQ009 - rejectJoinRequest() function", () => {
    let basePayload, reqInstance;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "user123",
            data: {
                room_id: "room123",
                message: "Tin nhắn xin tham gia hợp lệ",
                invite_token: "VALID_TOKEN_456"
            },
            models: {
                Notification: { create: jest.fn() },
                RoomUser: { create: jest.fn() },
                Room: { findById: jest.fn() },
            }
        };

        reqInstance = new JoinRoomRequest(basePayload);

        reqInstance.request = {
            _id: "req123",
            user_id: "user123",
            room_id: "room123",
            message: "Tin nhắn xin tham gia hợp lệ",
            invite_token: "VALID_TOKEN_456",
            status: "pending",
            save: jest.fn()
        };
    });

    test("TC08: throw lỗi nếu approverId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(reqInstance.reject("abc", "reason"))
            .rejects.toThrow("approverId không hợp lệ.");
    });

    test("TC07: throw lỗi nếu thiếu reason", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            room_name: "Phòng Test",
            status: "public"
        });

        await expect(reqInstance.reject("moderator123", ""))
            .rejects
            .toThrow("Yêu cầu điền lý do.");
    });

    test("TC06: throw lỗi nếu reason không hợp lệ (không phải chuỗi hoặc quá ngắn)", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            room_name: "Phòng Test",
            status: "public"
        });

        await expect(reqInstance.reject("moderator123", 123))
            .rejects
            .toThrow("Lý do từ chối phải là chuỗi và tối thiểu 10 ký tự.");

        await expect(reqInstance.reject("moderator123", "hi"))
            .rejects
            .toThrow("Lý do từ chối phải là chuỗi và tối thiểu 10 ký tự.");
    });

    test("TC05: throw lỗi nếu thiếu approverId", async () => {
        await expect(reqInstance.reject("", "reason"))
            .rejects
            .toThrow("Không được thiếu approverId.");
    });

    test("TC04: throw lỗi nếu không tìm thấy phòng", async () => {
        basePayload.models.Room.findById.mockResolvedValue(null);

        await expect(reqInstance.reject("moderator123", "reason"))
            .rejects.toThrow("Không tìm thấy phòng.");
    });

    test("TC03: throw lỗi nếu không tìm thấy yêu cầu", async () => {
        reqInstance.request = null;

        await expect(reqInstance.reject("moderator123", "reason"))
            .rejects.toThrow("Yêu cầu không tồn tại.");
    });

    test("TC02: throw lỗi nếu status != pending", async () => {
        reqInstance.request.status = "rejected";

        await expect(reqInstance.reject("moderator123", "reason"))
            .rejects.toThrow("Yêu cầu đã được xử lý.");
    });

    test("TC01: duyệt (từ chối) yêu cầu thành công ", async () => {
        basePayload.models.Room.findById.mockResolvedValue({
            _id: "room123",
            room_name: "Phòng Test",
            status: "public"
        });

        basePayload.models.RoomUser.create.mockResolvedValue({});
        basePayload.models.Notification.create.mockResolvedValue({ _id: "noti123" });

        const result = await reqInstance.reject("moderator123", "reason_rejected");

        expect(reqInstance.request.status).toBe("rejected");
        expect(reqInstance.request.approver_id).toBe("moderator123");
        expect(reqInstance.request.save).toHaveBeenCalled();

        expect(basePayload.models.Notification.create).toHaveBeenCalledWith({
            user_id: "user123",
            title: "Yêu cầu tham gia phòng bị từ chối.",
            content: `Lý do: reason_rejected.`
        });
    });
});