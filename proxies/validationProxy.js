
export class ValidationProxy {
    constructor(service) {
        this.service = service;
    }

    async uploadFile(file, userId, roomId) {
        if (!userId) 
            throw new Error("Thiếu userId");
        if (!roomId) 
            throw new Error("Thiếu roomId");
        if (!file) 
            throw new Error("Thiếu file");

        if (typeof file.size !== "number") {
            throw new Error("File không hợp lệ");
        }

        return this.service.uploadFile(file, userId, roomId);
    }

    async downloadDocument(documentId) {
        if (!documentId) 
            throw new Error("Thiếu documentId");

        return this.service.downloadDocument(documentId);
    }

    async deleteDocument(documentId, user) {
        if (!documentId) 
            throw new Error("Thiếu documentId");
        if (!user) 
            throw new Error("Thiếu user");

        return this.service.deleteDocument(documentId, user);
    }

    async getAllDocuments(options) {
        if (!options) 
            throw new Error("Thiếu options");
        if (options.page && options.page < 1) 
            throw new Error("Page không hợp lệ");
        if (options.limit && options.limit < 1) 
            throw new Error("Limit không hợp lệ");

        return this.service.getAllDocuments(options);
    }

    async getUploadedDocumentCount(userId) {
        if (!userId)
            throw new Error("Thiếu userId.");

        return this.service.getUploadedDocumentCount(userId);
    }

    async getDownloadedDocumentCount(userId) {
        if (!userId)
            throw new Error("Thiếu userId.");

        return this.service.getDownloadedDocumentCount(userId);
    }

    async getAllDownloadedDocumentCount(filters) {
        return this.service.getAllDownloadedDocumentCount(filters);
    }
}
