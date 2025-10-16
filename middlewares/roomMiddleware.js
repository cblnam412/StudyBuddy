import { RoomUser , Room } from "../models/index.js";

export const isRoomLeader = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const room_id = req.body?.room_id || req.query?.room_id || req.params?.room_id;

        if (!room_id) {
            return res.status(400).json({ message: "Thiếu room_id" });
        }

        const membership = await RoomUser.findOne({ room_id, user_id: userId });

        if (!membership) {
            return res.status(403).json({ message: "Bạn không phải là thành viên của phòng này" });
        }

        if (!["leader"].includes(membership.room_role)) {
            return res.status(403).json({ message: "Chỉ leader mới được thực hiện thao tác này" });
        }

        next();
    } catch (err) {
        res.status(500).json({ message: "Lỗi xác thực quyền", error: err.message });
    }
};

export const safeModeAndArchive = async (req, res, next) => {
    try {
        const room_id = req.body.room_id || req.params.room_id || req.query.room_id;
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }
        if (room.status === "archived" || room.status === "safe-mode") {
            return res.status(404).json({ message: "Bây giờ phòng không thể thực hiện thao tác này" });
        }

    } catch {
        res.status(500).json({ message: "Lỗi xác thực quyền", error: err.message });
    }
}

export const isArchive = async (req, res, next) => {
    try {
        const room_id = req.body.room_id || req.params.room_id || req.query.room_id;
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }
        if (room.status === "archived" ) {
            return res.status(404).json({ message: "Phòng đang ở trạng thái lưu trữ, không thể thực hiện chức năng này" });
        }

    } catch {
        res.status(500).json({ message: "Lỗi xác thực quyền", error: err.message });
    }
}

export const isSafeMode = async (req, res, next) => {
    try {
        const room_id = req.body.room_id || req.params.room_id || req.query.room_id;
        const room = await Room.findById(room_id);
        if (!room) {
            return res.status(404).json({ message: "Không tìm thấy phòng" });
        }
        if (room.status === "safe-mode") {
            return res.status(404).json({ message: "Phòng đang chờ xử lí, không thể thực hiện chức năng này" });
        }

    } catch {
        res.status(500).json({ message: "Lỗi xác thực quyền", error: err.message });
    }
}