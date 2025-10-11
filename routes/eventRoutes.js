import express from "express";
import { createEvent, cancelEvent, updateEvent, registerEvent } from "../controllers/eventController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, isRoomLeader, createEvent);
router.patch("/:id/cancel", verifyToken, isRoomLeader, cancelEvent);
router.post("/:id/update", verifyToken, isRoomLeader, updateEvent);
router.post("/register", verifyToken, registerEvent);

export default router;
