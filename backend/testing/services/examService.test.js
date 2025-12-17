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

    test("UT001 - missing eventId → error 'Thiếu thông tin cần thiết'", async () => {
        await expect(
            examService.createExam(null, "discussion", "title", "desc", 1)
        ).rejects.toThrow("Thiếu thông tin cần thiết");
    });

    test("UT002 - missing examType → error 'Thiếu thông tin cần thiết'", async () => {
        await expect(
            examService.createExam(1, null, "title", "desc", 1)
        ).rejects.toThrow("Thiếu thông tin cần thiết");
    });

    test("UT003 - missing title → error 'Thiếu thông tin cần thiết'", async () => {
        await expect(
            examService.createExam(1, "discussion", null, "desc", 1)
        ).rejects.toThrow("Thiếu thông tin cần thiết");
    });

    test("UT0004 - examType other → error 'Loại bài kiểm tra không hợp lệ'", async () => {
        await expect(
            examService.createExam(1, "other", "title", "desc", 1)
        ).rejects.toThrow("Loại bài kiểm tra không hợp lệ");
    });

    test("UT005 - duration = null → return newExam", async () => {
        const fakeExam = { id: 123 };
        mockCreate.mockResolvedValue(fakeExam);

        const res = await examService.createExam(1, "exam", "title", "desc", null);

        expect(res).toEqual(fakeExam);
        expect(mockCreate).toHaveBeenCalled();
    });

    test("UT006 - duration = 'abc' → error 'Thời gian làm bài không hợp lệ'", async () => {
        await expect(
            examService.createExam(1, "exam", "title", "desc", "abc")
        ).rejects.toThrow("Thời gian làm bài không hợp lệ");
    });

    test("UT007 - duration = 0 → error 'Thời gian làm bài không hợp lệ'", async () => {
        await expect(
            examService.createExam(1, "discussion", "title", "desc", 0)
        ).rejects.toThrow("Thời gian làm bài không hợp lệ");
    });

    test("UT008 - duration = 1 → success return newExam", async () => {
        const fakeExam = { id: 456 };
        mockCreate.mockResolvedValue(fakeExam);

        const res = await examService.createExam(1, "exam", "title", "desc", 1);

        expect(mockCreate).toHaveBeenCalled();
        expect(res).toEqual(fakeExam);
    });

    test("UT009 - examType discussion valid → return newExam", async () => {
        const fakeExam = { id: 789 };
        mockCreate.mockResolvedValue(fakeExam);

        const res = await examService.createExam(1, "discussion", "title", "desc", 10);

        expect(res).toEqual(fakeExam);
    });
});

