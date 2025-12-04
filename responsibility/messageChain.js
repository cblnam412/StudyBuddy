import { dictionary } from "../responsibility/badWordLoad.js";

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
        //AI chạy ngầm, không await để không làm chậm luồng chính
        this.runAICheckBackground(context);
        return await super.handle(context, userId);
    }

    async runAICheckBackground(context) {
        //TODO: kết nối với grop rồi gửi promt yêu cầu AI trả về JSON format: { "isBad": true, "badWords": ["từ1", "từ2"] }
        //TODO: nếu isBad true thì lưu từ vào badWordLoad.js bằng dictionary.addWord(word)
        //TODO: log lại hành vi gửi tin nhắn xấu của userId để phục vụ việc ban sau này
        //Lưu ý: không ném lỗi ở đây vì chạy ngầm
    }
}