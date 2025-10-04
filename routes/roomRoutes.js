import express from "express";
import { joinRoomRequest } from "../controllers/roomController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/join-room", verifyToken, joinRoomRequest);

export default router;
