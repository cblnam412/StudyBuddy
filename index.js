import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import Groq from 'groq-sdk';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Khởi tạo Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// ================================
// API endpoint: /api/chat
// ================================
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Vui lòng gửi 'prompt'." });
        }

        const completion = await groq.chat.completions.create({
            model: "groq/compound-mini", // model mạnh nhất miễn phí
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
        });

        // Lấy nội dung trả lời
        const reply = completion.choices[0].message.content;

        res.json({ response: reply });

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        res.status(500).json({ error: "Lỗi khi gọi Groq API." });
    }
});

// ================================
// RUN SERVER
// ================================
app.listen(port, () => {
    console.log(`Server chạy tại http://localhost:${port}`);
    console.log("Test API POST /api/chat");
});