describe("EXAM002 - Test getExamDetails function", () => {
    let examService;

    beforeEach(() => {
        const ExamModelMock = {
            findById: jest.fn(),
        };

        examService = new ExamService();
        examService.Exam = ExamModelMock;
        jest.spyOn(mongoose.Types.ObjectId, "isValid");
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // UC001 — examId invalid
    test("UC001 - examId invalid → throw 'ID bài kiểm tra không hợp lệ'", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        const invalidId = "abc123";

        await expect(examService.getExamDetails(invalidId))
            .rejects
            .toThrow("ID bài kiểm tra không hợp lệ");
    });

    // UC002 — examId valid nhưng không tồn tại
    test("UC002 - examId valid nhưng không tồn tại → throw 'Không tìm thấy bài kiểm tra'", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        examService.Exam.findById.mockResolvedValue(null);

        const nonExistId = "676fe0fcfba1b02df62d19a2";

        await expect(examService.getExamDetails(nonExistId))
            .rejects
            .toThrow("Không tìm thấy bài kiểm tra");
    });

    // UC003 — examId valid và tồn tại
    test("UC003 - examId valid và tồn tại → return exam object", async () => {
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

        examService.ExamAnswer= {
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
        const fakeAnswerDelete = { deletedCount: 20 };

        examService.Exam.findByIdAndDelete.mockResolvedValue(fakeExam);
        examService.Question.deleteMany.mockResolvedValue(fakeQuestionDelete);
        examService.ExamAnswer.deleteMany.mockResolvedValue(fakeAnswerDelete);

        const result = await examService.deleteExam(validId);

        expect(result).toEqual({
            examDeleted: validId,
            questionsDeleted: 5,
            answersDeleted: 20
        });

        expect(examService.Exam.findByIdAndDelete)
            .toHaveBeenCalledWith(validId);

        expect(examService.Question.deleteMany)
            .toHaveBeenCalledWith({ exam_id: validId });

        expect(examService.ExamAnswer.deleteMany)
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
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });
   test("UT001 - count = 0 → throw error 'Không thể publish...'", async () => {
        const examId = "676fe0fcfba1b02df62d19a2"; // Valid ID
        examService.Question.countDocuments.mockResolvedValue(0);
        await expect(
            examService.publishExam(examId)
        ).rejects.toThrow("Không thể publish bài thi không có câu hỏi");

        expect(examService.Question.countDocuments)
            .toHaveBeenCalledWith({ exam_id: examId });

        expect(examService.updateExam).not.toHaveBeenCalled();
    });

  test("UT002  - count = 1 → call updateExam & return result", async () => {
        const examId = "676fe0fcfba1b02df62d19a2";

        examService.Question.countDocuments.mockResolvedValue(1);
        const fakeUpdatedExam = { _id: examId, status: "published" };
        examService.updateExam.mockResolvedValue(fakeUpdatedExam);

        const result = await examService.publishExam(examId);

        expect(result).toEqual(fakeUpdatedExam);
        expect(examService.updateExam)
            .toHaveBeenCalledWith(examId, { status: "published" });
    });
    test("UT003 count = 2 → call updateExam & return result", async () => {
        const examId = "676fe0fcfba1b02df62d19a2";

        examService.Question.countDocuments.mockResolvedValue(1);

        const fakeUpdatedExam = { _id: examId, status: "published" };
        examService.updateExam.mockResolvedValue(fakeUpdatedExam);
        const result = await examService.publishExam(examId);
        expect(result).toEqual(fakeUpdatedExam);
        expect(examService.updateExam)
            .toHaveBeenCalledWith(examId, { status: "published" });
    });

        test("UT004 - Invalid examId format -> throw error 'Invalid ID'", async () => {
             const invalidId = "id_sai_tum_lum";
             await expect(
                 examService.publishExam(invalidId)
             ).rejects.toThrow("ID bài kiểm tra không hợp lệ");
             expect(examService.Question.countDocuments).not.toHaveBeenCalled();
             expect(examService.updateExam).not.toHaveBeenCalled();
         });
       });

describe("EXAM008 - Test updateQuestion function", () => {

    let examService;

    beforeEach(() => {
        // Khởi tạo service (theo yêu cầu của bạn là function nằm trong ExamService)
        examService = new ExamService();

        // Mock model Question
        examService.Question = {
            findByIdAndUpdate: jest.fn(),
        };

        // Spy hàm isValid của mongoose
        jest.spyOn(mongoose.Types.ObjectId, "isValid");
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // -----------------------------------------------------
    // UTCID01 – questionId invalid → throw "ID câu hỏi không hợp lệ"
    // -----------------------------------------------------
    test("UTCID01 - invalid questionId → throw invalid ID error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(
            examService.updateQuestion("invalid_id", {})
        ).rejects.toThrow("ID câu hỏi không hợp lệ");

        expect(examService.Question.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UTCID02 – valid Id, updates.options not Array → throw "Options phải là một array"
    // -----------------------------------------------------
    test("UTCID02 - updates.options is not an array → throw options error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const updates = { options: "not_an_array" };
        const validId = "676fe0fcfba1b02df62d19a2";

        await expect(
            examService.updateQuestion(validId, updates)
        ).rejects.toThrow("Options phải là một array");

        expect(examService.Question.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UTCID03 – valid Id, updates.points is not number → throw "Điểm phải là số >= 0"
    // -----------------------------------------------------
    test("UTCID03 - updates.points is not a number → throw points error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const updates = { points: "invalid_string" };
        const validId = "676fe0fcfba1b02df62d19a2";

        await expect(
            examService.updateQuestion(validId, updates)
        ).rejects.toThrow("Điểm phải là số >= 0");

        expect(examService.Question.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UTCID04 – valid Id, updates.points < 0 → throw "Điểm phải là số >= 0"
    // -----------------------------------------------------
    test("UTCID04 - updates.points is negative (-1) → throw points error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const updates = { points: -1 };
        const validId = "676fe0fcfba1b02df62d19a2";

        await expect(
            examService.updateQuestion(validId, updates)
        ).rejects.toThrow("Điểm phải là số >= 0");

        expect(examService.Question.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UTCID05 – valid Id, points null, question not found → throw "Không tìm thấy câu hỏi..."
    // -----------------------------------------------------
    test("UTCID05 - updates.points null & question not found → throw not found error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        // Mock DB trả về null (không tìm thấy)
        examService.Question.findByIdAndUpdate.mockResolvedValue(null);

        const validId = "676fe0fcfba1b02df62d19a2";
        // Trong bảng thiết kế: points là null -> code sẽ bỏ qua check số học và gọi DB
        const updates = { points: null };

        await expect(
            examService.updateQuestion(validId, updates)
        ).rejects.toThrow("Không tìm thấy câu hỏi để cập nhật");

        expect(examService.Question.findByIdAndUpdate).toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UTCID06 – valid Id, points valid (0), question not found → throw "Không tìm thấy câu hỏi..."
    // -----------------------------------------------------
    test("UTCID06 - updates.points valid (0) & question not found → throw not found error", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        // Mock DB trả về null
        examService.Question.findByIdAndUpdate.mockResolvedValue(null);

        const validId = "676fe0fcfba1b02df62d19a2";
        const updates = { points: 0 };

        await expect(
            examService.updateQuestion(validId, updates)
        ).rejects.toThrow("Không tìm thấy câu hỏi để cập nhật");

        expect(examService.Question.findByIdAndUpdate).toHaveBeenCalled();
    });

    // -----------------------------------------------------
    // UTCID07 – valid Id, points valid (0), found → return updatedQuestion
    // -----------------------------------------------------
    test("UTCID07 - updates.points valid (0) & found → return updated question", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const validId = "676fe0fcfba1b02df62d19a2";
        const updates = { points: 0 };
        const mockUpdatedQuestion = { _id: validId, points: 0, question_text: "Updated" };

        // Mock DB trả về object
        examService.Question.findByIdAndUpdate.mockResolvedValue(mockUpdatedQuestion);

        const result = await examService.updateQuestion(validId, updates);

        expect(result).toEqual(mockUpdatedQuestion);

        // Kiểm tra logic filter key và gọi DB
        expect(examService.Question.findByIdAndUpdate).toHaveBeenCalledWith(
            validId,
            { $set: { points: 0 } },
            { new: true, runValidators: true }
        );
    });

    // -----------------------------------------------------
    // UTCID08 – valid Id, points null, found → return updatedQuestion
    // -----------------------------------------------------
    test("UTCID08 - updates.points null & found → return updated question", async () => {
        mongoose.Types.ObjectId.isValid.mockReturnValue(true);

        const validId = "676fe0fcfba1b02df62d19a2";
        // Theo bảng thiết kế cột UTCID08: options isArray, points null
        const updates = { points: null, options: ["A", "B"] };
        const mockUpdatedQuestion = { _id: validId, points: null, options: ["A", "B"] };

        examService.Question.findByIdAndUpdate.mockResolvedValue(mockUpdatedQuestion);

        const result = await examService.updateQuestion(validId, updates);

        expect(result).toEqual(mockUpdatedQuestion);

        // Kiểm tra DB được gọi chính xác với các trường đã filter
        expect(examService.Question.findByIdAndUpdate).toHaveBeenCalledWith(
            validId,
            { $set: { points: null, options: ["A", "B"] } },
            { new: true, runValidators: true }
        );
    });
});

 // EXAM009 - deleteQuestion
 describe("EXAM009 - Test deleteQuestion function", () => {
     let examService;

     beforeEach(() => {
         examService = new ExamService();

         // --- MOCK QUESTION MODEL ---
         examService.Question = {
             findByIdAndDelete: jest.fn(),
         };

         jest.spyOn(mongoose.Types.ObjectId, "isValid");
     });

     afterEach(() => {
         jest.restoreAllMocks();
         jest.clearAllMocks();
     });

     // UC001
     test("UC001 - should throw error when questionId is invalid", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(false);

         await expect(
             examService.deleteQuestion("abc123")
         ).rejects.toThrow("ID câu hỏi không hợp lệ");
         expect(examService.Question.findByIdAndDelete).not.toHaveBeenCalled();
     });

     // UC002
     test("UC002 - should throw error when question not found for delete", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         examService.Question.findByIdAndDelete.mockResolvedValue(null);

         await expect(
             examService.deleteQuestion("64d295715")
         ).rejects.toThrow("Không tìm thấy câu hỏi để xóa");

         expect(examService.Question.findByIdAndDelete)
             .toHaveBeenCalledWith("64d295715");
     });

     // UC003
     test("UC003 - should return deleted question object", async () => {
         mongoose.Types.ObjectId.isValid.mockReturnValue(true);

         const fakeDeleted = { _id: "64d295715", question: "Q1" };

         examService.Question.findByIdAndDelete.mockResolvedValue(fakeDeleted);

         const result = await examService.deleteQuestion("64d295715");

         expect(examService.Question.findByIdAndDelete)
             .toHaveBeenCalledWith("64d295715");
         expect(result).toEqual(fakeDeleted);
     });
 });

