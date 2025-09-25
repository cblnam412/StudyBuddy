const express = require("express");
const { checkInfo, sendEmail, verifyOtpRegister, Login} = require("../controllers/authController.js");

const router = express.Router();

router.post("/check-info", checkInfo);
router.post("/send-email", sendEmail);
router.post("/verify-otp-register", verifyOtpRegister);
router.post("/login", Login);


module.exports = router;