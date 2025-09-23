import mongoose from "mongoose";

const reputationLogSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true,
        },
        points_change: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            trim: true,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

export default mongoose.model("ReputationLog", reputationLogSchema);
