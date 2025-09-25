require("dotenv").config(); 

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes.js");
const connectDB = require("./config/db.js");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
