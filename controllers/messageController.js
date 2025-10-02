import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const messages = await Message.find({ room_id: roomId })
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("user_id", "full_name")
            .lean();

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy tin nhắn", error: error.message });
    }
};  