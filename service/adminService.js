
export class AdminService {
    constructor(notificationModel, userModel, roomModel, reportModel, moderatorApplicationModel) {
        this.Notification = notificationModel,
        this.User = userModel,
        this.Room = roomModel,
        this.Report = reportModel,
        this.moderatorApplication = moderatorApplicationModel
    }

    async SetRole(Data) {
        try {
            const { userId, newRole } = Data;

            if (!userId || !newRole) {
                throw new Error("Thiếu userId hoặc newRole.");
            }

            if (!["moderator", "admin", "user"].includes(newRole)) {
                throw new Error("Role không hợp lệ.");
            }

            const user = await this.User.findById(userId);
            if (!user) {
                throw new Error("Không tìm thấy user.");
            }

            if (user.system_role === newRole) {
                throw new Error(`User đã là ${newRole}.`);
            }

            user.system_role = newRole;
            await user.save();

            const notification = await this.Notification.create({
                user_id: user._id,
                title: "Thay đổi quyền",
                content: `Quyền hệ thống của bạn đã được đổi thành ${newRole}.`
            });

            return { newRole, notification, userId: user._id.toString() };
        } catch (err) {
            throw err;
        }
    }
    async getUserStats() {
        try {
            const userStats = await this.User.aggregate([
                {
                    $group: {
                        _id: "$system_role",
                        count: { $sum: 1 },
                    },
                },
            ]);

            const stats = { admin: 0, moderator: 0, user: 0 };
            userStats.forEach(stat => {
                stats[stat._id] = stat.count;
            });
            return stats;

        } catch (error) {
            throw error;
        }
    }

    async getRoomStats() {
        try {
            const roomStats = await this.Room.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]);

            const stats = { public: 0, private: 0, archived: 0, "safe-mode": 0 };
            roomStats.forEach(stat => {
                stats[stat._id] = stat.count;
            });
            return stats;

        } catch (error) {
            throw error;
        }
    }
    
    async getReportProcessingRatio() {
        const total = await this.Report.countDocuments({});
        if (total === 0) return { total: 0, ratio: 100 };

        const pending = await this.Report.countDocuments({ status: 'pending' });

        const processed = total - pending;
        const ratio = Math.round((processed / total) * 100); 

        return { total, ratio };
    }

    async findModeratorApplications({ status, page = 1, limit = 20, userId, reviewerId, from, to, hasErrors, q } = {}) {
        try {
            const query = {};
            if (status) query.status = status;
            if (userId) query.user_id = userId;
            if (reviewerId) query.reviewer_id = reviewerId;

            if (from || to) {
                query.submission_date = {};
                if (from) query.submission_date.$gte = new Date(from);
                if (to) query.submission_date.$lte = new Date(to);
            }

            if (typeof hasErrors !== 'undefined') {
                if (hasErrors === true || hasErrors === 'true') {
                    query.auto_check_errors = { $exists: true, $ne: [] };
                } else if (hasErrors === false || hasErrors === 'false') {
                    query.$or = [
                        { auto_check_errors: { $exists: false } },
                        { auto_check_errors: [] }
                    ];
                }
            }

            if (q) {
                const regex = new RegExp(q, 'i');
                const matchedUsers = await this.User.find({ $or: [{ full_name: regex }, { email: regex }] }).select('_id');
                const ids = matchedUsers.map(u => u._id);
                if (ids.length === 0) {
                    return { total: 0, page, limit, apps: [] };
                }
                query.user_id = { $in: ids };
            }

            const skip = (page - 1) * limit;

            const [total, apps] = await Promise.all([
                this.moderatorApplication.countDocuments(query),
                this.moderatorApplication.find(query)
                    .sort({ submission_date: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('user_id', 'full_name email system_role')
                    .populate('reviewer_id', 'full_name email system_role')
            ]);

            return { total, page, limit, apps };
        } catch (err) {
            throw err;
        }
    }

    async approveModeratorApplication({ applicationId, reviewerId }) {
        try {
            const app = await this.moderatorApplication.findById(applicationId);
            if (!app) throw new Error('Không tìm thấy yêu cầu.');
            if (app.status === 'approved') throw new Error('Yêu cầu đã được chấp nhận.');
            if (app.status === 'rejected') throw new Error('Yêu cầu đã bị từ chối.');

            app.status = 'approved';
            app.reviewer_id = reviewerId || null;
            app.review_date = new Date();
            await app.save();

            const user = await this.User.findById(app.user_id);
            if (!user) throw new Error('User không tồn tại.');
            if (user.system_role !== 'moderator') {
                user.system_role = 'moderator';
                await user.save();
            }

            const notification = await this.Notification.create({
                user_id: user._id,
                type: 'request_approved',
                title: 'Đơn ứng tuyển Moderator đã được chấp nhận',
                content: 'Đơn ứng tuyển làm moderator của bạn đã được chấp nhận. Cảm ơn bạn đã đóng góp.',
                metadata: { requester: user.full_name, status: 'approved' }
            });

            return { application: app, userId: user._id.toString(), notification };
        } catch (err) {
            throw err;
        }
    }

    async rejectModeratorApplication({ applicationId, reviewerId, reason = null }) {
        try {
            const app = await this.moderatorApplication.findById(applicationId);
            if (!app) throw new Error('Không tìm thấy yêu cầu.');
            if (app.status === 'approved') throw new Error('Yêu cầu đã được chấp nhận, không thể từ chối.');
            if (app.status === 'rejected') throw new Error('Yêu cầu đã bị từ chối.');

            app.status = 'rejected';
            app.reviewer_id = reviewerId || null;
            app.review_date = new Date();
            app.reason = reason;
            await app.save();

            const user = await this.User.findById(app.user_id);
            if (!user) throw new Error('User không tồn tại.');

            const notification = await this.Notification.create({
                user_id: user._id,
                type: 'request_rejected',
                title: 'Đơn ứng tuyển Moderator bị từ chối',
                content: `Đơn ứng tuyển của bạn đã bị từ chối.${reason ? ' Lý do: ' + reason : ''}`,
                metadata: { requester: user.full_name, rejecter: reviewerId, reason, status: 'rejected' }
            });

            return { application: app, userId: user._id.toString(), notification };
        } catch (err) {
            throw err;
        }
    }


}
