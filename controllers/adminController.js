import { emitToUser, onlineUsers } from "../socket/onlineUser.js";
import { User, Notification, Room, Report, ModeratorApplication, RoomUser, RoomInvite, Tag, TagRoom, JoinRequest, Poll } from "../models/index.js";
import { AdminService } from "../service/adminService.js";
import { RoomService } from "../service/roomService.js";

const adminService = new AdminService(
    Notification,
    User,
    Room,
    Report,
    ModeratorApplication
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
        //const test = await adminService.getReportProcessingRatio();
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

export const getReportProcessingRatio = async(req, res, next) => {
    try {
        const stat = await adminService.getReportProcessingRatio();
        res.status(200).json(stat);
    } catch (error) {
        next(error);
    }
}

export const findModeratorApplications = async (req, res, next) => {
    try {
        const { status, page, limit, userId, reviewerId, from, to, hasErrors, q } = req.query;
        const parsed = {
            status,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            userId,
            reviewerId,
            from,
            to,
            hasErrors: typeof hasErrors === 'undefined' ? undefined : (hasErrors === 'true' || hasErrors === true),
            q
        };

        const result = await adminService.findModeratorApplications(parsed);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const approveModeratorApplication = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const reviewerId = req.user?.id;
        const result = await adminService.approveModeratorApplication({ applicationId, reviewerId });

        if (result && result.userId) {
            emitToUser(req.app.get("io"), result.userId, "moderator:application_approved", { notification: result.notification });
        }

        res.status(200).json({ message: "Đã duyệt đơn ứng tuyển moderator.", application: result.application });
    } catch (error) {
        next(error);
    }
};

export const rejectModeratorApplication = async (req, res, next) => {
    try {
        const applicationId = req.params.id;
        const reviewerId = req.user?.id;
        const { reason } = req.body;
        const result = await adminService.rejectModeratorApplication({ applicationId, reviewerId, reason });

        if (result && result.userId) {
            emitToUser(req.app.get("io"), result.userId, "moderator:application_rejected", { notification: result.notification });
        }

        res.status(200).json({ message: "Đã từ chối đơn ứng tuyển moderator.", application: result.application });
    } catch (error) {
        next(error);
    }
};

export const applySeverePunishment = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { level, reason } = req.body;
        const issuerId = req.user?.id;

        const roomService = new RoomService(Room, RoomUser, RoomInvite, Tag, TagRoom, JoinRequest, Poll);
        const result = await roomService.applySeverePunishment(userId, parseInt(level, 10), reason, issuerId);

        try {
            await Notification.create({
                user_id: userId,
                type: 'warning',
                title: 'Hình phạt được áp dụng',
                content: `Bạn đã bị áp dụng hình phạt level ${level}. Lý do: ${reason}`
            });
            emitToUser(req.app.get('io'), userId, 'user:punished', { level, reason });
        } catch (nerr) {
            console.error('Notify punished user error:', nerr);
        }

        res.status(200).json({ message: 'Áp dụng hình phạt thành công', result });
    } catch (error) {
        next(error);
    }
};