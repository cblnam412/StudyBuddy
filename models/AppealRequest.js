import mongoose from "mongoose";

const appealRequestSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
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
        review_date: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

appealRequestSchema.index({ report_id: 1 });

export default mongoose.model("AppealRequest", appealRequestSchema);
