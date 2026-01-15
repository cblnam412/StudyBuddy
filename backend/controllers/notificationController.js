import { Notification } from "../models/index.js";
import NotificationService from "../service/notificationService.js";

const notificationService = new NotificationService(Notification);

export const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ user_id: userId })
            .sort({ created_at: -1 });
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        const notification = await notificationService.markAsRead(notificationId, userId);
        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await notificationService.markAllAsRead(userId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const { limit, page, unreadOnly } = req.query;
        const notifications = await notificationService.getUserNotifications(userId, {
            limit: parseInt(limit) || 20,
            page: parseInt(page) || 1,
            unreadOnly: unreadOnly === 'true'
        });
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};