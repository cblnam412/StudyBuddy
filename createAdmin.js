require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User.js");

async function createAdmin() {
    try {
        await mongoose.connect(process.env.DB_URI);
        console.log("Đã kết nối MongoDB");

        const hashedPassword = await bcrypt.hash("123456", 10);

        const admin = await User.create({
            full_name: "Super Admin",
            email: "admin@example.com",
            password: hashedPassword,
            phone_number: "0123456789",
            system_role: "admin",
            enrollment_year: "2023",
            faculty: "SE",
            status: "active"
        });

        console.log(" Admin đã được tạo:", admin.email);

        process.exit(0);
    } catch (error) {
        console.error("Lỗi:", error);
        process.exit(1);
    }
}

createAdmin();
