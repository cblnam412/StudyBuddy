import express from "express";
import { getUserStatsByRole, setRole, getOnlineUsersCount, getRoomStatsByStatus } from "../controllers/adminController.js";
import { verifyToken, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/set-role", verifyToken, isAdmin, setRole);
router.get("/get-user", verifyToken, isAdmin, getUserStatsByRole);
router.get("/get-user-online", verifyToken, isAdmin, getOnlineUsersCount);
router.get("/get-room", verifyToken, isAdmin, getRoomStatsByStatus);

export default router;
