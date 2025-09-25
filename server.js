require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const tagRoutes = require("./routes/tagRoutes.js");
const connectDB = require("./config/db.js");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/tag", tagRoutes);

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
