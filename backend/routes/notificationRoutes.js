import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import {
    markNotificationAsRead,
    getNotifications,
    getUserNotifications,
    markAllNotificationsAsRead
 } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", verifyToken, getUserNotifications);
router.put("/:id/read", verifyToken, markNotificationAsRead);
router.put("/read-all", verifyToken, markAllNotificationsAsRead);
router.get("/unread-count", verifyToken, getNotifications);

export default router;