import { ExamService } from '../service/examService.js';
import { Exam, Question } from '../models/index.js';

const examService = new ExamService(Question, Exam);


export const createExam = async (req, res) => {
    try {
        const { event_id, examType, title, description, duration } = req.body;

        const newExam = await examService.createExam(
            event_id,
            examType,
            title,
            description,
            duration
        );

        res.status(201).json(newExam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


export const getExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const examWithQuestions = await examService.getExamWithQuestions(examId);
        res.status(200).json(examWithQuestions);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const updateExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const updates = req.body; // { title, description, duration, status, examType }

        const updatedExam = await examService.updateExam(examId, updates);
        res.status(200).json(updatedExam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteExam = async (req, res) => {
    try {
        const { examId } = req.params;

        const result = await examService.deleteExam(examId);
        res.status(200).json({ message: "Xóa bài kiểm tra thành công", ...result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const publishExam = async (req, res) => {
    try {
        const { examId } = req.params;

        const publishedExam = await examService.publishExam(examId);
        res.status(200).json(publishedExam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const addQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const questionData = req.body;

        const newQuestion = await examService.addQuestion(examId, questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const addQuestionsFromDocx = async (req, res) => {
    try {
        const { examId } = req.params;
        const file = req.file; 

        if (!file) {
            return res.status(400).json({ message: "Không có file nào được tải lên." });
        }

        const savedQuestions = await examService.addQuestions(examId, file);
        res.status(201).json({
            message: `Thêm thành công ${savedQuestions.length} câu hỏi.`,
            questions: savedQuestions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const updates = req.body; 

        const updatedQuestion = await examService.updateQuestion(questionId, updates);
        res.status(200).json(updatedQuestion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const deletedQuestion = await examService.deleteQuestion(questionId);
        res.status(200).json({ message: "Xóa câu hỏi thành công", question: deletedQuestion });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};