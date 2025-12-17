import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RoomUser } from "../models/index.js";

const commands = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, "../commands");

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        import(`../commands/${file}`).then(module => {
            const command = module.default;
            if (command && command.name) {
                commands.set(command.name, command);
                console.log(`Loaded command: /${command.name}`);
            }
        });
    }
}

export const handleSlashCommand = async (fullContent, socket, io, roomId) => {
    const [cmdName, ...args] = fullContent.slice(1).trim().split(/\s+/);
    const command = commands.get(cmdName.toLowerCase());

    if (!command) {
        socket.emit("room:system_message", { message: `Lệnh không tồn tại: /${cmdName}. Gõ /help để xem danh sách.` });
        return;
    }
    try {
        if (command.role === "leader") {
            const currentUser = await RoomUser.findOne({ room_id: roomId, user_id: socket.user.id });
            if (!currentUser || currentUser.role !== "leader") {
                return socket.emit("room:error", { message: "Bạn không có quyền sử dụng lệnh này." });
            }
        }

        await command.execute(socket, args, io, roomId);
    } catch (error) {
        console.error(`Error executing command ${cmdName}:`, error);
        socket.emit("room:error", { message: "Có lỗi xảy ra khi thực thi lệnh." });
    }
};

export const getHelpList = () => {
    return Array.from(commands.values()).map(c => `**/${c.name}**: ${c.description}`).join("\n");
};