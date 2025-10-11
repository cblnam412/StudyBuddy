import { Document } from "../models/index.js";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);


export const uploadFile = async (req, res) => {
    try {
        const file = req.file;
        const userId = req.user.id;

        if (!file) return res.status(400).json({ message: "Thiếu file" });

        const filePath = `uploads/${Date.now()}_${file.originalname}`;

        await supabase.storage
            .from(process.env.BUCKET_NAME)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });


        return res.json({
            message: "Upload thành công",
            path: filePath,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
}