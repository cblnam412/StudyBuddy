import { BaseRequest } from "./baseRequest.js";

export class CreateRoomRequest extends BaseRequest {

    constructor({ requesterId, data, models }) {
        super({ requesterId, models });
        this.data = data;
    }

    validate() {
        const { room_name, room_status, tags, reason, description } = this.data;

        if (!room_name || !room_status)
            throw new Error("Chưa nhập tên phòng hoặc trạng thái phòng");

        if (tags && tags.length > 0)
            this.tagList = tags; // để dùng approve()
    }

    async saveRequest() {
        const { RoomRequest, Tag } = this.models;

        if (this.data.tags && this.data.tags.length > 0) {
            const validTags = await Tag.find({ _id: { $in: this.data.tags } }).select("_id");

            if (validTags.length !== this.data.tags.length) {
                throw new Error("Một hoặc nhiều tag không hợp lệ");
            }
        }

        const newReq = await RoomRequest.create({
            requester_id: this.requesterId,
            ...this.data
        });

        this.request = newReq;
        return newReq;
    }

    async approve(approverId) {
        const { Room, TagRoom, RoomUser, Notification } = this.models;

        const request = this.request;
        if (!request || request.status !== "pending") 
            throw new Error("Không tìm thấy yêu cầu");

        // Tạo room
        const room = await Room.create({
            room_name: request.room_name,
            description: request.description,
            status: request.room_status
        });

        // Chủ phòng
        await RoomUser.create({
            room_id: room._id,
            user_id: request.requester_id,
            room_role: "leader"
        });

        // Tag phòng
        if (request.tags?.length) {
            await TagRoom.insertMany(
                request.tags.map(tag => ({ room_id: room._id, tag_id: tag }))
            );
        }

        // cập nhật request
        request.status = "approved";
        request.approver_id = approverId;
        await request.save();

        // gửi thông báo
        const notification = await Notification.create({
            user_id: request.requester_id,
            title: "Yêu cầu tạo phòng được duyệt",
            content: `Phòng "${request.room_name}" đã được tạo`
        });

        return { room, notification };
    }

    async reject(approverId, reason) {
        const { Notification } = this.models;

        const req = this.request;
        if (!req || req.status !== "pending")
            throw new Error("Không tìm thấy yêu cầu");

        req.status = "rejected";
        req.approver_id = approverId;
        req.reason = reason || req.reason || "Không rõ";
        await req.save();

        const notification = await Notification.create({
            user_id: req.requester_id,
            title: "Yêu cầu tạo phòng bị từ chối",
            content: `Lý do: ${req.reason}`
        });

        return { req, notification };
    }
}
