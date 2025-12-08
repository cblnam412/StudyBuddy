import { beforeEach, describe, jest } from "@jest/globals";
import mongoose, { mongo } from "mongoose";
import { RoomService } from "../../service/roomService.js";
import crypto from "crypto";

describe("TEST ROOM005 - kickUser() function", () => {
    let service;

    beforeEach (() => {
        jest.resetAllMocks();
        service = new RoomService();
        service.Room = { findById: jest.fn() };
        service.RoomUser = { findOne: jest.fn(), deleteOne: jest.fn() };
    });

    test("TC01: throw lỗi khi leader tự kick chính mình", async () => {
        const leaderId = "user1";
        const userIdToKick = "user1";
        const roomId = "room1";

        await expect(service.kickUser(leaderId, roomId, userIdToKick))
            .rejects
            .toThrow("Không thể tự đuổi bản thân");
    });

    test("TC02: throw lỗi khi không tìm thấy phòng", async () => {
        const leaderId = "leader1";
        const userIdToKick = "user2";
        const roomId = "non_existent_room";
        service.Room.findById.mockResolvedValue(null);

        await expect(service.kickUser(leaderId, roomId, userIdToKick))
            .rejects
            .toThrow("Không tìm thấy phòng");
        
        expect(service.Room.findById).toHaveBeenCalledWith(roomId);
    });

    test("TC03: throw lỗi khi người bị kick không phải thành viên của phòng", async () => {
        const leaderId = "leader1";
        const userIdToKick = "user_not_in_room";
        const roomId = "room1";

        service.Room.findById.mockResolvedValue({ _id: roomId });
        service.RoomUser.findOne.mockResolvedValue(null);

        await expect(service.kickUser(leaderId, roomId, userIdToKick))
            .rejects
            .toThrow("Người này không phải thành viên của phòng");

        expect(service.RoomUser.findOne).toHaveBeenCalledWith({ 
            room_id: roomId, 
            user_id: userIdToKick 
        });
    });

    test("TC04: Trả về userIdToKick khi kick thành công", async () => {
        const leaderId = "leader1";
        const userIdToKick = "victim_user";
        const roomId = "room1";
        const membershipId = "membership_123";

        service.Room.findById.mockResolvedValue({ _id: roomId });

        service.RoomUser.findOne.mockResolvedValue({ 
            _id: membershipId, 
            room_id: roomId, 
            user_id: userIdToKick 
        });

        service.RoomUser.deleteOne.mockResolvedValue({ deletedCount: 1 });

        const result = await service.kickUser(leaderId, roomId, userIdToKick);

        expect(result).toBe(userIdToKick);
        expect(service.RoomUser.deleteOne).toHaveBeenCalledWith({ _id: membershipId });
    });
});

//------ leaveRoom() ------//
describe("TEST ROOM006 - leaveRoom() function", () => {
    let service;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new RoomService();
        service.Room = { findById: jest.fn(), deleteOne: jest.fn() };
        service.RoomUser = { findOne: jest.fn(), deleteOne: jest.fn(), deleteMany: jest.fn() };
        service.TagRoom = { deleteMany: jest.fn() };
    });

    test("TC01: throw lỗi khi không tìm thấy phòng", async () => {
        service.Room.findById.mockResolvedValue(null);

        await expect(service.leaveRoom("user1", "room1"))
            .rejects
            .toThrow("Không tìm thấy phòng");
    });

    test("TC02: throw lỗi khi user không phải thành viên của phòng", async () => {
        service.Room.findById.mockResolvedValue({ _id: "room1" });
        service.RoomUser.findOne.mockResolvedValue(null);

        await expect(service.leaveRoom("user1", "room1"))
            .rejects
            .toThrow("Bạn không phải thành viên của phòng này");
    });

    test("TC03: throw lỗi khi Leader rời phòng nhưng vẫn còn thành viên khác", async () => {
        service.Room.findById.mockResolvedValue({ _id: "room1" });
        
        service.RoomUser.findOne
            .mockReturnValueOnce({ _id: "mem1", user_id: "user1", room_role: "leader" }) 
            .mockReturnValueOnce({ _id: "mem2", user_id: "user2", room_role: "member" }); 

        await expect(service.leaveRoom("user1", "room1"))
            .rejects
            .toThrow("Bạn không được rời phòng khi còn thành viên.");
    });

    test("TC04: Leader rời phòng và giải tán nhóm (khi không còn ai khác)", async () => {
        const roomId = "room1";
        service.Room.findById.mockResolvedValue({ _id: roomId });

        service.RoomUser.findOne
            .mockReturnValueOnce({ _id: "mem1", user_id: "user1", room_role: "leader" }) 
            .mockReturnValueOnce(null); 

        const result = await service.leaveRoom("user1", roomId);

        expect(service.Room.deleteOne).toHaveBeenCalledWith({ _id: roomId });
        expect(service.RoomUser.deleteMany).toHaveBeenCalledWith({ room_id: roomId });
        expect(service.TagRoom.deleteMany).toHaveBeenCalledWith({ room_id: roomId });
        expect(result).toEqual({ disbanded: true });
    });

    test("TC05: Thành viên bình thường rời phòng thành công", async () => {
        const memberId = "mem_abc";
        service.Room.findById.mockResolvedValue({ _id: "room1" });
        
        service.RoomUser.findOne.mockResolvedValue({ 
            _id: memberId, 
            user_id: "user2", 
            room_role: "member" 
        });

        const result = await service.leaveRoom("user2", "room1");

        expect(service.RoomUser.deleteOne).toHaveBeenCalledWith({ _id: memberId });
        expect(result).toEqual({ disbanded: false });
    });
});

