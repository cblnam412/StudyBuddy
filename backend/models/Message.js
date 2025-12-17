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
        event_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            default: null,
        },
        document_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Document",
            default: null,
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
            enum: ["sent", "edited", "deleted"],
            default: "sent",
        },
        reply_to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
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
messageSchema.index({ room_id: 1, status: 1 });
messageSchema.index({ event_id: 1, created_at: -1 });

messageSchema.index(
    { deleted_at: 1 },
    {
        expireAfterSeconds: 432000,
        partialFilterExpression: { status: "deleted" }
    }
);

export default mongoose.model("Message", messageSchema);