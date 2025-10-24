import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"
import { User, PendingUser } from "../models/index.js";
import sendVerificationEmail from "../utils/sendEmail.js";
import { sendResetPasswordEmail } from "../utils/sendEmail.js";

export const checkInfo = async (req, res) => {
    try {
        const { full_name, email, phone_number,studentId, DOB, password, address, enrollment_year, faculty } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { phone_number }, { studentId }] });
        const checkpendingUser = await PendingUser.findOne({ $or: [{ email }, { phone_number }, { studentId }] });
        if (existingUser || checkpendingUser) {
            let message;

            if (existingUser?.studentId === studentId || checkpendingUser?.studentId === studentId) {
                message = "Mã số sinh viên này đã được sử dụng.";
            } else if (existingUser?.email === email || checkpendingUser?.email === email) {
                message = "Email này đã được sử dụng.";
            } else if (existingUser?.phone_number === phone_number || checkpendingUser?.phone_number === phone_number) {
                message = "Số điện thoại này đã được sử dụng.";
            }

            return res.status(400).json({ message });
        }
        
        let dateOfBirth;
        if (DOB) {
            dateOfBirth = new Date(DOB);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (isNaN(dateOfBirth.getTime())) {
                return res.status(400).json({ message: "Ngày sinh không hợp lệ." });
            }

            if (dateOfBirth >= yesterday) {
                return res.status(400).json({ message: "Ngày sinh không thể là ngày trong tương lai." });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await PendingUser.deleteOne({ email });
        await PendingUser.create({
            full_name,
            email,
            phone_number,
            studentId,
            DOB: dateOfBirth,
            password: hashedPassword,
            address,
            enrollment_year,
            faculty,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });
        res.json({ message: "Gửi OTP" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const sendEmail = async (req, res) => {
    try {
        const { email } = req.body;

        const pending = await PendingUser.findOne({ email });
        if (!pending) return res.status(400).json({ message: "Chưa nhập thông tin cá nhân hoặc thông tin đã hết hạn" });

        // tạo OTP ngẫu nhiên có 6 số
        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();

        pending.otp = otp;
        await pending.save();

        await sendVerificationEmail(email, otp);

        res.json({ message: "Mã OTP đã được gửi tới email." });
    } catch (err) {
        res.status(500).json({ message: "Lỗi gửi OTP", error: err.message });
    }
};

export const verifyOtpRegister = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const pending = await PendingUser.findOne({ email });
        if (!pending) return res.status(400).json({ message: "Thông tin đã hết hạn hoặc chưa nhập thông tin cá nhân" });

        if (pending.otp !== otp) return res.status(400).json({ message: "Mã OTP không đúng" });

        // sau khi xác nhận otp hợp lệ thì chính thức tạo tài khoản user
        const newUser = new User({
            full_name: pending.full_name,
            email: pending.email,
            phone_number: pending.phone_number,
            studentId: pending.studentId,
            DOB: pending.DOB,
            password: pending.password,
            address: pending.address,
            enrollment_year: pending.enrollment_year,
            faculty: pending.faculty,
            status: "active"
        });

        await newUser.save();
        // xóa bản trong pending
        await PendingUser.deleteOne({ email });

        res.status(201).json({ message: "Tạo tài khoản thành công", user_id: newUser._id });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};

export const Login = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;
        const user = await User.findOne({
            $or: [{ email: emailOrPhone }, { phone_number: emailOrPhone }]
        });
        if (!user) return res.status(400).json({ message: "Tài khoản không tồn tại" });
        if (user.status === "banned") return res.status(403).json({ message: "Tài khoản đang bị khóa" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

        const token = jwt.sign({ id: user._id, role: user.system_role }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        res.json({ message: "Đăng nhập thành công", token });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
};
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy email." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();
        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
        await sendResetPasswordEmail(email, resetUrl);

        res.json({ message: "Đã gửi email đặt lại mật khẩu. Vui lòng check email của bạn!" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi gửi email đặt lại mật khẩu", error: err.message });
    }
};
/*
export const forgotPassword = async (req, res, ) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user){
        return res.status(404).json({ message: "Không tìm thấy email."});
    }
    // tạo token reset (dùng link)
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(email, resetUrl);

    // nếu dùng otp xác thực
    // const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    // user.resetPasswordOtp = otp;

    res.json({ message: "Đã gửi email đặt lại mật khẩu. Vui lòng check email của bạn!"});
};

// Đặt lại mật khẩu
*/
export const resetPassword = async (req, res) => {
    // nếu dùng otp
    // const { email, otp, newPassword } = req.body;
    // const user = await User.findOne({
    //     email,
    //     resetPasswordOtp: otp,
    //     resetPasswordExpires: { $gt: Date.now() }
    // });
    const { token, newPassword } = req.body;
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Đặt lại mật khẩu thành công." });
};