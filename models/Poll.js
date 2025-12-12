import mongoose from "mongoose";

const pollOptionSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    votes: { type: Number, default: 0 }
}, { _id: false });

const pollVoteSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    option_index: { type: Number, required: true }
}, { _id: false });

const pollSchema = new mongoose.Schema({
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true, trim: true },
    options: { type: [pollOptionSchema], required: true },
    votes: { type: [pollVoteSchema], default: [] },
    expires_at: { type: Date, default: null },
    status: { type: String, enum: ["active", "closed"], default: "active" }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

const Poll = mongoose.models.Poll || mongoose.model("Poll", pollSchema);
export default Poll;
