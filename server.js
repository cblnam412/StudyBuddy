import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import GlobalSocket from "./socket/global.js";
import RoomSocket from "./socket/room.js";
import app from "./app.js"; 

dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

connectDB();

GlobalSocket(io);
RoomSocket(io);
app.set("io", io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
