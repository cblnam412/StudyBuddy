import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/index.js";
import { Socket } from "socket.io-client";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Chưa đăng nhập hoặc token không hợp lệ." });
    }

    const token = authHeader.split(" ")[1];
    try {
        // kiểm tra token có hợp lệ ko, còn hạn ko và giải mã nội dung token
        const decoded = jwt.verify(token, JWT_SECRET);
        // hợp lệ thì lưu vào req.user
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};

// middleware kiểm tra user có bị ban ko
export const checkBanned = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }
        if (user.status !== "banned") return next();

        // nếu đã hết hạn bị ban tài khoản -> tự mở khóa
        if (user.ban_end_date && new Date(user.ban_end_date) <= new Date()) {
            user.status = "active";
            user.ban_end_date = null;
            await user.save();
            return next();
        }

        // Chặn user bị ban
        return res.status(403).json({
            message: "Tài khoản của bạn đã bị khóa đến " + user.ban_end_date,
            ban_end_date: user.ban_end_date
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Lỗi kiểm tra ban" });
    }
};

// middleware kiểm tra tính năng có bị khóa ko
export const checkFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);

            if (!user) 
                return res.status(401).json({ message: "Không tìm thấy user" });

            const blocked = user.blocked_features?.find(
                item => item.feature === featureName
            );

            // không bị khóa
            if (!blocked) return next();

            // hết hạn khóa -> tự gỡ
            if (blocked.expires_at && blocked.expires_at < new Date()) {
                await User.findByIdAndUpdate(req.user.id, {
                    $pull: { blocked_features: { feature: featureName } }
                });
                return next();
            }

            // đang bị khóa
            return res.status(403).json({
                message: `Tính năng "${featureName}" đang bị khóa.`,
                expires_at: blocked.expires_at,
                reason: blocked.reason
            });

        } catch (err) {
            return res.status(500).json({ message: "Lỗi kiểm tra tính năng." });
        }
    }
}

// middleware kiểm tra tính năng chat
export const checkSocketFeature = async (socket, featureName) => {
    const user = await User.findById(socket.user.id);

    if (!user) throw new Error("Không tìm thấy user");

    const blocked = user.blocked_features?.find(
        item => item.feature === featureName
    );

    // không bị khóa
    if (!blocked) return true;

    // hết hạn khóa, tự gỡ
    if (blocked.expires_at && new Date(blocked.expires_at) < new Date()) {
        await User.findByIdAndUpdate(socket.user.id, {
            $pull: { blocked_features: { feature: featureName } }
        });
        return true;
    }

    // đang bị khóa, ném lỗi để socket.emit xử lý
    throw new Error(`Tính năng "${featureName}" đang bị khóa đến ngày ${blocked.expires_at}.`);
};

export const checkChatRateLimit = async (socket) => {
    const user = await User.findById(socket.user.id);

    if (!user) throw new Error("Không tìm thấy user");

    const now = new Date();
    const limitMinutes = 10; 

    if (user.last_message) {
        const diffMs = now - user.last_message;
        const diffMinutes = diffMs / (1000 * 60);

        if (diffMinutes < limitMinutes) {
            throw new Error(
                `Bạn chỉ được gửi tin nhắn mỗi ${limitMinutes} phút một lần. Vui lòng chờ ${Math.ceil(limitMinutes - diffMinutes)} phút nữa.`
            );
        }
    }

    const blocked = user.blocked_features?.find(
        item => item.feature === "chat_rate_limit"
    );

    // không bị khóa
    if (!blocked) return true;

    // hết hạn khóa, tự gỡ
    if (blocked.expires_at && new Date(blocked.expires_at) < new Date()) {
        await User.findByIdAndUpdate(socket.user.id, {
            $pull: { blocked_features: { feature: "chat_rate_limit" } }
        });
        return true;
    }

    // Update thời gian gửi tin nhắn gần nhất
    user.last_message = now;
    await user.save();
};

export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Bạn không phải Admin, không có quyền truy cập." });
    }
    next();
};

export const isModerator = (req, res, next) => {
    if (req.user.role === "admin" || req.user.role === "moderator") {
        return next();
    }
    return res.status(403).json({ message: "Bạn không phải Moderator hay Admin, không có quyền truy cập." });
};

export const verifyTokenForProfile = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Chưa đăng nhập hoặc token không hợp lệ." });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password -resetPasswordToken -resetPasswordExpires -create_at -update_at -__v");
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
    }
};