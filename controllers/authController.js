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

export const checkInfo = async (req, res, next) => {
    try {
        const email = await authService.Register(req.body);
        return res.status(200).json({ message: `Đã gửi OTP đến ${email}` });
    } catch (error) {
        next(error);
    }
};

export const sendEmail = async (req, res, next) => {
    try {
        await authService.SendEmail(req.body);
        res.json({ message: "Mã OTP đã được gửi tới email." });
    } catch (error) {
        next(error);
    }
};

export const verifyOtpRegister = async (req, res, next) => {
    try {
        const newUser = await authService.VerifyOTP(req.body);
        res.status(201).json({ message: "Tạo tài khoản thành công", user_id: newUser._id });
    } catch (error) {
        next(error);
    }
};

export const Login = async (req, res, next) => {
    try {
        const { token, user } = await authService.Login(req.body);

        res.json({ message: "Đăng nhập thành công", token, userId: user._id.toString() });
    } catch (error) {
        next(error);
    }
};
export const forgotPassword = async (req, res, next) => {
    try {

        await authService.ForgotPassword(req.body);
        res.json({ message: "Đã gửi email đặt lại mật khẩu. Vui lòng check email của bạn!" });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        await authService.ResetPassword(req.body);

        res.json({ message: "Đặt lại mật khẩu thành công." });
    } catch (error) {
        next(error);
    }
};