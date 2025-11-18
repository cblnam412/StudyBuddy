import { emitToUser, onlineUsers } from "../socket/onlineUser.js";
import { User, Notification, Room } from "../models/index.js";
import { AdminService } from "../service/adminService.js";

const adminService = new AdminService(
    Notification,
    User,
    Room
);

export const setRole = async (req, res, next) => {
    try {
        const { newRole, notification, userId } = await adminService.SetRole(req.body);

        emitToUser(req.app.get("io"), userId, "user:role_updated", {
            notification,
        });
        return res.status(200).json({
            message: `Đã nâng quyền user thành ${newRole}.`,
        });
    } catch (error) {
        next(error);
    }
};

export const getOnlineUsersCount = (req, res, next) => {
    try {
        const onlineCount = onlineUsers.size;
        res.status(200).json({ onlineCount });
    } catch (error) {
        next(error);
    }
};

export const getUserStatsByRole = async (req, res, next) => {
    try {
        const stats = await adminService.getUserStats();
        res.status(200).json(stats);
    } catch (error) {
        next(error);
    }
};

export const getRoomStatsByStatus = async (req, res, next) => {
    try {
        const stats = await adminService.getRoomStats();
        res.status(200).json(stats);
    } catch (error) {
        next(error);
    }
};