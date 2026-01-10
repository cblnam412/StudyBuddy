import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
    {
        room_name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        description: {
            type: String,
            default: null,
            trim: true,
        },
        status: {
            type: String,
            enum: ["public", "private", "archived", "safe-mode"],
            default: "public",
        },
        avatar: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

export default mongoose.model("Room", roomSchema);
    