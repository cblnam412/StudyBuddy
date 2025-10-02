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
            validate: {
                validator: (v) => v.trim().length > 0,
                message: "Nội dung tin nhắn không được để trống",
            },
        },
        status: {
            type: String,
            enum: ["visible", "edited", "deleted"],
            default: "visible",
        },
        deleted_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);
    
messageSchema.index({ room_id: 1, created_at: -1, _id: 1 });

export default mongoose.model("Message", messageSchema);
