const express = require("express");
const multer = require("multer");
const { createTag, getAllTags, getTagById, updateTag, deleteTag, importTagsFromExcel, } = require("../controllers/tagController");
const { isModerator, verifyToken } = require("../middlewares/authMiddleware.js");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", verifyToken, isModerator, createTag);
router.get("/", verifyToken, isModerator, getAllTags);
router.get("/:id", verifyToken, isModerator, getTagById);
router.put("/:id", verifyToken, isModerator, updateTag);
router.delete("/:id", verifyToken, isModerator, deleteTag);
router.post("/import-excel", upload.single("file"), verifyToken, isModerator, importTagsFromExcel);

module.exports = router;