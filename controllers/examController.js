import { ExamService } from '../service/examService.js';
import { ExamFacade } from '../facades/ExamFacade.js'; 
import { Exam, Question, ExamAnswer } from '../models/index.js';

const examService = new ExamService(Question, Exam, ExamAnswer);
const examFacade = new ExamFacade(examService);

export const createExam = async (req, res) => {
    try {
        const newExam = await examFacade.createExam(req.body);
        res.status(201).json(newExam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


export const getExam = async (req, res) => {
    try {
        const exam = await examFacade.getFullExam(req.params.examId);
        res.status(200).json(exam);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const updateExam = async (req, res) => {
    try {
        const updated = await examFacade.updateExam(req.params.examId, req.body);
        res.status(200).json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteExam = async (req, res) => {
    try {
        const result = await examFacade.deleteExam(req.params.examId);
        res.status(200).json({ message: "Xóa thành công", ...result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const publishExam = async (req, res) => {
    try {
        const result = await examFacade.publishExam(req.params.examId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const addQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const questionData = req.body;
        
        // Gọi Facade với type='manual'
        const newQuestion = await examFacade.addQuestionsToExam(examId, 'manual', questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const addQuestionsFromDocx = async (req, res) => {
    try {
        const { examId } = req.params;
        const file = req.file;
        
        if (!file) return res.status(400).json({ message: "Không có file nào được tải lên." });

        const savedQuestions = await examFacade.addQuestionsToExam(examId, 'docx', file);
        
        res.status(201).json({
            message: `Thêm thành công ${savedQuestions.length} câu hỏi.`,
            questions: savedQuestions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addAIGeneratedQuestions = async (req, res) => {
    try {
        const { examId } = req.params;
        const aiParams = req.body;
        const savedQuestions = await examFacade.addQuestionsToExam(examId, 'ai_generated', aiParams);
        res.status(201).json({
            message: `Thêm thành công ${savedQuestions.length} câu hỏi từ AI.`,
            questions: savedQuestions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
};

export const updateQuestion = async (req, res) => {
    try {
        const updated = await examFacade.updateQuestion(req.params.questionId, req.body);
        res.status(200).json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        const deleted = await examFacade.deleteQuestion(req.params.questionId);
        res.status(200).json({ message: "Xóa thành công", question: deleted });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getExams = async (req, res) => {
    try {
        const exams = await examFacade.getExams(req.query);
        res.status(200).json(exams);    
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ==================== STUDENT ANSWER ENDPOINTS ====================

export const submitExamAnswers = async (req, res) => {
    try {
        const { examId } = req.params;
        const { answers } = req.body;
        const userId = req.user?.id || req.body.userId;

        if (!userId) {
            return res.status(400).json({ message: "Thiếu user ID" });
        }

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Answers phải là một array" });
        }

        const result = await examService.submitExamAnswers(examId, userId, answers);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getStudentAnswers = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user?.id || req.query.userId;

        if (!userId) {
            return res.status(400).json({ message: "Thiếu user ID" });
        }

        const answers = await examService.getStudentAnswers(examId, userId);
        res.status(200).json(answers);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getExamResults = async (req, res) => {
    try {
        const { examId } = req.params;

        const results = await examService.getExamResults(examId);
        res.status(200).json(results);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAnswerStatistics = async (req, res) => {
    try {
        const { examId } = req.params;

        const statistics = await examService.getAnswerStatistics(examId);
        res.status(200).json(statistics);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};