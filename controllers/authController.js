//checkInfo:check mssv hợp lệ với khoá, sdt hợp lệ, email hợp lệ
import { User, PendingUser } from "../models/index.js";
import sendVerificationEmail from "../utils/sendEmail.js";
import { sendResetPasswordEmail } from "../utils/sendEmail.js";
import mongoose, { startSession } from "mongoose";

import { AuthService } from "../service/authService.js";

const authService = new AuthService(
    User,              
    PendingUser,       
    sendVerificationEmail,
    sendResetPasswordEmail
);

export const checkInfo = async (req, res) => {
    try {
        const email = await authService.Register(req.body);
        return res.status(200).json({ message: `Đã gửi OTP đến ${email}` });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

export const sendEmail = async (req, res) => {
    try {
        await authService.SendEmail(req.body);
        res.json({ message: "Mã OTP đã được gửi tới email." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const verifyOtpRegister = async (req, res) => {
    try {
        const newUser = await authService.VerifyOTP(req.body);
        res.status(201).json({ message: "Tạo tài khoản thành công", user_id: newUser._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const Login = async (req, res) => {
    try {
        const { token, user } = await authService.Login(req.body);

        res.json({ message: "Đăng nhập thành công", token, userId: user._id.toString() });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
export const forgotPassword = async (req, res) => {
    try {

        await authService.ForgotPassword(req.body);
        res.json({ message: "Đã gửi email đặt lại mật khẩu. Vui lòng check email của bạn!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        await authService.ResetPassword(req.body);

        res.json({ message: "Đặt lại mật khẩu thành công." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};