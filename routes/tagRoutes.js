const express = require("express");
const { createTag, getAllTags, getTagById, updateTag, deleteTag, } = require("../controllers/tagController");
const { isModerator, verifyToken } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.post("/", verifyToken, isModerator, createTag);
router.get("/", verifyToken, isModerator, getAllTags);
router.get("/:id", verifyToken, isModerator, getTagById);
router.put("/:id", verifyToken, isModerator, updateTag);
router.delete("/:id", verifyToken, isModerator, deleteTag);

module.exports = router;