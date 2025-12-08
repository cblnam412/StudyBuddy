import { beforeEach, afterEach, jest, expect, describe } from "@jest/globals";
import mongoose from "mongoose";

import { ExamService } from "../../service/examService.js";

describe("EXAM001 - Test createExam function", () => {

    let mockCreate;
    let examService;

    beforeEach(() => {
        mockCreate = jest.fn();
        examService = new ExamService(null, { create: mockCreate });
    });

    test("UT0001 - missing eventId → error 'Thiếu thông tin cần thiết'", async () => {
        await expect(
            examService.createExam(null, "discussion", "title", "desc", 1)
        ).rejects.toThrow("Thiếu thông tin cần thiết");
    });

    test("UT0002 - missing examType → error 'Thiếu thông tin cần thiết'", async () => {
        await expect(
            examService.createExam(1, null, "title", "desc", 1)
        ).rejects.toThrow("Thiếu thông tin cần thiết");
    });

    test("UT0003 - missing title → error 'Thiếu thông tin cần thiết'", async () => {
        await expect(
            examService.createExam(1, "discussion", null, "desc", 1)
        ).rejects.toThrow("Thiếu thông tin cần thiết");
    });

    test("UT0004 - examType other → error 'Loại bài kiểm tra không hợp lệ'", async () => {
        await expect(
            examService.createExam(1, "other", "title", "desc", 1)
        ).rejects.toThrow("Loại bài kiểm tra không hợp lệ");
    });

    test("UT0005 - duration = null → return newExam", async () => {
        const fakeExam = { id: 123 };
        mockCreate.mockResolvedValue(fakeExam);

        const res = await examService.createExam(1, "exam", "title", "desc", null);

        expect(res).toEqual(fakeExam);
        expect(mockCreate).toHaveBeenCalled();
    });

    test("UT0006 - duration = 'abc' → error 'Thời gian làm bài không hợp lệ'", async () => {
        await expect(
            examService.createExam(1, "exam", "title", "desc", "abc")
        ).rejects.toThrow("Thời gian làm bài không hợp lệ");
    });

    test("UT0007 - duration = 0 → error 'Thời gian làm bài không hợp lệ'", async () => {
        await expect(
            examService.createExam(1, "discussion", "title", "desc", 0)
        ).rejects.toThrow("Thời gian làm bài không hợp lệ");
    });

    test("UT0008 - duration = 1 → success return newExam", async () => {
        const fakeExam = { id: 456 };
        mockCreate.mockResolvedValue(fakeExam);

        const res = await examService.createExam(1, "exam", "title", "desc", 1);

        expect(mockCreate).toHaveBeenCalled();
        expect(res).toEqual(fakeExam);
    });

    test("UT0009 - examType discussion valid → return newExam", async () => {
        const fakeExam = { id: 789 };
        mockCreate.mockResolvedValue(fakeExam);

        const res = await examService.createExam(1, "discussion", "title", "desc", 10);

        expect(res).toEqual(fakeExam);
    });
});

describe("EXAM002 - Test getExamDetails function", () => {
    let examService;

    beforeEach(() => {
        // Mock Exam Model
        const ExamModelMock = {
            findById: jest.fn(),
        };

        examService = new ExamService();
        examService.Exam = ExamModelMock;

        // Mock mongoose ObjectId
        jest.spyOn(mongoose.Types.ObjectId, "isValid");
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // UC00101 — examId invalid
    test("UC00101 - examId invalid → throw 'ID bài kiểm tra không hợp lệ'", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        const invalidId = "abc123";

        await expect(examService.getExamDetails(invalidId))
            .rejects
            .toThrow("ID bài kiểm tra không hợp lệ");
    });

    // UC00102 — examId valid nhưng không tồn tại
    test("UC00102 - examId valid nhưng không tồn tại → throw 'Không tìm thấy bài kiểm tra'", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        examService.Exam.findById.mockResolvedValue(null);

        const nonExistId = "676fe0fcfba1b02df62d19a2";

        await expect(examService.getExamDetails(nonExistId))
            .rejects
            .toThrow("Không tìm thấy bài kiểm tra");
    });

    // UC00103 — examId valid và tồn tại
    test("UC00103 - examId valid và tồn tại → return exam object", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const fakeExam = {
            _id: "676fe0fcfba1b02df62d19a2",
            name: "Midterm Test"
        };

        examService.Exam.findById.mockResolvedValue(fakeExam);

        const result = await examService.getExamDetails(fakeExam._id);

        expect(result).toEqual(fakeExam);
    });
});
