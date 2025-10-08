import multer from "multer";
import path from "path";
import fs from "fs";

const BASE_DIR = "uploads";

function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function detectFileType(mimetype) {
    if (mimetype.startsWith("video")) return "videos";
    if (mimetype.startsWith("audio")) return "audios";
    if (mimetype.startsWith("image")) return "images";
    if (
        mimetype === "application/pdf" ||
        mimetype.includes("word") ||
        mimetype.includes("text") ||
        mimetype.includes("spreadsheet") ||
        mimetype.includes("presentation")
    )
        return "documents";

    return "others";
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const typeFolder = detectFileType(file.mimetype);
        const uploadPath = path.join(BASE_DIR, typeFolder);
        ensureDirExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        "image/",
        "video/",
        "audio/",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ];
    if (allowed.some((t) => file.mimetype.startsWith(t) || file.mimetype === t)) {
        cb(null, true);
    } else {
        cb(new Error("Định dạng file không được hỗ trợ"), false);
    }
};

const limits = { fileSize: 20 * 1024 * 1024 };

export const upload = multer({ storage, fileFilter, limits });
