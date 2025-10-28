import jwt from "jsonwebtoken";
import { User, Room, RoomUser } from "../models/index.js";

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

export const verifyRoom = async (socket, roomId) => {
    const userId = socket.user.id;

    const room = await Room.findById(roomId);
    if (!room) {
        throw new Error("Không tìm thấy phòng");
    }

    const membership = await RoomUser.findOne({ room_id: roomId, user_id: userId });
    if (!membership) {
        throw new Error("Bạn không phải là thành viên của phòng này");
    }

    return true;
};