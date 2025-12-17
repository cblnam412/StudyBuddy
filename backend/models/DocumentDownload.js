import mongoose from "mongoose";

const documentDownloadSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    document_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true,
    },
    downloaded_at: {
        type: Date,
        default: Date.now,
    }
});

const DocumentDownload = mongoose.models.documentDownloadSchema || mongoose.model("DocumentDownload", documentDownloadSchema);
export default DocumentDownload;