import { JoinRequest, Room, RoomInvite, RoomUser, TagRoom, Tag, User } from "../models/index.js";
import crypto from "crypto";
import { create } from "domain";
import mongoose from "mongoose";

export class RoomService {
    constructor(Room, RoomUser, RoomInvite, Tag, TagRoom, JoinRequest, Poll) {
        this.Room = Room;
        this.RoomUser = RoomUser;
        this.RoomInvite = RoomInvite;
        this.Tag = Tag;
        this.TagRoom = TagRoom;
        this.JoinRequest = JoinRequest;
        this.Poll = Poll; // optional
    }

    async getJoinRequests(leaderId, roomId) {
        if (!leaderId || !roomId)
            throw new Error("Không được thiếu leaderId hoặc roomId.");
        
        if (!mongoose.isValidObjectId(leaderId) || !mongoose.isValidObjectId(roomId))
            throw new Error("leaderId hoặc roomId không hợp lệ.");

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

    async verifyJoinRoom(userId, roomId) {
        if (!userId || !roomId)
            throw new Error("Không được bỏ trống userId hoặc roomId.");

        if (!mongoose.isValidObjectId(userId)) 
            throw new Error("userId không hợp lệ.");

        if (!mongoose.isValidObjectId(roomId)) 
            throw new Error("roomId không hợp lệ.");

        const room = await this.Room.findById(roomId);
        if (!room) 
            throw new Error("Không tìm thấy phòng.");

        if (room.status === "safe-mode")
            throw new Error("Bây giờ không thể tham gia nhóm.");

        const isMember = await this.RoomUser.findOne({ user_id: userId, room_id: roomId });
        if (isMember) 
            throw new Error("Bạn đã là thành viên của phòng này.");

        return room;
    }

    async getMyRooms(userId) {
        if (!userId) throw new Error("Không được bỏ trống userId.");
                if (!mongoose.isValidObjectId(userId)) throw new Error("userId không hợp lệ.");

                const memberships = await this.RoomUser.find({ user_id: userId })
                    .populate({
                        path: "room_id",
                        select: "room_name description status avatar created_at updated_at",
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

        const room = await this.Room.findById(roomId);
        if (!room) {
            throw new Error("Room không tồn tại.");
        }

        const isLeader = await this.RoomUser.exists({ room_id: roomId, user_id: createdById, room_role: "leader" });
        if (!isLeader) {
            throw new Error("Bạn không phải nhóm trưởng của phòng này.");
        }

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
                const { room_name, description, tags, avatar } = data;

                const room = await this.Room.findById(roomId);
                if (!room) {
                    throw new Error("Không tìm thấy phòng.");
                }
                console.log("Service received Update:", { roomId, avatar });
                if (room_name) room.room_name = room_name;
                if (description) room.description = description;

                if (avatar) {
                    console.log("Saving new avatar to DB...");
                    room.avatar = avatar;
                }

                if (tags && Array.isArray(tags)) {
                    await this.TagRoom.deleteMany({ room_id: roomId });

                    const validTags = await this.Tag.find({ _id: { $in: tags } });
                    if (validTags.length > 0) {
                        const newTagRooms = validTags.map(tag => ({
                            room_id: roomId,
                            tag_id: tag._id
                        }));
                        await this.TagRoom.insertMany(newTagRooms);
                    }
                }
                await room.save();
                return room;
            }
    
    async updateStatus(roomId, status) {
        const room = await this.Room.findById(roomId);
        if (!room) {
            throw new Error("Không tìm thấy phòng.");
        }
        if (room.status !== 'public' && room.status !== 'private') {
            throw new Error("Không thể đổi trạng thái phòng");
        }
        room.status = status;
        await room.save();
        return room;
    }

    async getAllRooms(options, userId) {
            const { page = 1, limit = 100, search, tags } = options;
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

            let pendingRoomIds = [];
            if (userId) {
                const requests = await this.JoinRequest.find({
                    user_id: userId,
                    status: "pending"
                }).distinct("room_id");
                pendingRoomIds = requests.map(id => id.toString());
            }
            const [roomsRaw, count] = await Promise.all([
                this.Room.find(query)
                    .limit(limitNum)
                    .skip((pageNum - 1) * limitNum)
                    .sort({ room_name: 1 })
                    .lean(),
                this.Room.countDocuments(query)
            ]);

            const rooms = await Promise.all(roomsRaw.map(async (room) => {
                const memberIds = await this.RoomUser.find({ room_id: room._id }).distinct('user_id');

                return {
                    ...room,
                    memberNumber: memberIds.length,
                    members: memberIds,
                    isPending: userId ? pendingRoomIds.includes(room._id.toString()) : false
                };
            }));

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
            .populate("user_id", "full_name avatarUrl")
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

    async transferLeader(roomId, currentLeaderId, newLeaderId) {
        if (!roomId || !currentLeaderId || !newLeaderId) throw new Error('roomId, currentLeaderId và newLeaderId là bắt buộc.');
        if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(currentLeaderId) || !mongoose.isValidObjectId(newLeaderId)) {
            throw new Error('IDs không hợp lệ.');
        }

        const room = await this.Room.findById(roomId);
        if (!room) throw new Error('Không tìm thấy phòng.');

        const current = await this.RoomUser.findOne({ room_id: roomId, user_id: currentLeaderId });
        if (!current || current.room_role !== 'leader') throw new Error('Bạn không phải leader của phòng này.');

        const newMember = await this.RoomUser.findOne({ room_id: roomId, user_id: newLeaderId });
        if (!newMember) throw new Error('Người được chuyển không phải thành viên của phòng.');

        current.room_role = 'member';
        await current.save();

        newMember.room_role = 'leader';
        await newMember.save();

        return { roomId, oldLeader: currentLeaderId, newLeader: newLeaderId };
    }

    async applySeverePunishment(userId, level, reason, issuedById) {
        if (![2,3].includes(level)) throw new Error('applySeverePunishment only supports level 2 or 3');
        if (!mongoose.isValidObjectId(userId)) throw new Error('userId không hợp lệ.');

        // find rooms where this user is leader
        const leaderRooms = await this.RoomUser.find({ user_id: userId, room_role: 'leader' }).lean();
        const results = [];

        for (const lr of leaderRooms) {
            const roomId = lr.room_id;
            // set room to safe-mode
            await this.Room.findByIdAndUpdate(roomId, { status: 'safe-mode' });

            // demote leader in that room to member
            await this.RoomUser.findOneAndUpdate({ room_id: roomId, user_id: userId }, { room_role: 'member' });

            // NOTE: do not change global user system_role/status now — punishment will be applied after election closes

            // Prepare candidates: top 10 by reputation among room members
            const members = await this.RoomUser.find({ room_id: roomId }).populate('user_id', 'full_name reputation_score').lean();
            const sorted = members.sort((a,b) => (b.user_id.reputation_score||0) - (a.user_id.reputation_score||0));

            let candidates = sorted.map(m => m.user_id).filter(u => u && u._id.toString() !== userId.toString());
            candidates = candidates.slice(0,10);

            if (candidates.length === 0) {
                results.push({ roomId, poll: null, note: 'No eligible candidates' });
                continue;
            }

            const room = await this.Room.findById(roomId).lean();
            const question = `Bầu leader mới cho phòng ${room?.room_name || roomId}`;

            const options = candidates.map(c => ({ text: c.full_name || c._id.toString(), candidate_id: c._id, votes: 0 }));


            const banned = (level === 3) ? [mongoose.Types.ObjectId(userId)] : [];

            const pendingPunishment = {
                user_id: mongoose.Types.ObjectId(userId),
                level,
                reason: reason || null,
                issuer_id: issuedById ? mongoose.Types.ObjectId(issuedById) : null,
                applied: false
            };

            const poll = await this.Poll.create({
                room_id: roomId,
                created_by: issuedById,
                question,
                options,
                banned_voters: banned,
                pending_punishment: pendingPunishment,
                expires_at: new Date(Date.now() + 3*24*60*60*1000),
            });

            results.push({ roomId, poll: poll._id, candidates: candidates.map(c=>c._id) });
        }

        // Do NOT apply user-level punishments here; they'll be applied when the corresponding poll(s) close.
        return { roomsAffected: results.length, details: results };
    }

    async createPoll(roomId, createdById, data) {
        if (!roomId || !createdById) throw new Error('Thiếu thông tin cần thiết.');

        if (!mongoose.isValidObjectId(roomId) || !mongoose.isValidObjectId(createdById))
            throw new Error('Thông tin không hợp lệ.');

        const room = await this.Room.findById(roomId);
        if (!room) throw new Error('Không tìm thấy phòng.');

        // check membership
        const member = await this.RoomUser.findOne({ room_id: roomId, user_id: createdById });
        if (!member) throw new Error('Bạn không phải thành viên của phòng này.');

        const { question, options, expires_at = null } = data || {};
        if (!question || typeof question !== 'string' || !question.trim()) throw new Error('Cần có câu hỏi cho bình chọn.');
        if (!Array.isArray(options) || options.length < 2) throw new Error('Cần ít nhất 2 lựa chọn.');
        if (options.length > 20) throw new Error('Tối đa 20 lựa chọn.');

        const normalizedOptions = options.map(opt => ({ text: String(opt).trim(), votes: 0 }));

        const poll = await this.Poll.create({
            room_id: roomId,
            created_by: createdById,
            question: question.trim(),
            options: normalizedOptions,
            expires_at: expires_at ? new Date(expires_at) : null,
        });

        return poll;
    }

    async getPollById(pollId) {
        if (!pollId) throw new Error('pollId không được để trống.');
        if (!mongoose.isValidObjectId(pollId)) throw new Error('pollId không hợp lệ.');
        const poll = await this.Poll.findById(pollId)
            .populate('created_by', 'full_name email')
            .lean();
        if (!poll) throw new Error('Không tìm thấy bình chọn.');
        return poll;
    }

    async listPolls(roomId, { page = 1, limit = 20 } = {}) {
        if (!roomId) throw new Error('roomId không được để trống.');
        if (!mongoose.isValidObjectId(roomId)) throw new Error('roomId không hợp lệ.');

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;

        const [polls, count] = await Promise.all([
            this.Poll.find({ room_id: roomId })
                .sort({ created_at: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('created_by', 'full_name email')
                .lean(),
            this.Poll.countDocuments({ room_id: roomId })
        ]);

        return { polls, totalPages: Math.ceil(count / limitNum), currentPage: pageNum };
    }

    async updatePoll(pollId, userId, data) {
        if (!pollId || !userId) throw new Error('pollId và userId không được để trống.');
        if (!mongoose.isValidObjectId(pollId) || !mongoose.isValidObjectId(userId)) throw new Error('pollId hoặc userId không hợp lệ.');

        const poll = await this.Poll.findById(pollId);
        if (!poll) throw new Error('Không tìm thấy bình chọn.');

        const isCreator = poll.created_by.toString() === userId.toString();
        const roomUser = await this.RoomUser.findOne({ room_id: poll.room_id, user_id: userId });
        const isLeader = roomUser && roomUser.room_role === 'leader';
        if (!isCreator && !isLeader) throw new Error('Bạn không có quyền chỉnh sửa bình chọn này.');

        if (data.options && poll.votes && poll.votes.length > 0) {
            throw new Error('Không thể thay đổi lựa chọn khi đã có phiếu bầu.');
        }

        if (data.question) poll.question = String(data.question).trim();
        if (typeof data.expires_at !== 'undefined') poll.expires_at = data.expires_at ? new Date(data.expires_at) : null;
        if (data.options && Array.isArray(data.options)) {
            poll.options = data.options.map(opt => ({ text: String(opt).trim(), votes: 0 }));
        }

        await poll.save();
        return poll;
    }

    async deletePoll(pollId, userId) {
        if (!pollId || !userId) throw new Error('pollId và userId không được để trống.');
        if (!mongoose.isValidObjectId(pollId) || !mongoose.isValidObjectId(userId)) throw new Error('pollId hoặc userId không hợp lệ.');

        const poll = await this.Poll.findById(pollId);
        if (!poll) throw new Error('Không tìm thấy bình chọn.');

        const isCreator = poll.created_by.toString() === userId.toString();
        const roomUser = await this.RoomUser.findOne({ room_id: poll.room_id, user_id: userId });
        const isLeader = roomUser && roomUser.room_role === 'leader';
        if (!isCreator && !isLeader) throw new Error('Bạn không có quyền xóa bình chọn này.');

        await this.Poll.deleteOne({ _id: pollId });
        return pollId;
    }

    async closePoll(pollId, userId) {
        if (!pollId || !userId) throw new Error('pollId và userId không được để trống.');
        if (!mongoose.isValidObjectId(pollId) || !mongoose.isValidObjectId(userId)) throw new Error('pollId hoặc userId không hợp lệ.');

        const poll = await this.Poll.findById(pollId);
        if (!poll) throw new Error('Không tìm thấy bình chọn.');

        const isCreator = poll.created_by.toString() === userId.toString();
        const roomUser = await this.RoomUser.findOne({ room_id: poll.room_id, user_id: userId });
        const isLeader = roomUser && roomUser.room_role === 'leader';
        if (!isCreator && !isLeader) throw new Error('Bạn không có quyền đóng bình chọn này.');

        poll.status = 'closed';
        await poll.save();

        // If poll has pending punishment, apply it now and promote winner if election
        if (poll.pending_punishment && !poll.pending_punishment.applied) {
            try {
                const pp = poll.pending_punishment;

                // determine winner (option with highest votes)
                let maxVotes = -1;
                let winnerIndex = -1;
                for (let i = 0; i < poll.options.length; i++) {
                    const v = poll.options[i].votes || 0;
                    if (v > maxVotes) {
                        maxVotes = v;
                        winnerIndex = i;
                    }
                }

                const winnerCandidateId = (winnerIndex >= 0) ? poll.options[winnerIndex].candidate_id : null;

                // promote winner to leader in the room
                if (winnerCandidateId) {
                    await this.RoomUser.findOneAndUpdate({ room_id: poll.room_id, user_id: winnerCandidateId }, { room_role: 'leader' });
                }

                // apply punishment to target user
                if (pp.level === 2) {
                    await User.findByIdAndUpdate(pp.user_id, { status: 'inactive' });
                } else if (pp.level === 3) {
                    await User.findByIdAndUpdate(pp.user_id, { status: 'banned' });
                }

                // mark applied
                poll.pending_punishment.applied = true;
                await poll.save();
            } catch (e) {
                console.error('Error applying pending punishment on poll close:', e);
            }
        }

        return poll;
    }

    async votePoll(pollId, userId, optionIndex) {
        if (!pollId || !userId) throw new Error('pollId và userId không được để trống.');
        if (!mongoose.isValidObjectId(pollId) || !mongoose.isValidObjectId(userId)) throw new Error('pollId hoặc userId không hợp lệ.');

        const poll = await this.Poll.findById(pollId);
        if (!poll) throw new Error('Không tìm thấy bình chọn.');

        if (poll.status !== 'active') throw new Error('Bình chọn đã đóng.');
        if (poll.expires_at && poll.expires_at <= new Date()) throw new Error('Bình chọn đã hết hạn.');

        // Check membership
        const roomUser = await this.RoomUser.findOne({ room_id: poll.room_id, user_id: userId });
        if (!roomUser) throw new Error('Bạn không phải thành viên của phòng này.');

        const idx = parseInt(optionIndex);
        if (Number.isNaN(idx) || idx < 0 || idx >= poll.options.length) throw new Error('Lựa chọn không hợp lệ.');

        // Check if user already voted
        const existing = poll.votes.find(v => v.user_id.toString() === userId.toString());
        if (existing) {
            if (existing.option_index === idx) throw new Error('Bạn đã chọn lựa chọn này.');
            // Change vote: decrement old, remove vote entry, then add new
            poll.options[existing.option_index].votes = Math.max(0, (poll.options[existing.option_index].votes || 1) - 1);
            poll.votes = poll.votes.filter(v => !(v.user_id.toString() === userId.toString() && v.option_index === existing.option_index));
        }

        // Add new vote
        poll.options[idx].votes = (poll.options[idx].votes || 0) + 1;
        poll.votes.push({ user_id: userId, option_index: idx });

        await poll.save();
        return poll;
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

