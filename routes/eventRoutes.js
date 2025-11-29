import express from "express";
import {
    createEvent, cancelEvent, updateEvent, registerEvent, attendedEvent, markEventAsCompleted, getEventReport, getEvent, findEvents, unregisterEvent,
} from "../controllers/eventController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";
import { verifyToken, checkFeature } from "../middlewares/authMiddleware.js";
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.post("/", verifyToken, checkFeature("create_event"), isRoomLeader, createEvent);
router.patch("/:room_id/:id/cancel", verifyToken, isRoomLeader, cancelEvent);
router.post("/:room_id/:id/update", verifyToken, isRoomLeader, updateEvent);
router.post("/register", verifyToken, registerEvent);
router.delete("/register", verifyToken, unregisterEvent);

router.post("/:room_id/:eventId/attend", verifyToken, attendedEvent);

router.post("/:room_id/:eventId/markEvent", verifyToken, isRoomLeader, markEventAsCompleted);
router.get("/:room_id/:eventId/getReport", verifyToken, isRoomLeader, getEventReport);

//Lưu ý, getEvent chỉ lấy thông tin chi tiết MỘT sự kiện
router.get("/:id", verifyToken, getEvent);
//findEvent có thể lọc theo: người tạo, đã đăng ký, trạng thái và id Phòng, nên nếu kh có tham số nào = lấy hết.
router.get("/", verifyToken, findEvents);

export default router;
