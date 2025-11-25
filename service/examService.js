import mongoose from "mongoose";
import mammoth from 'mammoth';
import groq from '../config/groqClient.js';

export class ExamService {
    constructor(questionModel, examModel) {
        this.Question = questionModel;
        this.Exam = examModel;
    }

    async createExam(eventId, examType, title, description, duration) {
        if (!eventId || !examType || !title) {
            throw new Error("Thiếu thông tin cần thiết");
        }

        if (!['discussion', 'exam'].includes(examType)) {
            throw new Error("Loại bài kiểm tra không hợp lệ");
        }

        const dur = Number(duration);
        if (duration != null && (!Number.isFinite(dur) || dur <= 0)) {
            throw new Error("Thời gian làm bài không hợp lệ");
        }

        let newExam;

        try {
            newExam = await this.Exam.create({
                event_id: eventId,
                examType,
                title,
                description,
                duration,
                status: 'draft',
            });
        } catch (error) {
            throw error;
        }

        return newExam;
    }

    async getExamDetails(examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }
        const exam = await this.Exam.findById(examId);
        if (!exam) {
            throw new Error("Không tìm thấy bài kiểm tra");
        }
        return exam;
    }

    async getExams(query) {
        const mongoQuery = {};
        if (query.event_id) {
            mongoQuery.event_id = query.event_id;
        } 
        if (query.status) {
            mongoQuery.status = query.status;
        } 
        const exams = await this.Exam.find(mongoQuery).sort({ createdAt: -1 });
        return exams;
    }

    async getExamWithQuestions(examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const [exam, questions] = await Promise.all([
            this.Exam.findById(examId),
            this.Question.find({ exam_id: examId }).sort({ createdAt: 1 })
        ]);

        if (!exam) {
            throw new Error("Không tìm thấy bài kiểm tra");
        }

        return { ...exam.toObject(), questions };
    }

    async updateExam(examId, updates) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const allowedUpdates = ['title', 'description', 'duration', 'status', 'examType'];
        const finalUpdates = {};

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                finalUpdates[key] = updates[key];
            }
        });

        if (updates.examType && !['discussion', 'exam'].includes(updates.examType)) {
            throw new Error("Loại bài kiểm tra không hợp lệ");
        }

        const updatedExam = await this.Exam.findByIdAndUpdate(
            examId,
            { $set: finalUpdates },
            { new: true, runValidators: true }
        );

        if (!updatedExam) {
            throw new Error("Không tìm thấy bài kiểm tra để cập nhật");
        }

        return updatedExam;
    }

    async deleteExam(examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const [examResult, questionResult] = await Promise.all([
            this.Exam.findByIdAndDelete(examId),
            this.Question.deleteMany({ exam_id: examId })
        ]);

        if (!examResult) {
            throw new Error("Không tìm thấy bài kiểm tra để xóa");
        }

        return {
            examDeleted: examResult._id,
            questionsDeleted: questionResult.deletedCount,
        };
    }

    async publishExam(examId) {
        const count = await this.Question.countDocuments({ exam_id: examId });
        if (count === 0) {
            throw new Error("Không thể publish bài thi không có câu hỏi");
        }
        return this.updateExam(examId, { status: "published" });
    }

    async updateQuestion(questionId, updates) {
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            throw new Error("ID câu hỏi không hợp lệ");
        }

        const allowedUpdates = [
            "question_text",
            "options",
            "correct_answers",
            "points"
        ];

        const finalUpdates = {};
        for (const key of Object.keys(updates)) {
            if (allowedUpdates.includes(key)) {
                finalUpdates[key] = updates[key];
            }
        }

        if (updates.options && !Array.isArray(updates.options)) {
            throw new Error("Options phải là một array");
        }

        if (updates.points != null && (typeof updates.points !== "number" || updates.points < 0)) {
            throw new Error("Điểm phải là số >= 0");
        }

        const updatedQuestion = await this.Question.findByIdAndUpdate(
            questionId,
            { $set: finalUpdates },
            { new: true, runValidators: true }
        );

        if (!updatedQuestion) {
            throw new Error("Không tìm thấy câu hỏi để cập nhật");
        }

        return updatedQuestion;
    }

    async deleteQuestion(questionId) {
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            throw new Error("ID câu hỏi không hợp lệ");
        }

        const deleted = await this.Question.findByIdAndDelete(questionId);
        if (!deleted) {
            throw new Error("Không tìm thấy câu hỏi để xóa");
        }

        return deleted;
    }
}
