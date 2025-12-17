import { DocumentService } from "../../service/documentService";
import { DocumentFactory } from "../../documents/documentFactory";
import { beforeEach, afterEach, jest, expect, describe } from "@jest/globals";
import mongoose from "mongoose";

describe("DOC001 - Test uploadFile function", () => {
    let mockDocumentModel;
    let mockSupabase;
    let documentService;

      beforeEach(() => {
        const storageFrom = {
            upload: jest.fn().mockResolvedValue({ error: null }), 
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/uploads/file.pdf" }})
        };

        mockSupabase = {
            storage: {
                from: jest.fn().mockReturnValue(storageFrom)
            }
        };

        mockDocumentModel = {
            create: jest.fn().mockResolvedValue({ _id: "123456", file_url: "https://cdn.example.com/uploads/file.pdf" })
        };

        documentService = new DocumentService(mockDocumentModel, null, mockSupabase);

        jest.spyOn(DocumentFactory, "create").mockImplementation((file, supabase) => {
        return {
            validate: jest.fn(), 
            getFolder: () => "documents",
            getType: () => "pdf"
        };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("TC01 - Upload file thành công nếu file và roomId hợp lệ", async() => {
        const file = { size: 10, originalName: "file" };  
        const roomId = "690026054f6e3131ee50b455";
        const userId = "123456789";

        const mockDocumentValue = {
            uploader_id: userId,
            room_id: roomId,
            file_name: file.originalName,
            file_url: "https://cdn.example.com/uploads/file.pdf",
            file_size: file.size,
            file_type: "pdf",
            status: "active"
        };

        mockDocumentModel.create.mockResolvedValue(mockDocumentValue);

        const res = await documentService.uploadFile(file, userId, roomId);

        expect(res).toEqual({
            type: "pdf",
            url: "https://cdn.example.com/uploads/file.pdf",
            document: mockDocumentValue
        });
    });

    test("TC02 - Từ chối upload file nếu trống roomId", async () => {
        const file = { size: 10, originalName: "file" };  
        const roomId = undefined;
        const userId = "123456789"; 

        expect(documentService.uploadFile(file, userId, roomId)).rejects.toThrow("Thiếu roomId");
    });

    test("TC03 - Từ chối upload file nếu trống file", async () => {
        const file = null;  
        const roomId = "690026054f6e3131ee50b455";
        const userId = "123456789"; 

        expect(documentService.uploadFile(file, userId, roomId)).rejects.toThrow("Thiếu file");
    });

    test("TC04 - Từ chối upload file nếu file lớn hơn 20MB", async () => {
        const file = { size: 20*1024*1024 + 1, originalName: "file" };   
        const roomId = "690026054f6e3131ee50b455";
        const userId = "123456789"; 

        expect(documentService.uploadFile(file, userId, roomId)).rejects.toThrow("Dung lượng tối đa 20MB");
    });
});

describe("DOC002 - Test downloadDocument function", () => {
    let mockDocumentModel;
    let mockSupabase;
    let documentService;

    beforeEach(() => {
        const storageFrom = {
            download: jest.fn().mockResolvedValue({ 
                data: {name: "sampleFile", type: "application/pdf", arrayBuffer: jest.fn().mockResolvedValue(Buffer.from("file-body"))}, 
                error: null 
            }) 
        };

        mockSupabase = {
            storage: {
                from: jest.fn().mockReturnValue(storageFrom)
            }
        };

        mockDocumentModel = {
            findById: jest.fn().mockResolvedValue({}),
        };

        documentService = new DocumentService(mockDocumentModel, null, mockSupabase);

        process.env.SUPABASE_URL = "https://example.supabase.co";
    });

    test("TC01 - Tải xuống file nếu tìm thấy tài liệu ở trạng thái active", async () => {
        const documentId = "validId";
        
        const mockDoc = {
            name: "fileName", 
            status: "active", 
            file_url: "example.com/fileName"
        };

        mockDocumentModel.findById.mockResolvedValue(mockDoc);

        const res = await documentService.downloadDocument(documentId);

        expect(res.mimeType).toEqual("application/pdf");

         // Buffer.from(anotherBuffer) will produce a new anotherBuffer with the same content
        expect(res.buffer.toString()).toBe("file-body");

        expect(res.doc).toBe(mockDoc);
    });

    test("TC02 - Tải xuống file nếu tìm thấy tài liệu ở trạng thái archived", async () => {
        const documentId = "validId";
        
        const mockDoc = {
            name: "fileName", 
            status: "archived", 
            file_url: "example.com/fileName"
        };

        mockDocumentModel.findById.mockResolvedValue(mockDoc);

        const res = await documentService.downloadDocument(documentId);

        expect(res.mimeType).toEqual("application/pdf");

        expect(res.buffer.toString()).toBe("file-body");

        expect(res.doc).toBe(mockDoc);
    });

    test("TC03 - Từ chối tải file nếu tìm thấy tài liệu ở trạng thái deleted", async () => {
        const documentId = "validId";
        
        const mockDoc = {
            name: "fileName", 
            status: "deleted", 
            file_url: "example.com/fileName"
        };

        mockDocumentModel.findById.mockResolvedValue(mockDoc);

        expect(documentService.downloadDocument(documentId)).rejects.toThrow("Tài liệu đã bị xoá");
    });

    test("TC04 - Từ chối tải file nếu id tài liệu không hợp lệ", async () => {
        const documentId = "invalidId";
        
        mockDocumentModel.findById.mockResolvedValue(null);

        expect(documentService.downloadDocument(documentId)).rejects.toThrow("Không tìm thấy tài liệu");
    });

    test("TC05 - Từ chối tải file nếu id tài liệu trống", async () => {
        const documentId = undefined;
        
        mockDocumentModel.findById.mockResolvedValue(null);

        expect(documentService.downloadDocument(documentId)).rejects.toThrow("Không tìm thấy tài liệu");
    });
});

describe("DOC003 - Test deleteDocument function", () => {
    let mockDocumentModel;
    let documentService;
    
    beforeEach(() => {
        mockDocumentModel = {
            findById: jest.fn().mockResolvedValue({})
        };

        documentService = new DocumentService(mockDocumentModel, null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("TC01 - Cho phép xóa tài liệu nếu người yêu cầu là chủ tài liệu và tài liệu còn hoạt động", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "active";
        const user = { id: "uploaderId", role: "user" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        const res = await documentService.deleteDocument(documentId, user);

        expect(res).toBe(documentId);
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test("TC02 - Cho phép xóa tài liệu nếu người yêu cầu là chủ tài liệu và tài liệu ở trạng thái lưu trữ", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "archived";
        const user = { id: "uploaderId", role: "user" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        const res = await documentService.deleteDocument(documentId, user);

        expect(res).toBe(documentId);
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test("TC03 - Cho phép xóa tài liệu nếu người yêu cầu là moderator và tài liệu ở trạng thái hoạt động", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "active";
        const user = { id: "moderatorId", role: "moderator" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        const res = await documentService.deleteDocument(documentId, user);

        expect(res).toBe(documentId);
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test("TC04 - Cho phép xóa tài liệu nếu người yêu cầu admin và tài liệu ở trạng thái hoạt động", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "active";
        const user = { id: "adminId", role: "admin" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        const res = await documentService.deleteDocument(documentId, user);

        expect(res).toBe(documentId);
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test("TC05 - Từ chối xóa tài liệu nếu người yêu cầu không phải chủ sở hữu và là user", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "active";
        const user = { id: "non-uploaderId", role: "user" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("Bạn không có quyền xóa tài liệu này");
        expect(mockSave).toHaveBeenCalledTimes(0);
    });

    test("TC06 - Từ chối xóa tài liệu nếu tài liệu đã ở trạng thái deleted, người yêu cầu là user", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "deleted";
        const user = { id: "uploaderId", role: "user" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("Tài liệu đã bị xóa trước đó");
        expect(mockSave).toHaveBeenCalledTimes(0);
    });

    test("TC07 - Từ chối xóa tài liệu nếu tài liệu đã ở trạng thái deleted, người yêu cầu là moderator", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "deleted";
        const user = { id: "moderatorId", role: "moderator" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("Tài liệu đã bị xóa trước đó");
        expect(mockSave).toHaveBeenCalledTimes(0);
    });

    test("TC08 - Từ chối xóa tài liệu nếu tài liệu đã ở trạng thái deleted, người yêu cầu là admin", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "deleted";
        const user = { id: "adminId", role: "admin" };

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("Tài liệu đã bị xóa trước đó");
        expect(mockSave).toHaveBeenCalledTimes(0);
    });

    test("TC09 - Từ chối xóa tài liệu nếu không tìm thấy tài liệu", async () => {
        const documentId = "invalidDocumentId";
        const user = { id: "68ff51bca8b499e2606ab563", role: "user" };

        mockDocumentModel.findById.mockResolvedValue(null);

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("Không tìm thấy tài liệu");
    });

    test("TC10 - Từ chối xóa tài liệu nếu id tài liệu trống", async () => {
        const documentId = null;
        const user = { id: "68ff51bca8b499e2606ab563", role: "user" };

        mockDocumentModel.findById.mockResolvedValue(null);

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("Không tìm thấy tài liệu");
    });

    test("TC11 - Từ chối xóa tài liệu nếu trống user", async () => {
        const documentId = "validDocumentId";
        const documentStatus = "active";
        const user = undefined;

        const mockSave = jest.fn().mockResolvedValue({ok: true});

        mockDocumentModel.findById.mockResolvedValue({
            file_name: "Test Document",
            uploader_id: "uploaderId",
            status: documentStatus,
            save: mockSave
        });

        expect(documentService.deleteDocument(documentId, user)).rejects.toThrow("User không được trống");
        expect(mockSave).toHaveBeenCalledTimes(0);
    });
});

// describe("DOC004 - Test getAllDocuments function", () => {
//     let mockDocumentModel;
//     let documentService;
//     const totalDocumentsInDB = 100;

//     beforeEach(() => {
//         mockDocumentModel = {
//             find: jest.fn().mockResolvedValue({}),
//             countDocuments: jest.fn().mockResolvedValue(totalDocumentsInDB),
//         };

//         documentService = new DocumentService(mockDocumentModel, null);
//     });

//     afterEach(() => {
//         jest.clearAllMocks();
//     });

//     test("TC01 - Lấy thông tin 1 tài liệu, với id tài liệu hợp lệ, page = 1, limit = 1", async () => {
//         const roomId = "validRoomId";
//         const page = 1;
//         const limit = 1;
//         const skip = (page - 1) * limit;
        
//         const mockList = Array.from({ length: limit }, (_, index) => ({
//             _id: `doc_id_${index}`,           
//             file_name: `Document ${index + 1}`, 
//             uploader_id: "user123",
//             status: "active"
//         }));

//         mockDocumentModel.find.mockResolvedValue(mockList);

//         const res = await documentService.getAllDocuments({roomId, page, limit});

//         expect(res).toEqual({
//             documents: mockList,
//             total: totalDocumentsInDB,
//             page,
//             limit
//         });
//     })
// })

