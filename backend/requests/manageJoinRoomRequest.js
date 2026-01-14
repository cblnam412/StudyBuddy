import Room from "../models/Room.js";
import mongoose from "mongoose";
import { BaseRequest } from "./baseRequest.js";

export class JoinRoomRequest extends BaseRequest {
    constructor({ requesterId, data, models }) {
        super({ requesterId, models });
        this.data = data;
    }

    async validate() {
        const { room_id, message } = this.data;
        const { Room } = this.models;

        if (!room_id)
            throw new Error("Không được bỏ trống room_id.");

        if (!message || typeof message !== "string" || message.trim().length < 10)
            throw new Error("message phải là chuỗi và tối thiểu 10 ký tự.");

        const room = await Room.findById(room_id);
        if (!room)
            throw new Error("Không tìm thấy phòng.");

        if (room.status === "safe-mode")
            throw new Error("Hiện tại nhóm đang tạm khóa (safe-mode).");

        this.room = room;
    }


    async saveRequest() {
            const { room_id, message } = this.data;
            const room = this.room;

            const { JoinRequest, RoomInvite, Room, RoomUser } = this.models;

            const room = await Room.findById(room_id);
            if (!room)
                throw new Error("Không tìm thấy phòng.");

            const existingRequest = await JoinRequest.findOne({
                user_id: this.requesterId,
                room_id,
                status: { $in: ["pending", "approved"] },
                expires_at: { $gt: new Date() },
            });

            if (existingRequest) {
                if (existingRequest.status === "pending") {
                    throw new Error("Bạn đã gửi yêu cầu tham gia và đang chờ duyệt.");
                }
                if (existingRequest.status === "approved") {
                    //Có đơn Approved nhưng người này có đang ở trong phòng không?
                    const isRealMember = await RoomUser.exists({ room_id, user_id: this.requesterId });

                    if (isRealMember) {
                        throw new Error("Bạn đã là thành viên của phòng này.");
                    } else {
                        //Rời phòng thì xóa đơn cũ đi để tạo đơn mới
                        await JoinRequest.deleteOne({ _id: existingRequest._id });
                    }
                }
            }

            await JoinRequest.deleteMany({
                user_id: this.requesterId,
                room_id
            });

            this.request = await JoinRequest.create({
                user_id: this.requesterId,
                room_id,
                message,
                status: "pending",
                expires_at: new Date(Date.now() + 3 * 86400000), // 3 days
            });

            return this.request;
        }

    async approve(approverId) {
        const { Room, Notification, RoomUser } = this.models;

        if (!approverId)
            throw new Error("Không được thiếu approverId.");

        if (!mongoose.isValidObjectId(approverId))
            throw new Error("approverId không hợp lệ.");

        if (!this.request)
            throw new Error("Yêu cầu không tồn tại.");

        if (this.request.status !== "pending")
            throw new Error("Yêu cầu đã được xử lý.");

        const room = await Room.findById(this.request.room_id);
        if (!room) {
            throw new Error("Không tìm thấy phòng.");
        }

        if (room.status === "safe-mode") {
            throw new Error("Bây giờ không thể thêm thành viên vào nhóm.");
        }

        await RoomUser.create({
                    room_id: this.request.room_id,
                    user_id: this.request.user_id
                });

                this.request.status = "approved";
                this.request.approver_id = approverId;
                await this.request.save();

                const notification = await Notification.create({
                    user_id: this.request.user_id,
                    type: "JOIN_APPROVED",
                    metadata: { roomId: this.request.room_id },
                    title: "Yêu cầu tham gia phòng đã được duyệt.",
                    content: `Bạn đã được thêm vào phòng ${room.room_name}.`
                });

                return { request: this.request, notification };
    }

    async reject(approverId, reason) {
        const { Room, Notification } = this.models;

        if (!approverId)
            throw new Error("Không được thiếu approverId.");

        if (!mongoose.isValidObjectId(approverId))
            throw new Error("approverId không hợp lệ.");

        if (!this.request)
            throw new Error("Yêu cầu không tồn tại.");

        if (this.request.status !== "pending")
            throw new Error("Yêu cầu đã được xử lý.");

        const room = await Room.findById(this.request.room_id);
        if (!room) {
            throw new Error("Không tìm thấy phòng.");
        }

        if (!reason)
            throw new Error("Yêu cầu điền lý do.");

        if (typeof reason !== "string" || reason.trim().length < 10) {
            throw new Error("Lý do từ chối phải là chuỗi và tối thiểu 10 ký tự.");
        }

        this.request.status = "rejected";
                this.request.approver_id = approverId;
                this.request.reject_reason = reason || "Không rõ";
                await this.request.save();

                const notification = await Notification.create({
                    user_id: this.request.user_id,
                    type: "JOIN_REJECTED",
                    title: "Yêu cầu tham gia phòng bị từ chối.",
                    content: `Lý do: ${this.request.reject_reason}.`
                });

                return { request: this.request, notification };
            }
}
