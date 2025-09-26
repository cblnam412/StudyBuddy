import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import roomRequestRoutes from "./routes/roomRequestRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/tag", tagRoutes);
app.use("/room-request", roomRequestRoutes);

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` Server đang chạy tại http://localhost:${PORT}`);
});
