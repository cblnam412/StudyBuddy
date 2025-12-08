import { beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import { CreateRoomRequest } from "../../requests/manageRoomRequest.js";

//------ TEST HÀM validateRoomRequest() ------//
describe("TEST ROOMREQ002 - validateRoomRequest() function", () => {
    let basePayload;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "abc123",
            data: {
                room_name: "Phòng A1",
                room_status: "public",
                description: "Mô tả hợp lệ",
                reason: "Lý do hợp lệ",
                tags: ["tag1", "tag2"]
            },
            models: {}
        };
    });

    test("TCxx: throw nếu tags không phải array", () => {
        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.tags = "not-array";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow("Tags phải là một mảng.");
    });

    test("TC09: throw lỗi nếu thiếu room_name/ room_status / description / reason", () => {

        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.description = "";
        payload.data.reason = "";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate())
            .toThrow("Chưa nhập tên phòng hoặc trạng thái hoặc lý do hoặc mô tả phòng.");
    });

    test("TC08: throw lỗi nếu có tag không phải ObjectId hợp lệ", () => {
        mongoose.Types.ObjectId.isValid
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.tags = ["validTag", "invalidTag"];

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow(
            "Một hoặc nhiều tag không phải ObjectId hợp lệ."
        );
    });

    test("TC07: throw lỗi nếu reason < 5 ký tự", () => {
        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.reason = "xyz";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow(
            "Lý do tạo phòng phải là chuỗi và tối thiểu 5 ký tự."
        );
    });

    test("TC06: throw nếu description < 5 ký tự", () => {
        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.description = "abc";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow(
            "Mô tả phòng phải là chuỗi và tối thiểu 5 ký tự."
        );
    });

    test("TC05: throw lỗi nếu thiếu room_name/ room_status / description / reason", () => {

        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.room_name = "";
        payload.data.room_status = "";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate())
            .toThrow("Chưa nhập tên phòng hoặc trạng thái hoặc lý do hoặc mô tả phòng.");
    });

    test("TC04: throw lỗi nếu room_name < 3 ký tự", () => {
        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.room_name = "ab";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow(
            "Tên phòng phải là chuỗi và tối thiểu 3 ký tự."
        );
    });

    test("TC03: throw lỗi nếu thiếu tags", () => {
        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.tags = null;

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow("Chọn ít nhất một thẻ phòng.");
    });

    test("TC02: throw lỗi nếu room_status không hợp lệ", () => {
        const payload = JSON.parse(JSON.stringify(basePayload));
        payload.data.room_status = "invalid";

        const req = new CreateRoomRequest(payload);

        expect(() => req.validate()).toThrow("Trạng thái phòng không hợp lệ.");
    });

    test("TC01: validate thành công", () => {
        mongoose.Types.ObjectId.isValid.mockImplementation(() => true);

        const req = new CreateRoomRequest(basePayload);

        expect(() => req.validate()).not.toThrow();
        expect(req.tagList).toEqual(basePayload.data.tags);
    });
});

