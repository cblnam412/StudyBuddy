import mongoose from "mongoose";
import { BaseRequest } from "./baseRequest.js";
// yêu cầu tạo phòng
export class CreateRoomRequest extends BaseRequest {

    constructor({ requesterId, data, models }) {
        super({ requesterId, models });
        this.data = data;
    }

    validate() {
        const { room_name, room_status, tags, reason, description } = this.data;

        if (!room_name || !room_status || !description || !reason)
            throw new Error("Chưa nhập tên phòng hoặc trạng thái hoặc lý do hoặc mô tả phòng.");

        if (typeof room_name !== "string" || room_name.trim().length < 3) {
            throw new Error("Tên phòng phải là chuỗi và tối thiểu 3 ký tự.");
        }

        if (typeof description !== "string" || description.trim().length < 5) {
            throw new Error("Mô tả phòng phải là chuỗi và tối thiểu 5 ký tự.");
        }

        if (typeof reason !== "string" || reason.trim().length < 5) {
            throw new Error("Lý do tạo phòng phải là chuỗi và tối thiểu 5 ký tự.");
        }

        const validStatus = ["public", "private", "archived", "safe-mode"];
        if (!validStatus.includes(room_status)) {
            throw new Error("Trạng thái phòng không hợp lệ.");
        }

        if (!tags) {
            throw new Error("Chọn ít nhất một thẻ phòng.")
        }

        if (tags) {
            if (!Array.isArray(tags)) {
                throw new Error("Tags phải là một mảng.");
            }

            if (tags.some(t => !mongoose.Types.ObjectId.isValid(t))) {
                throw new Error("Một hoặc nhiều tag không phải ObjectId hợp lệ.");
            }

            this.tagList = tags;
        }
    }

    async saveRequest() {
        const { RoomRequest, Room, Tag } = this.models;
        const { room_name, tags } = this.data;

        if (tags && tags.length > 0) {
            const validTags = await Tag.find({ _id: { $in: tags } }).select("_id");

            if (validTags.length !== tags.length) {
                throw new Error("Một hoặc nhiều tag không hợp lệ.");
            }
        }

        const existedRoom = await Room.findOne({ room_name: room_name.trim() });
        if (existedRoom) {
            throw new Error("Tên phòng đã tồn tại trong hệ thống.");
        }

        const existedPendingReq = await RoomRequest.findOne({
            room_name: room_name.trim(),
            status: "pending"
        });

        if (existedPendingReq) {
            throw new Error("Đã có yêu cầu tạo phòng với tên này đang chờ duyệt.");
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

        if (!approverId)
            throw new Error("Không được thiếu approverId.");

        if (!mongoose.isValidObjectId(approverId))
            throw new Error("approverId không hợp lệ.");

        const request = this.request;
        if (!request) 
            throw new Error("Không tìm thấy yêu cầu.");

        if (request.status !== "pending")
            throw new Error("Trạng thái không hợp lệ để duyệt.");

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

        request.status = "approved";
                request.approver_id = approverId;
                await request.save();
console.log("[DEBUG BACKEND] Chuẩn bị tạo thông báo cho user:", request.requester_id);
console.log("[DEBUG BACKEND] Room ID cần lưu:", room._id);
        // gửi thông báo
        const notification = await Notification.create({
                    user_id: request.requester_id,
                    title: "Yêu cầu tạo phòng được duyệt",
                    content: `Phòng "${request.room_name}" đã được tạo`,
                    type: "ROOM_CREATED",
                    metadata: {
                        roomId: room._id
                    }

                });
console.log("[DEBUG BACKEND] Payload gửi xuống DB:", JSON.stringify(notificationPayload, null, 2));
        // log moderator activity
        const { ModeratorActivity } = this.models;
        if (ModeratorActivity) {
            try {
                await ModeratorActivity.create({
                    moderator_id: approverId,
                    action: "approve_room",
                    room_request_id: request._id,
                    target_type: "room_request",
                    decision: "approved",
                    details: `Room request "${request.room_name}" approved`,
                    metadata: { room_id: room._id, room_name: request.room_name }
                });
            } catch (err) {
                console.error('ModeratorActivity log error (approve room):', err);
            }
        }

        return { room, notification };
    }

    async reject(approverId, reason) {
        const { Notification } = this.models;

        if (!approverId)
            throw new Error("Không được thiếu approverId.");

        if (!mongoose.isValidObjectId(approverId))
            throw new Error("approverId không hợp lệ.");

        if (!reason)
            throw new Error("Yêu cầu điền lý do.");

        if (typeof reason !== "string" || reason.trim().length < 5) {
            throw new Error("Lý do từ chối phải là chuỗi và tối thiểu 5 ký tự.");
        }

        const req = this.request;
        if (!req) 
            throw new Error("Không tìm thấy yêu cầu.");

        if (req.status !== "pending")
            throw new Error("Trạng thái không hợp lệ để duyệt.");

        req.status = "rejected";
        req.approver_id = approverId;
        req.reason = reason || req.reason || "Không rõ";
        await req.save();

        const notification = await Notification.create({
            user_id: req.requester_id,
            title: "Yêu cầu tạo phòng bị từ chối.",
            content: `Lý do: ${req.reason}`
        });

        // log moderator activity
        const { ModeratorActivity } = this.models;
        if (ModeratorActivity) {
            try {
                await ModeratorActivity.create({
                    moderator_id: approverId,
                    action: "reject_room",
                    room_request_id: req._id,
                    target_type: "room_request",
                    decision: "rejected",
                    reason: req.reason,
                    details: `Room request "${req.room_name}" rejected: ${req.reason}`,
                    metadata: { room_name: req.room_name }
                });
            } catch (err) {
                console.error('ModeratorActivity log error (reject room):', err);
            }
        }

        return { req, notification };
    }
}
