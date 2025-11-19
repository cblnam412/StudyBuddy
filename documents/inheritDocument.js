import { BaseDocument } from "./baseDocument.js";

export class VideoDocument extends BaseDocument {
    validate() {
        if (!this.file.mimetype.startsWith("video")) {
            throw new Error("File không phải video");
        }
    }

    getFolder() { return "videos"; }
    getType() { return "video"; }
}

export class AudioDocument extends BaseDocument {
    validate() {
        if (!this.file.mimetype.startsWith("audio")) {
            throw new Error("File không phải audio");
        }
    }

    getFolder() { return "audios"; }
    getType() { return "audio"; }
}

export class FileDocument extends BaseDocument {
    validate() {
        // Không video, không audio → coi như tài liệu bình thường
    }

    getFolder() { return "documents"; }
    getType() { return "file"; }
}
