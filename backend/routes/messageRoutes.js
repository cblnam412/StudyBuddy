import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import {
    getRoomMessages,
    getLastMessagesFromAllRooms,
    getMessageById,
    searchRoomContent // Đã import đúng từ controller
} from "../controllers/messageController.js";

const router = express.Router();

// 1. Lấy tin nhắn cuối
router.get("/last/all", verifyToken, getLastMessagesFromAllRooms);

// 2. Tìm kiếm (QUAN TRỌNG: Phải đặt trước route /:room_id/)
router.get("/:room_id/search", verifyToken, searchRoomContent);

// 3. Lấy danh sách tin nhắn trong phòng
router.get("/:room_id/", verifyToken, getRoomMessages);

// 4. Lấy chi tiết 1 tin nhắn
router.get("/:message_id/detail", verifyToken, isModerator, getMessageById);

export default router;