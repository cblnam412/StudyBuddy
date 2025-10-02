import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http"; 
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import roomRequestRoutes from "./routes/roomRequestRoutes.js";
import connectDB from "./config/db.js";
import GlobalSocket from "./socket/global.js";


dotenv.config();

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/tag", tagRoutes);
app.use("/room-request", roomRequestRoutes);

connectDB();

GlobalSocket(io); 
app.set("io", io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { 
    console.log(` Server đang chạy tại http://localhost:${PORT}`);
});
