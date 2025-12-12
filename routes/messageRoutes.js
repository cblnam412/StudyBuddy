import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { getRoomMessages, getLastMessagesFromAllRooms, getMessageById } from "../controllers/messageController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.get("/last/all", verifyToken, getLastMessagesFromAllRooms);
router.get("/:room_id/", verifyToken, getRoomMessages);
router.get("/:message_id/detail", verifyToken, getMessageById);

export default router;
