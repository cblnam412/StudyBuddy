import { JoinRequest, Room, RoomInvite, RoomUser, TagRoom, Tag } from "../models/index.js";
import crypto from "crypto";
import { create } from "domain";
import mongoose from "mongoose";

export class RoomService {
    constructor(Room, RoomUser, RoomInvite, Tag, TagRoom, JoinRequest) {
        this.Room = Room;
        this.RoomUser = RoomUser;
        this.RoomInvite = RoomInvite;
        this.Tag = Tag;
        this.TagRoom = TagRoom;
        this.JoinRequest = JoinRequest;
    }

    async getJoinRequests(leaderId, roomId) {
        const leaderRooms = await this.RoomUser.find({
            user_id: leaderId,
            room_role: "leader",
        }).distinct("room_id");

        if (roomId) {
            if (!leaderRooms.map(id => id.toString()).includes(roomId)) {
                throw new Error("Bạn không có quyền xem yêu cầu của phòng này.");
            }
        } else if (leaderRooms.length === 0) {
            return [];
        }

        const filter = {
            status: "pending",
            expires_at: { $gt: new Date() },
            room_id: roomId ? roomId : { $in: leaderRooms },
        };

        const requests = await this.JoinRequest.find(filter)
            .populate("user_id", "full_name email")
            .populate("room_id", "room_name")
            .sort({ created_at: 1 });

        return requests;
    }

    async verifyJoinRoom(userId, data) {
        const { room_id } = data;

        const room = await this.Room.findById(room_id);
        if (!room) throw new Error("Không tìm thấy phòng");

        if (room.status === "safe-mode")
            throw new Error("Bây giờ không thể tham gia nhóm");

        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id });
        if (isMember) throw new Error("Bạn đã là thành viên của phòng này");

        return room;
    }

    async getMyRooms(userId) {
        if (!userId)
            throw new Error("Không được bỏ trống userId.");

        if (!mongoose.isValidObjectId(userId)) 
            throw new Error("userId không hợp lệ.");
        
        const memberships = await this.RoomUser.find({ user_id: userId })
            .populate({
                path: "room_id",
                select: "room_name description status created_at updated_at",
            })
            .lean();

        if (!memberships.length) return [];

        return memberships
            .filter(m => m.room_id)
            .map(m => ({
                ...m.room_id,
                room_role: m.room_role
            }));
    }

    async createRoomInvite(roomId, createdById) {
        if (!mongoose.isValidObjectId(roomId))
            throw new Error("roomId không đúng định dạng.");

        if (!mongoose.isValidObjectId(createdById))
            throw new Error("createdById không đúng định dạng.");

        if (!roomId || !createdById) 
            throw new Error("Không được bỏ trống roomId hoặc createdById.");

        const token = crypto.randomBytes(12).toString("hex");

        const invite = await this.RoomInvite.create({
            room_id: roomId,
            token,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            created_by: createdById,
        });

        return invite;
    }

    async kickUser(leaderId, roomId, userIdToKick) {
        if (leaderId === userIdToKick)
            throw new Error("Không thể tự đuổi bản thân");

        const room = await this.Room.findById(roomId);
        if (!room) throw new Error("Không tìm thấy phòng");

        const member = await this.RoomUser.findOne({ room_id: roomId, user_id: userIdToKick });
        if (!member) throw new Error("Người này không phải thành viên của phòng");

        await this.RoomUser.deleteOne({ _id: member._id });

        return userIdToKick;
    }

    async leaveRoom(userId, roomId) {
        const room = await this.Room.findById(roomId);
        if (!room) throw new Error("Không tìm thấy phòng");

        const member = await this.RoomUser.findOne({ room_id: roomId, user_id: userId });
        if (!member) throw new Error("Bạn không phải thành viên của phòng này");

        if (member.room_role === "leader") {
            const anotherMember = await this.RoomUser.findOne({
                room_id: roomId,
                user_id: { $ne: userId }
            });

            if (anotherMember) {
                throw new Error("Bạn không được rời phòng khi còn thành viên.");
            } else {
                await this.Room.deleteOne({ _id: roomId });
                await this.RoomUser.deleteMany({ room_id: roomId });
                await this.TagRoom.deleteMany({ room_id: roomId });

                return { disbanded: true };
            }
        }

        await this.RoomUser.deleteOne({ _id: member._id });
        return { disbanded: false };
    }

    async updateRoomInfo(roomId, data) {
        const { room_name, description, tags } = data;

        const room = await this.Room.findById(roomId);
        if (!room) throw new Error("Không tìm thấy phòng.");

        if (room_name) room.room_name = room_name;
        if (description) room.description = description;

        if (tags && Array.isArray(tags)) {
            await this.TagRoom.deleteMany({ room_id: roomId });

            const validTags = await this.Tag.find({ _id: { $in: tags } });

            if (validTags.length) {
                const newTagRooms = validTags.map(tag => ({
                    room_id: roomId,
                    tag_id: tag._id,
                }));

                await this.TagRoom.insertMany(newTagRooms);
            }
        }

        await room.save();
        return room;
    }

    async getAllRooms(options) {
        const { page = 1, limit = 20, search, tags } = options;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        let query = { status: "public" };

        if (search) {
            query.room_name = { $regex: search, $options: "i" };
        }

        if (tags) {
            const tagIds = tags.split(",");
            const roomIdsWithTags = await this.TagRoom.find({
                tag_id: { $in: tagIds }
            }).distinct("room_id");

            query._id = { $in: roomIdsWithTags };
        }

        const [rooms, count] = await Promise.all([
            this.Room.find(query)
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum)
                .sort({ room_name: 1 })
                .lean(),
            this.Room.countDocuments(query)
        ]);

        return {
            rooms,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum,
        };
    }

    async getRoomDetails(roomId) {
        const room = await this.Room.findById(roomId).lean();
        if (!room) throw new Error("Không tìm thấy phòng.");

        const members = await this.RoomUser.find({ room_id: roomId })
            .populate("user_id", "full_name")
            .lean();

        return {
            ...room,
            memberNumber: members.length,
            members: members.map(m => ({
                ...m.user_id,
                room_role: m.room_role
            }))
        };
    }
}


