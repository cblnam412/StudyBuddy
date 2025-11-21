import groq from "../config/groqClient.js";

export default {
    name: "ai",
    description: "Hỏi AI thông minh",
    usage: "/ai [câu hỏi]",
    role: "member",

    async execute(socket, args, io, roomId) {
        if (args.length === 0) {
            socket.emit("room:system_message", { message: "Vui lòng nhập câu hỏi. Ví dụ: /ai Xin chào" });
            return;
        }

        const question = `Bạn là một trợ lý thông minh. Hãy trả lời câu hỏi sau ngắn gọn, súc tích và dễ hiểu: ${args.join(" ")} Trả lời chỉ trong 1-2 câu, tập trung vào trọng tâm.`;
        const promt = args.join(" ");

        socket.emit("room:system_message", { message: "AI đang suy nghĩ..." });

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: question,
                    },
                ],
                model: "openai/gpt-oss-20b",
            });

            const answer = chatCompletion.choices[0]?.message?.content || "AI không phản hồi.";

            io.to(roomId).emit("room:system_message", {
                user: "AI Bot",
                message: `**Q:** ${promt}\n**A:** ${answer}`
            });
        } catch (error) {
            console.error("Lỗi AI:", error);
            socket.emit("room:error", { message: "Lỗi khi kết nối với AI." });
        }
    }
};