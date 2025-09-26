import express from "express";
import { createRoomRequest } from "../controllers/roomRequestController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createRoomRequest);

export default router;
