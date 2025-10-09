import express from "express";
import { forgotPassword, resetPassword, checkInfo, sendEmail, verifyOtpRegister, Login} from "../controllers/authController.js";

const router = express.Router();

router.post("/check-info", checkInfo);
router.post("/send-email", sendEmail);
router.post("/verify-otp-register", verifyOtpRegister);
router.post("/login", Login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
    