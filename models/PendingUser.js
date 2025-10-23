import mongoose from "mongoose";

// lưu tạm thông tin của user trong lúc đợi xác nhận OTP
const pendingUserSchema = new mongoose.Schema({
    full_name: String,
    email: String,
    phone_number: String,
    studentId: String,
    DOB: Date,
    password: String,
    address: String,
    enrollment_year: Number,
    faculty: String,
    otp: String,
    expiresAt: { type: Date, index: { expires: 600 } }
});

export default mongoose.model("PendingUser", pendingUserSchema);
