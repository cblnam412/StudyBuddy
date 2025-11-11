import { Message, RoomUser } from "../models/index.js";

export class MessageService {
    constructor(messageModel, roomUserModel) {
        this.Message = messageModel;
        this.RoomUser = roomUserModel;
    }

    async getRoomMessages(roomId, userId, options) {
        const { page = 1, limit = 50, before = null } = options;

        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id: roomId });
        if (!isMember) {
            throw new Error("Bạn không phải thành viên phòng này");
        }

        let query = { room_id: roomId, status: { $ne: "deleted" } };

        if (before) {
            query.created_at = { $lt: new Date(before) };
        }

        const [messages, total] = await Promise.all([
            this.Message.find(query)
                .populate("user_id", "full_name")
                .populate("reply_to") 
                .sort({ created_at: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit)),
            this.Message.countDocuments(query)
        ]);

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        };

        return {
            messages: messages.reverse(),
            pagination
        };
    }
}