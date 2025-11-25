import { getWeather } from "../utils/getWeather.js";
import { weatherProvider } from "../config/providers.js";

export default {
    name: "weather",
    description: "Xem thời tiết",
    usage: "/weather [tên_thành_phố]",
    role: "member",

    async execute(socket, args, io, roomId) {

        const location = args.join(" ") || "Hanoi" ;

        const weatherData = await weatherProvider.getCurrentWeather(location);

        console.log(weatherData);

        if (!weatherData) {
            return socket.emit("room:system_message", { message: "Không tìm thấy địa điểm." });
        }

        const message = `Thời tiết tại ${weatherData.location}: ${weatherData.temperature}°C, ${weatherData.description}.`;

        io.to(roomId).emit("room:system_message", {
            user: "Hệ thống",
            message: message,
        });
    }
};