// export class RoomService {
//     constructor(Room, RoomUser, JoinRequest, RoomInvite, Tag, TagRoom) {
//         this.Room = Room;
//         this.RoomUser = RoomUser;
//         this.JoinRequest = JoinRequest;
//         this.RoomInvite = RoomInvite;
//         this.Tag = Tag;
//         this.TagRoom = TagRoom;
//     }

//     async joinRoomRequest(userId, data) {
//         const { room_id, message, invite_token } = data;

//         const room = await this.Room.findById(room_id);
//         if (!room) {
//             throw new Error("Không tìm thấy phòng");
//         }

//         const isMember = await this.RoomUser.findOne({ user_id: userId, room_id });
//         if (isMember) {
//             throw new Error("Bạn đã là thành viên của phòng này");
//         }

//         if (room.status === "safe-mode") {
//             throw new Error("Bây giờ không thể tham gia nhóm");
//         }

//         const existingRequest = await this.JoinRequest.findOne({
//             user_id: userId,
//             room_id,
//             status: { $in: ["pending", "approved"] },
//             expires_at: { $gt: new Date() },
//         });

//         if (existingRequest) {
//             if (existingRequest.status === "pending") {
//                 throw new Error("Bạn đã gửi yêu cầu tham gia và đang chờ duyệt");
//             }
//             if (existingRequest.status === "approved") {
//                 throw new Error("Bạn đã là thành viên của phòng này");
//             }
//         }

//         await this.JoinRequest.deleteMany({ user_id: userId, room_id });

//         if (room.status === "private") {
//             if (!invite_token) {
//                 throw new Error("Cần có link mời để tham gia phòng private");
//             }
//             const invite = await this.RoomInvite.findOneAndUpdate(
//                 {
//                     room_id,
//                     token: invite_token,
//                     expires_at: { $gt: new Date() },
//                     uses: 0,
//                 },
//                 { $inc: { uses: 1 } },
//                 { new: true }
//             );

//             if (!invite) {
//                 throw new Error("Link mời không hợp lệ, đã hết hạn hoặc đã được dùng");
//             }
//         }

//         const newRequest = await this.JoinRequest.create({
//             user_id: userId,
//             room_id,
//             message: message || null,
//             expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
//         });

//         return newRequest;
//     }

//     async getMyRooms(userId) {
//         const memberships = await this.RoomUser.find({ user_id: userId })
//             .populate({
//                 path: "room_id",
//                 select: "room_name description status created_at updated_at",
//             })
//             .lean();

//         if (!memberships.length) {
//             return [];
//         }

//         const rooms = memberships
//             .filter((m) => m.room_id)
//             .map((m) => ({
//                 ...m.room_id,
//                 room_role: m.room_role,
//             }));

//         return rooms;
//     }

//     async approveJoinRequest(requestId) {
//         const request = await this.JoinRequest.findById(requestId);

//         if (!request || request.status !== "pending") {
//             throw new Error("Yêu cầu không tồn tại hoặc đã được xử lý");
//         }

//         const room = await this.Room.findById(request.room_id);
//         if (!room) {
//             throw new Error("Không tìm thấy phòng");
//         }

//         if (room.status === "safe-mode") {
//             throw new Error("Bây giờ không thể thêm thành viên vào nhóm");
//         }

//         await this.RoomUser.create({
//             room_id: room._id,
//             user_id: request.user_id,
//         });

//         request.status = "approved";
//         await request.save();
//         return request;
//     }

//     async rejectJoinRequest(requestId, reason) {
//         const request = await this.JoinRequest.findById(requestId);

//         if (!request || request.status !== "pending") {
//             throw new Error("Yêu cầu không tồn tại hoặc đã được xử lý");
//         }

//         const room = await this.Room.findById(request.room_id);
//         if (!room) {
//             throw new Error("Không tìm thấy phòng");
//         }

//         request.status = "rejected";
//         request.reject_reason = reason || null;
//         await request.save();
//         return request;
//     }

