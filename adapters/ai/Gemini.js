import { BaseAI } from "./BaseAI";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiAI extends BaseAI {
    constructor(model) {
        super();
        this.model = model;
    }

    async getAnswer(question) {
        try {
            const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const response = await client.chat.completions.create({
                model: this.model,
                messages: [{ role: "user", content: question }],
            });
            return response.choices[0]?.message?.content || "AI không phản hồi";
        } catch (error) {
            console.error("Lỗi kết nối với AI", error);
            throw error;
        }
    }
}