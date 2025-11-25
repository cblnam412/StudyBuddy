export class BaseWeather {
    async getCurrentWeather(location) {
        throw new Error("Triển khai phương thức này trong lớp con");
    }
}