//------ updateRoomInfo() ------//
describe("TEST ROOM007 - updateRoomInfo() function", () => {
    let service;
    let mockRoom;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new RoomService();
        
        service.Room = { findById: jest.fn() };
        service.Tag = { find: jest.fn() };
        service.TagRoom = { deleteMany: jest.fn(), insertMany: jest.fn() };

        mockRoom = {
            _id: "room1",
            room_name: "Old Name",
            description: "Old Desc",
            save: jest.fn().mockResolvedValue(true)
        };
    });

    test("TC01: throw lỗi khi không tìm thấy phòng", async () => {
        service.Room.findById.mockResolvedValue(null);

        await expect(service.updateRoomInfo("room1", { room_name: "New Name" }))
            .rejects
            .toThrow("Không tìm thấy phòng.");
    });

    test("TC02: Cập nhật thông tin cơ bản (tên, mô tả) thành công", async () => {
        service.Room.findById.mockResolvedValue(mockRoom);

        const updateData = {
            room_name: "New Name",
            description: "New Description"
        };

        const result = await service.updateRoomInfo("room1", updateData);

        expect(service.Room.findById).toHaveBeenCalledWith("room1");
        expect(mockRoom.room_name).toBe("New Name");
        expect(mockRoom.description).toBe("New Description");
        expect(mockRoom.save).toHaveBeenCalled();
        expect(result).toEqual(mockRoom);
    });

    test("TC03: Cập nhật tags thành công (Xóa cũ, thêm mới)", async () => {
        service.Room.findById.mockResolvedValue(mockRoom);

        const validTags = [{ _id: "tag1" }, { _id: "tag2" }];
        service.Tag.find.mockResolvedValue(validTags);

        const updateData = {
            tags: ["tag1", "tag2", "tag_invalid"] 
        };

        await service.updateRoomInfo("room1", updateData);

        expect(service.TagRoom.deleteMany).toHaveBeenCalledWith({ room_id: "room1" });

        expect(service.Tag.find).toHaveBeenCalledWith({ _id: { $in: updateData.tags } });

        expect(service.TagRoom.insertMany).toHaveBeenCalledWith([
            { room_id: "room1", tag_id: "tag1" },
            { room_id: "room1", tag_id: "tag2" }
        ]);

        expect(mockRoom.save).toHaveBeenCalled();
    });

    test("TC04: Không insert tag nếu danh sách tag không hợp lệ", async () => {
        service.Room.findById.mockResolvedValue(mockRoom);

        service.Tag.find.mockResolvedValue([]);

        const updateData = {
            tags: ["tag_fake_1", "tag_fake_2"]
        };

        await service.updateRoomInfo("room1", updateData);

        expect(service.TagRoom.deleteMany).toHaveBeenCalledWith({ room_id: "room1" });
        expect(service.TagRoom.insertMany).not.toHaveBeenCalled();
        expect(mockRoom.save).toHaveBeenCalled();
    });
});

