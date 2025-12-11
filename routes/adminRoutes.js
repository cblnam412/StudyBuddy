import express from "express";
import { getUserStatsByRole, setRole, getOnlineUsersCount, getRoomStatsByStatus,
    getReportProcessingRatio, findModeratorApplications, approveModeratorApplication, rejectModeratorApplication
} from "../controllers/adminController.js";
import { verifyToken, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/set-role", verifyToken, isAdmin, setRole);
router.get("/get-user", verifyToken, isAdmin, getUserStatsByRole);
router.get("/get-user-online", verifyToken, isAdmin, getOnlineUsersCount);
router.get("/get-room", verifyToken, isAdmin, getRoomStatsByStatus);
router.get("/report-ratio", verifyToken, isAdmin, getReportProcessingRatio);

router.get("/moderator-applications", verifyToken, isAdmin, findModeratorApplications);
router.post("/moderator-applications/:id/approve", verifyToken, isAdmin, approveModeratorApplication);
router.post("/moderator-applications/:id/reject", verifyToken, isAdmin, rejectModeratorApplication);

export default router;
