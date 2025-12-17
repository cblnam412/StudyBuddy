import { RoomRequest, Room, Tag, Notification, TagRoom, RoomUser, ModeratorActivity } from "../models/index.js";
import { RoomRequestService } from "../service/roomRequestService.js"; 
import { emitToUser } from "../socket/onlineUser.js";
import { RequestFactory } from "../requests/requestFactory.js";

export const createRoomRequest = async (req, res) => {
    try {
        const factory = new RequestFactory({ RoomRequest, Room, Tag, Notification, TagRoom, RoomUser, ModeratorActivity });
        const handler = factory.create( "room_create", req.user.id, req.body );
        handler.validate();
        const result = await handler.saveRequest();

        res.status(201).json({ message: "Yêu cầu tạo phòng đã được gửi", data: result });

    } catch (err) {
        const status = err.message.includes("Chưa nhập") || err.message.includes("không hợp lệ") ? 400 : 500;
        res.status(status).json({ message: err.message });
    }
};

export const approveRoomRequest = async (req, res) => {
    try {
        const request = await RoomRequest.findById(req.params.id);
        if (!request) throw new Error("Không tìm thấy yêu cầu");

        const factory = new RequestFactory({ RoomRequest, Room, Tag, Notification, TagRoom, RoomUser, ModeratorActivity });
        const handler = factory.create( "room_create", request.requester_id, request );
        handler.request = request;

        const { room, notification } = await handler.approve(req.user.id);

        emitToUser(
            req.app.get("io"),
            request.requester_id.toString(),
            "user:approve_room_request",
            { notification }
        );

        res.status(200).json({ message: "Đã duyệt yêu cầu", data: room });

    } catch (err) {
        const status = err.message.includes("Không tìm thấy") ? 404 : 400;
        res.status(status).json({ message: err.message });
    }
};

export const rejectRoomRequest = async (req, res) => {
    try {
        const request = await RoomRequest.findById(req.params.id);
        if (!request) throw new Error("Không tìm thấy yêu cầu");

        const factory = new RequestFactory({ RoomRequest, Room, Tag, Notification, TagRoom, RoomUser, ModeratorActivity });
        const handler = factory.create( "room_create", request.requester_id, request );
        handler.request = request;

        const { updatedReq, notification } = await handler.reject(req.user.id, req.body.reason);

        emitToUser(
            req.app.get("io"),
            request.requester_id.toString(),
            "user:reject_room_request",
            { notification }
        );

        res.status(200).json({ message: "Đã từ chối yêu cầu", data: updatedReq });

    } catch (err) {
        const status = err.message.includes("Không tìm thấy") ? 404 : 400;
        res.status(status).json({ message: err.message });
    }
};


const roomRequestService = new RoomRequestService(
    RoomRequest,
    Room,
    Tag,
    Notification,
    TagRoom,
    RoomUser
);

export const getAllRoomRequests = async (req, res) => {
    try {
        const requests = await roomRequestService.getAllRoomRequests();
        res.status(200).json(requests);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách yêu cầu:", error);
        res.status(500).json({ message: error.message });
    }
};

// export const createRoomRequest = async (req, res) => {
//     try {
//         const newRequest = await roomRequestService.createRoomRequest(req.body, req.user.id);
//         res.status(201).json({ message: "Yêu cầu tạo phòng đã được gửi", data: newRequest });
//     } catch (err) {
//         const status = (err.message.includes("Chưa nhập") || err.message.includes("không hợp lệ")) ? 400 : 500;
//         res.status(status).json({ message: err.message });
//     }
// };

// export const approveRoomRequest = async (req, res) => {
//     try {
//         const { request, notification } = await roomRequestService.approveRoomRequest(
//             req.params.id,
//             req.user._id
//         );

//         emitToUser(req.app.get("io"), request.requester_id.toString(), "user:approve_room_quest", {
//             notification,
//         });

//         res.json({ message: "Đã thông qua yêu cầu tạo phòng", request });
//     } catch (err) {
//         const status = (err.message.includes("Không tìm thấy") ? 404 :
//             err.message.includes("không hợp lệ") ? 400 : 500);
//         res.status(status).json({ message: err.message });
//     }
// };



// export const rejectRoomRequest = async (req, res) => {
//     try {
//         const { reason } = req.body;
//         const { request, notification } = await roomRequestService.rejectRoomRequest(
//             req.params.id,
//             req.user._id,
//             reason
//         );

//         emitToUser(req.app.get("io"), request.requester_id.toString(), "user:reject_room_quest", {
//             notification,
//         });

//         res.json({ message: "Đã từ chối yêu cầu", request });
//     } catch (err) {
//         const status = (err.message.includes("Không tìm thấy") ? 404 : 500);
//         res.status(status).json({ message: err.message });
//     }
// };

