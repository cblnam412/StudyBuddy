import mongoose from "mongoose";

const roomRequestSchema = new mongoose.Schema(
    {
        requester_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        room_name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: null },
        tags: [{ type: String }],
        reason: { type: String, trim: true, default: null },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        approver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

export default mongoose.model("RoomRequest", roomRequestSchema);
