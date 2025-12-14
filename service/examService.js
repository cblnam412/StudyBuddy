import mongoose from "mongoose";
import mammoth from 'mammoth';
import groq from '../config/groqClient.js';

export class ExamService {
    constructor(questionModel, examModel, examAnswerModel) {
        this.Question = questionModel;
        this.Exam = examModel;
        this.ExamAnswer = examAnswerModel;
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
        if (!examId) {
            throw new Error("ID bài kiểm tra là bắt buộc");
        }
        
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
        if (!examId) {
            throw new Error("ID bài kiểm tra là bắt buộc");
        }
        
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const [examResult, questionResult, answerResult] = await Promise.all([
            this.Exam.findByIdAndDelete(examId),
            this.Question.deleteMany({ exam_id: examId }),
            this.ExamAnswer.deleteMany({ exam_id: examId })
        ]);

        if (!examResult) {
            throw new Error("Không tìm thấy bài kiểm tra để xóa");
        }

        return {
            examDeleted: examResult._id,
            questionsDeleted: questionResult.deletedCount,
            answersDeleted: answerResult.deletedCount,
        };
    }

    async publishExam(examId) {
        if (!examId) {
            throw new Error("ID bài kiểm tra là bắt buộc");
        }
        
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }
        
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


    async submitExamAnswers(examId, userId, answers) {
        if (!mongoose.Types.ObjectId.isValid(examId) || 
            !mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("ID không hợp lệ");
        }

        if (!Array.isArray(answers) || answers.length === 0) {
            throw new Error("Vui lòng trả lời ít nhất 1 câu hỏi");
        }

        const exam = await this.Exam.findById(examId);
        if (!exam) {
            throw new Error("Không tìm thấy bài kiểm tra");
        }

        const questions = await this.Question.find({ exam_id: examId });
        const questionMap = {};
        questions.forEach(q => {
            questionMap[q._id.toString()] = q;
        });

        await this.ExamAnswer.deleteMany({
            exam_id: examId,
            user_id: userId
        });

        const savedAnswers = [];

        for (const answer of answers) {
            if (!answer.questionId || !answer.selectedAnswer) {
                continue;
            }

            if (!mongoose.Types.ObjectId.isValid(answer.questionId)) {
                throw new Error(`ID câu hỏi không hợp lệ: ${answer.questionId}`);
            }

            const question = questionMap[answer.questionId];
            if (!question) {
                throw new Error(`Không tìm thấy câu hỏi: ${answer.questionId}`);
            }

            if (!question.options.includes(answer.selectedAnswer)) {
                throw new Error(`Đáp án không hợp lệ cho câu ${question.question_text}`);
            }

            let isCorrect = false;
            let pointsEarned = 0;

            if (exam.examType === 'exam') {
                isCorrect = question.correct_answers && question.correct_answers.includes(answer.selectedAnswer);
                pointsEarned = isCorrect ? question.points : 0;
            }

            const examAnswer = await this.ExamAnswer.create({
                exam_id: examId,
                question_id: answer.questionId,
                user_id: userId,
                selected_answer: answer.selectedAnswer,
                is_correct: isCorrect,
                points_earned: pointsEarned
            });

            savedAnswers.push(examAnswer);
        }

        let result = {};

        if (exam.examType === 'exam') {
            const totalPoints = savedAnswers.reduce((sum, answer) => sum + answer.points_earned, 0);
            const totalQuestions = questions.length;
            const correctCount = savedAnswers.filter(a => a.is_correct).length;

            result = {
                examId,
                userId,
                examType: 'exam',
                totalQuestions,
                answeredCount: savedAnswers.length,
                correctCount,
                totalPoints,
                answers: savedAnswers
            };
        } else if (exam.examType === 'discussion') {

            const statistics = await this.getAnswerStatistics(examId);

            result = {
                examId,
                userId,
                examType: 'discussion',
                answeredCount: savedAnswers.length,
                userAnswers: savedAnswers,
                statistics
            };
        }

        return result;
    }

    async getStudentAnswers(examId, userId) {
        if (!mongoose.Types.ObjectId.isValid(examId) || 
            !mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("ID không hợp lệ");
        }

        const answers = await this.ExamAnswer.find({
            exam_id: examId,
            user_id: userId
        }).sort({ createdAt: 1 });

        return answers;
    }

    async getAnswerStatistics(examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const questions = await this.Question.find({ exam_id: examId }).sort({ createdAt: 1 });
        const statistics = [];

        for (const question of questions) {
            const answers = await this.ExamAnswer.find({
                question_id: question._id
            });

            const answerCount = {};
            
            if (question.options) {
                question.options.forEach(option => {
                    answerCount[option] = 0;
                });
            }

            answers.forEach(answer => {
                if (answerCount.hasOwnProperty(answer.selected_answer)) {
                    answerCount[answer.selected_answer]++;
                }
            });

            statistics.push({
                questionId: question._id,
                questionText: question.question_text,
                options: question.options,
                answerCount,
                totalAnswers: answers.length
            });
        }

        return statistics;
    }

    async getExamResults(examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
            throw new Error("ID bài kiểm tra không hợp lệ");
        }

        const exam = await this.Exam.findById(examId);
        if (!exam) {
            throw new Error("Không tìm thấy bài kiểm tra");
        }

        const allAnswers = await this.ExamAnswer.find({ exam_id: examId })
            .populate('user_id', 'full_name email')
            .sort({ user_id: 1, createdAt: 1 });

        if (exam.examType === 'exam') {
            const userResults = {};

            allAnswers.forEach(answer => {
                const userId = answer.user_id._id.toString();
                if (!userResults[userId]) {
                    userResults[userId] = {
                        userId: answer.user_id._id,
                        userName: answer.user_id.name,
                        userEmail: answer.user_id.email,
                        totalPoints: 0,
                        correctCount: 0,
                        totalAnswered: 0,
                        answers: []
                    };
                }
                userResults[userId].totalPoints += answer.points_earned;
                if (answer.is_correct) userResults[userId].correctCount++;
                userResults[userId].totalAnswered++;
                userResults[userId].answers.push(answer);
            });

            return {
                examId,
                examType: 'exam',
                results: Object.values(userResults)
            };
        } else if (exam.examType === 'discussion') {
            const statistics = await this.getAnswerStatistics(examId);
            return {
                examId,
                examType: 'discussion',
                statistics
            };
        }
    }
}
