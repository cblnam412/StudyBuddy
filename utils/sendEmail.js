import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export default async function sendVerificationEmail(email, otp) {
    await transporter.sendMail({
        from: `"MyApp" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Xác thực Email",
        text: `Mã OTP của bạn là: ${otp}. Mã sẽ hết hạn sau 5 phút.`,
    });
}
