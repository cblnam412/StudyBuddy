import mongoose from "mongoose";

const userWarningSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    violation_level: {
      type: Number,
      min: 0,
      required: true,
    },
    punishment_points: {
      type: Number,
      min: 0,
      required: true,
    },
    punishment_details: {
      type: String,
      trim: true,
      default: null,
    },
    moderator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proof_url: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

userWarningSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model("UserWarning", userWarningSchema);
