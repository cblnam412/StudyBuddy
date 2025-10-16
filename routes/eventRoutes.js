import express from "express";
import { createEvent, cancelEvent, updateEvent, registerEvent, attendedEvent, markEventAsCompleted, getEventReport } from "../controllers/eventController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, isRoomLeader, createEvent);
router.patch("/:room_id/:id/cancel", verifyToken, isRoomLeader, cancelEvent);
router.post("/:room_id/:id/update", verifyToken, isRoomLeader, updateEvent);
router.post("/register", verifyToken, registerEvent);

router.post("/:room_id/:event_id/attend", verifyToken, attendedEvent);

router.post("/:room_id/:eventId/markEvent", verifyToken, isRoomLeader, markEventAsCompleted);
router.get("/:room_id/:eventId/getReport", verifyToken, isRoomLeader, getEventReport);

export default router;
