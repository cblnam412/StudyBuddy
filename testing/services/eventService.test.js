import { EventService } from "../../service/eventService";
import { beforeEach, afterEach, jest, expect, describe } from "@jest/globals";

describe("EVE001 - Test getEvent function", () => {
  let mockEventModel;
  let mockEventUserModel;
  let eventService;

  beforeEach(() => {
    mockEventModel = {
      findById: jest.fn().mockResolvedValue({}),
    };

    mockEventUserModel = {
      find: jest.fn().mockResolvedValue({}),
    };

    eventService = new EventService(
      mockEventModel,
      mockEventUserModel,
      null,
      null
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("TC01 - Trả về thông tin chi tiết sự kiện nếu id sự kiện hợp lệ và người dùng có tham gia sự kiện", async () => {
    const userId = "participantId";
    const eventId = "validEventId";

    const mockEventDocument = {
      _id: eventId,
      room_id: "validRoomId",
      user_id: { _id: "validHostId", full_name: "Host Name" },
      title: "Sample Title",
      description: "Sample description",
      max_participants: 50,
      toObject() {
        return {
          _id: this._id,
          room_id: this.room_id,
          user_id: this.user_id,
          title: this.title,
          description: this.description,
          max_participants: this.max_participants,
        };
      },
    };

    mockEventModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockEventDocument),
    });

    const participants = [
      {
        event_id: eventId,
        user_id: { _id: userId, full_name: "Participant Name" },
        is_attended: true,
      },
      {
        event_id: eventId,
        user_id: { _id: "someoneElse", full_name: "Other" },
        is_attended: false,
      },
    ];

    mockEventUserModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(participants),
    });

    const res = await eventService.getEvent(eventId, userId);
    
    // event
    expect(res._id).toBe(eventId);

    // creator
    expect(res.creator).toEqual(mockEventDocument.user_id);

    // participants
    expect(Array.isArray(res.participants)).toBe(true);
    expect(res.participants).toHaveLength(2);

    // stats
    expect(res.stats).toEqual({
        totalRegistered: 2,
        totalAttended: 1,
        maxParticipants: 50
    });

    // user status
    expect(res.userStatus).toEqual({
        isRegistered: true,
        isAttended: true,
        isHost: mockEventDocument.user_id
    });
  });

  test("TC02 - Trả về thông tin chi tiết sự kiện nếu id sự kiện hợp lệ và người dùng có tham gia sự kiện với vai trò host", async () => {
    const userId = "hostId";
    const eventId = "validEventId";

    const mockEventDocument = {
      _id: eventId,
      room_id: "validRoomId",
      user_id: { _id: "validHostId", full_name: "Host Name" },
      title: "Sample Title",
      description: "Sample description",
      max_participants: 50,
      toObject() {
        return {
          _id: this._id,
          room_id: this.room_id,
          user_id: this.user_id,
          title: this.title,
          description: this.description,
          max_participants: this.max_participants,
        };
      },
    };

    mockEventModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockEventDocument),
    });

    const participants = [
      {
        event_id: eventId,
        user_id: { _id: userId, full_name: "Host Name" },
        is_attended: true,
      },
      {
        event_id: eventId,
        user_id: { _id: "someoneElse", full_name: "Other" },
        is_attended: false,
      },
    ];

    mockEventUserModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(participants),
    });

    const res = await eventService.getEvent(eventId, userId);
    
    // event
    expect(res._id).toBe(eventId);

    // creator
    expect(res.creator).toEqual(mockEventDocument.user_id);

    // participants
    expect(Array.isArray(res.participants)).toBe(true);
    expect(res.participants).toHaveLength(2);

    // stats
    expect(res.stats).toEqual({
        totalRegistered: 2,
        totalAttended: 1,
        maxParticipants: 50
    });

    // user status
    expect(res.userStatus).toEqual({
        isRegistered: true,
        isAttended: true,
        isHost: mockEventDocument.user_id
    });
  });

  test("TC03 - Trả về thông tin chi tiết sự kiện (status isRegistered và isAttended: false) nếu id sự kiện hợp lệ và người dùng không đăng ký sự kiện", async () => {
    const userId = "participantId";
    const eventId = "validEventId";

    const mockEventDocument = {
      _id: eventId,
      room_id: "validRoomId",
      user_id: { _id: "validHostId", full_name: "Host Name" },
      title: "Sample Title",
      description: "Sample description",
      max_participants: 50,
      toObject() {
        return {
          _id: this._id,
          room_id: this.room_id,
          user_id: this.user_id,
          title: this.title,
          description: this.description,
          max_participants: this.max_participants,
        };
      },
    };

    mockEventModel.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockEventDocument),
    });

    const participants = [
      {
        event_id: eventId,
        user_id: { _id: "someoneElseId1", full_name: "Host Name" },
        is_attended: true,
      },
      {
        event_id: eventId,
        user_id: { _id: "someoneElseId2", full_name: "Other" },
        is_attended: false,
      },
    ];

    mockEventUserModel.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(participants),
    });

    const res = await eventService.getEvent(eventId, userId);
    
    // event
    expect(res._id).toBe(eventId);

    // creator
    expect(res.creator).toEqual(mockEventDocument.user_id);

    // participants
    expect(Array.isArray(res.participants)).toBe(true);
    expect(res.participants).toHaveLength(2);

    // stats
    expect(res.stats).toEqual({
        totalRegistered: 2,
        totalAttended: 1,
        maxParticipants: 50
    });

    // !IMPORTANT PART HERE, the rest expect are not-as-important in this test case
    // user status
    expect(res.userStatus).toEqual({
        isRegistered: false,
        isAttended: false,
        isHost: mockEventDocument.user_id
    });
  });

  test("TC04 - Từ chối lấy thông tin chi tiết sự kiện nếu event id không hợp lệ", async () => {
    const userId = "participantId";
    const eventId = "invalidEventId";

    mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
    });

    expect(eventService.getEvent(eventId, userId)).rejects.toThrow("Không tìm thấy sự kiện");
  });

  test("TC05 - Từ chối lấy thông tin chi tiết sự kiện nếu event id trống", async () => {
    const userId = "participantId";
    const eventId = undefined;

    mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
    });

    expect(eventService.getEvent(eventId, userId)).rejects.toThrow("Không tìm thấy sự kiện");
  });

  test("TC06 - Từ chối lấy thông tin chi tiết sự kiện nếu user id trống", async () => {
    const userId = undefined;
    const eventId = "validEventId";

    expect(eventService.getEvent(eventId, userId)).rejects.toThrow("Thiếu user id");
  });
});


