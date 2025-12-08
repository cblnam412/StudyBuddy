import { beforeEach, afterEach, jest, expect, describe } from "@jest/globals";
import mongoose from "mongoose";
import { MessageService } from "../../service/messageService.js";

describe("MSG001 - Test getRoomMessages function", () => {
    let messageService;

    beforeEach(() => {
        messageService = new MessageService({}, {}); // temp

        messageService.RoomUser = {
            findOne: jest.fn(),
        };

        messageService.Message = {
            find: jest.fn(),
            countDocuments: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    // UC001
    test("UC001 - should throw error when user is not member (isMember = null)", async () => {
        messageService.RoomUser.findOne.mockResolvedValue(null);

        await expect(
            messageService.getRoomMessages("room01", "user01", {})
        ).rejects.toThrow("Bạn không phải thành viên phòng này");

        expect(messageService.RoomUser.findOne)
            .toHaveBeenCalledWith({ user_id: "user01", room_id: "room01" });
    });

    // UC002
    test("UC002 - should return reversed messages with pagination when user is member", async () => {
        const mockOptions = { page: 1, limit: 2, before: null };

        messageService.RoomUser.findOne.mockResolvedValue({ _id: "xxx" });

        const mockMsgs = [
            { _id: 1, content: "A" },
            { _id: 2, content: "B" }
        ];

        const mockFind = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
        };

        messageService.Message.find.mockReturnValue(mockFind);
        messageService.Message.find().populate()
            .sort().limit().skip
            .mockResolvedValue(mockMsgs);

        messageService.Message.countDocuments.mockResolvedValue(2);

        const result = await messageService.getRoomMessages(
            "room01",
            "user01",
            mockOptions
        );

        expect(messageService.RoomUser.findOne)
            .toHaveBeenCalledWith({ user_id: "user01", room_id: "room01" });

        expect(messageService.Message.find)
            .toHaveBeenCalledWith({ room_id: "room01", status: { $ne: "deleted" } });

        expect(result.messages).toEqual(mockMsgs.reverse());

        expect(result.pagination).toEqual({
            page: 1,
            limit: 2,
            total: 2,
            pages: 1,
        });
    });
});
