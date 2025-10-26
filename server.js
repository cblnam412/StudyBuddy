import { app, server } from "./app.js"; 
import connectDB from "./config/db.js";

connectDB();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(` Server đang chạy tại http://localhost:${PORT}`);
});