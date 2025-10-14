import { User } from "../models/index.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendVerificationEmail from "../utils/sendEmail.js";
import { supabase } from "./documentController.js";
import path from "path";

export const viewUserInfo = async (req, res) => {
    try {
        res.json({
            message: "Lấy thông tin profile người dùng thành công.",
            user: req.user
        })
    } catch(error){
        res.status(500).json({message: "LỖI SERVER: ", error: error.message});
    }
};

export const updateUserInfo = async (req, res) => {
    try {
        const { full_name, phone_number, address, email, faculty } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        if (full_name) user.full_name = full_name;
        if (phone_number) user.phone_number = phone_number;
        if (address) user.address = address;
        if (email) user.email = email;
        if (faculty) user.faculty = faculty;

        await user.save();

        const updatedUser = await User.findById(user._id).select("-password -resetPasswordToken -resetPasswordExpires -create_at -update_at -__v");
        res.json({ message: "Cập nhật thông tin thành công", user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: "LỖI SERVER: ", error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");
        if(!user){
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if(!isMatch) {
            return res.status(400).json({ message: "Mật khẩu cũ không đúng." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Đổi mật khẩu thành công." });
    } catch (error) {
        res.status(500).json({ message: "LỖI SERVER: ", error: error.message });
    }
};

export const sendEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const user = await User.findById(req.user._id).select("+password");
        if(!user){
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        req.user.emailChangeOtp = otp;
        req.user.emailChangeNew = newEmail;
        req.user.emailChangeExpires = Date.now() + 10 * 60 * 1000; // 10 phút

        await req.user.save();
        await sendVerificationEmail(newEmail, otp);

        res.json({ message: "Mã OTP đã được gửi tới email mới." });
    } catch (error) {
        res.status(500).json({ message: "LỖI SERVER: ", error: error.message });
    }
};

export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if(!user){
        return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    if (!user.emailChangeOtp || user.emailChangeOtp !== otp || user.emailChangeExpires < Date.now()) {
      return res.status(400).json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn." });
    }

    user.email = user.emailChangeNew;
    user.emailChangeOtp = undefined;
    user.emailChangeNew = undefined;
    user.emailChangeExpires = undefined;

    await user.save();

    res.json({ message: "Đổi email thành công.", newEmail: user.email });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xác thực OTP", error: error.message });
  }
};


export const updateAvatar = async (req, res) => {
    try {
        const file = req.file;
        const userId = req.user._id;

        if (!file) {
            return res.status(400).json({ message: "Thiếu file ảnh" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        if (!file.mimetype.startsWith("image/")) {
            return res.status(400).json({ message: "Chỉ cho phép upload ảnh (jpg, png, webp, ...)" });
        }

        if (file.size > 1024 * 1024 * 3) {
            return res.status(400).json({ message: "Dung lượng ảnh tối đa 5MB" });
        }

        const ext = path.extname(file.originalname);
        const fileName = `${userId}_${Date.now()}${ext}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true, 
            });

        if (uploadError) {
            return res.status(500).json({ message: "Upload thất bại", error: uploadError.message });
        }

        const { data: publicData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);
        const publicUrl = publicData.publicUrl;

        if (user.avatarUrl && user.avatarUrl.includes("avatars")) {
            try {
                const oldPath = user.avatarUrl.split("/avatars/")[1];
                await supabase.storage.from("avatars").remove([oldPath]);
            } catch (err) {
                console.warn("Không thể xóa avatar cũ:", err.message);
            }
        }

        user.avatarUrl = publicUrl;
        await user.save();

        return res.json({
            message: "Cập nhật avatar thành công",
            avatarUrl: publicUrl,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
}