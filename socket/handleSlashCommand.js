import { getWeather } from "../utils/getWeather.js";

export const handleSlashCommand = async (command, userId) => {
    const [cmd, ...args] = command.trim().split(" ");

    switch (cmd) {
        case "/dice": {
            return `Số **${Math.floor(Math.random() * 6) + 1}**!`;
        }

        case "/help":
            return `Các lệnh khả dụng:\n/dice - Tung xúc xắc\n/help - Xem trợ giúp`;

        case "/shrug":
            return `¯\\_(ツ)_/¯`;
        case "/tableflip":
            return `(╯°□°）╯︵ ┻━┻`;
        case "/unflip":
            return `┬─┬ ノ( ゜-゜ノ)`;
        case "/flip": {
            return `${Math.random() < 0.5 ? "Ngửa" : "Sấp"}`
        }
        case "/weather": {
            const city = args.join(" ") || "Hanoi";
            return await getWeather(city);
        }
        default:
            return `Lệnh "${cmd}" không tồn tại. Gõ /help để xem danh sách.`;
    }
}
