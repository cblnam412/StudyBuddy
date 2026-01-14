import Tag from "../models/Tag.js";
import fs from "fs";
import xlsx from "xlsx";
import { dissolveTag } from "../utils/dissolve.js"; 

const MAX_TAG_LENGTH = 10;

export class TagService {
    constructor(tagModel) {
        this.Tag = tagModel;
    }

    async createTag(tagName) {
        if (!tagName) {
            throw new Error("Thiếu tên Tag");
        }

        const formattedName = tagName.trim().toLowerCase();

        if (formattedName.length > MAX_TAG_LENGTH) {
            throw new Error(`Tag Name không được dài quá ${MAX_TAG_LENGTH} ký tự.`);
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(formattedName)) {
            throw new Error("Tag Name chỉ được chứa chữ cái (A-Z), chữ số (0-9), dấu gạch ngang (-) và dấu gạch dưới (_).");
        }

        const exists = await this.Tag.findOne({ tagName: formattedName });
        if (exists) {
            throw new Error("Đã có Tag này");
        }

        const newTag = new this.Tag({ tagName: formattedName });
        await newTag.save();
        return newTag;
    }

    async importTagsFromExcel(file) {
        if (!file) {
            throw new Error("Không thấy file");
        }

        try {
            const workbook = xlsx.readFile(file.path);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            let tags = rows.flat().filter(Boolean);
            tags = tags.map(tag => tag.toString().trim().toLowerCase());
            tags = [...new Set(tags)];

            const validTags = tags.filter(tag =>
                /^[a-zA-Z0-9-_]+$/.test(tag) && tag.length <= MAX_TAG_LENGTH
            );
            const invalidTags = tags.filter(tag => !validTags.includes(tag));

            const existing = await this.Tag.find({ tagName: { $in: validTags } });
            const existingNames = existing.map(t => t.tagName);

            const newTags = validTags.filter(tag => !existingNames.includes(tag));

            if (newTags.length === 0) {
                throw new Error("Không còn tag hợp lệ để thêm");
            }

            const createdTags = await this.Tag.insertMany(
                newTags.map(tag => ({ tagName: tag }))
            );

            return {
                created: createdTags,
                skipped: existingNames,
                invalid: invalidTags,
            };
        } finally {
            fs.unlinkSync(file.path);
        }
    }

    async getAllTags() {
        const tags = await this.Tag.find().sort({ tagName: 1 });
        return tags;
    }

    async getTagById(id) {
        const tag = await this.Tag.findById(id);
        if (!tag) {
            throw new Error("Không tìm thấy");
        }
        return tag;
    }

    async updateTag(id, tagName) {
        if (!tagName) {
            throw new Error("Thiếu tên Tag");
        }

        const formattedName = tagName.trim().toLowerCase();

        if (formattedName.length > MAX_TAG_LENGTH) {
            throw new Error(`Tag Name không được dài quá ${MAX_TAG_LENGTH} ký tự.`);
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(formattedName)) {
            throw new Error("Tag Name chỉ được chứa chữ cái (A-Z), chữ số (0-9), dấu gạch ngang (-) và dấu gạch dưới (_).");
        }

        const exists = await this.Tag.findOne({ tagName: formattedName });
        if (exists && exists._id.toString() !== id) {
            throw new Error("Đã tồn tại Tag cùng tên");
        }

        const updatedTag = await this.Tag.findByIdAndUpdate(
            id,
            { tagName: formattedName },
            { new: true, runValidators: true }
        );

        if (!updatedTag) {
            throw new Error("Không tìm thấy");
        }
        return updatedTag;
    }

    async deleteTag(id) {
        const deletedTag = await dissolveTag(id);

        if (!deletedTag) {
            throw new Error("Không tìm thấy Tag");
        }
        return deletedTag;
    }
}
