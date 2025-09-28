import express from "express";
import { createRoomRequest, rejectRoomRequest, approveRoomRequest } from "../controllers/roomRequestController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createRoomRequest);
router.post("/:id/reject", verifyToken, isModerator, rejectRoomRequest);
router.post("/:id/approve", verifyToken, isModerator, approveRoomRequest);

export default router;