//------ getAllRooms() ------//
describe("TEST ROOM008 - getAllRooms() function", () => {
    let service;
    let mockFindChain;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new RoomService();
        service.TagRoom = { find: jest.fn() };
        
        mockFindChain = {
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([]) 
        };

        service.Room = { 
            find: jest.fn().mockReturnValue(mockFindChain),
            countDocuments: jest.fn().mockResolvedValue(0)
        };
    });

    test("TC01: Lấy danh sách mặc định (page 1, limit 20, status public)", async () => {
        const mockRooms = [{ _id: "room1", room_name: "Room A" }];
        
        mockFindChain.lean.mockResolvedValue(mockRooms);
        service.Room.countDocuments.mockResolvedValue(10);

        const result = await service.getAllRooms({});

        expect(service.Room.find).toHaveBeenCalledWith({ status: "public" });
        
        expect(mockFindChain.limit).toHaveBeenCalledWith(20);
        expect(mockFindChain.skip).toHaveBeenCalledWith(0);
        
        expect(result).toEqual({
            rooms: mockRooms,
            totalPages: 1, 
            currentPage: 1
        });
    });

    test("TC02: Filter theo tên (search)", async () => {
        await service.getAllRooms({ search: "Music" });

        expect(service.Room.find).toHaveBeenCalledWith({
            status: "public",
            room_name: { $regex: "Music", $options: "i" }
        });
    });

    test("TC03: Filter theo tags", async () => {
        const tagInput = "tagA,tagB";
        const mockRoomIds = ["room1", "room2"];

        service.TagRoom.find.mockReturnValue({
            distinct: jest.fn().mockResolvedValue(mockRoomIds)
        });

        await service.getAllRooms({ tags: tagInput });

        expect(service.TagRoom.find).toHaveBeenCalledWith({
            tag_id: { $in: ["tagA", "tagB"] }
        });

        expect(service.Room.find).toHaveBeenCalledWith({
            status: "public",
            _id: { $in: mockRoomIds }
        });
    });

    test("TC04: Kiểm tra tính toán phân trang (Pagination Logic)", async () => {
        const options = { page: 2, limit: 5 };
        const totalDocs = 12;

        service.Room.countDocuments.mockResolvedValue(totalDocs);

        const result = await service.getAllRooms(options);

        expect(mockFindChain.skip).toHaveBeenCalledWith(5);
        expect(mockFindChain.limit).toHaveBeenCalledWith(5);
        
        expect(result.totalPages).toBe(3); 
        expect(result.currentPage).toBe(2);
    });

    test("TC05: Kết hợp search và tags", async () => {
        const options = { search: "Study", tags: "Math" };
        const mockRoomIds = ["room99"];

        service.TagRoom.find.mockReturnValue({
            distinct: jest.fn().mockResolvedValue(mockRoomIds)
        });

        await service.getAllRooms(options);

        expect(service.Room.find).toHaveBeenCalledWith({
            status: "public",
            room_name: { $regex: "Study", $options: "i" },
            _id: { $in: mockRoomIds }
        });
    });
});

//------ getRoomDetails() ------//
describe("TEST ROOM009 - getRoomDetails() function", () => {
    let service;
    let mockRoomChain;
    let mockUserChain;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new RoomService();
        
        mockRoomChain = {
            lean: jest.fn()
        };
        service.Room = { 
            findById: jest.fn().mockReturnValue(mockRoomChain) 
        };

        mockUserChain = {
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn()
        };
        service.RoomUser = { 
            find: jest.fn().mockReturnValue(mockUserChain) 
        };
    });

    test("TC01: throw lỗi khi không tìm thấy phòng", async () => {
        mockRoomChain.lean.mockResolvedValue(null);

        await expect(service.getRoomDetails("room_invalid"))
            .rejects
            .toThrow("Không tìm thấy phòng.");
            
        expect(service.Room.findById).toHaveBeenCalledWith("room_invalid");
    });

    test("TC02: Lấy chi tiết phòng thành công (có thành viên)", async () => {
        const mockRoom = { 
            _id: "room1", 
            room_name: "Test Room", 
            description: "Room Description" 
        };

        const mockMembers = [
            { 
                user_id: { _id: "u1", full_name: "User One" }, 
                room_role: "leader" 
            },
            { 
                user_id: { _id: "u2", full_name: "User Two" }, 
                room_role: "member" 
            }
        ];

        mockRoomChain.lean.mockResolvedValue(mockRoom);
        mockUserChain.lean.mockResolvedValue(mockMembers);

        const result = await service.getRoomDetails("room1");

        expect(service.Room.findById).toHaveBeenCalledWith("room1");

        expect(service.RoomUser.find).toHaveBeenCalledWith({ room_id: "room1" });
        expect(mockUserChain.populate).toHaveBeenCalledWith("user_id", "full_name");

        expect(result).toEqual({
            ...mockRoom,
            memberNumber: 2,
            members: [
                { _id: "u1", full_name: "User One", room_role: "leader" },
                { _id: "u2", full_name: "User Two", room_role: "member" }
            ]
        });
    });

    test("TC03: Lấy chi tiết phòng thành công (không có thành viên)", async () => {
        const mockRoom = { _id: "roomEmpty", room_name: "Empty Room" };
        
        mockRoomChain.lean.mockResolvedValue(mockRoom);
        mockUserChain.lean.mockResolvedValue([]); 

        const result = await service.getRoomDetails("roomEmpty");

        expect(result.memberNumber).toBe(0);
        expect(result.members).toEqual([]);
    });
});