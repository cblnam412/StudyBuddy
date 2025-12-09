import { beforeEach, jest } from "@jest/globals";
import { TagService } from "../../service/tagService.js";
import fs from "fs";
import xlsx from "xlsx";
jest.mock("fs");

//------ createTag() ------//
describe("TEST TAG001 - createTag() function", () => {
    let service;
    let mockTagModel;
    let mockSave;

    beforeEach(() => {
        jest.resetAllMocks();

        mockSave = jest.fn().mockResolvedValue(true);
        mockTagModel = jest.fn().mockImplementation((data) => ({
            ...data,
            save: mockSave
        }));
        mockTagModel.findOne = jest.fn();
        service = new TagService(mockTagModel);
    });

    test("TC01: Throw lỗi khi không có tagName", async () => {
        await expect(service.createTag(null))
            .rejects
            .toThrow("Thiếu tên Tag");

        await expect(service.createTag(""))
            .rejects
            .toThrow("Thiếu tên Tag");
    });

    test("TC02: Throw lỗi khi tagName dài hơn 10 ký tự", async () => {
        const longName = "12345678901"; 
        
        await expect(service.createTag(longName))
            .rejects
            .toThrow("Tag Name không được dài quá 10 ký tự.");
    });

    test("TC03: Throw lỗi khi tagName chứa ký tự đặc biệt hoặc khoảng trắng", async () => {
        const invalidName1 = "tag name"; 
        const invalidName2 = "tag@name";
        
        await expect(service.createTag(invalidName1))
            .rejects
            .toThrow("Tag Name chỉ được chứa chữ cái (A-Z), chữ số (0-9), dấu gạch ngang (-) và dấu gạch dưới (_).");
            
        await expect(service.createTag(invalidName2))
            .rejects
            .toThrow("Tag Name chỉ được chứa chữ cái (A-Z), chữ số (0-9), dấu gạch ngang (-) và dấu gạch dưới (_).");
    });

    test("TC04: Throw lỗi khi Tag đã tồn tại", async () => {
        const tagName = "existing";
        
        mockTagModel.findOne.mockResolvedValue({ tagName: "existing" });

        await expect(service.createTag(tagName))
            .rejects
            .toThrow("Đã có Tag này");
            
        expect(mockTagModel.findOne).toHaveBeenCalledWith({ tagName: "existing" });
    });

    test("TC05: Tạo Tag thành công (Format đúng: trim + lowercase)", async () => {
        const inputName = "  NeWTaG  ";
        const expectedName = "newtag";
        mockTagModel.findOne.mockResolvedValue(null);

        const result = await service.createTag(inputName);

        expect(mockTagModel.findOne).toHaveBeenCalledWith({ tagName: expectedName });

        expect(mockTagModel).toHaveBeenCalledWith({ tagName: expectedName });

        expect(mockSave).toHaveBeenCalled();

        expect(result.tagName).toBe(expectedName);
    });
});

