import mongoose from "mongoose";

const roomUserSchema = new mongoose.Schema(
    {
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        room_role: {
            type: String,
            enum: ["member", "leader", "acting-leader", "co-host"],
            default: "member",
        },
        join_date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
    }
);

roomUserSchema.index({ room_id: 1, user_id: 1 }, { unique: true });

export default mongoose.model("RoomUser", roomUserSchema);
