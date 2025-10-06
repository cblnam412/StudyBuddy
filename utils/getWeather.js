import fetch from "node-fetch";

const API_KEY = process.env.WEATHER_API;

export async function getWeather(city = "Hanoi") {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
    )}&appid=${API_KEY}&units=metric&lang=vi`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Không thể lấy dữ liệu thời tiết.");
        const data = await res.json();
        const temp = data.main.temp.toFixed(1);
        const desc = data.weather[0].description;
        const name = data.name;

        return `**${name}**: ${temp}°C, ${desc}`;
    } catch (err) {
        return "Lỗi khi lấy dữ liệu thời tiết.";
    }
}