//------ importTagsFromExcel() ------//
describe("TEST TAG002 - importTagsFromExcel() function", () => {
    let service;
    let mockTagModel;

    const mockFile = { path: "uploads/test.xlsx" };

    beforeEach(() => {
        jest.resetAllMocks();

        mockTagModel = {
            find: jest.fn(),
            insertMany: jest.fn()
        };

        service = new TagService(mockTagModel);
        
        fs.unlinkSync = jest.fn(); 
        
        xlsx.readFile = jest.fn();
        xlsx.utils = {
            sheet_to_json: jest.fn()
        };
    });

    test("TC01: Throw lỗi khi không có file input", async () => {
        await expect(service.importTagsFromExcel(null))
            .rejects
            .toThrow("Không thấy file");
            
        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    test("TC02: Throw lỗi khi tất cả tag đều không hợp lệ hoặc bị trùng (Không còn tag nào để thêm)", async () => {
        xlsx.readFile.mockReturnValue({
            SheetNames: ["Sheet1"],
            Sheets: { "Sheet1": {} }
        });

        const excelData = [["invalid@tag"], ["existing_tag"]];
        xlsx.utils.sheet_to_json.mockReturnValue(excelData);

        mockTagModel.find.mockResolvedValue([{ tagName: "existing_tag" }]);

        await expect(service.importTagsFromExcel(mockFile))
            .rejects
            .toThrow("Không còn tag hợp lệ để thêm");

        expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    test("TC03: Import thành công (xử lý Valid, Invalid, Duplicate)", async () => {
        xlsx.readFile.mockReturnValue({
            SheetNames: ["Sheet1"],
            Sheets: { "Sheet1": {} }
        });

        const excelData = [["  ValidTag1 "], ["TooLongTagName123"], ["Duplicate"]];
        xlsx.utils.sheet_to_json.mockReturnValue(excelData);

        mockTagModel.find.mockResolvedValue([{ tagName: "duplicate" }]);

        const mockCreatedTags = [{ tagName: "validtag1", _id: "new_id" }];
        mockTagModel.insertMany.mockResolvedValue(mockCreatedTags);

        const result = await service.importTagsFromExcel(mockFile);
        expect(mockTagModel.find).toHaveBeenCalledWith({ 
            tagName: { $in: ["validtag1", "duplicate"] } 
        });

        expect(mockTagModel.insertMany).toHaveBeenCalledWith([{ tagName: "validtag1" }]);

        expect(result).toEqual({
            created: mockCreatedTags,
            skipped: ["duplicate"],
            invalid: ["toolongtagname123"]
        });
        expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });

    test("TC04: Đảm bảo file luôn được xóa (unlinkSync) ngay cả khi đọc file bị lỗi", async () => {
        xlsx.readFile.mockImplementation(() => {
            throw new Error("File Corrupted");
        });

        await expect(service.importTagsFromExcel(mockFile))
            .rejects
            .toThrow("File Corrupted");
        expect(fs.unlinkSync).toHaveBeenCalledWith(mockFile.path);
    });
});

//------ getTagById() ------//
describe("TEST TAG003 - getTagById() function", () => {
    let service;
    let mockTagModel;

    beforeEach(() => {
        jest.resetAllMocks();
        mockTagModel = {
            findById: jest.fn()
        };

        service = new TagService(mockTagModel);
    });

    test("TC01: Throw lỗi khi không tìm thấy Tag (ID không tồn tại)", async () => {
        const tagId = "non_existent_id";

        mockTagModel.findById.mockResolvedValue(null);

        await expect(service.getTagById(tagId))
            .rejects
            .toThrow("Không tìm thấy");

        expect(mockTagModel.findById).toHaveBeenCalledWith(tagId);
    });

    test("TC02: Trả về thông tin Tag khi tìm thấy", async () => {
        const tagId = "valid_id";
        const mockTag = { _id: tagId, tagName: "javascript" };
        mockTagModel.findById.mockResolvedValue(mockTag);

        const result = await service.getTagById(tagId);

        expect(mockTagModel.findById).toHaveBeenCalledWith(tagId);
        expect(result).toEqual(mockTag);
    });
});

//------ updateTag() ------//
describe("TEST TAG004 - updateTag() function", () => {
    let service;
    let mockTagModel;

    beforeEach(() => {
        jest.resetAllMocks();

        mockTagModel = {
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn()
        };

        service = new TagService(mockTagModel);
    });

    test("TC01: Throw lỗi khi thiếu tagName", async () => {
        await expect(service.updateTag("tag_id", null))
            .rejects
            .toThrow("Thiếu tên Tag");
    });

    test("TC02: Throw lỗi khi tagName quá dài (>10 ký tự)", async () => {

        const longName = "12345678901";

        await expect(service.updateTag("tag_id", longName))
            .rejects
            .toThrow("Tag Name không được dài quá 10 ký tự.");
    });

    test("TC03: Throw lỗi khi tagName chứa ký tự không hợp lệ", async () => {
        const invalidName = "tag@inva";

        await expect(service.updateTag("tag_id", invalidName))
            .rejects
            .toThrow("Tag Name chỉ được chứa chữ cái (A-Z), chữ số (0-9), dấu gạch ngang (-) và dấu gạch dưới (_).");
    });

    test("TC04: Throw lỗi khi trùng tên với Tag khác (Khác ID)", async () => {
        const idToUpdate = "id_1";
        const newName = "duplicate";
        
        mockTagModel.findOne.mockResolvedValue({
            _id: "id_2",
            tagName: "duplicate"
        });

        await expect(service.updateTag(idToUpdate, newName))
            .rejects
            .toThrow("Đã tồn tại Tag cùng tên");
    });

    test("TC05: Cho phép cập nhật nếu tên trùng với chính Tag hiện tại (Cùng ID)", async () => {
        const idToUpdate = "id_1";
        const newName = "SameName";

        mockTagModel.findOne.mockResolvedValue({
            _id: idToUpdate, 
            tagName: "samename"
        });

        const updatedTag = { _id: idToUpdate, tagName: "samename" };
        mockTagModel.findByIdAndUpdate.mockResolvedValue(updatedTag);

        const result = await service.updateTag(idToUpdate, newName);

        expect(result).toEqual(updatedTag);
        expect(mockTagModel.findByIdAndUpdate).toHaveBeenCalledWith(
            idToUpdate,
            { tagName: "samename" },
            { new: true, runValidators: true }
        );
    });

    test("TC06: Throw lỗi khi không tìm thấy Tag để update", async () => {
        const idToUpdate = "id_not_found";
        
        mockTagModel.findOne.mockResolvedValue(null);

        mockTagModel.findByIdAndUpdate.mockResolvedValue(null);

        await expect(service.updateTag(idToUpdate, "valid_name"))
            .rejects
            .toThrow("Không tìm thấy");
    });

    test("TC07: Cập nhật thành công (Trường hợp bình thường)", async () => {
        const idToUpdate = "id_1";
        const newName = " NewTagName ";

        mockTagModel.findOne.mockResolvedValue(null);

        const mockUpdated = { _id: idToUpdate, tagName: "newtagname" };
        mockTagModel.findByIdAndUpdate.mockResolvedValue(mockUpdated);

        const result = await service.updateTag(idToUpdate, newName);

        expect(mockTagModel.findOne).toHaveBeenCalledWith({ tagName: "newtagname" });
        
        expect(mockTagModel.findByIdAndUpdate).toHaveBeenCalledWith(
            idToUpdate,
            { tagName: "newtagname" },
            expect.anything()
        );
        expect(result).toEqual(mockUpdated);
    });
});
