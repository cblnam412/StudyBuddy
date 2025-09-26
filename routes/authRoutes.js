import express from "express";
import { checkInfo, sendEmail, verifyOtpRegister, Login } from "../controllers/authController.js";

const router = express.Router();

router.post("/check-info", checkInfo);
router.post("/send-email", sendEmail);
router.post("/verify-otp-register", verifyOtpRegister);
router.post("/login", Login);

export default router;
    