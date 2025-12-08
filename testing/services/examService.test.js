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

describe("EXAM003 - Test getExams function", () => {
    let examService;

    beforeEach(() => {
        examService = new ExamService();

        examService.Exam = {
            find: jest.fn().mockReturnThis(),
            sort: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Helper mock return data
    const sampleExams = [
        { id: 1, name: "Exam A" },
        { id: 2, name: "Exam B" }
    ];

    const empty = [];

    // -----------------------------
    // UC001 – event_id missing + status missing → return all exams
    // -----------------------------
    test("UC001 - missing event_id + missing status → return exams", async () => {
        examService.Exam.sort.mockResolvedValue(sampleExams);

        const result = await examService.getExams({});

        expect(examService.Exam.find).toHaveBeenCalledWith({});
        expect(result).toEqual(sampleExams);
    });

    // -----------------------------
    // UC002 – missing event_id + invalid status → empty array
    // -----------------------------
    test("UC002 - missing event_id + invalid status → empty array", async () => {
        examService.Exam.sort.mockResolvedValue(empty);

        const result = await examService.getExams({ status: "???" });

        expect(examService.Exam.find).toHaveBeenCalledWith({ status: "???" });
        expect(result).toEqual(empty);
    });

    // -----------------------------
    // UC003 – missing event_id + valid status → return exams
    // -----------------------------
    test("UC003 - missing event_id + valid status → return exams", async () => {
        examService.Exam.sort.mockResolvedValue(sampleExams);

        const result = await examService.getExams({ status: "published" });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({ status: "published" });

        expect(result).toEqual(sampleExams);
    });

    // -----------------------------
    // UC004 – invalid event_id + missing status → empty array
    // -----------------------------
    test("UC004 - invalid event_id + missing status → empty array", async () => {
        examService.Exam.sort.mockResolvedValue(empty);

        const result = await examService.getExams({ event_id: "???" });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({ event_id: "???" });

        expect(result).toEqual(empty);
    });

    // -----------------------------
    // UC005 – invalid event_id + invalid status → empty array
    // -----------------------------
    test("UC005 - invalid event_id + invalid status → empty array", async () => {
        examService.Exam.sort.mockResolvedValue(empty);

        const result = await examService.getExams({
            event_id: "abc",
            status: "??"
        });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({ event_id: "abc", status: "??" });

        expect(result).toEqual(empty);
    });

    // -----------------------------
    // UC006 – invalid event_id + valid status → empty array
    // -----------------------------
    test("UC006 - invalid event_id + valid status → empty array", async () => {
        examService.Exam.sort.mockResolvedValue(empty);

        const result = await examService.getExams({
            event_id: "not-real",
            status: "draft"
        });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({ event_id: "not-real", status: "draft" });

        expect(result).toEqual(empty);
    });

    // -----------------------------
    // UC007 – valid event_id + missing status → return exams
    // -----------------------------
    test("UC007 - valid event_id + missing status → return exams", async () => {
        examService.Exam.sort.mockResolvedValue(sampleExams);

        const result = await examService.getExams({
            event_id: "676fe0fcfba1b02df62d19a2"
        });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({
                event_id: "676fe0fcfba1b02df62d19a2"
            });

        expect(result).toEqual(sampleExams);
    });

    // -----------------------------
    // UC008 – valid event_id + invalid status → empty array
    // -----------------------------
    test("UC008 - valid event_id + invalid status → empty array", async () => {
        examService.Exam.sort.mockResolvedValue(empty);

        const result = await examService.getExams({
            event_id: "676fe0fcfba1b02df62d19a2",
            status: "???"
        });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({
                event_id: "676fe0fcfba1b02df62d19a2",
                status: "???"
            });

        expect(result).toEqual(empty);
    });

    // -----------------------------
    // UC009 – valid event_id + valid status → return exams
    // -----------------------------
    test("UC009 - valid event_id + valid status → return exams", async () => {
        examService.Exam.sort.mockResolvedValue(sampleExams);

        const result = await examService.getExams({
            event_id: "676fe0fcfba1b02df62d19a2",
            status: "published"
        });

        expect(examService.Exam.find)
            .toHaveBeenCalledWith({
                event_id: "676fe0fcfba1b02df62d19a2",
                status: "published"
            });

        expect(result).toEqual(sampleExams);
    });
});

describe("EXAM004 - Test getExamWithQuestions function", () => {
    let examService;

    beforeEach(() => {
        examService = new ExamService();

        examService.Exam = {
            findById: jest.fn(),
        };

        examService.Question = {
            find: jest.fn().mockReturnThis(),
            sort: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // -------------------------------
    // UC001 – examId invalid → throw "ID bài kiểm tra không hợp lệ"
    // -------------------------------
    test("UC001 - invalid examId → throw invalid ID error", async () => {
        // fake isValid = false
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(false);

        await expect(examService.getExamWithQuestions("abc"))
            .rejects.toThrow("ID bài kiểm tra không hợp lệ");
    });

    // -------------------------------
    // UC002 – examId valid but exam not exist → throw "Không tìm thấy bài kiểm tra"
    // -------------------------------
    test("UC002 - non-exist examId → throw not found error", async () => {
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(true);

        examService.Exam.findById.mockResolvedValue(null);
        examService.Question.sort.mockResolvedValue([]);

        await expect(
            examService.getExamWithQuestions("676fe0fcfba1b02df62d19a2")
        ).rejects.toThrow("Không tìm thấy bài kiểm tra");
    });

    // -------------------------------
    // UC003 – valid & exist → return { ...exam.toObject(), questions }
    // -------------------------------
    test("UC003 - valid examId & exist → return exam with questions", async () => {
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(true);

        const fakeExam = {
            toObject: () => ({ _id: "676fe0fcfba1b02df62d19a2", title: "Midterm" }),
        };

        const fakeQuestions = [
            { id: 1, question: "Q1" },
            { id: 2, question: "Q2" }
        ];

        examService.Exam.findById.mockResolvedValue(fakeExam);
        examService.Question.sort.mockResolvedValue(fakeQuestions);

        const result = await examService.getExamWithQuestions("676fe0fcfba1b02df62d19a2");

        expect(result).toEqual({
            _id: "676fe0fcfba1b02df62d19a2",
            title: "Midterm",
            questions: fakeQuestions
        });

        expect(examService.Exam.findById)
            .toHaveBeenCalledWith("676fe0fcfba1b02df62d19a2");

        expect(examService.Question.find)
            .toHaveBeenCalledWith({ exam_id: "676fe0fcfba1b02df62d19a2" });
    });
});

describe("EXAM005 - Test updateExam function", () => {
    let examService;

    beforeEach(() => {
        examService = new ExamService();

        examService.Exam = {
            findByIdAndUpdate: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // -----------------------------------------------------
    // UC001 – examId invalid → throw
    // -----------------------------------------------------
    test("UC001 - invalid examId → throw invalid ID error", async () => {
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(false);

        await expect(
            examService.updateExam("abc", { title: "New title" })
        ).rejects.toThrow("ID bài kiểm tra không hợp lệ");
    });

    // -----------------------------------------------------
    // UC002 – valid examId but examType invalid → throw
    // -----------------------------------------------------
    test("UC002 - invalid examType → throw invalid exam type error", async () => {
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(true);

        const updates = { examType: "essay" }; // "other" case

        await expect(
            examService.updateExam("676fe0fcfba1b02df62d19a2", updates)
        ).rejects.toThrow("Loại bài kiểm tra không hợp lệ");
    });

    // -----------------------------------------------------
    // UC003 – valid examId, valid examType, but updatedExam = null → throw
    // -----------------------------------------------------
    test("UC003 - exam not found → throw not found error", async () => {
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(true);

        examService.Exam.findByIdAndUpdate.mockResolvedValue(null);

        const updates = { examType: "discussion" };

        await expect(
            examService.updateExam("676fe0fcfba1b02df62d19a2", updates)
        ).rejects.toThrow("Không tìm thấy bài kiểm tra để cập nhật");
    });

    // -----------------------------------------------------
    // UC004 – valid examId, valid examType, updatedExam not null → return updatedExam
    // -----------------------------------------------------
    test("UC004 - valid update → return updated exam", async () => {
        jest.spyOn(mongoose.Types.ObjectId, "isValid").mockReturnValue(true);

        const fakeUpdatedExam = {
            _id: "676fe0fcfba1b02df62d19a2",
            title: "Updated Title",
            examType: "exam",
        };

        examService.Exam.findByIdAndUpdate.mockResolvedValue(fakeUpdatedExam);

        const updates = {
            title: "Updated Title",
            examType: "exam"
        };

        const result = await examService.updateExam("676fe0fcfba1b02df62d19a2", updates);

        expect(result).toEqual(fakeUpdatedExam);

        expect(examService.Exam.findByIdAndUpdate).toHaveBeenCalledWith(
            "676fe0fcfba1b02df62d19a2",
            { $set: updates },
            { new: true, runValidators: true }
        );
    });
});
