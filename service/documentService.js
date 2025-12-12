import { Document, User } from "../models/index.js";
import { DocumentFactory } from "../documents/documentFactory.js";
import mongoose from "mongoose";

export class DocumentService {
    constructor(documentModel, documentDownloadModel, supabaseClient) {
        this.Document = documentModel;
        this.DocumentDownload = documentDownloadModel;
        this.supabase = supabaseClient;
        this.MAX_FILE_SIZE = 1024 * 1024 * 20;
    }

    async uploadFile(file, userId, roomId) {

        if (!file) throw new Error("Thiếu file");

        if (!roomId) throw new Error("Thiếu roomId");

        if (file.size > this.MAX_FILE_SIZE) {
            throw new Error("Dung lượng tối đa 20MB");
        }

        const handler = DocumentFactory.create(file, this.supabase);
        handler.validate();

        const folder = handler.getFolder();
        const type = handler.getType();

        const filePath = `${folder}/${Date.now()}_${file.originalname}`;

        const { error } = await this.supabase.storage
            .from("uploads")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) throw new Error("Upload thất bại: " + error.message);

        const publicUrl = this.supabase.storage
            .from("uploads")
            .getPublicUrl(filePath)
            .data.publicUrl;

        const document = await this.Document.create({
            uploader_id: userId,
            room_id: roomId,
            file_name: file.originalname,
            file_url: publicUrl,
            file_size: file.size,
            file_type: type,
            status: "active",
        });

