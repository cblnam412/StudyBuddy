import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
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
        content: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["visible", "edited", "deleted"],
            default: "visible",
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

messageSchema.index({ room_id: 1, created_at: -1 });

export default mongoose.model("Message", messageSchema);
