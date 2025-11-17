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
    deleteQuestion
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

router.patch('/:examId', updateExam);

router.delete('/:examId', deleteExam);

router.patch('/:examId/publish', publishExam);

router.post('/:examId/questions', addQuestion);

router.post(
    '/:examId/questions/upload',
    upload.single('file'), 
    addQuestionsFromDocx
);

router.patch('/questions/:questionId', updateQuestion);

router.delete('/questions/:questionId', deleteQuestion);


export default router;