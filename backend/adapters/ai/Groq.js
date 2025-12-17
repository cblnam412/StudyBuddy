import { BaseAI } from "./BaseAI";
import groq from "../../config/groq.js";

export class GroqAI extends BaseAI {
    constructor(model) {
        super();
        this.model = moldel;
    }

    async getAnswer(question) {
        try {
            const chatResponse = await groq.chat.completions.create({
                model: this.model,
                messages: [{ role: "user", content: question }],
            });
            return chatResponse.choices[0]?.message?.content || "AI không phản hồi";
        } catch (error) {
            console.error("Lỗi kết nối với AI", error);
            throw error;
        }
    }
}