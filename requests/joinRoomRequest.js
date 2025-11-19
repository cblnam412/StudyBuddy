import { BaseRequest } from "./baseRequest.js";

export class JoinRoomRequest extends BaseRequest {
    constructor({ requesterId, data, models }) {
        super({ requesterId, models });
        this.data = data;
    }

    async validate() {
        const { room_id, invite_token } = this.data;
        const { Room, RoomUser } = this.models;

        if (!room_id) throw new Error("room_id không được bỏ trống");

        const room = await Room.findById(room_id);
        if (!room) throw new Error("Không tìm thấy phòng");

        const isMember = await RoomUser.findOne({
            user_id: this.requesterId,
            room_id
        });

        if (isMember) throw new Error("Bạn đã là thành viên trong phòng");

        if (room.status === "safe-mode")
            throw new Error("Hiện tại nhóm đang tạm khóa (safe-mode)");

        this.room = room;
    }

    async saveRequest() {
        const { room_id, message, invite_token } = this.data;
        const { JoinRequest, RoomInvite } = this.models;

        if (this.room.status === "private") {
            if (!invite_token) throw new Error("Phòng private yêu cầu link mời (invite_token)");

            const invite = await RoomInvite.findOneAndUpdate(
                {
                    room_id,
                    token: invite_token,
                    expires_at: { $gt: new Date() },
                    uses: 0,
                },
                { $inc: { uses: 1 } },
                { new: true }
            );

            if (!invite) throw new Error("Link mời không hợp lệ hoặc đã được dùng");
        }

        const existingRequest = await JoinRequest.findOne({
            user_id: this.requesterId,
            room_id,
            status: { $in: ["pending", "approved"] },
            expires_at: { $gt: new Date() },
        });

        if (existingRequest) {
            if (existingRequest.status === "pending") {
                throw new Error("Bạn đã gửi yêu cầu tham gia và đang chờ duyệt");
            }
            if (existingRequest.status === "approved") {
                throw new Error("Bạn đã là thành viên của phòng này");
            }
        }

        // Xóa các request cũ
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

        if (!this.request || this.request.status !== "pending")
            throw new Error("Yêu cầu không tồn tại hoặc đã được xử lý.");

        const room = await Room.findById(this.request.room_id);
        if (!room) {
            throw new Error("Không tìm thấy phòng");
        }

        if (room.status === "safe-mode") {
            throw new Error("Bây giờ không thể thêm thành viên vào nhóm");
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
            title: "Yêu cầu tham gia phòng đã được duyệt",
            content: `Bạn đã được thêm vào phòng ${room.room_name}`
        });

        return { request: this.request, notification };
    }

    async reject(approverId, reason) {
        const { Room, Notification } = this.models;

        if (!this.request || this.request.status !== "pending")
            throw new Error("Yêu cầu không tồn tại hoặc đã xử lý.");

        const room = await Room.findById(this.request.room_id);
        if (!room) {
            throw new Error("Không tìm thấy phòng");
        }

        this.request.status = "rejected";
        this.request.approver_id = approverId;
        this.request.reject_reason = reason || "Không rõ";
        await this.request.save();

        const notification = await Notification.create({
            user_id: this.request.user_id,
            title: "Yêu cầu tham gia phòng bị từ chối",
            content: `Lý do: ${this.request.reject_reason}`
        });

        return { request: this.request, notification };
    }
}
