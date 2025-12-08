import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { EventService } from "../../service/eventService.js";

describe("TEST EVE006 - updateEvent() function", () => {
    let eventService;
    let EventMock;
    let EventUserMock;

    beforeEach(() => {
        EventMock = {
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn()
        };

        EventUserMock = {
            countDocuments: jest.fn()
        };

        eventService = new EventService(EventMock, EventUserMock);
    });


    // ----------------------------------------------------------
    // TC001: eventId invalid → not found
    // ----------------------------------------------------------
    test("TC001 - eventId invalid → throw 'Không tìm thấy sự kiện'", async () => {
        EventMock.findById.mockResolvedValue(null);

        await expect(
            eventService.updateEvent("invalidId", {})
        ).rejects.toThrow("Không tìm thấy sự kiện");
    });

    // ----------------------------------------------------------
    // TC002: event status = cancelled → cannot update
    // ----------------------------------------------------------
    test("TC002 - event cancelled → throw 'Không thể chỉnh sửa sự kiện đã bị huỷ'", async () => {
        EventMock.findById.mockResolvedValue({ status: "cancelled" });

        await expect(
            eventService.updateEvent("id", {})
        ).rejects.toThrow("Không thể chỉnh sửa sự kiện đã bị huỷ");
    });

    // ----------------------------------------------------------
    // TC003: start_time invalid
    // ----------------------------------------------------------
    test("TC003 - start_time invalid → throw 'Thời gian không hợp lệ'", async () => {
        EventMock.findById.mockResolvedValue({
            status: "upcoming",
            start_time: new Date(),
            end_time: new Date()
        });

        await expect(
            eventService.updateEvent("id", { start_time: "abc" })
        ).rejects.toThrow("Thời gian không hợp lệ");
    });

    // ----------------------------------------------------------
    // TC004: end_time invalid
    // ----------------------------------------------------------
    test("TC004 - end_time invalid → throw 'Thời gian không hợp lệ'", async () => {
        EventMock.findById.mockResolvedValue({
            status: "upcoming",
            start_time: new Date(),
            end_time: new Date()
        });

        await expect(
            eventService.updateEvent("id", { end_time: "xyz" })
        ).rejects.toThrow("Thời gian không hợp lệ");
    });

    // ----------------------------------------------------------
    // TC005: end_time < start_time
    // ----------------------------------------------------------
    test("TC005 - end_time < start_time → throw 'Thời gian kết thúc phải sau thời gian bắt đầu'", async () => {
        EventMock.findById.mockResolvedValue({
            status: "upcoming",
            start_time: "2025-01-10T10:00:00Z",
            end_time: "2025-01-10T12:00:00Z"
        });

        await expect(
            eventService.updateEvent("id", {
                start_time: "2025-01-10T10:00:00Z",
                end_time: "2025-01-10T09:00:00Z"
            })
        ).rejects.toThrow("Thời gian kết thúc phải sau thời gian bắt đầu");
    });

    // ----------------------------------------------------------
    // TC006: title empty
    // ----------------------------------------------------------
    test("TC006 - title empty → throw 'Không được để trống tiêu đề'", async () => {
        EventMock.findById.mockResolvedValue({
            status: "upcoming"
        });

        await expect(
            eventService.updateEvent("id", { title: "" })
        ).rejects.toThrow("Không được để trống tiêu đề");
    });

    // ----------------------------------------------------------
    // TC007: max_participants = 0
    // ----------------------------------------------------------
    test("TC007 - max_participants = 0 → throw 'Giới hạn tối thiểu là 1 người tham gia'", async () => {
        EventMock.findById.mockResolvedValue({
            status: "upcoming"
        });

        await expect(
            eventService.updateEvent("id", { max_participants: 0 })
        ).rejects.toThrow("Giới hạn tối thiểu là 1 người tham gia");
    });

    // ----------------------------------------------------------
    // TC008: max_participants < currentParticipants
    // ----------------------------------------------------------
    test("TC008 - max_participants < currentParticipants → throw lỗi", async () => {
        EventMock.findById.mockResolvedValue({
            status: "upcoming"
        });

        EventUserMock.countDocuments.mockResolvedValue(5);

        await expect(
            eventService.updateEvent("id", { max_participants: 3 })
        ).rejects.toThrow("Không thể đặt giới hạn 3, vì đã có 5 người đăng ký.");
    });

    // ----------------------------------------------------------
    // TC009: valid update → return updatedEvent
    // ----------------------------------------------------------
    test("TC009 - valid update → return updatedEvent", async () => {
        const event = {
            status: "upcoming",
            start_time: "2025-01-10T10:00:00Z",
            end_time: "2025-01-10T12:00:00Z",
        };

        const updated = { title: "updated" };

        EventMock.findById.mockResolvedValue(event);

        EventUserMock.countDocuments.mockResolvedValue(2);

        EventMock.findByIdAndUpdate.mockResolvedValue(updated);

        const result = await eventService.updateEvent("id", {
            title: "updated",
            max_participants: 10
        });

        expect(result).toEqual(updated);
    });
});

