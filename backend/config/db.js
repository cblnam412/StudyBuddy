import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const mongoURI = process.env.MGAL_URI;
        if (!mongoURI) {
            throw new Error("Lỗi kết nối: biến môi trường MGAL_URI không được tìm thấy");
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("Kết nối MongoDB thành công");
    } catch (error) {
        console.error("Lỗi kết nối MongoDB:", error.message);
        process.exit(1);
    }
};

export default connectDB;

// class Database {
//     constructor() {
//         this.connected = false;
//     }

//     async connect() {
//         if (this.connected) {
//             console.log("MongoDB đã được kết nối trước đó (singleton).");
//             return mongoose.connection;
//         }

//         try {
//             const mongoURI = process.env.MGAL_URI;
//             if (!mongoURI) {
//                 throw new Error("Biến môi trường MGAL_URI không tồn tại.");
//             }

//             await mongoose.connect(mongoURI, {
//                 useNewUrlParser: true,
//                 useUnifiedTopology: true,
//             });

//             this.connected = true;
//             console.log("Kết nối MongoDB thành công (singleton).");

//             return mongoose.connection;
//         } catch (error) {
//             console.error("Lỗi kết nối MongoDB:", error.message);
//             process.exit(1);
//         }
//     }
// }

// const databaseInstance = new Database();
// export default databaseInstance;