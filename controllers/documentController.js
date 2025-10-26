//uploafFile: kiểm tra trạng thái phòng (archived,..), kiểm tra người dùng có bị cấm up file không
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
            /*if (mimetype.includes("image"))
                return { folder: "avatars", type: "avatar" };*/
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

        const { data, error } = await supabase.storage
            .from("uploads")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ message: "Upload thất bại", error: error.message });
        }

        const publicUrl = supabase.storage
            .from("uploads")
            .getPublicUrl(filePath)
            .data.publicUrl;

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
        console.error('Upload document error:', error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const downloadDocument = async (req, res) => {
    try {
        const { documentId } = req.params;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

        if (doc.status === "deleted") {
            return res.status(404).json({ message: "Tài liệu đã bị xoá" });
        }

        const fileUrl = doc.file_url;
        const baseUrl = process.env.SUPABASE_URL + "/storage/v1/object/public/uploads/";
        const filePath = fileUrl.replace(baseUrl, "");
            
        const { data, error } = await supabase.storage.from("uploads").download(filePath);
        if (error) throw error;

        res.setHeader("Content-Type", data.type);
        res.setHeader("Content-Disposition", `attachment; filename="${doc.file_name}"`);

        const buffer = await data.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi tải file", error: error.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.user.id;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Không tìm thấy tài liệu" });

        if (doc.uploader_id.toString() !== userId && req.user.role !== "moderator" && req.user.role !== "admin")
            return res.status(403).json({ message: "Bạn không có quyền xoá tài liệu này" });

        if (doc.status === "deleted")
            return res.status(400).json({ message: "Tài liệu đã bị xoá trước đó" });

        doc.status = "deleted";
        await doc.save();

        return res.json({ message: "Xoá tài liệu thành công", documentId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const getAllDocuments = async (req, res) => {
    try {
        const { roomId, page = 1, limit = 20 } = req.query;
        const query = { status: "active" };
        if (roomId) query.room_id = roomId;

        const documents = await Document.find(query)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("uploader_id", "username email");

        const total = await Document.countDocuments(query);

        res.json({
            documents,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách tài liệu", error: error.message });
    }
};

