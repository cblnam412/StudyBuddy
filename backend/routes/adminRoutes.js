import express from "express";
import { getUserStatsByRole, setRole, getOnlineUsersCount, getRoomStatsByStatus,
    getReportProcessingRatio, findModeratorApplications, approveModeratorApplication, rejectModeratorApplication, applySeverePunishment
} from "../controllers/adminController.js";
import { listModeratorActivities, getActivityStats, getModeratorSummary } from "../controllers/moderatorController.js";
import { verifyToken, isAdmin, isModerator } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/set-role", verifyToken, isAdmin, setRole);
router.get("/get-user", verifyToken, isAdmin, getUserStatsByRole);
router.get("/get-user-online", verifyToken, isAdmin, getOnlineUsersCount);
router.get("/get-room", verifyToken, isAdmin, getRoomStatsByStatus);
router.get("/report-ratio", verifyToken, isAdmin, getReportProcessingRatio);

router.get("/moderator-applications", verifyToken, isAdmin, findModeratorApplications);
router.post("/moderator-applications/:id/approve", verifyToken, isAdmin, approveModeratorApplication);
router.post("/moderator-applications/:id/reject", verifyToken, isAdmin, rejectModeratorApplication);

router.post("/punish/:id", verifyToken, isModerator, applySeverePunishment);

router.get("/moderator-activities", verifyToken, isAdmin, listModeratorActivities);
router.get("/moderator-activities/stats", verifyToken, isAdmin, getActivityStats);
router.get("/moderator/:id/summary", verifyToken, isAdmin, getModeratorSummary);

export default router;
