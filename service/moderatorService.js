export class ModeratorService {
    constructor(ModeratorActivityModel, ReportModel, RoomRequestModel, UserModel) {
        this.ModeratorActivity = ModeratorActivityModel;
        this.Report = ReportModel;
        this.RoomRequest = RoomRequestModel;
        this.User = UserModel;
    }

    async listActivities({ moderatorId, action, target_type, page = 1, limit = 20, from, to } = {}) {
        const q = {};
        if (moderatorId) q.moderator_id = moderatorId;
        if (action) q.action = action;
        if (target_type) q.target_type = target_type;
        if (from || to) {
            q.created_at = {};
            if (from) q.created_at.$gte = new Date(from);
            if (to) q.created_at.$lte = new Date(to);
        }

        const skip = (page - 1) * limit;
        const total = await this.ModeratorActivity.countDocuments(q);
        const activities = await this.ModeratorActivity.find(q)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate('moderator_id', 'full_name email system_role')
            .populate('report_id')
            .populate('room_request_id');

        const pages = Math.max(1, Math.ceil(total / limit));
        return { activities, total, page, pages };
    }

    async activityStats({ from, to } = {}) {
        const match = {};
        if (from || to) {
            match.created_at = {};
            if (from) match.created_at.$gte = new Date(from);
            if (to) match.created_at.$lte = new Date(to);
        }

        const byAction = await this.ModeratorActivity.aggregate([
            { $match: match },
            { $group: { _id: '$action', count: { $sum: 1 } } }
        ]);

        const byTarget = await this.ModeratorActivity.aggregate([
            { $match: match },
            { $group: { _id: '$target_type', count: { $sum: 1 } } }
        ]);

        const actionCounts = {};
        byAction.forEach(a => { actionCounts[a._id] = a.count; });

        const targetCounts = {};
        byTarget.forEach(t => { targetCounts[t._id] = t.count; });

        return { actionCounts, targetCounts };
    }

    async moderatorSummary(moderatorId, { from, to } = {}) {
        if (!moderatorId) throw new Error('moderatorId is required');

        const match = { moderator_id: moderatorId };
        if (from || to) {
            match.created_at = {};
            if (from) match.created_at.$gte = new Date(from);
            if (to) match.created_at.$lte = new Date(to);
        }

        const byAction = await this.ModeratorActivity.aggregate([
            { $match: match },
            { $group: { _id: '$action', count: { $sum: 1 } } }
        ]);

        const totalActions = await this.ModeratorActivity.countDocuments(match);

        const actionCounts = {};
        byAction.forEach(a => { actionCounts[a._id] = a.count; });

        const reviewed = await this.ModeratorActivity.countDocuments({ moderator_id: moderatorId, action: { $in: ['restrict_chat','restrict_activity','ban','approve_report','reject_report'] }, ...(match.created_at ? { created_at: match.created_at } : {}) });

        return { moderatorId, totalActions, actionCounts, reviewedReports: reviewed };
    }
}

export default ModeratorService;
