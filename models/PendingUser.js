import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
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
    otp: String,
    expiresAt: { type: Date, index: { expires: 600 } }
});

export default mongoose.model("PendingUser", pendingUserSchema);