// describe("EVE002 - Test findEvents function", () => {
//     let mockEventModel;
//     let mockEventUserModel;
//     let eventService;

//     beforeEach(() => {
//         mockEventModel = {
//             find: jest.fn()
//         };

//         mockEventUserModel = {
//             find: jest.fn()
//         };

//         eventService = new EventService(mockEventModel, mockEventUserModel, null, null);
//     });

//     afterEach(() => {
//         jest.clearAllMocks();
//     });
// });

describe("EVE003 - Test markEventAsCompleted function", () => {
    let mockEventModel;
    let eventService;

    beforeEach(() => {
        mockEventModel = {
            findById: jest.fn()
        };

        eventService = new EventService(mockEventModel, null, null, null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("TC01 - Đánh dấu event hoàn thành nếu id event tồn tại và trạng thái event là ongoing", async () => {
        const eventId = "existEventId";
        
        const mockEventDocument = {
            _id: "validEventId", 
            title: "Sample title", 
            description: "Sample description",
            status: "ongoing",
            save: jest.fn().mockResolvedValue({ok: true})
        };

        mockEventModel.findById.mockResolvedValue(mockEventDocument);

        const res = await eventService.markEventAsCompleted(eventId);

        expect(res).toBe(mockEventDocument);
        expect(mockEventDocument.save).toHaveBeenCalledTimes(1);
    });

    test("TC02 - Từ chối đánh dấu hoàn thành nếu id event không tồn tại", async () => {
        const eventId = "notExistEventId";

        mockEventModel.findById.mockResolvedValue(null);

        expect(eventService.markEventAsCompleted(eventId)).rejects.toThrow("Không tìm thấy sự kiện");
    });

    test("TC03 - Từ chối đánh dấu hoàn thành nếu id event trống", async () => {
        const eventId = undefined;

        mockEventModel.findById.mockResolvedValue(null);

        expect(eventService.markEventAsCompleted(eventId)).rejects.toThrow("Không tìm thấy sự kiện");
    });

    test("TC04 - Từ chối đánh dấu hoàn thành nếu sự kiện chưa diễn ra", async () => {
        const eventId = "existEventId";

        const mockEventDocument = {
            _id: "validEventId", 
            title: "Sample title", 
            description: "Sample description",
            status: "upcoming",
            save: jest.fn().mockResolvedValue({ok: true})
        };

        mockEventModel.findById.mockResolvedValue(mockEventDocument);

        expect(eventService.markEventAsCompleted(eventId)).rejects.toThrow("Sự kiện chưa diễn ra.");
    });

    test("TC05 - Từ chối đánh dấu hoàn thành nếu sự kiện đã hoàn thành", async () => {
        const eventId = "existEventId";

        const mockEventDocument = {
            _id: "validEventId", 
            title: "Sample title", 
            description: "Sample description",
            status: "completed",
            save: jest.fn().mockResolvedValue({ok: true})
        };

        mockEventModel.findById.mockResolvedValue(mockEventDocument);

        expect(eventService.markEventAsCompleted(eventId)).rejects.toThrow("Sự kiện đã hoàn thành từ trước.");
    });

    test("TC06 - Từ chối đánh dấu hoàn thành nếu sự kiện đã bị hủy", async () => {
        const eventId = "existEventId";

        const mockEventDocument = {
            _id: "validEventId", 
            title: "Sample title", 
            description: "Sample description",
            status: "cancelled",
            save: jest.fn().mockResolvedValue({ok: true})
        };

        mockEventModel.findById.mockResolvedValue(mockEventDocument);

        expect(eventService.markEventAsCompleted(eventId)).rejects.toThrow("Sự kiện đã bị hủy từ trước.");
    });
});

describe("EVE004 - Test createEvent function", () => {
    let mockEventModel;
    let mockEventUserModel;
    let mockRoomModel;
    let eventService;

    beforeEach(() => {
        mockEventModel = {
            create: jest.fn().mockResolvedValue(null),
            findOne: jest.fn().mockResolvedValue(null)
        };

        mockEventUserModel = {
            create: jest.fn().mockResolvedValue(null),
        };

        mockRoomModel = {
            findById: jest.fn().mockResolvedValue(null),
        };

        eventService = new EventService(mockEventModel, mockEventUserModel, null, null, mockRoomModel);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("TC01 - Tạo event mới với input hợp lệ", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        const res = await eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId);

        expect(res).toEqual(mockEventDocument);
        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC02 - Từ chối tạo event mới nếu roomId trống", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = undefined;
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết.");
    });

    test("TC03 - Tạo event mới với input hợp lệ, title 1 kí tự", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "a";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        const res = await eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId);

        expect(res).toEqual(mockEventDocument);
        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC04 - Tạo event mới với input hợp lệ, title 255 kí tự", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis,";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        const res = await eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId);

        expect(res).toEqual(mockEventDocument);
        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC05 - Từ chối tạo event mới nếu title vượt 255 kí tự", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "1Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis,";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Tên sự kiện không được dài quá 255 ký tự."); 
    });

    test("TC06 - Từ chối tạo event mới nếu title undefined", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = undefined;
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết."); 
    });

    test("TC07 - Từ chối tạo event mới nếu title trống", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "          ";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Tên sự kiện không được để trống."); 
    });

    test("TC08 - Từ chối tạo sự kiện mới nếu title trùng với một sự kiện khác đang/sắp diễn ra của phòng", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "duplicateTitle";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        // !IMPORTANT PART HERE
        mockEventModel.findOne.mockResolvedValue({
            room_id,
            title,
            status: "ongoing"
        });

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Đã có sự kiện cùng tên sắp hoặc đang diễn ra."); 

        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC09 - Từ chối tạo event mới nếu description rỗng", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết."); 
    });

    test("TC10 - Tạo event mới với input hợp lệ, description 1 kí tự", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "T";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        const res = await eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId);

        expect(res).toEqual(mockEventDocument);
        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC11 - Tạo event mới với input hợp lệ, description 3000 kí tự", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description =
          "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. " +
          "Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. " +
          "Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. " +
          "Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. " +
          "Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. " +
          "Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. " +
          "Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. " +
          "Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. " +
          "Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. " +
          "Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. " +
          "Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. " +
          "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. " +
          "Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. " +
          "Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. " +
          "Aenean ut eros et nisl sagittis vestibulum. Nullam nulla eros, ultricies sit amet, nonummy id, imperdiet feugiat, pede. Sed lectus. " +
          "Donec mollis hendrerit risus. Phasellus nec sem in justo pellentesque facilisis. Etiam imperdiet imperdiet orci. Nunc nec neque. " +
          "Phasellus leo dolor, tempus non, auctor et, hendrerit quis, nisi. Curabitur ligula sapien, tincidunt non, euismod vitae, posuere imperdiet, leo. " +
          "Maecenas malesuada. Praesent congue erat at massa. Sed cursus turpis vitae tortor. Donec posuere vulputate arcu. Phasellus accumsan cursus velit. " +
          "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed aliquam, nisi quis porttitor congue, elit erat euismod orci, ac placerat dolor lectus quis orci. " +
          "Phasellus consectetuer vestibulum elit. Aenean tellus metus, bibendum sed, posuere ac, mattis non, nunc. Vestibulum fringilla pede sit amet augue. " +
          "In turpis. Pellentesque posuere. Praesent turpis. Aenean posuere, tor";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        const res = await eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId);

        expect(res).toEqual(mockEventDocument);
        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC12 - Từ chối tạo event mới nếu description quá 3000 kí tự", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description =
          "LLorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. " +
          "Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. " +
          "Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. " +
          "Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. " +
          "Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. " +
          "Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. " +
          "Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. " +
          "Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. " +
          "Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. " +
          "Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. Fusce vulputate eleifend sapien. " +
          "Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. " +
          "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu. " +
          "Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. " +
          "Praesent adipiscing. Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. " +
          "Aenean ut eros et nisl sagittis vestibulum. Nullam nulla eros, ultricies sit amet, nonummy id, imperdiet feugiat, pede. Sed lectus. " +
          "Donec mollis hendrerit risus. Phasellus nec sem in justo pellentesque facilisis. Etiam imperdiet imperdiet orci. Nunc nec neque. " +
          "Phasellus leo dolor, tempus non, auctor et, hendrerit quis, nisi. Curabitur ligula sapien, tincidunt non, euismod vitae, posuere imperdiet, leo. " +
          "Maecenas malesuada. Praesent congue erat at massa. Sed cursus turpis vitae tortor. Donec posuere vulputate arcu. Phasellus accumsan cursus velit. " +
          "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed aliquam, nisi quis porttitor congue, elit erat euismod orci, ac placerat dolor lectus quis orci. " +
          "Phasellus consectetuer vestibulum elit. Aenean tellus metus, bibendum sed, posuere ac, mattis non, nunc. Vestibulum fringilla pede sit amet augue. " +
          "In turpis. Pellentesque posuere. Praesent turpis. Aenean posuere, tor";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Mô tả sự kiện không được dài quá 3000 ký tự."); 
    });

    test("TC13 - Từ chối tạo event mới nếu description trống", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = undefined;

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết."); 
    });

    test("TC14 - Từ chối tạo event mới nếu start_time không ở tương lai", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate());

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thời gian bắt đầu phải ở tương lai."); 
    });

    test("TC15 - Từ chối tạo event mới nếu start_time không đúng định dạng", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = "a/b/c"

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thời gian bắt đầu hoặc kết thúc không hợp lệ."); 
    });

    test("TC16 - Từ chối tạo event mới nếu start_time trống", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = undefined;

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết."); 
    });

    test("TC17 - Từ chối tạo event mới nếu end_time trước start_time", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate());

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thời gian kết thúc phải sau thời gian bắt đầu."); 
    });

    test("TC18 - Từ chối tạo event mới nếu end_time không đúng định dạng", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = "a/b/c";

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thời gian bắt đầu hoặc kết thúc không hợp lệ."); 
    });

    test("TC19 - Từ chối tạo event mới nếu end_time trống", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = undefined;

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết."); 
    });

    test("TC20 - Tạo event mới với input hợp lệ, số người tối đa là 100 người", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description"

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 100;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        const mockEventDocument = {
            _id: "test id",
            room_id,
            user_id: userId,
            title,
            description,
            start_time,
            end_time,
            max_participants
        };
        mockEventModel.create.mockResolvedValue(mockEventDocument);

        const mockEventUserDocument = {
            event_id: mockEventDocument._id,
            user_id: userId
        };
        mockEventUserModel.create.mockResolvedValue(mockEventUserDocument);

        const res = await eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId);

        expect(res).toEqual(mockEventDocument);
        expect(mockRoomModel.findById).toHaveBeenCalledWith(room_id);
        expect(mockEventModel.findOne).toHaveBeenCalledWith({
            room_id,
            title,
            status: { $in: ["upcoming", "ongoing"] },
        });
    });

    test("TC21 - Từ chối tạo event mới nếu số người tối đa vượt 100 người", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 101;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Số lượng thành viên phải là một số trong khoảng 1 đến 100."); 
    });

    test("TC22 - Từ chối tạo event mới nếu số người tối đa không phải là số", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = "abcdef";

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Số lượng thành viên phải là một số trong khoảng 1 đến 100."); 
    });

    test("TC23 - Từ chối tạo event mới nếu số người tối đa trống", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "validId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = undefined;

        mockRoomModel.findById.mockResolvedValue({_id: "roomId", title: "Room Title"});

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Thiếu thông tin cần thiết."); 
    });

    test("TC24 - Từ chối tạo event nếu không tìm thấy phòng", async () => {
        const userId = "68ff51bca8b499e2606ab563";
        const room_id = "invalidId";
        const title = "Test title";
        const description = "Test description";

        const today = new Date();

        const start_time = new Date(today);
        start_time.setDate(today.getDate() + 1);

        const end_time = new Date(today);
        end_time.setDate(today.getDate() + 2);

        const max_participants = 1;

        mockRoomModel.findById.mockResolvedValue(null); // !IMPORTANT PART HERE

        await expect(eventService.createEvent({ room_id, title, description, start_time, end_time, max_participants}, userId))
            .rejects
            .toThrow("Không tìm thấy phòng."); 
    });
});

