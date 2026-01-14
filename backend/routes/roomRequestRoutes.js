import express from "express";
import { createRoomRequest, rejectRoomRequest, approveRoomRequest, getAllRoomRequests } from "../controllers/roomRequestController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
// routes/roomRequestRoutes.js
router.post("/join", verifyToken, createJoinRoomRequest);

router.post("/", verifyToken, createRoomRequest);
router.post("/:id/reject", verifyToken, isModerator, rejectRoomRequest);
router.post("/:id/approve", verifyToken, isModerator, approveRoomRequest);
router.get("/", verifyToken, isModerator, getAllRoomRequests);


export default router;
