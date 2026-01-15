import cron from "node-cron";
import { JoinRequest, User, Notification } from "../models/index.js";

export const startJoinRequestExpirationCron = () => {
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            // Lấy các join request đã hết hạn nhưng còn pending
            const expiredRequests = await JoinRequest.find({
                status: "pending",
                expires_at: { $ne: null, $lte: now },
            });

            console.log(
                `[CRON] Expired ${expiredRequests.length} join requests and sent notifications`
            );
            if (expiredRequests.length === 0) return;

            // Update status -> expired
            await JoinRequest.updateMany(
                { _id: { $in: expiredRequests.map(r => r._id) } },
                { $set: { status: "expired" } }
            );

            // Lấy danh sách moderator
            const moderators = await User.find(
                { system_role: "moderator" },
                "_id"
            );

            const moderatorIds = moderators.map(m => m._id);

            // Tạo notification
            const notifications = [];

            for (const request of expiredRequests) {
                // thông báo cho người gửi yêu cầu
                notifications.push({
                    user_id: request.user_id,
                    title: "Yêu cầu tham gia phòng đã hết hạn",
                    content: "Yêu cầu tham gia phòng của bạn đã hết hạn do quá thời gian xử lý.",
                    type: "JOIN_EXPIRED",
                    metadata: {
                        requestId: request._id,
                        roomId: request.room_id,
                    },
                });

                // thông báo cho tất cả moderator
                moderatorIds.forEach(modId => {
                    notifications.push({
                        user_id: modId,
                        title: "Yêu cầu tham gia phòng đã hết hạn",
                        content: "Có một yêu cầu tham gia phòng đã tự động hết hạn.",
                        type: "JOIN_REQUEST_EXPIRED",
                        metadata: {
                            requestId: request._id,
                            roomId: request.room_id,
                            requesterId: request.user_id,
                        },
                    });
                });
            }

            await Notification.insertMany(notifications);

            console.log(
                `[CRON] Expired ${expiredRequests.length} join requests and sent notifications`
            );
        } catch (err) {
            console.error("[CRON] Error handling expired join requests:", err);
        }
    });
};

