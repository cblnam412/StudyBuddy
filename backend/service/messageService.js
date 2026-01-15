import { Message, RoomUser, Room } from "../models/index.js";
import mongoose from "mongoose";
import { ProfanityFilter, SmartAI } from "../responsibility/messageChain.js";

export class MessageService {
    constructor(messageModel, roomUserModel) {
        this.Message = messageModel;
        this.RoomUser = roomUserModel;

        this.handlerChain = new ProfanityFilter();
        this.smartAI = new SmartAI();

        this.handlerChain.setNext(this.smartAI);
    }

    async detectArchivedRoom(roomId) {
        const room = await Room.findById(roomId);

        if (!room)
            throw new Error("Không tìm thấy phòng.");

        if (room.status === "archived")
            throw new Error("Phòng đang ở trạng thái lưu trữ.");

        return true;
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
                .populate("user_id", "full_name avatarUrl")
                .populate("reply_to") 
                .populate("document_id", "file_name")
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

    async sendMessage(roomId, userId, content, replyTo = null, eventId = null, documentId = null) {
        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id: roomId });
        if (!isMember) {
            throw new Error("Bạn không phải thành viên phòng này");
        }

        // check trạng thái lưu trữ
        await this.detectArchivedRoom(roomId);

        try {
            await this.handlerChain.handle({ message: content }, userId);
        } catch (error) {
            throw error;
        }

        const messageData = {
            room_id: roomId,
            user_id: userId,
            content,
            reply_to: replyTo
        };

        // Thêm event_id nếu được cung cấp
        if (eventId) {
            messageData.event_id = eventId;
        }
        if (documentId) {
            messageData.document_id = documentId;
        }

        const newMessage = await this.Message.create(messageData);
        const populated = await newMessage.populate([{ path: "user_id", select: "full_name avatarUrl" },{ path: "reply_to" }]);

        if (this.smartAI) {
            try {
                this.smartAI.runAICheckBackground(content, userId, newMessage._id);
            } catch (err) {
                console.error('[SmartAI] Background error:', err);
            }
        }

        return populated;
    }

    async getLastMessagesFromUserRooms(userId) {
        const memberships = await this.RoomUser.find({ user_id: userId }).select('room_id').lean();
        
        if (!memberships || memberships.length === 0) {
            return [];
        }

        const roomIds = memberships.map(m => m.room_id);

        const lastMessages = await Promise.all(
            roomIds.map(async (roomId) => {
                const lastMsg = await this.Message.findOne({
                    room_id: roomId,
                    status: { $ne: "deleted" }
                })
                    .populate('user_id', 'full_name avatarUrl')
                    .sort({ created_at: -1 })
                    .lean();

                return {
                    room_id: roomId,
                    last_message: lastMsg || null
                };
            })
        );

        return lastMessages;
    }

    async getMessageById(messageId) {
    if (!messageId) {
        throw new Error("Thiếu messageId.");
    }

    if (!mongoose.isValidObjectId(messageId)) {
        throw new Error("messageId không hợp lệ.");
    }

    const msg = await this.Message.findById(messageId)
        .select("-created_at -updated_at")
        .populate("user_id", "full_name email")
        .populate("room_id", "room_name")
        .lean();

    if (!msg) {
        throw new Error("Không tìm thấy tin nhắn.");
    }

    return msg;
}

}