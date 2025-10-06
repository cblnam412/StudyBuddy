import { Message, RoomUser} from "../models/index.js";

export const getRoomMessages = async (req, res) => {
    try {
        const { room_id } = req.params;
        const { page = 1, limit = 50, before = null } = req.query;

        const userId = req.user.id;

        const isMember = await RoomUser.findOne({ user_id: userId, room_id });

        if (!isMember) {
            return res.status(403).json({ message: "Bạn không phải thành viên phòng này" });
        }

        let query = { room_id, status: { $ne: "deleted" } };

        if (before) {
            query.created_at = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate("user_id", "full_name")
            .populate("reply_to")
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip((page - 1) * limit);

        const total = await Message.countDocuments(query);

        res.json({
            messages: messages.reverse(),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};