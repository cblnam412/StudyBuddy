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
            const validAnswerLetters = validOptions.map((_, index) => 
                String.fromCharCode(65 + index)
            );
            validatedCorrectAnswers = correct_answers.filter(answer => 
                validAnswerLetters.includes(answer.toUpperCase())
            );
            if (correct_answers.length > 0 && validatedCorrectAnswers.length === 0) {
                throw new Error(`Đáp án đúng phải nằm trong phạm vi: ${validAnswerLetters.join(', ')}`);
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

        const difficultyGuidelines = {
            'easy': 'Câu hỏi dễ: kiến thức cơ bản, nhớ lại thông tin, định nghĩa đơn giản. Đáp án rõ ràng, không đánh đố.',
            'medium': 'Câu hỏi trung bình: yêu cầu hiểu và áp dụng kiến thức, so sánh, phân tích cơ bản. Có thể có 1-2 đáp án gây nhiễu hợp lý.',
            'hard': 'Câu hỏi khó: yêu cầu phân tích sâu, tổng hợp, đánh giá, tư duy phản biện. Các đáp án đều có vẻ hợp lý, cần suy luận kỹ để chọn đúng.'
        };

        const prompt = `Bạn là chuyên gia giáo dục chuyên tạo câu hỏi trắc nghiệm chất lượng cao.

NHIỆM VỤ: Tạo chính xác ${quantity} câu hỏi trắc nghiệm về chủ đề "${topic}" với độ khó "${difficulty}".

YÊU CẦU CHẤT LƯỢNG:
1. Câu hỏi phải rõ ràng, không mơ hồ, dễ hiểu
2. Mỗi câu hỏi phải có đúng 4 lựa chọn (A, B, C, D)
3. Chỉ có 1 đáp án đúng duy nhất
4. Các đáp án sai phải hợp lý, không quá dễ nhận biết
5. ${difficultyGuidelines[difficulty] || difficultyGuidelines['medium']}
6. Câu hỏi phải liên quan trực tiếp đến chủ đề "${topic}"
7. Tránh câu hỏi quá dài hoặc phức tạp không cần thiết

FORMAT JSON (bắt buộc - phải là object chứa mảng):
{
  "questions": [
    {
      "question": "Nội dung câu hỏi rõ ràng, đầy đủ",
      "options": {
        "A": "Lựa chọn A (phải có nội dung)",
        "B": "Lựa chọn B (phải có nội dung)",
        "C": "Lựa chọn C (phải có nội dung)",
        "D": "Lựa chọn D (phải có nội dung)"
      },
      "correct_answer": "A"
    }
  ]
}

QUAN TRỌNG:
- Trả về JSON OBJECT với key "questions" chứa mảng các câu hỏi
- Không có markdown, không có giải thích
- Tất cả câu hỏi phải bằng tiếng Việt
- Đảm bảo mỗi câu hỏi đều có đủ 4 lựa chọn A, B, C, D
- correct_answer phải là một trong: "A", "B", "C", hoặc "D"
- Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác`;
        let reply;
        try {
            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                response_format: { type: "json_object" }
            });
            reply = completion.choices[0].message.content;
        } catch (err) {
            //console.error("Groq API Error:", err);
            throw new Error("Lỗi khi gọi Groq API.");
        }
        let aiData;
        try {
            // Parse JSON and extract questions array
            const cleaned = reply.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            // Extract questions from object or use array directly
            aiData = parsed.questions || (Array.isArray(parsed) ? parsed : []);
        } catch (err) {
            //console.error("JSON Parse Error:", err, "\nRAW:", reply);
            throw new Error("AI trả về JSON không hợp lệ.");
        }
        const questionsToSave = aiData.map(aiQuestion => {
            const opts = aiQuestion.options;
            return {
                exam_id: examId,
                question_text: aiQuestion.question, 
                options: [opts.A || "", opts.B || "", opts.C || "", opts.D || ""],
                correct_answers: [aiQuestion.correct_answer],
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

        const prompt = `Bạn là chuyên gia trích xuất và chuẩn hóa câu hỏi trắc nghiệm từ tài liệu.

NHIỆM VỤ: Phân tích văn bản dưới đây và trích xuất TẤT CẢ các câu hỏi trắc nghiệm có trong đó.

QUY TẮC TRÍCH XUẤT:
1. Chỉ trích xuất câu hỏi có đầy đủ: câu hỏi + ít nhất 2 lựa chọn trả lời
2. Bỏ qua câu hỏi tự luận, câu hỏi không có đáp án, hoặc câu hỏi không rõ ràng
3. Nếu câu hỏi có hơn 4 lựa chọn, chỉ lấy 4 lựa chọn đầu tiên
4. Nếu câu hỏi có ít hơn 4 lựa chọn, thêm các lựa chọn trống ("") cho đến đủ 4
5. Chuẩn hóa định dạng: loại bỏ số thứ tự, ký hiệu đặc biệt không cần thiết
6. Giữ nguyên nội dung gốc, chỉ làm sạch định dạng
7. Nếu không tìm thấy câu hỏi nào, trả về mảng rỗng []

XỬ LÝ ĐỊNH DẠNG:
- Nhận diện các ký hiệu lựa chọn: A), B), C), D) hoặc a), b), c), d) hoặc 1), 2), 3), 4) hoặc •, -, *
- Nhận diện câu hỏi: số thứ tự (1., 2., ...) hoặc chữ số (Câu 1, Câu 2, ...)
- Loại bỏ: số trang, header/footer, ghi chú không liên quan

FORMAT JSON (bắt buộc - phải là object chứa mảng):
{
  "questions": [
    {
      "question": "Nội dung câu hỏi đã được làm sạch (không có số thứ tự, ký hiệu)",
      "options": {
        "A": "Nội dung lựa chọn A (hoặc rỗng nếu không có)",
        "B": "Nội dung lựa chọn B (hoặc rỗng nếu không có)",
        "C": "Nội dung lựa chọn C (hoặc rỗng nếu không có)",
        "D": "Nội dung lựa chọn D (hoặc rỗng nếu không có)"
      }
    }
  ]
}

QUAN TRỌNG:
- Trả về JSON OBJECT với key "questions" chứa mảng các câu hỏi
- Không có markdown code blocks, không thêm giải thích, bình luận
- Nếu văn bản không chứa câu hỏi trắc nghiệm, trả về: { "questions": [] }
- Đảm bảo mỗi object trong mảng đều có đầy đủ trường "question" và "options"

---- NỘI DUNG VĂN BẢN ----
${fileContent}
---- KẾT THÚC VĂN BẢN ----`;

        let reply;
        try {
            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            });
            reply = completion.choices[0].message.content;
        } catch (err) {
            console.error("Groq API Error:", err);
            throw new Error("Lỗi khi gọi Groq API.");
        }

        try {
            // Parse JSON and extract questions array
            const cleaned = reply.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            // Extract questions from object or use array directly
            const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
            return questions;
        } catch (err) {
            console.error("JSON Parse Error:", err, "\nRAW:", reply);
            throw new Error("AI trả về JSON không hợp lệ.");
        }
    }
}