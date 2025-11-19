import { getWeather } from "../utils/getWeather.js";

export default {
    name: "weather",
    description: "Xem thời tiết",
    usage: "/weather [tên_thành_phố]",
    role: "member",

    async execute(socket, args, io, roomId) {

        /*if (args.length === 0) {
            return socket.emit("room:system_message", { message: "⚠️ Vui lòng nhập tên thành phố." });
        }
        */

        const city = args.length > 0 ? args.join(" ") : "Hanoi";

        const result = await getWeather(city);

        io.to(roomId).emit("room:system_message", {
            user: "Hệ thống",
            message: result
        });
    }
};