// =====================================================
// attendedEvent()
// =====================================================
describe("TEST EVE007 - attendedEvent() function", () => {

    let eventService;
    let EventMock;
    let EventUserMock;

    let sessionMock;

    beforeEach(() => {
        EventMock = {
            findById: jest.fn(),
        };

        EventUserMock = {
            findOne: jest.fn(),
        };

        // Fake session của mongoose
        sessionMock = {
            withTransaction: jest.fn((fn) => fn()),
            endSession: jest.fn(),
        };

        // Mock mongoose.startSession()
        jest.spyOn(mongoose, "startSession").mockResolvedValue(sessionMock);

        eventService = new EventService(EventMock, EventUserMock);
    });

    // ----------------------------------------------------------
    // UT001 – eventId invalid → not found
    // ----------------------------------------------------------
    test("UT001 - eventId invalid → throw 'Không tìm thấy sự kiện.'", async () => {
        EventMock.findById.mockResolvedValue(null);

        await expect(
            eventService.attendedEvent("id", "user")
        ).rejects.toThrow("Không tìm thấy sự kiện.");
    });

    // ----------------------------------------------------------
    // UT002 – event.status = upcoming → cannot check-in
    // ----------------------------------------------------------
    test("UT002 - Sự kiện chưa bắt đầu → throw lỗi", async () => {
        EventMock.findById.mockResolvedValue({ status: "upcoming" });

        await expect(
            eventService.attendedEvent("id", "user")
        ).rejects.toThrow("Sự kiện chưa bắt đầu, không thể điểm danh.");
    });

    // ----------------------------------------------------------
    // UT003 – event.status = completed → cannot check-in
    // ----------------------------------------------------------
    test("UT003 - Sự kiện kết thúc → throw lỗi", async () => {
        EventMock.findById.mockResolvedValue({ status: "completed" });

        await expect(
            eventService.attendedEvent("id", "user")
        ).rejects.toThrow("Sự kiện đã kết thúc.");
    });

    // ----------------------------------------------------------
    // UT004 – event.status = cancelled → cannot check-in
    // ----------------------------------------------------------
    test("UT004 - Sự kiện bị hủy → throw lỗi", async () => {
        EventMock.findById.mockResolvedValue({ status: "cancelled" });

        await expect(
            eventService.attendedEvent("id", "user")
        ).rejects.toThrow("Sự kiện đã bị hủy.");
    });

    // ----------------------------------------------------------
    // UT005 – eventRegistration null
    // ----------------------------------------------------------
    test("UT005 - Chưa đăng ký → throw lỗi", async () => {
        EventMock.findById.mockResolvedValue({ status: "ongoing" });
        EventUserMock.findOne.mockResolvedValue(null);

        await expect(
            eventService.attendedEvent("id", "user")
        ).rejects.toThrow("Bạn chưa đăng ký tham gia sự kiện này.");
    });

    // ----------------------------------------------------------
    // UT006 – đã điểm danh rồi
    // ----------------------------------------------------------
    test("UT006 - Đã điểm danh → throw lỗi", async () => {
        EventMock.findById.mockResolvedValue({ status: "ongoing" });
        EventUserMock.findOne.mockResolvedValue({
            is_attended: true
        });

        await expect(
            eventService.attendedEvent("id", "user")
        ).rejects.toThrow("Bạn đã điểm danh tham gia sự kiện này rồi.");
    });

    // ----------------------------------------------------------
    // UT007 – điểm danh thành công → return eventRegistration
    // ----------------------------------------------------------
    test("UT007 - valid check-in → return updated eventRegistration", async () => {
        const registration = {
            is_attended: false,
            attended_at: null,
            save: jest.fn()
        };

        EventMock.findById.mockResolvedValue({ status: "ongoing" });
        EventUserMock.findOne.mockResolvedValue(registration);

        registration.save.mockResolvedValue();

        const result = await eventService.attendedEvent("event1", "user1");

        expect(registration.is_attended).toBe(true);
        expect(registration.save).toHaveBeenCalled();
        expect(sessionMock.endSession).toHaveBeenCalled();
        expect(result).toBe(registration);
    });
});
