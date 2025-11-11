import Tag from "../models/Tag.js";
import { TagService } from "../service/tagService.js"; 

const tagService = new TagService(Tag);

export const createTag = async (req, res) => {
    try {
        const { tagName } = req.body;
        const newTag = await tagService.createTag(tagName);
        res.status(201).json({ message: "Tạo Tag thành công!!", data: newTag });
    } catch (error) {
        const status = (error.message.includes("Thiếu tên") || error.message.includes("Tag Name") ? 400 :
            error.message.includes("Đã có Tag này") ? 409 : 500);
        res.status(status).json({ message: error.message });
    }
};

export const importTagsFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Không thấy file" });
        }

        const result = await tagService.importTagsFromExcel(req.file);

        res.status(201).json({
            message: "Thêm thành công",
            ...result,
        });
    } catch (error) {
        const status = (error.message.includes("Không còn tag") ? 409 : 500);
        res.status(status).json({ message: error.message });
    }
};

export const getAllTags = async (req, res) => {
    try {
        const tags = await tagService.getAllTags();
        res.status(200).json(tags);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

export const getTagById = async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await tagService.getTagById(id);
        res.status(200).json(tag);
    } catch (error) {
        const status = (error.message.includes("Không tìm thấy") ? 404 : 500);
        res.status(status).json({ message: error.message });
    }
};

export const updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { tagName } = req.body;
        const updatedTag = await tagService.updateTag(id, tagName);
        res.status(200).json({ message: "Cập nhật thành công", data: updatedTag });
    } catch (error) {
        const status = (error.message.includes("Không tìm thấy") ? 404 :
            error.message.includes("tồn tại Tag cùng tên") ? 409 :
                (error.message.includes("Thiếu tên") || error.message.includes("Tag Name")) ? 400 : 500);
        res.status(status).json({ message: error.message });
    }
};

export const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        await tagService.deleteTag(id);
        res.status(200).json({ message: "Xoá Tag thành công" });
    } catch (error) {
        const status = (error.message.includes("Không tìm thấy Tag") ? 404 : 500);
        res.status(status).json({ message: error.message });
    }
};