        return { type, url: publicUrl, document };
    }

    async downloadDocument(documentId) {
        const doc = await this.Document.findById(documentId);
        if (!doc) {
            throw new Error("Không tìm thấy tài liệu");
        }
        if (doc.status === "deleted") {
            throw new Error("Tài liệu đã bị xoá");
        }

        const baseUrl = process.env.SUPABASE_URL + "/storage/v1/object/public/uploads/";
        const filePath = doc.file_url.replace(baseUrl, "");

        const { data, error } = await this.supabase.storage.from("uploads").download(filePath);
        if (error) {
            console.error("Supabase download error:", error.message);
            throw new Error(`Lỗi khi tải file service: ${error.message}`);
        }

        const mimeType = data.type;
        const buffer = Buffer.from(await data.arrayBuffer());

        return { buffer, doc, mimeType };
    }

    async deleteDocument(documentId, user) {
        if (!user)
            throw new Error("User không được trống");
        
        const doc = await this.Document.findById(documentId);
        if (!doc) {
            throw new Error("Không tìm thấy tài liệu");
        }

        const isUploader = doc.uploader_id.toString() === user.id;
        const isModerator = user.role === "moderator" || user.role === "admin";

        if (!isUploader && !isModerator) {
            throw new Error("Bạn không có quyền xóa tài liệu này");
        }

        if (doc.status === "deleted") {
            throw new Error("Tài liệu đã bị xóa trước đó");
        }

        doc.status = "deleted";
        await doc.save();

        return documentId;
    }

    async getAllDocuments(options) {
        const { userId, roomId, page = 1, limit = 20 } = options;
        
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);

        if (Number.isNaN(parsedPage) || Number.isNaN(parsedLimit)) {
            throw new Error("Số trang và giới hạn phải là số!");
        }

        if (parsedPage < 1 || parsedLimit < 1)
        {
            throw new Error("Số trang và giới hạn phải lớn hơn hoặc bằng 1!");
        }

        const query = { status: "active" };
        if (roomId) {
            query.room_id = roomId;
        }
        if (userId) query.uploader_id = userId;

        const skip = (parsedPage - 1) * parsedLimit;

        const documents = await this.Document.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("uploader_id", "full_name email");

        const total = await this.Document.countDocuments(query);

        return { documents, total, page: parseInt(page), limit: parseInt(limit) };
    }

    async getDocumentById(documentId) {
        if (!documentId) {
            throw new Error("Thiếu documentId.");
        }

        if (!mongoose.isValidObjectId(documentId)) {
            throw new Error("documentId không hợp lệ.");
        }

        const doc = await this.Document.findById(documentId)
            .select("-created_at -updated_at")
            .populate("uploader_id", "full_name email")
            .populate("room_id", "room_name")
            .lean();

        if (!doc) {
            throw new Error("Không tìm thấy tài liệu.");
        }

        return doc;
    }


    async getUploadedDocumentCount(userId) {
        const count = await this.Document.countDocuments({
            uploader_id: userId,
            status: { $ne: "deleted" } // không đếm tài liệu bị xoá
        });

        return count;
    }

    async getDownloadedDocumentCount(userId) {
        const result = await this.DocumentDownload.aggregate([
            {   // where
                $match: { user_id: new mongoose.Types.ObjectId(userId) }
            },
            {   // left join
                $lookup: {
                    from: "documents",
                    localField: "document_id",
                    foreignField: "_id",
                    as: "document"
                }
            },
            { $unwind: "$document" },
            {
                $match: {
                    "document.status": { $ne: "deleted" }   // không lấy tài liệu bị xóa
                }
            },
            {
                $group: { _id: "$document_id" }
            },
            {
                $count: "total"
            }
        ]);

        return result.length > 0 ? result[0].total : 0;
    }

    async getAllDownloadedDocumentCount(filters = {}) {
        const match = {};

        if (filters.from || filters.to) {
            match.downloaded_at = {};
            if (filters.from) 
                match.downloaded_at.$gte = new Date(filters.from);
            if (filters.to) 
                match.downloaded_at.$lte = new Date(filters.to);
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: "documents",
                    localField: "document_id",
                    foreignField: "_id",
                    as: "doc"
                }
            },
            { $unwind: "$doc" },
            { 
                $match: { "doc.status": { $ne: "deleted" } } 
            },
            {
                $group: {
                    _id: "$document_id"
                }
            },
            {
                $count: "total_documents_downloaded"
            }
        ];

        const result = await this.DocumentDownload.aggregate(pipeline);
        return result[0]?.total_documents_downloaded || 0;
    }
}

    // #detectFolderAndType(mimetype) {
    //     if (mimetype.startsWith("video"))
    //         return { folder: "videos", type: "video" };
    //     if (mimetype.startsWith("audio"))
    //         return { folder: "audios", type: "audio" };
    //     return { folder: "documents", type: "file" };
    // }

    
    // async uploadFile(file, userId, roomId) {
    //     if (!file) {
    //         throw new Error("Thiếu file");
    //     }
    //     if (!roomId) {
    //         throw new Error("Thiếu room_id");
    //     }
    //     if (file.size > MAX_FILE_SIZE) {
    //         throw new Error("Dung lượng file tối đa 20MB");
    //     }

    //     const { folder, type } = this.#detectFolderAndType(file.mimetype);
    //     const filePath = `${folder}/${Date.now()}_${file.originalname}`;

    //     const { error } = await this.supabase.storage
    //         .from("uploads")
    //         .upload(filePath, file.buffer, {
    //             contentType: file.mimetype,
    //             upsert: false,
    //         });

    //     if (error) {
    //         console.error("Supabase upload error:", error.message);
    //         throw new Error(`Upload thất bại: ${error.message}`);
    //     }

    //     const publicUrl = this.supabase
    //         .storage
    //         .from("uploads")
    //         .getPublicUrl(filePath)
    //         .data.publicUrl;

    //     const document = await this.Document.create({
    //         uploader_id: userId,
    //         room_id: roomId,
    //         file_name: file.originalname,
    //         file_url: publicUrl,
    //         file_size: file.size,
    //         file_type: type,
    //         status: "active",
    //     });

    //     return { type, path: filePath, url: publicUrl, document };
    // }

        // hàm cập nhật điểm uy tín cho user dựa trên số tài liệu hợp lệ 
    // async updateReputationScore(userId) {
    //     if (!userId)
    //         throw new Error("Thiếu user id!");

    //     const user = await User.findById(userId);
    //     if (!user)
    //         throw new Error("User không tồn tại!");

    //     const activeDocs = await Document.countDocuments({
    //         uploader_id: userId,
    //         status: "active"
    //     });

    //     const score = activeDocs * 2;
    //     if (score > 30)
    //         score = 30;

    //     // Cập nhật điểm
    //     const updatedUser = await User.findByIdAndUpdate(
    //         userId,
    //         { reputation_score: score },
    //         { new: true }
    //     );
    //     // Cập nhật điểm
    //     const updatedUser = await User.findByIdAndUpdate(
    //         userId,
    //         { reputation_score: score },
    //         { new: true }
    //     );

    //     return updatedUser;
    // }
    //     return updatedUser;
    // }