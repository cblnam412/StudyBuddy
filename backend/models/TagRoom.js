import mongoose from "mongoose";

const tagRoomSchema = new mongoose.Schema(
    {
        room_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        tag_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tag",
            required: true,
        },
    },
    { timestamps: false }
);

tagRoomSchema.index({ room_id: 1, tag_id: 1 }, { unique: true });

export default mongoose.model("TagRoom", tagRoomSchema);
