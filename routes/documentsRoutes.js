import dotenv from "dotenv";
import express from "express";
import multer from "multer";

import { uploadFile} from "../controllers/documentController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

dotenv.config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); 

router.post("/upload", verifyToken, upload.single("file"), uploadFile);

export default router;
