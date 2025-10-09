import express from "express";
import { verifyTokenForProfile } from "../middlewares/authMiddleware.js";
import { viewUserInfo, updateUserInfo, changePassword, verifyEmail, sendEmail } from "../controllers/userController.js";

const router = express.Router();
router.get("/view-profile", verifyTokenForProfile, viewUserInfo);
router.put("/update-profile", verifyTokenForProfile, updateUserInfo);
router.put("/change-password", verifyTokenForProfile, changePassword);
router.post("/change-email/send-otp", verifyTokenForProfile, sendEmail);
router.post("/change-email/verify-otp", verifyTokenForProfile, verifyEmail);

export default router;