//------ TEST HÀM saveRoomRequest() ------//
describe("TEST ROOMREQ003 - saveRoomRequest() function", () => {
    let basePayload;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "abc123",
            data: {
                room_name: "Phòng A1",
                room_status: "public",
                description: "Mô tả hợp lệ",
                reason: "Lý do hợp lệ",
                tags: ["tag1", "tag2"]
            },
            models: {
                RoomRequest: { findOne: jest.fn(), create: jest.fn() },
                Room: { findOne: jest.fn() },
                Tag: { find: jest.fn() }
            }
        };
    });

    test("TC04: throw lỗi nếu có tag không tồn tại trong DB", async () => {
        basePayload.models.Tag.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([{ _id: "tag1" }]) // thiếu tag2
        });        
        const req = new CreateRoomRequest(basePayload);

        await expect(req.saveRequest()).rejects.toThrow(
            "Một hoặc nhiều tag không hợp lệ."
        );
    });

    test("TC03: throw lỗi nếu đã tồn tại yêu cầu đang chờ với cùng room_name", async () => {
        basePayload.models.Tag.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([{ _id: "tag1" }, { _id: "tag2" }])
        }); 

        basePayload.models.Room.findOne.mockResolvedValue(null);

        basePayload.models.RoomRequest.findOne.mockResolvedValue({ _id: "req1" });

        const req = new CreateRoomRequest(basePayload);

        await expect(req.saveRequest())
            .rejects
            .toThrow(
            "Đã có yêu cầu tạo phòng với tên này đang chờ duyệt."
        );

        expect(basePayload.models.RoomRequest.findOne).toHaveBeenCalledWith({
            room_name: "Phòng A1",
            status: "pending"
        });
    });

    test("TC02: throw lỗi nếu tên phòng đã tồn tại", async () => {
        basePayload.models.Tag.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([{ _id: "tag1" }, { _id: "tag2" }])
        }); 

        basePayload.models.Room.findOne.mockResolvedValue([{ _id: "req1" }]);

        const req = new CreateRoomRequest(basePayload);

        await expect(req.saveRequest()).rejects.toThrow(
            "Tên phòng đã tồn tại trong hệ thống."
        );

        expect(basePayload.models.Room.findOne).toHaveBeenCalledWith({
            room_name: "Phòng A1",
        });
    });

    test("TC01: lưu yêu cầu tạo phòng thành công", async () => {
        basePayload.models.Tag.find.mockReturnValue({
            select: jest.fn().mockResolvedValue([{ _id: "tag1" }, { _id: "tag2" }])
        });

        basePayload.models.Room.findOne.mockResolvedValue(null);

        basePayload.models.RoomRequest.findOne.mockResolvedValue(null);

        basePayload.models.RoomRequest.create.mockResolvedValue({ _id: "newReq" });

        const req = new CreateRoomRequest(basePayload);

        const result = await req.saveRequest();

        expect(result).toEqual({ _id: "newReq" });
    });
});

//------ TEST HÀM approveRoomRequest() ------//
describe("TEST ROOMREQ004 - approveRoomRequest() function", () => {
    let basePayload, reqInstance;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "user123",
            data: {
                room_name: "Phòng Test",
                room_status: "public",
                description: "Mô tả phòng",
                reason: "Lý do tạo",
                tags: ["tag1", "tag2"]
            },
            models: {
                Room: { create: jest.fn() },
                RoomRequest: { findById: jest.fn() },
                RoomUser: { create: jest.fn() },
                TagRoom: { insertMany: jest.fn() },
                Notification: { create: jest.fn() }
            }
        };

        reqInstance = new CreateRoomRequest(basePayload);

        reqInstance.request = {
            _id: "req123",
            requester_id: "user123",
            room_name: "Phòng Test",
            description: "Mô tả phòng",
            room_status: "public",
            tags: ["tag1", "tag2"],
            status: "pending",
            save: jest.fn()
        };
    });

    test("TC05: throw lỗi nếu thiếu approverId", async () => {
        await expect(reqInstance.approve(""))
            .rejects
            .toThrow("Không được thiếu approverId.");
    });

    test("TC04: throw lỗi nếu approverId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(reqInstance.approve("abc"))
            .rejects.toThrow("approverId không hợp lệ.");
    });

    test("TC03: throw lỗi nếu không tìm thấy yêu cầu", async () => {
        reqInstance.request = null;

        await expect(reqInstance.approve("approver123"))
            .rejects.toThrow("Không tìm thấy yêu cầu.");
    });

    test("TC02: throw lỗi nếu status != pending", async () => {
        reqInstance.request.status = "approved";

        await expect(reqInstance.approve("approver123"))
            .rejects.toThrow("Trạng thái không hợp lệ để duyệt.");
    });

    test("TC01: duyệt(chấp nhận) yêu cầu thành công", async () => {
        basePayload.models.Room.create.mockResolvedValue({ _id: "room123" });
        basePayload.models.RoomUser.create.mockResolvedValue({});
        basePayload.models.TagRoom.insertMany.mockResolvedValue({});
        basePayload.models.Notification.create.mockResolvedValue({ _id: "noti123" });

        const result = await reqInstance.approve("approver123");

        expect(basePayload.models.Room.create).toHaveBeenCalledWith({
            room_name: "Phòng Test",
            description: "Mô tả phòng",
            status: "public"
        });

        expect(basePayload.models.RoomUser.create).toHaveBeenCalledWith({
            room_id: "room123",
            user_id: "user123",
            room_role: "leader"
        });

        expect(basePayload.models.TagRoom.insertMany).toHaveBeenCalledWith([
            { room_id: "room123", tag_id: "tag1" },
            { room_id: "room123", tag_id: "tag2" }
        ]);

        expect(reqInstance.request.status).toBe("approved");
        expect(reqInstance.request.approver_id).toBe("approver123");
        expect(reqInstance.request.save).toHaveBeenCalled();

        expect(basePayload.models.Notification.create).toHaveBeenCalledWith({
            user_id: "user123",
            title: "Yêu cầu tạo phòng được duyệt",
            content: `Phòng "Phòng Test" đã được tạo`
        });

        expect(result).toHaveProperty("room");
        expect(result).toHaveProperty("notification");
    });
});

