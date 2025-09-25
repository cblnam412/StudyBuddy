const express = require("express");
const { checkInfo, sendEmail, verifyOtpRegister } = require("../controllers/authController.js");
const { verify } = require("jsonwebtoken");

const router = express.Router();

router.post("/check-info", checkInfo);
router.post("/send-email", sendEmail);
router.post("/verify-otp-register", verifyOtpRegister);


module.exports = router;