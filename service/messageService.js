import { Message, RoomUser } from "../models/index.js";

import { ProfanityFilter, SmartAI } from "../responsibility/messageChain.js";

export class MessageService {
    constructor(messageModel, roomUserModel) {
        this.Message = messageModel;
        this.RoomUser = roomUserModel;

        this.handlerChain = new ProfanityFilter();
        const smartAI = new SmartAI();

        this.handlerChain.setNext(smartAI);
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

    async sendMessage(roomId, userId, content, replyTo = null) {
        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id: roomId });
        if (!isMember) {
            throw new Error("Bạn không phải thành viên phòng này");
        }

        try {
            await this.handlerChain.handle({ message: content }, userId);
        } catch (error) {
            throw error;
        }

        const newMessage = await this.Message.create({
            room_id: roomId,
            user_id: userId,
            content,
            reply_to: replyTo
        });
        return await newMessage.populate([{ path: "user_id", select: "full_name" },{ path: "reply_to" }]);
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
                    .populate('user_id', 'full_name')
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
}