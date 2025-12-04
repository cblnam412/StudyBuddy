import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CachingProxy {
    constructor(service, cacheFolder = "./documentCache") {
        this.service = service;
        this.cacheFolder = cacheFolder;

        // key = documentId, value = { filePath, expireAt, download_count }
        this.cache = new Map();
        this.listCache = new Map();
        this.TTL = 60 * 60 * 1000;  // 1h
        this.MIN_DOWNLOAD_COUNT = 99;
        
        console.log(`CachingProxy: Cache folder set to ${this.cacheFolder}`);
    }

    async setCache(doc, buffer, mimeType) {
        if (doc.download_count <= this.MIN_DOWNLOAD_COUNT) {
            console.log(`CachingProxy: Skipping cache for document ${doc._id} (download_count: ${doc.download_count} <= ${this.MIN_DOWNLOAD_COUNT})`);
            return;
        }

        const originalFileName = doc.file_name || "document";
        const fileExtension = path.extname(originalFileName);
        const baseFileName = path.basename(originalFileName, fileExtension) || "document";
        
        const sanitizedBaseName = baseFileName.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
        
        const cachedFileName = `${doc._id}_${Date.now()}_${sanitizedBaseName}${fileExtension}`;
        const filePath = path.join(this.cacheFolder, cachedFileName);
        
        fs.writeFileSync(filePath, Buffer.from(buffer));
        console.log(`CachingProxy: Cached document ${doc._id} to ${filePath} (${(buffer.length / 1024).toFixed(2)} KB)`);

        this.cache.set(doc._id.toString(), { 
            filePath, 
            expireAt: Date.now() + this.TTL,
            mimeType,
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

    getCache(documentId) {
        const entry = this.cache.get(documentId);
        if (!entry) return null;

        if (Date.now() > entry.expireAt) {
            if (fs.existsSync(entry.filePath)) {
                fs.unlinkSync(entry.filePath);
            }
            this.cache.delete(documentId);
            return null;
        }

        if (!fs.existsSync(entry.filePath)) {
            this.cache.delete(documentId);
            return null;
        }

        return { 
            buffer: fs.readFileSync(entry.filePath),
            mimeType: entry.mimeType
        };
    }

    async downloadDocument(documentId) {
        const cacheEntry = this.getCache(documentId);
        let doc;
        if (cacheEntry) {
            console.log("CachingProxy: lấy từ cache.", documentId);
            doc = await this.service.Document.findById(documentId);

            await this.service.Document.updateOne(
                { _id: documentId },
                { $inc: { download_count: 1 } }
            );

            doc = await this.service.Document.findById(documentId);

            return { 
                buffer: cacheEntry.buffer, 
                mimeType: cacheEntry.mimeType,
                doc 
            };
        }
        // nếu không cache, dùng supabase
        const { buffer, doc: serviceDoc, mimeType } = await this.service.downloadDocument(documentId);
        doc = serviceDoc;

        await this.service.Document.updateOne(
            { _id: documentId },
            { $inc: { download_count: 1 } }
        );

        doc = await this.service.Document.findById(documentId);

        await this.setCache(doc, buffer, mimeType);
        return { buffer, doc, mimeType };
    }

    // async getAllDocuments(options) {
    //     // serialize JSON để làm key
    //     const key = `list:${JSON.stringify(options)}`;

    //     // Check list cache
    //     const cachedEntry = this.listCache.get(key);
    //     if (cachedEntry && Date.now() <= cachedEntry.expireAt) {
    //         console.log("getAllDocuments: lấy từ cache");
    //         return cachedEntry.data;
    //     }

    //     const result = await this.service.getAllDocuments(options);
        
    //     this.listCache.set(key, {
    //         data: result,
    //         expireAt: Date.now() + (5 * 60 * 1000)
    //     });

    //     if (this.listCache.size > 20) {
    //         const firstKey = this.listCache.keys().next().value;
    //         this.listCache.delete(firstKey);
    //     }

    //     return result;
    // }

    async uploadFile(file, userId, roomId) {
        return this.service.uploadFile(file, userId, roomId);
    }

    async getAllDocuments(options) {
        return this.service.getAllDocuments(options);
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
