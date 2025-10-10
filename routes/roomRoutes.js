import express from "express";
import { joinRoomRequest, createRoomInvite, approveJoinRequest, rejectJoinRequest, kickUser, leaveRoom , updateRoomInfo} from "../controllers/roomController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.post("/join-room", verifyToken, joinRoomRequest);
router.post("/leave-room", verifyToken, leaveRoom);

router.post("/:id/approve", verifyToken, isRoomLeader, approveJoinRequest);
router.post("/:id/reject", verifyToken, isRoomLeader, rejectJoinRequest);
router.post("/invite-link", verifyToken, isRoomLeader, createRoomInvite);
router.post("/kick-user", verifyToken, isRoomLeader, kickUser);

router.put("/update-info", verifyToken, isRoomLeader, updateRoomInfo);

export default router;
