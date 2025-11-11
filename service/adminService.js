
export class AdminService {
    constructor(notificationModel, userModel, roomModel) {
        this.Notification = notificationModel,
        this.User = userModel,
        this.Room = roomModel
    }

    async SetRole(Data) {
        try {
            const { userId, newRole } = Data;

            if (!userId || !newRole) {
                throw new Error("Thiếu userId hoặc newRole.");
            }

            if (!["moderator", "admin", "user"].includes(newRole)) {
                throw new Error("Role không hợp lệ.");
            }

            const user = await this.User.findById(userId);
            if (!user) {
                throw new Error("Không tìm thấy user.");
            }

            if (user.system_role === newRole) {
                throw new Error(`User đã là ${newRole}.`);
            }

            user.system_role = newRole;
            await user.save();

            const notification = await this.Notification.create({
                user_id: user._id,
                title: "Thay đổi quyền",
                content: `Quyền hệ thống của bạn đã được đổi thành ${newRole}.`
            });

            return { newRole, notification, userId: user._id.toString() };
        } catch (err) {
            throw err;
        }
    }
    async getUserStats() {
        try {
            const userStats = await this.User.aggregate([
                {
                    $group: {
                        _id: "$system_role",
                        count: { $sum: 1 },
                    },
                },
            ]);

            const stats = { admin: 0, moderator: 0, user: 0 };
            userStats.forEach(stat => {
                stats[stat._id] = stat.count;
            });
            return stats;

        } catch (error) {
            throw error;
        }
    }

    async getRoomStats() {
        try {
            const roomStats = await this.Room.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]);

            const stats = { public: 0, private: 0, archived: 0, "safe-mode": 0 };
            roomStats.forEach(stat => {
                stats[stat._id] = stat.count;
            });
            return stats;

        } catch (error) {
            throw error;
        }
    }
}