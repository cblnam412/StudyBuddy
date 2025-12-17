import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";

dotenv.config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MGAL_URI);
        console.log("Đã kết nối MongoDB");

        const hashedPassword = await bcrypt.hash("123456", 10);

        const admin = await User.create({
            full_name: "Super Admin",
            email: "admin@example.com",
            password: hashedPassword,
            phone_number: "0123456295",
            system_role: "admin",
            enrollment_year: "2023",
            faculty: "SE",
            studentId: "23520025",
            status: "active"
        });

        console.log("Admin đã được tạo:", admin.email);

        process.exit(0);
    } catch (error) {
        console.error("Lỗi:", error);
        process.exit(1);
    }
}

createAdmin();
