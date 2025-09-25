const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Chưa đăng nhập hoặc token không hợp lệ." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Bạn không có quyền truy cập." });
    }
    next();
};


exports.isModerator = (req, res, next) => {
    if (req.user.role === "admin" || req.user.role === "moderator") {
        return next();
    }
    return res.status(403).json({ message: "Bạn không có quyền truy cập." });
};