import dotenv from "dotenv";
import express from "express";
import multer from "multer";

import { uploadFile, downloadDocument, deleteDocument, getAllDocuments } from "../controllers/documentController.js";
import { verifyToken, checkFeature } from "../middlewares/authMiddleware.js";

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); 

router.post("/upload", verifyToken, checkFeature("upload_document"), upload.single("file"), uploadFile);
router.get("/:documentId/download", verifyToken, downloadDocument);
router.delete("/:documentId/delete", verifyToken, deleteDocument);
router.get("/", verifyToken, getAllDocuments);

export default router;
