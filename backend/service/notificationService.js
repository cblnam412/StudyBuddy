import {  Notification } from '../models/index.js';
import { emitToUser } from '../socket/onlineUser.js';

class NotificationService {
    constructor(NotificationModel) {
        this.Notification = NotificationModel;
    }

    async sendNotification(io, {user_id, type, title, content, metadata = {}}) {
        try {
            
            if (!user_id || !type || !title || !content) {
                throw new Error('Thiếu dữ liệu bắt buộc để gửi thông báo');
            }

            if (title.length > 100) {
                throw new Error('Tiêu đề thông báo không được vượt quá 100 ký tự');
            }

            if (content.length > 500) {
                throw new Error('Nội dung thông báo không được vượt quá 500 ký tự');
            }

            const notification = await this.Notification.create({
                user_id,
                type,
                title,
                content,
                metadata
            });

            await notification.populate({
                path: 'user_id',
                select: 'full_name avatar'
            });

            emitToUser(io, user_id.toString(), "notification:new", {
                _id: notification._id,
                type: notification.type,
                title: notification.title,
                content: notification.content,
                metadata: notification.metadata,
                is_read: notification.is_read,
                created_at: notification.created_at,
                user: notification.user_id
            });

            return notification;
        } catch (error) {
            throw new Error(`Lỗi khi gửi thông báo: ${error.message}`);
        }
    } 

    async sendBulkNotifications(io, users, notificationData) {
        const promises = users.map(userId => 
            this.sendNotification(io, {
                ...notificationData,
                user_id: userId
            })
        );
        return Promise.all(promises);
    }

    async markAsRead(notificationId, userId) {
        const notification = await this.Notification.findOneAndUpdate(
            { _id: notificationId, user_id: userId },
            { is_read: true },
            { new: true }
        );
        
        if (notification) {
            return notification;
        }
        throw new Error("Không tìm thấy thông báo hoặc bạn không có quyền thực hiện hành động này.");
    }

    async markAllAsRead(userId) {
        await this.Notification.updateMany(
            { user_id: userId, is_read: false },
            { is_read: true }
        );
        return { message: "Tất cả thông báo đã được đọc" };
    }

    async getUserNotifications(userId, { limit = 20, page = 1, unreadOnly = false }) {
        const query = { user_id: userId };
        if (unreadOnly) {
            query.is_read = false;
        }

        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            this.Notification.find(query)
                .populate('user_id', 'full_name email')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit),
            this.Notification.countDocuments(query)
        ]);

        return {
            notifications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

export default NotificationService;
