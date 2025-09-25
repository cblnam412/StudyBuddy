const Tag = require("../models/Tag.js");

const createTag = async (req, res) => {
    try {
        let { tagName } = req.body;
        if (!tagName) {
            return res.status(400).json({ message: "Thiếu tên Tag" });
        }

        tagName = tagName.trim().toLowerCase();

        const exists = await Tag.findOne({ tagName });
        if (exists) {
            return res.status(409).json({ message: "Đã có Tag này" });
        }

        const newTag = new Tag({ tagName });
        await newTag.save();

        res.status(201).json({ message: "Ok xong", data: newTag });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

const getAllTags = async (req, res) => {
    try {
        const tags = await Tag.find().sort({ tagName: 1 });
        res.status(200).json(tags);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

const getTagById = async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await Tag.findById(id);

        if (!tag) return res.status(404).json({ message: "Khong tìm thấy" });

        res.status(200).json(tag);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

const updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        let { tagName } = req.body;

        if (!tagName) {
            return res.status(400).json({ message: "Thiếu tên Tag" });
        }

        tagName = tagName.trim().toLowerCase();

        const exists = await Tag.findOne({ tagName });
        if (exists && exists._id.toString() !== id) {
            return res.status(409).json({ message: "Đã tồn tại Tag cùng tên" });
        }

        const updatedTag = await Tag.findByIdAndUpdate(
            id,
            { tagName },
            { new: true, runValidators: true }
        );

        if (!updatedTag) {
            return res.status(404).json({ message: "Không tìm thấy" });
        }

        res.status(200).json({ message: "Cập nhật thành công", data: updatedTag });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTag = await Tag.findByIdAndDelete(id);

        if (!deletedTag) {
            return res.status(404).json({ message: "Không tìm thấy Tag" });
        }

        res.status(200).json({ message: "Xoá Tag thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

module.exports = { createTag, getAllTags, getTagById, updateTag, deleteTag, };
