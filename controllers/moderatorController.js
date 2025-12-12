import { ModeratorActivity, Report, RoomRequest, User } from "../models/index.js";
import ModeratorService from "../service/moderatorService.js";

const moderatorService = new ModeratorService(ModeratorActivity, Report, RoomRequest, User);

export const listModeratorActivities = async (req, res, next) => {
    try {
        const { moderatorId, action, target_type, page, limit, from, to } = req.query;
        const result = await moderatorService.listActivities({ moderatorId, action, target_type, page: parseInt(page) || 1, limit: parseInt(limit) || 20, from, to });
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const getActivityStats = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const stats = await moderatorService.activityStats({ from, to });
        res.status(200).json(stats);
    } catch (err) {
        next(err);
    }
};

export const getModeratorSummary = async (req, res, next) => {
    try {
        const moderatorId = req.params.id;
        const { from, to } = req.query;
        const summary = await moderatorService.moderatorSummary(moderatorId, { from, to });
        res.status(200).json(summary);
    } catch (err) {
        next(err);
    }
};

export default { listModeratorActivities, getActivityStats, getModeratorSummary };
