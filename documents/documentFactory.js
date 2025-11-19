import { VideoDocument, AudioDocument, FileDocument } from "./inheritDocument.js";

export class DocumentFactory {
    static create(file, supabase) {
        if (!file) throw new Error("File không tồn tại");

        if (file.mimetype.startsWith("video"))
            return new VideoDocument(file, supabase);

        if (file.mimetype.startsWith("audio"))
            return new AudioDocument(file, supabase);

        return new FileDocument(file, supabase);
    }
}
