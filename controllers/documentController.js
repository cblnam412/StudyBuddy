import { Document } from "../models/index.js";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);
function detectFolderAndType(mimetype) {
    if (mimetype.startsWith("video"))
        return { folder: "videos", type: "video" };
    if (mimetype.startsWith("audio"))
        return { folder: "audios", type: "audio" };
    if (mimetype.includes("image"))
        return { folder: "avatars", type: "avatar" };
    return { folder: "documents", type: "file" };
}

export const uploadFile = async (req, res) => {
    try {
        const file = req.file;
        const userId = req.user.id;
        const { roomId } = req.body;

        if (!file) return res.status(400).json({ message: "Thiếu file" });
        if (!roomId) return res.status(400).json({ message: "Thiếu room_id" });

        const { folder, type } = detectFolderAndType(file.mimetype);
        const filePath = `${folder}/${Date.now()}_${file.originalname}`;

        if (file.size > 1024 * 1024 * 20) return res.status(400).json({ message: "Dung lượng file tối đa 20MB" });

        const { error } = await supabase.storage
            .from("uploads")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) throw error;

        const publicUrl = supabase
            .storage
            .from("uploads")
            .getPublicUrl(filePath)
            .data.publicUrl;

        if (type === "avatar") {
            //Thêm link vào bảng User sau
            return res.json({
                message: "Upload avatar thành công",
                type,
                url: publicUrl,
            });
        }

        const document = await Document.create({
            uploader_id: userId,
            room_id: roomId,
            file_name: file.originalname,
            file_url: publicUrl,
            file_size: file.size,
            file_type: type,
            status: "active",
        });

        return res.json({
            message: "Upload thành công",
            type,
            path: filePath,
            url: publicUrl,
            document,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};
