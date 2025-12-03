//checkInfo:check mssv hợp lệ với khoá, sdt hợp lệ, email hợp lệ
import { User, PendingUser, ReputationLog, ReputationScore } from "../models/index.js";
import sendVerificationEmail from "../utils/sendEmail.js";
import { sendResetPasswordEmail } from "../utils/sendEmail.js";
import mongoose, { startSession } from "mongoose";

import { AuthService } from "../service/authService.js";
import { UserService } from "../service/userService.js"; 
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const userService = new UserService(User, null, null, null, null, null, ReputationLog, ReputationScore);

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

        const streak = await authService.updateLoginStreak(user._id);

        if (streak % 10 === 0) {
            // cộng điểm mỗi khi đăng nhập 10 ngày liên tiếp  
            await userService.incrementUserReputation(
                user._id,
                0.2,
                "Đạt chuỗi đăng nhập 10 ngày liên tiếp",
                "activity"
            );
        }

        res.json({ message: "Đăng nhập thành công", token, userId: user._id.toString() });
    } catch (error) {
        next(error);
    }
};
export const forgotPassword = async (req, res, next) => {
    try {
        const status = await authService.ForgotPassword(req.body);
        if (status) res.json({ message: "Đã gửi email đặt lại mật khẩu. Vui lòng check email của bạn!" });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const status = await authService.ResetPassword(req.body);

        if (status) res.json({ message: "Đặt lại mật khẩu thành công." });
    } catch (error) {
        next(error);
    }
};