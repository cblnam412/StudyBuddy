import { beforeEach, jest } from "@jest/globals";
import mongoose, { mongo } from "mongoose";
import { RoomService } from "../../service/roomService.js";
import crypto from "crypto";

//------ TEST HÀM getMyRooms() ------//
describe("TEST ROOM003 - getMyRooms() function", () => {
    let service;

    beforeEach (() => {
        jest.resetAllMocks();

        mongoose.Types.ObjectId.isValid = jest.fn();
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        service = new RoomService();
        service.RoomUser = { 
            find: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn()
        };

    });

    test("TC03: throw lỗi khi thiếu userId", async() => {
        await expect(service.getMyRooms(null))
            .rejects
            .toThrow("Không được bỏ trống userId.");
    });

    test("TC02: throw lỗi khi định dạng userId không hợp lệ", async() => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(service.getMyRooms("abc"))
            .rejects
            .toThrow("userId không hợp lệ.");
    });

    test("TC04: trả về mảng rỗng nếu user chưa tham gia phòng nào", async () => {
        service.RoomUser.lean.mockResolvedValue([]);

        const result = await service.getMyRooms("user123");

        expect(result).toEqual([]);
    });

    test("TC01: trả về danh sách phòng hợp lệ", async () => {
        service.RoomUser.lean.mockResolvedValue([
            {
                room_id: {
                    _id: "room1",
                    room_name: "Room 1",
                    description: "Desc 1",
                    status: "public",
                },
                room_role: "leader"
            },
            {
                room_id: {
                    _id: "room2",
                    room_name: "Room 2",
                    description: "Desc 2",
                    status: "private",
                },
                room_role: "member"
            }
        ]);

        const result = await service.getMyRooms("user123");

        expect(result).toEqual([
            {
                _id: "room1",
                room_name: "Room 1",
                description: "Desc 1",
                status: "public",
                room_role: "leader"
            },
            {
                _id: "room2",
                room_name: "Room 2",
                description: "Desc 2",
                status: "private",
                room_role: "member"
            }
        ]);
    });
});

//------ TEST HÀM createRoomInvite() ------//
describe("TEST ROOM004 - createRoomInvite() function", () => {
    let service;

    beforeEach (() => {
        jest.resetAllMocks();

        jest.spyOn(crypto, "randomBytes")
            .mockReturnValue(Buffer.from("fake_random_bytes"));

        mongoose.isValidObjectId = jest.fn().mockReturnValue(true);

        service = new RoomService();
        service.RoomInvite = { create: jest.fn(), findOne: jest.fn(), exists: jest.fn() };
        service.Room = { findById: jest.fn() };
        service.RoomUser = { exists: jest.fn() };

    });

    test("TC07: throw nếu user không phải là leader của room", async () => {
        service.Room.findById.mockResolvedValue({ _id: "507f191e810c19729de860ea" });
        service.RoomUser.exists.mockResolvedValue(false);

        await expect(service.createRoomInvite("507f191e810c19729de860ea", "507f191e810c19729de860eb"))
            .rejects
            .toThrow("Bạn không phải nhóm trưởng của phòng này.");
    });

    test("TC06: throw lỗi khi không tìm thấy phòng", async() => {
        mongoose.isValidObjectId.mockReturnValue(true);

        service.Room.findById.mockResolvedValue(null);

        await expect(service.createRoomInvite("room_123", "user123"))
            .rejects
            .toThrow("Room không tồn tại.");
    });

    test("TC05: throw lỗi khi thiếu createdById", async() => {
        await expect(service.createRoomInvite("room_123", null))
            .rejects
            .toThrow("Không được bỏ trống roomId hoặc createdById.");
    });

    test("TC04: throw lỗi khi thiếu roomId", async() => {
        await expect(service.createRoomInvite(null, "user123"))
            .rejects
            .toThrow("Không được bỏ trống roomId hoặc createdById.");
    });

    test("TC03: throw lỗi khi định dạng roomId không hợp lệ", async() => {
        mongoose.isValidObjectId
            .mockReturnValueOnce(false);

        await expect(service.createRoomInvite("invalid123", "507f191e810c19729de860ea"))
            .rejects
            .toThrow("roomId không đúng định dạng.");
    });

    test("TC02: throw lỗi khi định dạng createdById không hợp lệ", async() => {
        mongoose.isValidObjectId
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        await expect(service.createRoomInvite("507f191e810c19729de860ea", "invalid123"))
            .rejects
            .toThrow("createdById không đúng định dạng.");
    });

    test("TC01: trả về invite_token cho phòng private", async () => {
        mongoose.isValidObjectId.mockReturnValue(true);

        service.Room.findById.mockResolvedValue({
            _id: "507f191e810c19729de860ea"
        });

        service.RoomUser.exists.mockResolvedValue(true);

        const fakeCreated = {
            _id: "newInviteId",
            token: "abcd1234token"
        };
        service.RoomInvite.create.mockResolvedValue(fakeCreated);

        const result = await service.createRoomInvite(
            "507f191e810c19729de860ea",
            "507f191e810c19729de860eb"
        );

        expect(crypto.randomBytes).toHaveBeenCalledWith(12);
        expect(service.RoomInvite.create).toHaveBeenCalled();
        expect(result).toEqual(fakeCreated);
    });
});

