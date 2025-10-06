import express from "express";
import { joinRoomRequest, createRoomInvite, approveJoinRequest, rejectJoinRequest } from "../controllers/roomController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.post("/join-room", verifyToken, joinRoomRequest);

router.post("/:id/approve", verifyToken, isRoomLeader, approveJoinRequest);
router.post("/:id/reject", verifyToken, isRoomLeader, rejectJoinRequest);
router.post("/invite-link", verifyToken, isRoomLeader, createRoomInvite);

export default router;
