import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
    {
        tag_name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            maxlength: 100,
        },
    },
    { timestamps: false }
);

export default mongoose.model("Tag", tagSchema);
