import mongoose from "mongoose";

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
        studentId: {
            type: String,
            unique: true,
            trim: true,
        },
        DOB: {
           type: Date,
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
        avatarUrl: {
            type: String,
            trim: true,
            default: null,
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
            default: undefined,
        },
        violation_count: {
            type: Number,
            default: 0,
            min: 0,
        },
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date },
        emailChangeOtp: {type: String },
        emailChangeNew: { type: String },
        emailChangeExpires: { type: Date },
    },
    {
        timestamps: { createdAt: "create_at", updatedAt: "update_at" },
    }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
