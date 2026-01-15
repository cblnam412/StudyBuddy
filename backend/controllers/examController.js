import { ExamService } from '../service/examService.js';
import { ExamFacade } from '../facades/ExamFacade.js'; 
import { Exam, Question, ExamAnswer, Event } from '../models/index.js';

const examService = new ExamService(Question, Exam, ExamAnswer, Event);
const examFacade = new ExamFacade(examService);

export const createExam = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { event_id, examType, title, description, duration } = req.body;
        
        if (!event_id || !examType || !title) {
            return res.status(400).json({ message: "Missing required fields: event_id, examType, title" });
        }
        
        const newExam = await examFacade.createExam(req.body);
        res.status(201).json(newExam);
    } catch (error) {
        console.error('Error creating exam:', error);
        res.status(400).json({ message: error.message });
    }
};


export const getExam = async (req, res) => {
    try {
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        const exam = await examFacade.getFullExam(examId);
        res.status(200).json(exam);
    } catch (error) {
        console.error('Error getting exam:', error);
        const statusCode = error.message.includes('không tìm thấy') || error.message.includes('không hợp lệ') ? 404 : 500;
        res.status(statusCode).json({ message: error.message });
    }
};

export const updateExam = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No update data provided" });
        }
        
        const updated = await examFacade.updateExam(examId, req.body);
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating exam:', error);
        res.status(400).json({ message: error.message });
    }
};

export const deleteExam = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        const result = await examFacade.deleteExam(examId);
        res.status(200).json({ message: "Xóa thành công", ...result });
    } catch (error) {
        console.error('Error deleting exam:', error);
        res.status(400).json({ message: error.message });
    }
};

export const publishExam = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        const result = await examFacade.publishExam(examId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error publishing exam:', error);
        res.status(400).json({ message: error.message });
    }
};

export const addQuestion = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        const questionData = req.body;
        
        if (!questionData || !questionData.question_text) {
            return res.status(400).json({ message: "Question data with question_text is required" });
        }
        
        // Gọi Facade với type='manual'
        const newQuestion = await examFacade.addQuestionsToExam(examId, 'manual', questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(400).json({ message: error.message });
    }
};

export const addQuestionsFromDocx = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        const file = req.file;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        if (!file) {
            return res.status(400).json({ message: "Không có file nào được tải lên." });
        }

        const savedQuestions = await examFacade.addQuestionsToExam(examId, 'docx', file);
        
        res.status(201).json({
            message: `Thêm thành công ${savedQuestions.length} câu hỏi.`,
            questions: savedQuestions
        });
    } catch (error) {
        console.error('Error adding questions from docx:', error);
        res.status(500).json({ message: error.message });
    }
};

export const addAIGeneratedQuestions = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        const aiParams = req.body;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        if (!aiParams || !aiParams.topic) {
            return res.status(400).json({ message: "Topic is required for AI generation" });
        }
        
        const savedQuestions = await examFacade.addQuestionsToExam(examId, 'ai_generated', aiParams);
        res.status(201).json({
            message: `Thêm thành công ${savedQuestions.length} câu hỏi từ AI.`,
            questions: savedQuestions
        });
    } catch (error) {
        console.error('Error generating AI questions:', error);
        res.status(500).json({ message: error.message });
    }   
};

export const updateQuestion = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { questionId } = req.params;
        
        if (!questionId) {
            return res.status(400).json({ message: "Question ID is required" });
        }
        
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No update data provided" });
        }
        
        const updated = await examFacade.updateQuestion(questionId, req.body);
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(400).json({ message: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { questionId } = req.params;
        
        if (!questionId) {
            return res.status(400).json({ message: "Question ID is required" });
        }
        
        const deleted = await examFacade.deleteQuestion(questionId);
        res.status(200).json({ message: "Xóa thành công", question: deleted });
    } catch (error) {
        console.error('Error deleting question:', error);
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

export const submitExamAnswers = async (req, res) => {
    try {
        const { examId } = req.params;
        const { answers } = req.body;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Answers phải là một array" });
        }
        
        if (answers.length === 0) {
            return res.status(400).json({ message: "Phải có ít nhất một câu trả lời" });
        }

        const result = await examService.submitExamAnswers(examId, userId, answers);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error submitting exam answers:', error);
        res.status(400).json({ message: error.message });
    }
};

export const getStudentAnswers = async (req, res) => {
    try {
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }
        
        // Use authenticated user ID from verifyToken middleware
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }

        const answers = await examService.getStudentAnswers(examId, userId);
        res.status(200).json(answers);
    } catch (error) {
        console.error('Error getting student answers:', error);
        res.status(400).json({ message: error.message });
    }
};

export const getExamResults = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }

        const results = await examService.getExamResults(examId);
        res.status(200).json(results);
    } catch (error) {
        console.error('Error getting exam results:', error);
        res.status(400).json({ message: error.message });
    }
};

export const getAnswerStatistics = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized - User not authenticated" });
        }
        
        const { examId } = req.params;
        
        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required" });
        }

        const statistics = await examService.getAnswerStatistics(examId);
        res.status(200).json(statistics);
    } catch (error) {
        console.error('Error getting answer statistics:', error);
        res.status(400).json({ message: error.message });
    }
};