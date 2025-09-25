const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        full_name: {
            type: String,
            required: true,
            trim: true,
        },
        phone_number: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            default: null,
            trim: true,
        },
        enrollment_year: {
            type: Number,
            min: 1900,
            max: 2100,
        },
        faculty: {
            type: String,
            enum: ["IS", "SE", "CS", "CE"],
            required: true,
        },
        system_role: {
            type: String,
            enum: ["user", "moderator", "admin"],
            default: "user",
        },
        reputation_score: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "banned"],
            default: "active",
        },
        ban_end_date: {
            type: Date,
            default: null,
        },
        violation_count: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: { createdAt: "create_at", updatedAt: "update_at" },
    }
);

module.exports = mongoose.model("User", userSchema); 


