import express from "express";
import multer from "multer";
import {
    createTag,
    getAllTags,
    getTagById,
    updateTag,
    deleteTag,
    importTagsFromExcel
} from "../controllers/tagController.js";
import { isModerator, verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", verifyToken, isModerator, createTag);
router.get("/", verifyToken, getAllTags);
router.get("/:id", verifyToken, isModerator, getTagById);
router.put("/:id", verifyToken, isModerator, updateTag);
router.delete("/:id", verifyToken, isModerator, deleteTag);
router.post("/import-excel", upload.single("file"), verifyToken, isModerator, importTagsFromExcel);

export default router;
