import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CachingProxy {
    constructor(service, cacheFolder = "./documentCache") {
        this.service = service;
        // xác định vị trí cache folder để lưu cache
        this.cacheFolder = path.isAbsolute(cacheFolder) 
            ? cacheFolder 
            : path.resolve(__dirname, "..", cacheFolder.replace(/^\.\.?\//, ""));

        // key = documentId, value = { filePath, expireAt, download_count }
        this.cache = new Map();
        this.listCache = new Map();
        this.TTL = 60 * 60 * 1000;  // 1h
        this.MIN_DOWNLOAD_COUNT = 0;
        
        console.log(`CachingProxy: Cache folder set to ${this.cacheFolder}`);
    }

    async setCache(doc, buffer) {
        if (doc.download_count <= this.MIN_DOWNLOAD_COUNT) {
            console.log(`CachingProxy: Skipping cache for document ${doc._id} (download_count: ${doc.download_count} <= ${this.MIN_DOWNLOAD_COUNT})`);
            return;
        }

        // tạo cache folder nếu chưa có
        if (!fs.existsSync(this.cacheFolder)) {
            fs.mkdirSync(this.cacheFolder, { recursive: true });
            console.log(`CachingProxy: Created cache folder at ${this.cacheFolder}`);
        }

        const originalFileName = doc.file_name || "document";
        const fileExtension = path.extname(originalFileName) || this.getExtensionFromMimeType(doc.file_type);
        const baseFileName = path.basename(originalFileName, fileExtension) || "document";
        
        const sanitizedBaseName = baseFileName.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
        
        const cachedFileName = `${doc._id}_${Date.now()}_${sanitizedBaseName}${fileExtension}`;
        const filePath = path.join(this.cacheFolder, cachedFileName);
        
        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log(`CachingProxy: Cached document ${doc._id} to ${filePath} (${(buffer.length / 1024).toFixed(2)} KB)`);

        this.cache.set(doc._id.toString(), { 
            filePath, 
            expireAt: Date.now() + this.TTL,
            download_count: doc.download_count || 0
        });

        // cache chỉ lưu top 10
        if (this.cache.size > 10) {
            const sortedKeys = Array.from(this.cache.keys()).sort((a, b) => {
                const da = this.cache.get(a);
                const db = this.cache.get(b);
                return (db.download_count || 0) - (da.download_count || 0);
            });
            const keysToRemove = sortedKeys.slice(10);
            keysToRemove.forEach(k => {
                const entry = this.cache.get(k);
                if (entry && fs.existsSync(entry.filePath)) {
                    fs.unlinkSync(entry.filePath);
                }
                this.cache.delete(k);
            });
        }
    }

    getExtensionFromMimeType(fileType) {
        const extensionMap = {
            "video": ".mp4",
            "audio": ".mp3",
            "image": ".jpg",
            "file": ".pdf",
            "avatar": ".jpg"
        };
        return extensionMap[fileType] || ".bin";
    }

    getCache(documentId) {
        const entry = this.cache.get(documentId);
        if (!entry) return null;

        if (Date.now() > entry.expireAt) {
            this.cache.delete(documentId);
            return null;
        }

        if (!fs.existsSync(entry.filePath)) {
            this.cache.delete(documentId);
            return null;
        }

        return fs.readFileSync(entry.filePath);
    }

    async downloadDocument(documentId) {
        const cachedBuffer = this.getCache(documentId);
        let doc;
        if (cachedBuffer) {
            console.log("CachingProxy: lấy từ cache.", documentId);
            doc = await this.service.Document.findById(documentId);

            await this.service.Document.updateOne(
                { _id: documentId },
                { $inc: { download_count: 1 } }
            );

            doc = await this.service.Document.findById(documentId);
            return { buffer: cachedBuffer, doc };

        }
        // nếu không cache, dùng supabase
        const { buffer, doc: serviceDoc } = await this.service.downloadDocument(documentId);
        doc = serviceDoc;

        await this.service.Document.updateOne(
            { _id: documentId },
            { $inc: { download_count: 1 } }
        );

        doc = await this.service.Document.findById(documentId);

        await this.setCache(doc, buffer);
        return { buffer, doc };
    }

    async getAllDocuments(options) {
        // serialize JSON để làm key
        const key = `list:${JSON.stringify(options)}`;

        // Check list cache
        const cachedEntry = this.listCache.get(key);
        if (cachedEntry && Date.now() <= cachedEntry.expireAt) {
            console.log("getAllDocuments: lấy từ cache");
            return cachedEntry.data;
        }

        const result = await this.service.getAllDocuments(options);
        
        this.listCache.set(key, {
            data: result,
            expireAt: Date.now() + (5 * 60 * 1000)
        });

        if (this.listCache.size > 20) {
            const firstKey = this.listCache.keys().next().value;
            this.listCache.delete(firstKey);
        }

        return result;
    }

    async uploadFile(file, userId, roomId) {
        return this.service.uploadFile(file, userId, roomId);
    }

    async deleteDocument(documentId, user) {
        const result = await this.service.deleteDocument(documentId, user);
        // Remove from document cache
        const entry = this.cache.get(documentId);
        if (entry && fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
        }
        this.cache.delete(documentId);
        // Clear list cache since documents changed
        this.listCache.clear();
        return result;
    }
}
