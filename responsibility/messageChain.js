import { dictionary } from "../responsibility/badWordLoad.js";
import groq from "../config/groqClient.js";
import { Report } from "../models/index.js";
import mongoose from "mongoose";

class messageHandler {
    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }

    async handle(context, userId){
        if (this.nextHandler) {
            return await this.nextHandler.handle(context, userId);
        }
        return context;
    }
}

//Lọc từ ngữ không phù hợp
export class ProfanityFilter extends messageHandler {
    async handle(context, userId) {
        const words = context.message.split(/\s+/);

        for (const word of words) {
            if (dictionary.has(word)) {
                throw new Error("Tin nhắn chứa từ ngữ không phù hợp.");
            }
        }
        return await super.handle(context, userId);
    }
}

// Bộ lọc AI thông minh - tự học
export class SmartAI extends messageHandler {
    async handle(context, userId) {
        const content = context.message;
        console.log("[SmartAI] Chạy kiểm tra AI cho tin nhắn:", content);
        if (content) {
            this.runAICheckBackground(content, userId);
        }
        return await super.handle(content, userId);
    }

    async runAICheckBackground(content, userId, messageId = null) {
        try {
            const prompt = `Bạn là hệ thống AI kiểm duyệt nội dung chuyên nghiệp, chuyên phát hiện ngôn ngữ không phù hợp trong môi trường giáo dục.

NHIỆM VỤ: Phân tích nội dung tin nhắn và xác định xem có chứa ngôn ngữ không phù hợp hay không.

NỘI DUNG CẦN KIỂM TRA: "${content}"

TIÊU CHÍ ĐÁNH GIÁ (theo thứ tự ưu tiên):
1. TỪ NGỮ TỤC TĨU/THÔ TỤC: Từ ngữ liên quan đến bộ phận sinh dục, hành vi tình dục, chất thải cơ thể (ví dụ: lồn, cặc, địt, đụ, ỉa, đái...)
2. CHỬI THỀ/LĂNG MẠ: Từ ngữ xúc phạm, chửi rủa, mắng nhiếc (ví dụ: đồ ngu, thằng chó, con lợn...)
3. PHÂN BIỆT ĐỐI XỬ: Từ ngữ phân biệt vùng miền, chủng tộc, giới tính, tôn giáo, khuyết tật
4. BẠO LỰC: Đe dọa, kích động bạo lực, mô tả hành vi bạo lực chi tiết
5. NỘI DUNG NHẠY CẢM: Tự tử, ma túy, cờ bạc (nếu được đề cập một cách tiêu cực/kích động)

QUY TẮC PHÁT HIỆN:
- CHỈ đánh dấu là "isBad: true" nếu nội dung chứa từ ngữ RÕ RÀNG vi phạm (độ chắc chắn ≥ 90%)
- KHÔNG đánh dấu các từ có thể hiểu theo nhiều nghĩa (ví dụ: "cụ" có thể là kính ngữ hoặc từ tục)
- KHÔNG đánh dấu các từ thông thường được dùng trong ngữ cảnh giáo dục hợp lý
- Xem xét NGỮ CẢNH: cùng một từ có thể chấp nhận được trong ngữ cảnh này nhưng không phù hợp trong ngữ cảnh khác
- Phân biệt giữa sử dụng từ ngữ không phù hợp vs. thảo luận về từ ngữ không phù hợp (ví dụ: "từ X là không phù hợp" thì không vi phạm)

MỨC ĐỘ NGHIÊM TRỌNG:
- "high": Từ ngữ tục tĩu trực tiếp, đe dọa, phân biệt đối xử nghiêm trọng, nội dung bạo lực
- "medium": Chửi thề nhẹ, lăng mạ, từ ngữ không phù hợp nhưng không quá nghiêm trọng

FORMAT JSON (bắt buộc):
{
  "isBad": boolean,
  "badWords": ["từ1", "từ2", ...],
  "severity": "medium" | "high",
  "reason": "Lý do ngắn gọn (nếu isBad = true)"
}

QUAN TRỌNG:
- Nếu isBad = false, badWords phải là mảng rỗng []
- Nếu isBad = true, badWords phải chứa các từ cụ thể được phát hiện (chỉ lấy từ gốc, không lấy biến thể)
- Chỉ trả về JSON hợp lệ, không có markdown, không có giải thích thêm
- Phải sử dụng response_format: json_object để đảm bảo định dạng chính xác`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "openai/gpt-oss-20b",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const responseContent = chatCompletion.choices[0]?.message?.content;
            
            if (responseContent) {
                const result = JSON.parse(responseContent);

                if (result.isBad) {
                    console.log(`[SmartAI] Phát hiện vi phạm từ User ${userId}:`, {
                        badWords: result.badWords,
                        severity: result.severity,
                        reason: result.reason || "Không có lý do"
                    });

                    if (Array.isArray(result.badWords) && result.badWords.length > 0) {
                        result.badWords.forEach(word => dictionary.addWord(word));
                    }

                    await this.createAutoReport(messageId, content, result);
                }
            }
        } catch (error) {
            console.error("[SmartAI] Lỗi xử lý:", error.message);
        }
    }

    async createAutoReport(messageId, content, aiResult) {
        try {
            await Report.create({
                reporter_id: new mongoose.Types.ObjectId("68ff46c8beec46aca8902a13"), //ID hệ thống
                reported_item_id: messageId, 
                reported_item_type: "message", 
                report_type: "violated_content",
                content: content,
            });
        } catch (err) {
            console.error("[SmartAI] Lỗi khi tạo report:", err.message);
        }
    }
}