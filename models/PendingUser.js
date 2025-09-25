const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
    full_name: String,
    email: String,
    phone_number: String,
    password: String,
    address: String,
    enrollment_year: Number,
    faculty: String,
    otp: String,
    expiresAt: { type: Date, index: { expires: 600 } } 
});

module.exports = mongoose.model("PendingUser", pendingUserSchema);
