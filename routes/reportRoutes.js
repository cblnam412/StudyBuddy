import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { createReport, reviewReport } from "../controllers/reportController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createReport);
router.post("/:id/review", verifyToken, isModerator, reviewReport);

export default router;
