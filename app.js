import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import roomRequestRoutes from "./routes/roomRequestRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import documentRoutes from "./routes/documentsRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/tag", tagRoutes);
app.use("/room-request", roomRequestRoutes);
app.use("/room", roomRoutes);
app.use("/event", eventRoutes);
app.use("/user", userRoutes);
app.use("/document", documentRoutes);
app.use("/report", reportRoutes);

export default app;
