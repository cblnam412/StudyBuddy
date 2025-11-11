import { Message, RoomUser } from "../models/index.js";
import { MessageService } from "../service/messageService.js"; 

const messageService = new MessageService(Message, RoomUser);

export const getRoomMessages = async (req, res) => {
    try {
        const { room_id } = req.params;
        const userId = req.user.id;

        const options = {
            page: req.query.page,
            limit: req.query.limit,
            before: req.query.before
        };
        const { messages, pagination } = await messageService.getRoomMessages(room_id, userId, options);

        return res.json({
            messages,
            pagination
        });

    } catch (error) {
        if (error.message === "Bạn không phải thành viên phòng này") {
            return res.status(403).json({ message: error.message });
        }
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};