import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { createReport, reviewReport, processReport } from "../controllers/reportController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createReport);
router.post("/:id/review", verifyToken, isModerator, reviewReport);
router.post("/:id/process", verifyToken, processReport);

export default router;
