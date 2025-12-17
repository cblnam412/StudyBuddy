import { ManualQuestion, DocxImport, AIGeneratedQuestion} from "../strategies/Question.js";

export class ExamFacade {
    constructor(examService) {
        this.examService = examService;
        this.strategies = {
            'manual': new ManualQuestion(),
            'docx': new DocxImport(),
            'ai_generated': new AIGeneratedQuestion(),
        };
    }

    async addQuestionsToExam(examId, type, data) {
        const strategy = this.strategies[type];
        
        if (!strategy) {
            throw new Error(`Strategy '${type}' không được hỗ trợ.`);
        }
        await this.examService.getExamDetails(examId);
        return await strategy.add(examId, data);
    }

    async createExam(data) {
        const { event_id, examType, title, description, duration } = data;
        return await this.examService.createExam(event_id, examType, title, description, duration);
    }

    async getFullExam(examId) {
        return await this.examService.getExamWithQuestions(examId);
    }

    async getExams(query) {
        return await this.examService.getExams(query);
    }

    async updateExam(examId, data) {
        return await this.examService.updateExam(examId, data);
    }

    async deleteExam(examId) {
        return await this.examService.deleteExam(examId);
    }
    
    async publishExam(examId) {
        return await this.examService.publishExam(examId);
    }

    async updateQuestion(questionId, data) {
        return await this.examService.updateQuestion(questionId, data);
    }

    async deleteQuestion(questionId) {
        return await this.examService.deleteQuestion(questionId);
    }

    // ==================== STUDENT ANSWER METHODS ====================

    async submitExamAnswers(examId, userId, answers) {
        return await this.examService.submitExamAnswers(examId, userId, answers);
    }

    async getStudentAnswers(examId, userId) {
        return await this.examService.getStudentAnswers(examId, userId);
    }

    async getExamResults(examId) {
        return await this.examService.getExamResults(examId);
    }

    async getAnswerStatistics(examId) {
        return await this.examService.getAnswerStatistics(examId);
    }
}