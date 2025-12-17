import mongoose from "mongoose";

const moderatorActivitySchema = new mongoose.Schema(
    {
        moderator_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            enum: ["restrict_chat","restrict_activity","ban","approve_room","approve_report","reject_room","reject_report"],
            required: true,
        },
        report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Report",
            default: null,
        },
        room_request_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RoomRequest",
            default: null,
        },
        target_type: {
            type: String,
            enum: ["report", "room_request", "other"],
            default: "other",
        },
        details: {
            type: String,
            trim: true,
            default: null,
        },
        decision: {
            type: String,
            enum: ["approved", "rejected", "n/a"],
            default: "n/a",
        },
        reason: {
            type: String,
            trim: true,
            default: null,
        },
        violation_level: {
            type: Number,
            enum: [1, 2, 3],
            default: null,
        },
        ban_days: { type: Number, default: null },
        blocked_days: { type: Number, default: null },
        affected_features: { type: [String], default: undefined },
        expires_at: { type: Date, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

export default mongoose.model("ModeratorActivity", moderatorActivitySchema);
