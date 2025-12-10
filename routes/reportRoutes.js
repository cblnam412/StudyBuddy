import express from "express";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";
import { createReport, reviewReport, processReport, findReport, viewReportDetails } from "../controllers/reportController.js";
import { isRoomLeader } from "../middlewares/roomMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createReport);
router.get("/", verifyToken, isModerator, findReport);
router.get("/:id", verifyToken, isModerator, viewReportDetails);
router.post("/:id/review", verifyToken, isModerator, reviewReport);
router.post("/:id/process", verifyToken, processReport);

export default router;
