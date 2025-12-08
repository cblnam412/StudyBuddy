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

describe("EXAM006 - Test deleteExam function", () => {

    let examService;

    beforeEach(() => {
        examService = new ExamService();

        examService.Exam = {
            findByIdAndDelete: jest.fn(),
        };

        examService.Question = {
            deleteMany: jest.fn(),
        };

        jest.spyOn(mongoose.Types.ObjectId, "isValid");
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // -----------------------------------------------------
    // UC001 – examId invalid → throw "ID bài kiểm tra không hợp lệ"
    // -----------------------------------------------------
    test("UC001 - invalid examId → throw invalid ID error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(
            examService.deleteExam("abc")
        ).rejects.toThrow("ID bài kiểm tra không hợp lệ");

        expect(examService.Exam.findByIdAndDelete).not.toHaveBeenCalled();
        expect(examService.Question.deleteMany).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UC002 – examId valid but exam not found → throw "Không tìm thấy bài kiểm tra để xóa"
    // -----------------------------------------------------
    test("UC002 - valid examId but exam not exist → throw not found error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        examService.Exam.findByIdAndDelete.mockResolvedValue(null);
        examService.Question.deleteMany.mockResolvedValue({ deletedCount: 0 });

        const validId = "676fe0fcfba1b02df62d19a2";

        await expect(
            examService.deleteExam(validId)
        ).rejects.toThrow("Không tìm thấy bài kiểm tra để xóa");

        expect(examService.Exam.findByIdAndDelete).toHaveBeenCalledWith(validId);
        expect(examService.Question.deleteMany).toHaveBeenCalledWith({ exam_id: validId });
    });

    // -----------------------------------------------------
    // UC003 – valid examId + exam deleted → return { examDeleted, questionsDeleted }
    // -----------------------------------------------------
    test("UC003 - valid examId & exist → return deletion result", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const validId = "676fe0fcfba1b02df62d19a2";

        const fakeExam = { _id: validId };
        const fakeQuestionDelete = { deletedCount: 5 };

        examService.Exam.findByIdAndDelete.mockResolvedValue(fakeExam);
        examService.Question.deleteMany.mockResolvedValue(fakeQuestionDelete);

        const result = await examService.deleteExam(validId);

        expect(result).toEqual({
            examDeleted: validId,
            questionsDeleted: 5,
        });

        expect(examService.Exam.findByIdAndDelete)
            .toHaveBeenCalledWith(validId);

        expect(examService.Question.deleteMany)
            .toHaveBeenCalledWith({ exam_id: validId });
    });
});

