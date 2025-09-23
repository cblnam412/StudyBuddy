import mongoose from "mongoose";

const moderatorApplicationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        reviewer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        submission_date: {
            type: Date,
            default: Date.now,
        },
        review_date: {
            type: Date,
            default: null,
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

moderatorApplicationSchema.index({ user_id: 1, status: 1 });

export default mongoose.model("ModeratorApplication", moderatorApplicationSchema);
