import { beforeEach, afterEach, jest, expect, describe } from "@jest/globals";
import { AdminService } from "../../service/adminService.js";

describe("AUTH008 - Test setRole function", () => {

    let adminService;
    let NotificationMock;
    let UserMock;

    beforeEach(() => {
        NotificationMock = {
            create: jest.fn()
        };

        UserMock = {
            findById: jest.fn()
        };

        adminService = new AdminService(NotificationMock, UserMock, {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });


    // ============================
    // UTC001 - validId + validRole → SUCCESS
    // ============================
    test("UTC001 - validId + validRole → thành công", async () => {
        const mockUser = {
            _id: "u001",
            system_role: "user",
            save: jest.fn()
        };

        UserMock.findById.mockResolvedValue(mockUser);

        const mockNotification = { _id: "n001" };
        NotificationMock.create.mockResolvedValue(mockNotification);

        const result = await adminService.SetRole({
            userId: "u001",
            newRole: "admin"
        });

        expect(mockUser.save).toHaveBeenCalled();

        expect(NotificationMock.create).toHaveBeenCalledWith({
            user_id: mockUser._id,
            title: "Thay đổi quyền",
            content: "Quyền hệ thống của bạn đã được đổi thành admin."
        });

        expect(result).toEqual({
            newRole: "admin",
            notification: mockNotification,
            userId: "u001"
        });
    });


    // ============================
    // UTC002 - invalid role
    // ============================
    test("UTC002 - role không hợp lệ → throw error", async () => {
        await expect(
            adminService.SetRole({ userId: "123", newRole: "superman" })
        ).rejects.toThrow("Role không hợp lệ.");
    });


    // ============================
    // UTC003 - userId notFound
    // ============================
    test("UTC003 - userId không tồn tại → throw error", async () => {
        UserMock.findById.mockResolvedValue(null);

        await expect(
            adminService.SetRole({ userId: "notfound", newRole: "admin" })
        ).rejects.toThrow("Không tìm thấy user.");

        expect(UserMock.findById).toHaveBeenCalledWith("notfound");
    });


    // ============================
    // UTC004 - sameAsCurrent
    // ============================
    test("UTC004 - role hiện tại trùng newRole → throw error", async () => {
        UserMock.findById.mockResolvedValue({
            _id: "u002",
            system_role: "moderator"
        });

        await expect(
            adminService.SetRole({ userId: "u002", newRole: "moderator" })
        ).rejects.toThrow("User đã là moderator.");
    });


    // ============================
    // UTC005 - missing userId
    // ============================
    test("UTC005 - missing userId → throw error", async () => {
        await expect(
            adminService.SetRole({ userId: null, newRole: "admin" })
        ).rejects.toThrow("Thiếu userId hoặc newRole.");
    });


    // ============================
    // UTC006 - missing newRole
    // ============================
    test("UTC006 - missing newRole → throw error", async () => {
        await expect(
            adminService.SetRole({ userId: "123", newRole: null })
        ).rejects.toThrow("Thiếu userId hoặc newRole.");
    });

});
