import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import documentRoutes from "./routes/documentsRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import GlobalSocket from "./socket/global.js";
import RoomSocket from "./socket/room.js";

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
app.use("/report", reportRoutes);
app.use("/document", documentRoutes);
app.use("/event", eventRoutes);
GlobalSocket(io);
RoomSocket(io);
app.set("io", io);

export { app, server };