import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
    {
        uploader_id: {
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
        file_name: {
            type: String,
            required: true,
            trim: true,
        },
        file_url: {
            type: String,
            required: true,
            trim: true,
        },
        file_size: {
            type: Number,
            min: 0,
            required: true,
        },
        file_type: {
            type: String,
            enum: ["video", "audio", "file", "avatar", "image"],
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "deleted", "archived"],
            default: "active",
        },
        download_count: {
            type: Number,
            min: 0
        }
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

documentSchema.index({ room_id: 1, created_at: -1 });
documentSchema.index({ event_id: 1, created_at: -1 });

export default mongoose.model("Document", documentSchema);
