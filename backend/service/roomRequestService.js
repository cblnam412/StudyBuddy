import { RoomRequest, Room, Tag, Notification, TagRoom, RoomUser } from "../models/index.js";

// Yêu cầu tạo phòng
export class RoomRequestService {
    constructor(RoomRequest) {
        this.RoomRequest = RoomRequest;
    }

    async getAllRoomRequests() {
        return this.RoomRequest.find()
            .populate("requester_id", "email")
            .populate("tags", "tagName")
            .sort({ createdAt: -1 });
    }
}

// export class RoomRequestService {
//     constructor(RoomRequest, Room, Tag, Notification, TagRoom, RoomUser) {
//         this.RoomRequest = RoomRequest;
//         this.Room = Room;
//         this.Tag = Tag;
//         this.Notification = Notification;
//         this.TagRoom = TagRoom;
//         this.RoomUser = RoomUser;
//     }

//     async createRoomRequest(data, requesterId) {
//         const { room_name, description, tags, reason, room_status } = data;

//         if (!room_name || !room_status) {
//             throw new Error("Chưa nhập tên phòng hoặc trạng thái phòng");
//         }

//         if (tags && tags.length > 0) {
//             const validTags = await this.Tag.find({ _id: { $in: tags } });
//             if (validTags.length !== tags.length) {
//                 throw new Error("Một số tag không hợp lệ!");
//             }
//         }

//         const newRequest = await this.RoomRequest.create({
//             requester_id: requesterId,
//             room_name,
//             description,
//             tags: tags || [],
//             reason,
//             room_status,
//         });

//         return newRequest;
//     }

//     async approveRoomRequest(requestId, approverId) {
//         const request = await this.RoomRequest.findById(requestId);
//         if (!request || request.status !== "pending") {
//             throw new Error("Không tìm thấy yêu cầu");
//         }

//         if (request.tags && request.tags.length > 0) {
//             const validTags = await this.Tag.find({ _id: { $in: request.tags } });
//             if (validTags.length !== request.tags.length) {
//                 throw new Error("Một số tag không hợp lệ.");
//             }
//         }

//         const room = await this.Room.create({
//             room_name: request.room_name,
//             description: request.description,
//             status: request.room_status,
//         });

//         await this.RoomUser.create({
//             room_id: room._id,
//             user_id: request.requester_id,
//             room_role: "leader"
//         });

//         if (request.tags && request.tags.length > 0) {
//             const roomTags = request.tags.map((tagId) => ({
//                 room_id: room._id,
//                 tag_id: tagId,
//             }));
//             await this.TagRoom.insertMany(roomTags);
//         }

//         request.status = "approved";
//         request.approver_id = approverId;
//         await request.save();

//         const notification = await this.Notification.create({
//             user_id: request.requester_id,
//             title: "Yêu cầu tạo phòng được thông qua",
//             content: `Phòng "${request.room_name}" đã được tạo`,
//         });

//         return { request, notification };
//     }

//     async getAllRoomRequests() {
//         const requests = await this.RoomRequest.find()
//             .populate("requester_id", "email")
//             .populate("tags", "tagName")
//             .sort({ createdAt: -1 }); 

//         return requests;
//     }

//     async rejectRoomRequest(requestId, approverId, reason) {
//         const request = await this.RoomRequest.findById(requestId);
//         if (!request || request.status !== "pending") {
//             throw new Error("Không tìm thấy yêu cầu");
//         }

//         request.status = "rejected";
//         request.approver_id = approverId;
//         request.reason = reason || request.reason || "Không rõ"; 
//         await request.save();

//         const notification = await this.Notification.create({
//             user_id: request.requester_id,
//             title: "Yêu cầu tạo phòng bị từ chối",
//             content: `Phòng "${request.room_name}" đã bị từ chối. Lý do: ${request.reason}`,
//         });

//         return { request, notification };
//     }
// }