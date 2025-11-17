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

        if (duration != null && (!Number.isFinite(duration) || duration <= 0)) {
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

    async addQuestion(examId, questionData) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const { question_text, options, correct_answers, points } = questionData;

        if (!question_text || !options) {
            throw new Error("Thiếu nội dung câu hỏi hoặc các lựa chọn");
        }

        const newQuestion = await this.Question.create({
            exam_id: examId,
            question_text,
            options,
            correct_answers,
            points,
        });

        return newQuestion;
    }

    async addQuestions(examId, file) {
        const exam = await this.getExamDetails(examId);

        const aiData = await this._extractQuiz(file);

        if (!Array.isArray(aiData) || aiData.length === 0) {
            throw new Error("AI không thể trích xuất bất kỳ câu hỏi nào từ file.");
        }

        const questionsToSave = aiData.map(aiQuestion => {
            const opts = aiQuestion.options;

            return {
                exam_id: examId,
                question_text: aiQuestion.question,
                options: [
                    opts.A || "",
                    opts.B || "",
                    opts.C || "",
                    opts.D || ""
                ],
                correct_answers: null,
                points: 1.0
            };
        });

        return await this.Question.insertMany(questionsToSave);
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

    async _extractQuiz(file) {
        if (!file) {
            throw new Error("Vui lòng upload một file.");
        }

        let fileContent = "";

        try {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            fileContent = result.value;
        } catch (err) {
            console.error("DOCX Error:", err);
            throw new Error("Không thể đọc nội dung file .docx.");
        }

        const prompt = `
            Bạn là AI chuyên trích xuất câu hỏi trắc nghiệm.
            Hãy trả về *mảng JSON* duy nhất theo format:

            [
              {
                "question": "...",
                "options": { "A": "...", "B": "...", "C": "...", "D": "..." }
              }
            ]

            Không thêm chữ nào ngoài JSON.

            ---- TEXT ----
            ${fileContent}
            ---- END ----
            `;

        let reply;

        try {
            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
            });

            reply = completion.choices[0].message.content;
        } catch (err) {
            console.error("Groq API Error:", err);
            throw new Error("Lỗi khi gọi Groq API.");
        }

        try {
            const cleaned = reply.replace(/```json|```/g, "").trim();
            return JSON.parse(cleaned);
        } catch (err) {
            console.error("JSON Parse Error:", err, "\nRAW:", reply);
            throw new Error("AI trả về JSON không hợp lệ.");
        }
    }
}
