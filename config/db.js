const mongoose = require("mongoose");


const connectDB = async () => {
    try {
        const mongoURI = process.env.DB_URI;
        if (!mongoURI) {
            throw new Error("Lỗi kết nối");
        }
        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, });
        console.log("Kết nối thành công");
    } catch (error) {
        console.error("Lỗi kết nối:", error.message);
        process.exit(1);
    }
}

module.exports = connectDB;