//------ TEST HÀM verifyJoinRoom() ------//
describe("TEST ROOM002 - verifyJoinRoom() function", () => {
    let service;

    beforeEach (() => {
        jest.resetAllMocks();

        mongoose.isValidObjectId = jest.fn().mockReturnValue(true);

        service = new RoomService();
        service.Room = { findById: jest.fn() };
        service.RoomUser = { findOne: jest.fn() };

    });

    test("TC07: throw nếu phòng có status = safe-mode", async () => {
        mongoose.isValidObjectId.mockReturnValue(true);

        service.Room.findById.mockResolvedValue({
            status: "safe-mode",
        });

        await expect(service.verifyJoinRoom("507f191e810c19729de860ea", "507f191e810c19729de860eb"))
            .rejects
            .toThrow("Bây giờ không thể tham gia nhóm.");
    });

    test("TC06: throw lỗi khi không tìm thấy phòng", async() => {
        mongoose.isValidObjectId.mockReturnValue(true);

        service.Room.findById.mockResolvedValue(null);

        await expect(service.verifyJoinRoom("user123", "room123"))
            .rejects
            .toThrow("Không tìm thấy phòng.");
    });

    test("TC03: throw lỗi khi thiếu roomId hoặc userId", async() => {
        await expect(service.verifyJoinRoom(null, "user123"))
            .rejects
            .toThrow("Không được bỏ trống userId hoặc roomId.");

            await expect(service.verifyJoinRoom("room123", null))
            .rejects
            .toThrow("Không được bỏ trống userId hoặc roomId.");
    });

    test("TC04: throw lỗi khi định dạng userId không hợp lệ", async() => {
        mongoose.isValidObjectId
            .mockReturnValueOnce(false);

        await expect(service.verifyJoinRoom("invalid123", "507f191e810c19729de860ea"))
            .rejects
            .toThrow("userId không hợp lệ.");
    });

    test("TC05: throw lỗi khi định dạng roomId không hợp lệ", async() => {
        mongoose.isValidObjectId
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        await expect(service.verifyJoinRoom("507f191e810c19729de860ea", "invalid123"))
            .rejects
            .toThrow("roomId không hợp lệ.");
    });

    test("TC02: throw lỗi khi user đã là thành viên của phòng", async () => {
        mongoose.isValidObjectId.mockReturnValueOnce(true);

        service.Room.findById.mockResolvedValue({
            _id: "room123",
            status: "public"
        });

        service.RoomUser.findOne.mockResolvedValue({ user_id: "user123" });

        await expect(service.verifyJoinRoom("user123", "room123"))
            .rejects
            .toThrow("Bạn đã là thành viên của phòng này.");
    });

    test("TC01: Trả về room khi tất cả hợp lệ", async () => {
        mongoose.isValidObjectId.mockReturnValue(true);

        const mockRoom = { 
            _id: "507f1f77bcf86cd799439011",
            status: "active"
        };

        service.Room.findById.mockResolvedValue(mockRoom);
        service.RoomUser.findOne.mockResolvedValue(null);

        const result = await service.verifyJoinRoom(
            "507f191e810c19729de860ea",
            "507f1f77bcf86cd799439011"
        );

        expect(result).toEqual(mockRoom);
        expect(service.Room.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
        expect(service.RoomUser.findOne).toHaveBeenCalledWith({
            user_id: "507f191e810c19729de860ea",
            room_id: "507f1f77bcf86cd799439011"
        });
    });
});