import dotenv from "dotenv";
import express from "express";
import multer from "multer";

import { uploadFile, downloadDocument, deleteDocument, getAllDocuments, 
    getUploadedDocumentCount, getDownloadedDocumentCount, 
    getAllDownloadedDocumentCount
} from "../controllers/documentController.js";
import { verifyToken, checkFeature, isAdmin, isModerator } from "../middlewares/authMiddleware.js";

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); 

router.post("/upload", verifyToken, checkFeature("upload_document"), upload.single("file"), uploadFile);
router.get("/:documentId/download", verifyToken, downloadDocument);
router.delete("/:documentId/delete", verifyToken, deleteDocument);

// lấy tất cả tài liệu được up trên hệ thống
router.get("/", verifyToken, getAllDocuments);
router.get("/uploaded-by", verifyToken, getUploadedDocumentCount);
router.get("/downloaded-by", verifyToken, getDownloadedDocumentCount);
// lấy tất cả tài liệu được down về trên hệ thống
router.get("/downloaded", verifyToken, isModerator, getAllDownloadedDocumentCount);
export default router;
