import dotenv from 'dotenv';
dotenv.config();

import { OpenWeather } from '../adapters/weather/OpenWeather.js';

export const weatherProvider = new OpenWeather(process.env.WEATHER_API);