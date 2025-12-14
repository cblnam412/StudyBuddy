import mammoth from 'mammoth';
import groq from '../config/groqClient.js';
import { Question } from '../models/index.js';

class IQuestion {
    async add(examId, data) { throw new Error("Method not implemented"); }
}

//Thêm thủ công
export class ManualQuestion extends IQuestion {
    async add(examId, data) {
        const { question_text, options, correct_answers, points } = data;

        if (!question_text || !options) {
            throw new Error("Thiếu nội dung câu hỏi hoặc các lựa chọn");
        }
        if (!Array.isArray(options) || options.length < 2) {
            throw new Error("Câu hỏi phải có ít nhất 2 lựa chọn");
        }
        const validOptions = options.filter(opt => opt && opt.trim() !== "");
        if (validOptions.length < 2) {
            throw new Error("Câu hỏi phải có ít nhất 2 lựa chọn không rỗng");
        }

        let validatedCorrectAnswers = [];
        if (correct_answers && Array.isArray(correct_answers)) {
            validatedCorrectAnswers = correct_answers.filter(answer => 
                validOptions.includes(answer)
            );
            if (correct_answers.length > 0 && validatedCorrectAnswers.length === 0) {
                throw new Error(`Đáp án đúng phải nằm trong các lựa chọn`);
            }
        }

        const validatedPoints = points && typeof points === 'number' && points >= 0 ? points : 1.0;

        return await Question.create({
            exam_id: examId,
            question_text: question_text.trim(),
            options: validOptions,
            correct_answers: validatedCorrectAnswers.length > 0 ? validatedCorrectAnswers : null,
            points: validatedPoints,
        });
    }
}

export class AIGeneratedQuestion extends IQuestion {
    async add(examId, data) {
        const { topic, quantity, difficulty } = data;

        const prompt = `
            Bạn là AI chuyên tạo câu hỏi trắc nghiệm.
            Hãy tạo ${quantity} câu hỏi về chủ đề "${topic}" với độ khó "${difficulty}".
            Trả về *mảng JSON* duy nhất theo format:
            [
              { "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "correct_answer": "A" }
            ]
            Nếu không có yêu cầu ở chủ đề, mặc định trả về JSON tiếng Việt. Không thêm chữ nào ngoài JSON.
        `;
        let reply;
        try {
            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });
            reply = completion.choices[0].message.content;
        } catch (err) {
            //console.error("Groq API Error:", err);
            throw new Error("Lỗi khi gọi Groq API.");
        }
        let aiData;
        try {
            const cleaned = reply.replace(/```json|```/g, "").trim();
            aiData = JSON.parse(cleaned);
        } catch (err) {
            //console.error("JSON Parse Error:", err, "\nRAW:", reply);
            throw new Error("AI trả về JSON không hợp lệ.");
        }
        const questionsToSave = aiData.map(aiQuestion => {
            const opts = aiQuestion.options;
            const optionsArray = [opts.A || "", opts.B || "", opts.C || "", opts.D || ""];
            const correctAnswerLetter = aiQuestion.correct_answer;
            const correctAnswerIndex = correctAnswerLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            const correctAnswerText = optionsArray[correctAnswerIndex];
            return {
                exam_id: examId,
                question_text: aiQuestion.question, 
                options: optionsArray,
                correct_answers: correctAnswerText ? [correctAnswerText] : null,
                points: difficulty === 'hard' ? 3.0 : (difficulty === 'medium' ? 2.0 : 1.0)
            };
        });
        return await Question.insertMany(questionsToSave);
    }
}

// Dùng AI thêm câu hỏi từ file .docx
export class DocxImport extends IQuestion {
    async add(examId, file) {
        if (!file) throw new Error("Vui lòng upload một file.");

        const aiData = await this._extractQuiz(file);

        if (!Array.isArray(aiData) || aiData.length === 0) {
            throw new Error("AI không thể trích xuất bất kỳ câu hỏi nào từ file.");
        }

        const questionsToSave = aiData.map(aiQuestion => {
            const opts = aiQuestion.options;
            return {
                exam_id: examId,
                question_text: aiQuestion.question,
                options: [opts.A || "", opts.B || "", opts.C || "", opts.D || ""],
                correct_answers: null,
                points: 1.0
            };
        });

        return await Question.insertMany(questionsToSave);
    }

    async _extractQuiz(file) {
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
                model: "openai/gpt-oss-20b",
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