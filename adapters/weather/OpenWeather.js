import { BaseWeather } from "./BaseWeather.js";
import axios from "axios";

export class OpenWeather extends BaseWeather {
    constructor(apiKey) {
        super();
        this.apiKey = apiKey;
        this.baseUrl = "https://api.openweathermap.org/data/2.5/weather";
    }

    async getCurrentWeather(location) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    q: location,
                    appid: this.apiKey,
                    units: "metric",
                    lang: "vi",
                },
            });     
            const data = response.data;
            return {
                location: data.name,
                temperature: data.main.temp,
                description: data.weather[0].description,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
            };
        } catch (error) {
            return null;
        }
    }
}        