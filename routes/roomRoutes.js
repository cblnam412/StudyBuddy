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
  getJoinRequests, // ✅ THÊM DÒNG NÀY
} from "../controllers/roomController.js";

import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { isRoomLeader, isArchive, isSafeMode, safeModeAndArchive } from "../middlewares/roomMiddleware.js"; //Phần này phải sửa lại params nên sửa sau
const router = express.Router();
router.get("/my", verifyToken, getMyRooms);
router.get("/join-requests", verifyToken, isRoomLeader, getJoinRequests);

router.post("/join-room", verifyToken, joinRoomRequest);
router.post("/leave-room", verifyToken, leaveRoom);
router.post("/invite-link", verifyToken, isRoomLeader, createRoomInvite);
router.post("/kick-user", verifyToken, isRoomLeader, kickUser);

router.post("/:id/approve", verifyToken, isRoomLeader, approveJoinRequest);
router.post("/:id/reject", verifyToken, isRoomLeader, rejectJoinRequest);
router.put("/update-info", verifyToken, isRoomLeader, updateRoomInfo);

// ✅ Cuối cùng mới là các route tổng quát
router.get("/", verifyToken, getAllRooms);
router.get("/:id", verifyToken, getRoom);


// routes/roomRoutes.js


export default router;