//------ TEST HÀM rejectRoomRequest() ------//
describe("TEST ROOMREQ005 - rejectRoomRequest() function", () => {
    let basePayload, reqInstance;

    beforeEach(() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        basePayload = {
            requesterId: "user123",
            data: {
                room_name: "Phòng Test",
                room_status: "public",
                description: "Mô tả phòng",
                reason: "Lý do tạo",
                tags: ["tag1", "tag2"]
            },
            models: {
                Notification: { create: jest.fn() }
            }
        };

        reqInstance = new CreateRoomRequest(basePayload);

        reqInstance.request = {
            _id: "req123",
            requester_id: "user123",
            room_name: "Phòng Test",
            description: "Mô tả phòng",
            room_status: "public",
            tags: ["tag1", "tag2"],
            status: "pending",
            save: jest.fn()
        };
    });

    test("TC07: throw lỗi nếu reason không hợp lệ (không phải chuỗi hoặc quá ngắn)", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        await expect(reqInstance.reject("approver123", 123))
            .rejects
            .toThrow("Lý do từ chối phải là chuỗi và tối thiểu 5 ký tự.");

        await expect(reqInstance.reject("approver123", "hi"))
            .rejects
            .toThrow("Lý do từ chối phải là chuỗi và tối thiểu 5 ký tự.");
    });

    test("TC06: throw lỗi nếu thiếu approverId", async () => {
        await expect(reqInstance.reject("", "reason"))
            .rejects
            .toThrow("Không được thiếu approverId.");
    });

    test("TC05: throw lỗi nếu approverId không hợp lệ", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(reqInstance.reject("abc", "reason"))
            .rejects.toThrow("approverId không hợp lệ.");
    });

    test("TC04: throw lỗi nếu thiếu reason", async () => {
        await expect(reqInstance.reject("approver123", ""))
            .rejects
            .toThrow("Yêu cầu điền lý do.");
    });

    test("TC03: throw lỗi nếu không tìm thấy yêu cầu", async () => {
        reqInstance.request = null;

        await expect(reqInstance.reject("approver123", "reason"))
            .rejects.toThrow("Không tìm thấy yêu cầu.");
    });

    test("TC02: throw lỗi nếu status != pending", async () => {
        reqInstance.request.status = "rejected";

        await expect(reqInstance.reject("approver123", "reason"))
            .rejects.toThrow("Trạng thái không hợp lệ để duyệt.");
    });

    test("TC01: duyệt (từ chối) yêu cầu thành công ", async () => {
        basePayload.models.Notification.create.mockResolvedValue({ _id: "noti123" });

        const result = await reqInstance.reject("approver123", "reason");

        expect(reqInstance.request.status).toBe("rejected");
        expect(reqInstance.request.approver_id).toBe("approver123");
        expect(reqInstance.request.save).toHaveBeenCalled();

        expect(basePayload.models.Notification.create).toHaveBeenCalledWith({
            user_id: "user123",
            title: "Yêu cầu tạo phòng bị từ chối.",
            content: `Lý do: reason`
        });

        expect(result).toHaveProperty("notification");
    });
});