describe("EXAM007 - Test publishExam function", () => {
    let examService;

    beforeEach(() => {
        examService = new ExamService();

        examService.Question = {
            countDocuments: jest.fn(),
        };

        examService.updateExam = jest.fn();

        jest.spyOn(mongoose.Types.ObjectId, "isValid");
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // -----------------------------------------------------
    // UT001 – count = 0 → throw lỗi "Không thể publish bài thi không có câu hỏi"
    // -----------------------------------------------------
    test("UT001 - count = 0 → throw error no question", async () => {
        const examId = "676fe0fcfba1b02df62d19a2";

        examService.Question.countDocuments.mockResolvedValue(0);

        await expect(
            examService.publishExam(examId)
        ).rejects.toThrow("Không thể publish bài thi không có câu hỏi");

        expect(examService.Question.countDocuments)
            .toHaveBeenCalledWith({ exam_id: examId });

        expect(examService.updateExam).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UT002 – count >= 1 → gọi updateExam & return updatedExam
    // -----------------------------------------------------
    test("UT002 - count >= 1 → update exam status to published", async () => {
        const examId = "676fe0fcfba1b02df62d19a2";

        examService.Question.countDocuments.mockResolvedValue(1);

        const fakeUpdatedExam = { id: examId, status: "published" };
        examService.updateExam.mockResolvedValue(fakeUpdatedExam);

        const result = await examService.publishExam(examId);

        expect(result).toEqual(fakeUpdatedExam);

        expect(examService.Question.countDocuments)
            .toHaveBeenCalledWith({ exam_id: examId });

        expect(examService.updateExam)
            .toHaveBeenCalledWith(examId, { status: "published" });
    });
});

describe("EXAM008 - Test updateQuestion function", () => {
     let examService;

     beforeEach(() => {
         const mockQuestionModel = {
             findByIdAndUpdate: jest.fn(),
         };

         examService = new ExamService(mockQuestionModel, null);

         jest.spyOn(mongoose.Types.ObjectId, "isValid");
     });

     afterEach(() => {
         jest.restoreAllMocks();
         jest.clearAllMocks();
     });

     // =====================================================
     // UT001 – questionId invalid → Throw error
     // =====================================================
     test("UT001 - questionId invalid → throw 'ID câu hỏi không hợp lệ'", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(false);

         await expect(
             examService.updateQuestion("invalidId", {})
         ).rejects.toThrow("ID câu hỏi không hợp lệ");
     });

     // =====================================================
     // UT002 – updates.options NOT array → Throw error
     // =====================================================
     test("UT002 - options isNotArray → throw 'Options phải là một array'", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         await expect(
             examService.updateQuestion("676fe0fcfba1b02df62d19a2", { options: "wrong" })
         ).rejects.toThrow("Options phải là một array");
     });

     // =====================================================
     // UT003 – updates.points isNotNumber → Throw error
     // =====================================================
     test("UT003 - points isNotNumber → throw 'Điểm phải là số >= 0'", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         await expect(
             examService.updateQuestion("676fe0fcfba1b02df62d19a2", { points: "abc" })
         ).rejects.toThrow("Điểm phải là số >= 0");
     });

     // =====================================================
     // UT004 – updates.points = -1 → Throw error
     // =====================================================
     test("UT004 - points = -1 → throw 'Điểm phải là số >= 0'", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         await expect(
             examService.updateQuestion("676fe0fcfba1b02df62d19a2", { points: -1 })
         ).rejects.toThrow("Điểm phải là số >= 0");
     });

     // =====================================================
     // UT005 – updatedQuestion = null → Throw error
     // =====================================================
     test("UT005 - updatedQuestion null → throw 'Không tìm thấy câu hỏi để cập nhật'", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         examService.Question.findByIdAndUpdate.mockResolvedValue(null);

         await expect(
             examService.updateQuestion("676fe0fcfba1b02df62d19a2", { points: 1 })
         ).rejects.toThrow("Không tìm thấy câu hỏi để cập nhật");
     });

     // =====================================================
     // UT006 – updates.options isArray + valid points + updatedQuestion OK
     // =====================================================
     test("UT006 - options isArray & valid → return updatedQuestion", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         const updated = { id: "676fe0fcfba1b02df62d19a2", points: 1, options: [] };
         examService.Question.findByIdAndUpdate.mockResolvedValue(updated);

         const result = await examService.updateQuestion(
             "676fe0fcfba1b02df62d19a2",
             { options: [], points: 1 }
         );

         expect(result).toEqual(updated);
         expect(examService.Question.findByIdAndUpdate).toHaveBeenCalledWith(
             "676fe0fcfba1b02df62d19a2",
             { $set: { options: [], points: 1 } },
             { new: true, runValidators: true }
         );
     });

     // =====================================================
     // UT007 – updates.points = 0 → valid return
     // =====================================================
     test("UT007 - points = 0 → valid update", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         const updated = { id: "676fe0fcfba1b02df62d19a2", points: 0 };
         examService.Question.findByIdAndUpdate.mockResolvedValue(updated);

         const result = await examService.updateQuestion(
             "676fe0fcfba1b02df62d19a2",
             { points: 0 }
         );

         expect(result).toEqual(updated);
     });

     // =====================================================
     // UT008 – updates.points = 1 → valid return
     // =====================================================
     test("UT008 - points = 1 → valid update", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         const updated = { id: "676fe0fcfba1b02df62d19a2", points: 1 };
         examService.Question.findByIdAndUpdate.mockResolvedValue(updated);

         const result = await examService.updateQuestion(
             "676fe0fcfba1b02df62d19a2",
             { points: 1 }
         );

         expect(result).toEqual(updated);
     });
 });
