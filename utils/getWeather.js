import axios from "axios";

const API_KEY = process.env.WEATHER_API;

export const getWeather = async (city = "Hanoi") => {
    try {
        const url = 'https://api.openweathermap.org/data/2.5/weather';
        const response = await axios.get(url, {
            params: {
                q: city,
                appid: API_KEY,
                units: "metric",
                lang: "vi"
            }
        });

        const data = response.data;
        const temp = data.main.temp.toFixed(1);
        const desc = data.weather[0].description;
        const name = data.name;
        const country = data.sys.country;

        return `**${name}, ${country}**: ${temp}°C, ${desc}`;
    } catch (error) {
        console.error("Weather Error:", error.message);
        if (error.response && error.response.status === 404) {
            return `Không tìm thấy thành phố: ${city}`;
        }
        return "Lỗi khi lấy dữ liệu thời tiết.";
    }
}