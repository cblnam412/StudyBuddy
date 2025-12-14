import express from 'express';
import multer from 'multer';
import {
    createExam,
    getExam,
    updateExam,
    deleteExam,
    publishExam,
    addQuestion,
    addQuestionsFromDocx,
    updateQuestion,
    deleteQuestion,
    addAIGeneratedQuestions,
    getExams,
    submitExamAnswers,
    getStudentAnswers,
    getExamResults,
    getAnswerStatistics
} from '../controllers/examController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            cb(null, true);
        } else {
            cb(new Error("Chỉ chấp nhận file .docx"), false);
        }
    }
});

// Create exam (requires authentication)
router.post('/', verifyToken, createExam);

// Get all exams (must come before /:examId to avoid route collision)
router.get('/', getExams);

// Get single exam
router.get('/:examId', getExam);

// Update exam (requires authentication)
router.patch('/:examId', verifyToken, updateExam);

// Delete exam (requires authentication)
router.delete('/:examId', verifyToken, deleteExam);

// Publish exam (requires authentication)
router.patch('/:examId/publish', verifyToken, publishExam);

// Add question manually (requires authentication)
router.post('/:examId/questions', verifyToken, addQuestion);

// Upload questions from docx (requires authentication)
router.post(
    '/:examId/questions/upload',
    verifyToken,
    upload.single('file'), 
    addQuestionsFromDocx
);

// Generate questions with AI (requires authentication)
router.post('/:examId/questions/ai-generated', verifyToken, addAIGeneratedQuestions);

// Update question (requires authentication)
router.patch('/questions/:questionId', verifyToken, updateQuestion);

// Delete question (requires authentication)
router.delete('/questions/:questionId', verifyToken, deleteQuestion);

// Submit all answers for exam (1 request for entire exam) - requires authentication
router.post('/:examId/submit', verifyToken, submitExamAnswers);

// Get student's answers for an exam - requires authentication
router.get('/:examId/student-answers', verifyToken, getStudentAnswers);

// Get results for all students (teacher view) - requires authentication
router.get('/:examId/results', verifyToken, getExamResults);

// Get answer statistics for discussion exams - requires authentication
router.get('/:examId/statistics', verifyToken, getAnswerStatistics);

export default router;