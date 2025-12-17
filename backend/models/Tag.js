import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
    {
        tagName: {
            type: String,
            required: [true],
            unique: true,
            trim: true,
            maxlength: [10],
            validate: {
                validator: function (v) {
                    return /^[a-zA-Z0-9-_]+$/.test(v);
                },
            },
        },
    },
    { timestamps: false }
);

tagSchema.pre("save", function (next) {
    if (this.tagName) {
        this.tagName = this.tagName.toLowerCase();
    }
    next();
});

tagSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();
    if (update.tagName) {
        update.tagName = update.tagName.toLowerCase();
    }
    next();
});

export default mongoose.model("Tag", tagSchema);
