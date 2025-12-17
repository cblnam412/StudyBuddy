import mongoose from "mongoose";

const userWarningSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        moderator_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        violation_level: {
            type: Number,
            required: true,
            min: 1,
        },
        punishment_points: {
            type: Number,
            required: true,
        },
        punishment_details: {
            type: String,
            required: true,
            trim: true,
        },
        proof_url: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

userWarningSchema.index({ user_id: 1 });

export default mongoose.model("UserWarning", userWarningSchema);