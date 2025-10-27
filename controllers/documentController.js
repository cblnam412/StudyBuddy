import { Document } from "../models/index.js";
import { supabase } from "../supabaseClient.js"; 

function detectFolderAndType(mimetype) {
    if (mimetype.startsWith("video"))
        return { folder: "videos", type: "video" };
    if (mimetype.startsWith("audio"))
        return { folder: "audios", type: "audio" };
    return { folder: "documents", type: "file" };
}

export const uploadFile = async (req, res) => {
    try {
        const file = req.file;
        const userId = req.user.id;
        const { roomId } = req.body;

        if (!file) return res.status(400).json({ message: "Thiếu file" });
        if (!roomId) return res.status(400).json({ message: "Thiếu room_id" });
        if (file.size > 1024 * 1024 * 20)
            return res.status(400).json({ message: "Dung lượng file tối đa 20MB" });

        const { folder, type } = detectFolderAndType(file.mimetype);
        const filePath = `${folder}/${Date.now()}_${file.originalname}`;

        const { data, error } = await supabase.storage
            .from("uploads")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            return res.status(500).json({ message: "Upload thất bại", error: error.message });
        }

        const publicUrl = supabase.storage
            .from("uploads")
            .getPublicUrl(filePath).data.publicUrl;

        const document = await Document.create({
            uploader_id: userId,
            room_id: roomId,
            file_name: file.originalname,
            file_url: publicUrl,
            file_size: file.size,
            file_type: type,
            status: "active",
        });

        return res.status(200).json({
            message: "Upload thành công",
            type,
            path: filePath,
            url: publicUrl,
            document,
        });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
        await doc.deleteOne();
        return res.json({ message: "Xoá tài liệu thành công" });
    } catch (error) {
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};