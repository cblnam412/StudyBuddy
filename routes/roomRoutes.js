import express from "express";
import { joinRoomRequest, createRoomInvite } from "../controllers/roomController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.post("/join-room", verifyToken, joinRoomRequest);
router.post("/invite-link", verifyToken, isRoomLeader, createRoomInvite);

export default router;
