import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export default {
    name: "help",
    description: "Xem danh sách lệnh.",
    role: "member",

    async execute(socket, args, io, roomId) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));

        let helpText = "**Danh sách lệnh:**\n";

        const commands = files.map(f => `/${f.replace('.js', '')}`).join(", ");

        socket.emit("room:system_message", {
            user: "Hệ thống",
            message: `Các lệnh hỗ trợ: ${commands}.`
        });
    }
};