import RoomUser from "../models/RoomUser.js";

export const isRoomLeader = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { room_id } = req.body;

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
        console.error(err);
        res.status(500).json({ message: "Lỗi xác thực quyền", error: err.message });
    }
};
