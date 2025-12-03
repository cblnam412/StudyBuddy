// Repository Pattern - Abstract data access layer
// Provides a consistent interface for data operations

/**
 * Base Repository with common CRUD operations
 */
export class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    /**
     * Find by ID
     */
    async findById(id, projection = null) {
        return await this.model.findById(id).select(projection);
    }

    /**
     * Find one by criteria
     */
    async findOne(criteria, projection = null) {
        return await this.model.findOne(criteria).select(projection);
    }

    /**
     * Find all by criteria
     */
    async find(criteria = {}, options = {}) {
        const { 
            projection = null, 
            sort = null, 
            limit = null, 
            skip = null,
            populate = null 
        } = options;

        let query = this.model.find(criteria);

        if (projection) query = query.select(projection);
        if (sort) query = query.sort(sort);
        if (limit) query = query.limit(limit);
        if (skip) query = query.skip(skip);
        if (populate) query = query.populate(populate);

        return await query;
    }

    /**
     * Create new document
     */
    async create(data) {
        return await this.model.create(data);
    }

    /**
     * Update by ID
     */
    async updateById(id, data) {
        return await this.model.findByIdAndUpdate(
            id, 
            data, 
            { new: true, runValidators: true }
        );
    }

    /**
     * Update one by criteria
     */
    async updateOne(criteria, data) {
        return await this.model.findOneAndUpdate(
            criteria,
            data,
            { new: true, runValidators: true }
        );
    }

    /**
     * Update many
     */
    async updateMany(criteria, data) {
        return await this.model.updateMany(criteria, data);
    }

    /**
     * Delete by ID
     */
    async deleteById(id) {
        return await this.model.findByIdAndDelete(id);
    }

    /**
     * Delete one by criteria
     */
    async deleteOne(criteria) {
        return await this.model.findOneAndDelete(criteria);
    }

    /**
     * Delete many
     */
    async deleteMany(criteria) {
        return await this.model.deleteMany(criteria);
    }

    /**
     * Count documents
     */
    async count(criteria = {}) {
        return await this.model.countDocuments(criteria);
    }

    /**
     * Check if exists
     */
    async exists(criteria) {
        const count = await this.model.countDocuments(criteria);
        return count > 0;
    }

    /**
     * Paginate results
     */
    async paginate(criteria = {}, page = 1, limit = 10, options = {}) {
        const skip = (page - 1) * limit;
        const { sort = null, projection = null, populate = null } = options;

        let query = this.model.find(criteria);

        if (projection) query = query.select(projection);
        if (sort) query = query.sort(sort);
        if (populate) query = query.populate(populate);

        const [documents, total] = await Promise.all([
            query.skip(skip).limit(limit),
            this.model.countDocuments(criteria)
        ]);

        return {
            documents,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        };
    }

    /**
     * Aggregate
     */
    async aggregate(pipeline) {
        return await this.model.aggregate(pipeline);
    }

    /**
     * Bulk write operations
     */
    async bulkWrite(operations) {
        return await this.model.bulkWrite(operations);
    }
}

/**
 * Specialized User Repository with custom queries
 */
export class UserRepository extends BaseRepository {
    /**
     * Find user by email or phone
     */
    async findByEmailOrPhone(emailOrPhone) {
        return await this.model.findOne({
            $or: [
                { email: emailOrPhone },
                { phone_number: emailOrPhone }
            ]
        });
    }

    /**
     * Find active users only
     */
    async findActiveUsers(criteria = {}) {
        return await this.find({ ...criteria, status: 'active' });
    }

    /**
     * Find users by role
     */
    async findByRole(role) {
        return await this.find({ role });
    }

    /**
     * Count users by role
     */
    async countByRole() {
        return await this.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
    }

    /**
     * Check if email exists
     */
    async emailExists(email, excludeUserId = null) {
        const criteria = { email };
        if (excludeUserId) {
            criteria._id = { $ne: excludeUserId };
        }
        return await this.exists(criteria);
    }
}

/**
 * Room Repository with custom queries
 */
export class RoomRepository extends BaseRepository {
    /**
     * Find public rooms
     */
    async findPublicRooms(options = {}) {
        return await this.find({ status: 'public' }, options);
    }

    /**
     * Find rooms by status
     */
    async findByStatus(status, options = {}) {
        return await this.find({ status }, options);
    }

    /**
     * Count rooms by status
     */
    async countByStatus() {
        return await this.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
    }

    /**
     * Search rooms by name or description
     */
    async searchRooms(searchTerm, options = {}) {
        const criteria = {
            $or: [
                { room_name: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ]
        };
        return await this.find(criteria, options);
    }
}

/**
 * Usage in services:
 * 
 * import { UserRepository } from '../repositories/BaseRepository.js';
 * import { User } from '../models/index.js';
 * 
 * const userRepo = new UserRepository(User);
 * 
 * // Simple operations
 * const user = await userRepo.findById(userId);
 * const allUsers = await userRepo.findActiveUsers();
 * 
 * // Pagination
 * const { documents, pagination } = await userRepo.paginate(
 *     { status: 'active' },
 *     page,
 *     limit,
 *     { sort: '-created_at' }
 * );
 * 
 * // Custom queries
 * const user = await userRepo.findByEmailOrPhone(email);
 */
