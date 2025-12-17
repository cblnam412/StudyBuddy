import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        reporter_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reported_item_id: {
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
        },
        reported_item_type: {
            type: String,
            enum: ["message", "document", "user"],
            required: true,
        },
        report_type: {
            type: String,
            enum: ["spam", "violated_content", "infected_file", "offense", "misuse_authority", "other"],
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["pending", "reviewed", "dismissed", "action_taken", "warninged"],
            default: "pending",
        },
        reviewer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        processing_action: {
            type: String,
            trim: true,
            default: null,
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

reportSchema.index({ reported_item_type: 1, reported_item_id: 1 });

export default mongoose.model("Report", reportSchema);
