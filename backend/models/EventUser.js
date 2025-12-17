import mongoose from "mongoose";

const eventUserSchema = new mongoose.Schema(
    {
        event_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        is_attended: {
            type: Boolean,
            default: false,
        },
        registered_at: {
            type: Date,
            default: Date.now,
        },
        attended_at: {
            type: Date,
            default: null,
        },
    },
    { timestamps: false }
);

eventUserSchema.index({ event_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model("EventUser", eventUserSchema);
