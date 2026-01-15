import express from "express";
import {
  joinRoomRequest,
  createRoomInvite,
  approveJoinRequest,
  rejectJoinRequest,
  kickUser,
  leaveRoom,
  updateRoomInfo,
  getAllRooms,
  getRoom,
  getMyRooms,
  getJoinRequests,
  createPoll,
  listRoomPolls,
  getPoll,
  updatePoll,
  deletePoll,
  closePoll,
  votePoll,
  transferLeader
} from "../controllers/roomController.js";

import { checkFeature, verifyToken } from "../middlewares/authMiddleware.js";
import { isRoomLeader, isArchive, isSafeMode, safeModeAndArchive } from "../middlewares/roomMiddleware.js"; //Phần này phải sửa lại params nên sửa sau
const router = express.Router();
router.get("/my", verifyToken, getMyRooms);
router.get("/join-requests", verifyToken, isRoomLeader, getJoinRequests);

router.post("/join", verifyToken, joinRoomRequest);
router.post("/leave", verifyToken, leaveRoom);
router.post("/invite-link", verifyToken, isRoomLeader, createRoomInvite);
router.post("/kick-user", verifyToken, checkFeature("kick_user"), isRoomLeader, kickUser);

router.post("/:id/approve", verifyToken, isRoomLeader, approveJoinRequest);
router.post("/:id/reject", verifyToken, isRoomLeader, rejectJoinRequest);


router.put("/update-info", verifyToken, checkFeature("update_room"), isRoomLeader, updateRoomInfo);

router.put("/:id", verifyToken, isRoomLeader, updateRoomInfo);

router.post("/:room_id/polls", verifyToken, checkFeature("create_poll"), isRoomLeader, createPoll);
router.get("/:room_id/polls", verifyToken, listRoomPolls);

router.get("/polls/:id", verifyToken, getPoll);
router.put("/polls/:id", verifyToken, checkFeature("update_poll"), updatePoll);
router.post("/polls/:id/close", verifyToken, checkFeature("update_poll"), closePoll);
router.delete("/polls/:id", verifyToken, checkFeature("delete_poll"), deletePoll);
router.post("/polls/:id/vote", verifyToken, votePoll);

router.post("/:room_id/transfer-leader", verifyToken, isRoomLeader, transferLeader);

router.get("/", verifyToken, getAllRooms);
router.get("/:id", verifyToken, getRoom);

export default router;
