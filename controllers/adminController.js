import { emitToUser, onlineUsers } from "../socket/onlineUser.js";
import { User, Notification, Room } from "../models/index.js";

export const setRole = async (req, res) => {
    try {
        const { userId, newRole } = req.body;

        if (!userId || !newRole) {
            return res.status(400).json({ message: "Thiếu userId hoặc newRole." });
        }

        if (!["moderator", "admin", "user"].includes(newRole)) {
            return res.status(400).json({ message: "Role không hợp lệ." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user." });
        }

        if (user.system_role === newRole) {
            return res.status(400).json({ message: `User đã là ${newRole}.` });
        }

        user.system_role = newRole;
        await user.save();

        const notification = await Notification.create({
            user_id: user._id,
            title: "Thay đổi quyền",
            content: `Quyền hệ thống của bạn đã được đổi thành ${newRole}.`
        });

        emitToUser(req.app.get("io"), user._id.toString(), "user:role_updated", {
            notification,
        });

        return res.status(200).json({
            message: `Đã nâng quyền user thành ${newRole}.`,
        });
    }
};

export const getOnlineUsersCount = (req, res) => {
    try {
        const onlineCount = onlineUsers.size;
        res.status(200).json({ onlineCount });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const getUserStatsByRole = async (req, res) => {
    try {
        const userStats = await User.aggregate([
            {
                $group: {
                    _id: "$system_role",
                    count: { $sum: 1 },
                },
            },
        ]);

        const stats = {
            admin: 0,
            moderator: 0,
            user: 0,
        };

        userStats.forEach(stat => {
            stats[stat._id] = stat.count;
        });

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const getRoomStatsByStatus = async (req, res) => {
    try {
        const roomStats = await Room.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const stats = {
            public: 0,
            private: 0,
            archived: 0,
            "safe-mode": 0,
        };

        roomStats.forEach(stat => {
            stats[stat._id] = stat.count;
        });

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};