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
            const prompt = `
                Bạn là một AI kiểm duyệt nội dung.
                Phân tích câu: "${content}"
                
                Nhiệm vụ:
                1. Tìm các từ ngữ tục tĩu, thô tục, chửi thề, lăng mạ, hoặc phân biệt vùng miền/chủng tộc.
                2. Chỉ lấy những từ được cho là 100% tục tĩu hoặc thô tục, không lấy những từ 50% tục như "cụ".
                3. Chỉ trả về JSON duy nhất.
                
                Format JSON:
                { 
                    "isBad": boolean, 
                    "badWords": ["từ1", "từ2"],
                    "severity": "medium" | "high" 
                }
            `;

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
                    console.log(`[SmartAI] Phát hiện vi phạm từ User ${userId}:`, result.badWords);

                    if (Array.isArray(result.badWords)) {
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