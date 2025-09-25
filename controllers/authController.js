const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, PendingUser } = require("../models/index.js");
const sendVerificationEmail = require("../utils/sendEmail.js");

const checkInfo = async (req, res) => {
    try {
        const { full_name, email, phone_number, password, address, enrollment_year, faculty } = req.body;
        const existingUser = await User.findOne({ $or: [{ email }, { phone_number }] });
        if (existingUser) return res.status(400).json({ message: "Email hoặc số điện thoại đã tồn tại" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await PendingUser.deleteOne({ email });
        await PendingUser.create({
            full_name,
            email,
            phone_number,
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
}

const sendEmail = async (req, res) => {
    try {
        const { email } = req.body;

        const pending = await PendingUser.findOne({ email });
        if (!pending) return res.status(400).json({ message: "Chưa nhập thông tin cá nhân hoặc thông tin đã hết hạn" });

        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();

        pending.otp = otp;
        await pending.save();

        await sendVerificationEmail(email, otp);

        res.json({ message: "Mã OTP đã được gửi tới email." });
    } catch (err) {
        res.status(500).json({ message: "Lỗi gửi OTP", error: err.message });
    }
}
const verifyOtpRegister = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const pending = await PendingUser.findOne({ email });
        if (!pending) return res.status(400).json({ message: "Thông tin đã hết hạn hoặc chưa nhập thông tin cá nhân" });

        if (pending.otp !== otp) return res.status(400).json({ message: "Mã OTP không đúng" });

        const newUser = new User({
            full_name: pending.full_name,
            email: pending.email,
            phone_number: pending.phone_number,
            password: pending.password,
            address: pending.address,
            enrollment_year: pending.enrollment_year,
            faculty: pending.faculty,
            status: "active"
        });

        await newUser.save();

        await PendingUser.deleteOne({ email });

        res.status(201).json({ message: "Tạo tài khoản thành công", user_id: newUser._id });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server", error: err.message });
    }
}


module.exports = { checkInfo, sendEmail, verifyOtpRegister };