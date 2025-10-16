import express from "express";
import multer from "multer";
import { verifyTokenForProfile } from "../middlewares/authMiddleware.js";
import { viewUserInfo, updateUserInfo, changePassword, verifyEmail, sendEmail, updateAvatar, applyForModerator } from "../controllers/userController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/view-profile", verifyTokenForProfile, viewUserInfo);
router.put("/update-profile", verifyTokenForProfile, updateUserInfo);
router.put("/change-password", verifyTokenForProfile, changePassword);
router.post("/change-email/send-otp", verifyTokenForProfile, sendEmail);
router.post("/change-email/verify-otp", verifyTokenForProfile, verifyEmail);
router.post("/apply-moderator", verifyTokenForProfile, applyForModerator);

router.post("/update-avatar", verifyTokenForProfile, upload.single("avatar"), updateAvatar);

export default router;