import mongoose, { startSession } from 'mongoose';
import {
    Room, User, RoomUser, TagRoom, Document, Message, Event, EventUser, JoinRequest, RoomInvite, Tag, RoomRequest, Notification, ModeratorApplication,
    ReputationLog, UserWarning, Report
} from "../models/index.js";


export const dissolveRoom = async (room_id) => {

    if (!mongoose.Types.ObjectId.isValid(room_id)) {
        throw new Error("ID phòng không hợp lệ.");
    }

    const session = await startSession();

    try {
        await session.withTransaction(async () => {

            await RoomUser.deleteMany({ room_id }, { session });
            await TagRoom.deleteMany({ room_id }, { session });
            await Document.deleteMany({ room_id }, { session });
            await Message.deleteMany({ room_id }, { session });
            await JoinRequest.deleteMany({ room_id }, { session });
            await RoomInvite.deleteMany({ room_id }, { session });

            const events = await Event.find({ room_id }).select('_id').session(session);
            const eventIds = events.map(e => e._id);

            if (eventIds.length > 0) {
                await EventUser.deleteMany({ event_id: { $in: eventIds } }, { session });
                await Event.deleteMany({ _id: { $in: eventIds } }, { session });
            }

            await Room.deleteOne({ _id: room_id }, { session });
        });

        return { success: true, message: "Phòng và tất cả dữ liệu liên quan đã được giải tán." };
    } catch (error) {
        throw new Error("Giải tán phòng thất bại do lỗi database.");
    } finally {
        session.endSession();
    }
};

export const dissolveEvent = async (event_id) => {
    if (!mongoose.Types.ObjectId.isValid(event_id)) {
        throw new Error("ID sự kiện không hợp lệ.");
    }

    const session = await startSession();

    try {
        await session.withTransaction(async () => {

            await EventUser.deleteMany({ event_id }, { session });

            await Event.deleteOne({ _id: event_id }, { session });
        });

        return { success: true, message: "Sự kiện và tất cả dữ liệu liên quan đã được xoá." };
    } catch (error) {
        throw new Error("Xoá sự kiện thất bại do lỗi database.");
    } finally {
        session.endSession();
    }
};

export const dissolveTag = async (tag_id) => {
    if (!mongoose.Types.ObjectId.isValid(tag_id)) {
        throw new Error("ID tag không hợp lệ.");
    }

    const session = await startSession();

    try {
        await session.withTransaction(async () => {

            await TagRoom.deleteMany({ tag_id }, { session });

            await RoomRequest.updateMany(
                { tags: tag_id },
                { $pull: { tags: tag_id } },
                { session }
            );

            await Tag.deleteOne({ _id: tag_id }, { session });
        });

        return { success: true, message: "Tag và tất cả dữ liệu liên quan đã được xoá." };
    } catch (error) {
        console.error("Transaction failed in dissolveTag:", error);
        throw new Error("Xoá tag thất bại do lỗi database.");
    } finally {
        session.endSession();
    }
};

export const dissolveUser = async (user_id) => {
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new Error("ID người dùng không hợp lệ.");
    }

    const session = await startSession();

    try {
        await session.withTransaction(async () => {

            await Message.updateMany(
                { user_id },
                { $set: { user_id: null } },
                { session }
            );

            await Document.updateMany(
                { uploader_id: user_id },
                { $set: { uploader_id: null } },
                { session }
            );

            await Report.updateMany(
                { $or: [{ reporter_id: user_id }, { reviewer_id: user_id }] },
                {
                    $set: {
                        reporter_id: null, 
                        reviewer_id: null  
                    }
                },
                { session }
            );

            await Promise.all([
                RoomUser.deleteMany({ user_id }, { session }),
                JoinRequest.deleteMany({ user_id }, { session }),
                EventUser.deleteMany({ user_id }, { session }),
                Notification.deleteMany({ user_id }, { session }),
                ModeratorApplication.deleteMany({ user_id }, { session }),
                ReputationLog.deleteMany({ user_id }, { session }),
                UserWarning.deleteMany({ user_id }, { session }),
                RoomRequest.deleteMany({ requester_id: user_id }, { session })
            ]);

            const deletedUser = await User.findByIdAndDelete(user_id, { session });
            if (!deletedUser) {
                throw new Error("Tài khoản người dùng không tồn tại.");
            }
        });

        return { success: true, message: "Tài khoản người dùng và tất cả dữ liệu liên quan đã được xóa vĩnh viễn." };
    } catch (error) {
        throw new Error(`Xóa tài khoản thất bại: ${error.message}`);
    } finally {
        session.endSession();
    }
};