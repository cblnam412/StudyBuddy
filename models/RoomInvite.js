import mongoose from "mongoose";

const roomInviteSchema = new mongoose.Schema({
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uses: { type: Number, default: 0 },
});

export default mongoose.model("RoomInvite", roomInviteSchema);
