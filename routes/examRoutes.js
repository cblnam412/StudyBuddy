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

router.post('/', createExam);

router.get('/:examId', getExam);

router.get('/', getExams);

router.patch('/:examId', updateExam);

router.delete('/:examId', deleteExam);

router.patch('/:examId/publish', publishExam);

router.post('/:examId/questions', addQuestion);

router.post(
    '/:examId/questions/upload',
    upload.single('file'), 
    addQuestionsFromDocx
);

router.post('/:examId/questions/ai-generated', addAIGeneratedQuestions);

router.patch('/questions/:questionId', updateQuestion);

router.delete('/questions/:questionId', deleteQuestion);

// ==================== STUDENT ANSWER ROUTES ====================

// Submit all answers for exam (1 request for entire exam)
router.post('/:examId/submit', submitExamAnswers);

// Get student's answers for an exam
router.get('/:examId/student-answers', getStudentAnswers);

// Get results for all students (teacher view)
router.get('/:examId/results', getExamResults);

// Get answer statistics for discussion exams
router.get('/:examId/statistics', getAnswerStatistics);

export default router;