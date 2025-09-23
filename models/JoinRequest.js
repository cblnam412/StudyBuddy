import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        message: {
            type: String,
            trim: true,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "expired"],
            default: "pending",
        },
        rejection_reason: {
            type: String,
            default: null,
            trim: true,
        },
        expires_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

joinRequestSchema.index({ user_id: 1, room_id: 1 }, { unique: true });

export default mongoose.model("JoinRequest", joinRequestSchema);
