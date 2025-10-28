import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { getRoomMessages } from "../controllers/messageController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.get("/:room_id/", verifyToken, getRoomMessages);

export default router;