describe("EVE005 - Test cancelEvent function", () => {
    let mockEventModel;
    let eventService;

    beforeEach(() => {
        mockEventModel = {
            findByIdAndUpdate: jest.fn()
        };

        eventService = new EventService(mockEventModel, null, null, null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("TC01 - Cho phép hủy sự kiện nếu event id hợp lệ", async () => {
        const eventId = "existEventId";

        const mockEventDocument = {
            _id: eventId,
            title: "Sample title",
            status: "cancelled"
        };

        mockEventModel.findByIdAndUpdate.mockResolvedValue(mockEventDocument);

        const res = await eventService.cancelEvent(eventId);

        await expect(res).toEqual(mockEventDocument);
        await expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        await expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledWith(
            eventId,
            { status: "cancelled" },
            { new: true }
        );
    });

    test("TC02 - Từ chối hủy sự kiện nếu event id không tồn tại", async () => {
        const eventId = "notExistEventId";

        const mockEventDocument = null;

        mockEventModel.findByIdAndUpdate.mockResolvedValue(mockEventDocument);

        await expect(eventService.cancelEvent(eventId)).rejects.toThrow("Không tìm thấy sự kiện");
        await expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        await expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledWith(
            eventId,
            { status: "cancelled" },
            { new: true }
        );
    });

    test("TC03 - Từ chối hủy sự kiện nếu event id trống", async () => {
        const eventId = undefined;

        const mockEventDocument = null;

        mockEventModel.findByIdAndUpdate.mockResolvedValue(mockEventDocument);

        await expect(eventService.cancelEvent(eventId)).rejects.toThrow("Không tìm thấy sự kiện");
        await expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        await expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalledWith(
            eventId,
            { status: "cancelled" },
            { new: true }
        );
    });
});