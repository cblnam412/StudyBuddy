import { User, ModeratorApplication, UserWarning, Document, EventUser, ReputationLog, ReputationScore } from "../models/index.js";
import { supabase } from "./documentController.js"; 
import { UserService } from "../service/userService.js"; 

// Khởi tạo service
const userService = new UserService(
    User,
    ModeratorApplication,
    UserWarning,
    Document,
    EventUser,
    supabase,
    ReputationLog,
    ReputationScore
);

export const viewUserInfo = async (req, res) => {
    try {
        const user = await userService.viewUserInfo(req.user._id);
        res.json({
            message: "Lấy thông tin profile người dùng thành công.",
            user: user
        });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const updateUserInfo = async (req, res) => {
    try {
        const updatedUser = await userService.updateUserInfo(req.user._id, req.body);
        res.json({ message: "Cập nhật thông tin thành công", user: updatedUser });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 :
            error.message.includes("tồn tại") || error.message.includes("không hợp lệ") || error.message.includes("tương lai") ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        await userService.changePassword(req.user._id, oldPassword, newPassword);
        res.json({ message: "Đổi mật khẩu thành công." });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 :
            error.message.includes("không đúng") ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const sendEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        await userService.sendEmailChangeOtp(req.user._id, newEmail);
        res.json({ message: "Mã OTP đã được gửi tới email mới." });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { otp } = req.body;
        const newEmail = await userService.verifyEmailChange(req.user._id, otp);
        res.json({ message: "Đổi email thành công.", newEmail: newEmail });
    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 :
            error.message.includes("không hợp lệ") ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
};

export const updateAvatar = async (req, res) => {
    try {
        const avatarUrl = await userService.updateAvatar(req.user._id, req.file);
        return res.json({
            message: "Cập nhật avatar thành công",
            avatarUrl: avatarUrl,
        });
    } catch (error) {
        const status = (error.message.includes("Thiếu file") || error.message.includes("Chỉ cho phép") || error.message.includes("Dung lượng")) ? 400 :
            error.message.includes("Không tìm thấy") ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
}

export const applyForModerator = async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await userService.applyForModerator(req.user._id, reason);

        res.status(201).json(result);

    } catch (error) {
        const status = error.message.includes("Không tìm thấy") ? 404 :
            (error.message.includes("Bạn đã có quyền") || error.message.includes("Bạn đã có yêu cầu") || error.message.includes("thử lại sau")) ? 400 : 500;
        res.status(status).json({ message: error.message });
    }
}