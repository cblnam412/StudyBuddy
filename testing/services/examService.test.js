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
