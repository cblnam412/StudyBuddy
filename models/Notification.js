import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["request_approved", "request_rejected", "room_status_change", "warning", 'info'],
            default: "info",
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        metadata: {
            roomName: String,
            requester: String,
            rejecter: String,
            reason: String,
            status: String,
            requestType: String,
            targetScreen: String 
        },
        is_read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
