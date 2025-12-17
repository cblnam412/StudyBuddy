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
            enum: ["approved", "rejected", "reviewed"],
            default: "reviewed",
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
        },
        reason: {
            type: String,
            trim: true,
            default: null,
        },
        auto_check_errors: {
            type: [String],
        }
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

moderatorApplicationSchema.index({ user_id: 1, status: 1 });

export default mongoose.model("ModeratorApplication", moderatorApplicationSchema);
