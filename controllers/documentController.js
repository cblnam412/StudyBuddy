import { Document, User, ModeratorApplication, UserWarning, EventUser, ReputationLog, ReputationScore } from "../models/index.js";
import { createClient } from "@supabase/supabase-js";
import { DocumentService } from "../service/documentService.js";
import { UserService } from "../service/userService.js";
import { ValidationProxy } from "../proxies/validationProxy.js";
import { CachingProxy } from "../proxies/cachingProxy.js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const baseService = new DocumentService(Document, supabase);
const cachedService = new CachingProxy(baseService, "./documentCache");
const documentService = new ValidationProxy(cachedService);

// const documentService = new DocumentService(Document, supabase);
const userService = new UserService(User, ModeratorApplication, UserWarning, Document, EventUser, supabase, ReputationLog, ReputationScore);

export const uploadFile = async (req, res) => {
    try {
        const result = await documentService.uploadFile(req.file, req.user.id, req.body.roomId);

        // Cập nhật điểm reputation sau khi upload
        await userService.incrementUserReputation(
            req.user.id,
            2,
            `Uploaded document "${result.document.file_name}"`,
            "document"
        );

        return res.status(201).json({
            message: "Upload thành công",
            type: result.type,
            path: result.path,
            url: result.url,
            document: result.document,
        });
    } catch (error) {
        if (error.message.includes("Thiếu") || error.message.includes("Dung lượng")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes("Upload thất bại")) {
            return res.status(500).json({ message: "Upload thất bại", error: error.message });
        }
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const downloadDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { buffer, doc } = await documentService.downloadDocument(documentId);

        res.setHeader("Content-Type", doc.file_type);
        res.setHeader("Content-Disposition", `attachment; filename="${doc.file_name}"`);

        res.send(buffer);

    } catch (error) {
        if (error.message.includes("Không tìm thấy") || error.message.includes("đã bị xoá")) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Lỗi khi tải file controller", error: error.message });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;
        const deletedId = await documentService.deleteDocument(documentId, req.user);
        const document = await Document.findById(documentId);

        // Cập nhật lại điểm reputation sau khi tài liệu bị xóa
        await userService.incrementUserReputation(
            req.user.id,
            -2,
            `Deleted document "${document.file_name}"`,
            "document"
        );

        return res.json({ message: "Xoá tài liệu thành công", documentId: deletedId });

    } catch (error) {
        if (error.message.includes("Không tìm thấy")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("không có quyền")) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes("Đã bị xoá")) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const getAllDocuments = async (req, res) => {
    try {
        const { documents, total, page, limit } = await documentService.getAllDocuments(req.query);

        res.json({
            documents,
            pagination: {
                total,
                page,
                limit,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách tài liệu", error: error.message });
    }
};