//     async createRoomInvite(roomId, createdById) {
//         const token = crypto.randomBytes(12).toString("hex");

//         const invite = await this.RoomInvite.create({
//             room_id: roomId,
//             token,
//             expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
//             created_by: createdById,
//         });

//         return invite;
//     }

//     async kickUser(leaderId, roomId, userIdToKick) {
//         if (leaderId === userIdToKick) {
//             throw new Error("Không thể tự đuổi bản thân");
//         }

//         const room = await this.Room.findById(roomId);
//         if (!room) {
//             throw new Error("Không tìm thấy phòng");
//         }

//         const member = await this.RoomUser.findOne({ room_id: roomId, user_id: userIdToKick });
//         if (!member) {
//             throw new Error("Người này không phải thành viên của phòng");
//         }

//         await this.RoomUser.deleteOne({ _id: member._id });
//         return userIdToKick;
//     }

//     async leaveRoom(userId, roomId) {
//         const room = await this.Room.findById(roomId);
//         if (!room) {
//             throw new Error("Không tìm thấy phòng");
//         }

//         const member = await this.RoomUser.findOne({ room_id: roomId, user_id: userId });
//         if (!member) {
//             throw new Error("Bạn không phải là thành viên của phòng này");
//         }

//         if (member.room_role === "leader") {
//             const anotherMember = await this.RoomUser.findOne({ room_id: roomId, user_id: { $ne: userId } });
//             if (anotherMember) {
//                 throw new Error("Bạn không được rời phòng khi còn thành viên.");
//             } else {
//                 await this.Room.deleteOne({ _id: roomId });
//                 await this.RoomUser.deleteMany({ room_id: roomId });
//                 await this.TagRoom.deleteMany({ room_id: roomId });
//                 return { disbanded: true };
//             }
//         }

//         await this.RoomUser.deleteOne({ _id: member._id });
//         return { disbanded: false };
//     }

//     async updateRoomInfo(roomId, data) {
//         const { room_name, description, tags } = data;

//         const room = await this.Room.findById(roomId);
//         if (!room) {
//             throw new Error("Không tìm thấy phòng.");
//         }

//         if (room_name) room.room_name = room_name;
//         if (description) room.description = description;

//         if (tags && Array.isArray(tags)) {
//             await this.TagRoom.deleteMany({ room_id: roomId });

//             const validTags = await this.Tag.find({ _id: { $in: tags } });
//             const newTagRooms = validTags.map(tag => ({
//                 room_id: roomId,
//                 tag_id: tag._id
//             }));

//             if (newTagRooms.length > 0) {
//                 await this.TagRoom.insertMany(newTagRooms);
//             }
//         }

//         await room.save();
//         return room;
//     }

//     async getAllRooms(options) {
//         const { page = 1, limit = 20, search, tags } = options;
//         const pageNum = parseInt(page);
//         const limitNum = parseInt(limit);

//         let query = { status: "public" };

//         if (search) {
//             query.room_name = { $regex: search, $options: "i" };
//         }

//         if (tags) {
//             const tagIds = tags.split(',');
//             const roomIdsWithTags = await this.TagRoom.find({ tag_id: { $in: tagIds } }).distinct('room_id');
//             query._id = { $in: roomIdsWithTags };
//         }

//         const [rooms, count] = await Promise.all([
//             this.Room.find(query)
//                 .limit(limitNum)
//                 .skip((pageNum - 1) * limitNum)
//                 .sort({ room_name: 1 })
//                 .lean(),
//             this.Room.countDocuments(query)
//         ]);

//         return {
//             rooms,
//             totalPages: Math.ceil(count / limitNum),
//             currentPage: pageNum
//         };
//     }

//     async getJoinRequests(leaderId, roomId) {
//         const leaderRooms = await this.RoomUser.find({
//             user_id: leaderId,
//             room_role: "leader",
//         }).distinct("room_id");

//         if (roomId) {
//             if (!leaderRooms.map(id => id.toString()).includes(roomId)) {
//                 throw new Error("Bạn không có quyền xem yêu cầu của phòng này.");
//             }
//         } else if (leaderRooms.length === 0) {
//             return [];
//         }

//         const filter = {
//             status: "pending",
//             expires_at: { $gt: new Date() },
//             room_id: roomId ? roomId : { $in: leaderRooms },
//         };

//         const requests = await this.JoinRequest.find(filter)
//             .populate("user_id", "full_name email")
//             .populate("room_id", "room_name")
//             .sort({ created_at: 1 });

//         return requests;
//     }

//     async getRoomDetails(roomId) {
//         const room = await this.Room.findById(roomId).lean(); 
//         if (!room) {
//             throw new Error("Không tìm thấy phòng.");
//         }

//         const members = await this.RoomUser.find({ room_id: roomId })
//             .populate({
//                 path: 'user_id',
//                 select: 'full_name'
//             })
//             .lean();

//         const memberNumber = members.length;

//         return {
//             ...room,
//             memberNumber,
//             members: members.map(m => ({ ...m.user_id, room_role: m.room_role }))
//         };
//     }
// }

