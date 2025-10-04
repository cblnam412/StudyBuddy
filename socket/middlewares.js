import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
        return next(new Error("Authentication error: missing token"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user = decoded;
        if (!decoded.full_name) {
            user = await User.findById(decoded.id).select("_id full_name");
        } // Học cache sau

        socket.user = user;
        next();
    } catch (err) {
        next(new Error("Authentication error: invalid token"));
        socket.disconnect(true);
    }
};


export const isAdmin = (socket, next) => {
    if (socket.user.role !== "admin") {
        return next(new Error("Bạn không có quyền truy cập. Yêu cầu quyền Admin."));
    }
    next();
};

export const isModerator = (socket, next) => {
    if (socket.user.role === "admin" || socket.user.role === "moderator") {
        return next();
    }
    return next(new Error("Bạn không có quyền truy cập. Yêu cầu quyền Admin hoặc Moderator."));
};