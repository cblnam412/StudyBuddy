import dotenv from "dotenv";
import express from "express";
import multer from "multer";

import { uploadFile, downloadDocument, deleteDocument, getAllDocuments, 
    getUploadedDocumentCount, getDownloadedDocumentCount, 
    getAllDownloadedDocumentCount,
    getDocumentById
} from "../controllers/documentController.js";
import { verifyToken, checkFeature, isAdmin, isModerator } from "../middlewares/authMiddleware.js";

dotenv.config();

const router = express.Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
});

const fixFileNameEncoding = (req, res, next) => {
    if (req.file && req.file.originalname) {
        try {
            const decodedName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
            req.file.originalname = decodedName;
        } catch (e) {
        }
    }
    next();
};

router.post("/upload", verifyToken, checkFeature("upload_document"), upload.single("file"), fixFileNameEncoding, uploadFile);
router.get("/:documentId/download", verifyToken, downloadDocument);
router.delete("/:documentId/delete", verifyToken, deleteDocument);

// lấy tất cả tài liệu được up trên hệ thống
router.get("/", verifyToken, getAllDocuments);

// lấy tất cả tài liệu được down về trên hệ thống
router.get("/downloaded", verifyToken, isModerator, getAllDownloadedDocumentCount);

router.get("/uploaded-by", verifyToken, getUploadedDocumentCount);
router.get("/downloaded-by", verifyToken, getDownloadedDocumentCount);

router.get("/:document_id", verifyToken, isModerator, getDocumentById);

export default router;
