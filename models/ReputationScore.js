import mongoose from "mongoose";

const reputationScoreSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", 
            required: true,
        },
        document_score: { type: Number, default: 0 },
        event_score: { type: Number, default: 0 },
        total_score: { type: Number, default: 0 },
        report_score: { type: Number, default: 0 },
        activity_score: { type: Number, default: 0 },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

export default mongoose.model("ReputationScore", reputationScoreSchema);
