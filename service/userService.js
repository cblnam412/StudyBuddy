import { User, ModeratorApplication, UserWarning, Document, EventUser } from "../models/index.js";
import bcrypt from "bcrypt";
import sendVerificationEmail from "../utils/sendEmail.js";
import path from "path";

const MAX_POINTS = {
    document: 30,
    event: 30,
    report: 15,
    activity: 20,
};

export class UserService {
    constructor(User, ModeratorApplication, UserWarning, Document, EventUser, supabase, ReputationLog, ReputationScore) {
        this.User = User;
        this.ModeratorApplication = ModeratorApplication;
        this.UserWarning = UserWarning;
        this.Document = Document;
        this.EventUser = EventUser;
        this.supabase = supabase;
        this.MAX_POINTS = MAX_POINTS;
        this.ReputationLog = ReputationLog;
        this.ReputationScore = ReputationScore;
    }

    async viewUserInfo(userId) {
        const user = await this.User.findById(userId)
            .select("-password -resetPasswordToken -resetPasswordExpires -create_at -update_at -__v");

        if (!user) {
            throw new Error("Không tìm thấy người dùng.");
        }
        return user;
    }

    async updateUserInfo(userId, data) {
        const { full_name, phone_number, address, studentId, DOB, faculty } = data;
        const user = await this.User.findById(userId);

        if (!user) {
            throw new Error("Không tìm thấy người dùng.");
        }

        if (phone_number || studentId) {
            const orChecks = [];
            if (phone_number) orChecks.push({ phone_number });
            if (studentId) orChecks.push({ studentId });

            const existingInfo = await this.User.findOne({
                $or: orChecks,
                _id: { $ne: userId }
            });

            if (existingInfo) {
                throw new Error("Số điện thoại hoặc MSSV đã tồn tại.");
            }
        }

        if (DOB) {
            const dateOfBirth = new Date(DOB);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (isNaN(dateOfBirth.getTime())) {
                throw new Error("Ngày sinh không hợp lệ.");
            }
            if (dateOfBirth >= yesterday) {
                throw new Error("Ngày sinh không thể là ngày trong tương lai.");
            }
            user.DOB = dateOfBirth;
        }

        if (full_name) user.full_name = full_name;
        if (address) user.address = address;
        if (phone_number) user.phone_number = phone_number;
        if (studentId) user.studentId = studentId;
        if (faculty) user.faculty = faculty;

        await user.save();

        const updatedUser = await this.User.findById(userId)
            .select("-password -resetPasswordToken -resetPasswordExpires -create_at -update_at -__v");

        return updatedUser;
    }

    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.User.findById(userId).select("+password");
        if (!user) {
            throw new Error("Không tìm thấy người dùng.");
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new Error("Mật khẩu cũ không đúng.");
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
    }

    async sendEmailChangeOtp(userId, newEmail) {
        const user = await this.User.findById(userId);
        if (!user) {
            throw new Error("Không tìm thấy người dùng.");
        }

        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        user.emailChangeOtp = otp;
        user.emailChangeNew = newEmail;
        user.emailChangeExpires = Date.now() + 10 * 60 * 1000;

        await user.save();
        await sendVerificationEmail(newEmail, otp); 
    }

    async verifyEmailChange(userId, otp) {
        const user = await this.User.findById(userId);
        if (!user) {
            throw new Error("Không tìm thấy người dùng.");
        }

        if (!user.emailChangeOtp || user.emailChangeOtp !== otp || user.emailChangeExpires < Date.now()) {
            throw new Error("Mã OTP không hợp lệ hoặc đã hết hạn.");
        }

        user.email = user.emailChangeNew;
        user.emailChangeOtp = undefined;
        user.emailChangeNew = undefined;
        user.emailChangeExpires = undefined;

        await user.save();
        return user.email; 
    }

    async updateAvatar(userId, file) {
        if (!file) {
            throw new Error("Thiếu file ảnh");
        }

        const user = await this.User.findById(userId);
        if (!user) {
            throw new Error("Không tìm thấy người dùng");
        }

        if (!file.mimetype.startsWith("image/")) {
            throw new Error("Chỉ cho phép upload ảnh (jpg, png, webp, ...)");
        }

        if (file.size > 1024 * 1024 * 3) { // 3MB
            throw new Error("Dung lượng ảnh tối đa 3MB");
        }

        const ext = path.extname(file.originalname);
        const fileName = `${userId}_${Date.now()}${ext}`;

        const { error: uploadError } = await this.supabase.storage
            .from("avatars")
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Upload thất bại: ${uploadError.message}`);
        }

        const { data: publicData } = this.supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);
        const publicUrl = publicData.publicUrl;

        if (user.avatarUrl && user.avatarUrl.includes("avatars")) {
            try {
                const oldPath = user.avatarUrl.split("/avatars/")[1];
                await this.supabase.storage.from("avatars").remove([oldPath]);
            } catch (err) {
                console.warn("Không thể xóa avatar cũ:", err.message);
            }
        }

        user.avatarUrl = publicUrl;
        await user.save();
        return publicUrl;
    }

    async applyForModerator(userId, reason) {
        const user = await this.User.findById(userId);
        if (!user) {
            throw new Error("Không tìm thấy người dùng.");
        }

        if (user.system_role !== "user") {
            throw new Error(`Bạn đã có quyền ${user.system_role}`);
        }

        const existingApplication = await this.ModeratorApplication.findOne({ user_id: userId });

        if (existingApplication) {
            if (existingApplication.status === "reviewed" || existingApplication.status === "approved") {
                throw new Error("Bạn đã có yêu cầu đang chờ duyệt hoặc đã được duyệt.");
            }
            if (existingApplication.status === "rejected") {
                const reviewDate = existingApplication.review_date || existingApplication.created_at;
                const nextAllowedDate = new Date(reviewDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 ngày cooldown

                if (Date.now() < nextAllowedDate.getTime()) {
                    const remainingDays = Math.ceil((nextAllowedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    throw new Error(`Yêu cầu của bạn đã bị từ chối trước đây. Vui lòng thử lại sau ${remainingDays} ngày nữa.`);
                }
            }
        }

        const errors = [];
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        // 1. Thời gian hoạt động
        const activeDays = (Date.now() - user.create_at.getTime()) / (1000 * 60 * 60 * 24);
        if (activeDays < 30) {
            errors.push(`Thời gian hoạt động tối thiểu phải là 30 ngày (Hiện tại: ${Math.floor(activeDays)} ngày).`);
        }

        // 2. Điểm danh tiếng
        if (user.reputation_score < 70) {
            errors.push(`Điểm danh tiếng tối thiểu phải là 70 (Hiện tại: ${user.reputation_score}).`);
        }

        // 3. Đóng góp
        const [activeDocumentsCount, attendedEventsCount] = await Promise.all([
            this.Document.countDocuments({ uploader_id: userId, status: "active" }),
            this.EventUser.countDocuments({ user_id: userId, is_attended: true })
        ]);
        if (activeDocumentsCount < 8 && attendedEventsCount < 12) {
            errors.push(`Đóng góp nội dung chưa đủ: cần có >= 8 tài liệu hợp lệ HOẶC >= 12 sự kiện đã tham gia. (Tài liệu: ${activeDocumentsCount}, Sự kiện: ${attendedEventsCount})`);
        }

        // 4. Tỷ lệ tham gia sự kiện (60 ngày)
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const recentEvents = await this.EventUser.find({
            user_id: userId,
            registered_at: { $gt: sixtyDaysAgo },
        });
        const recentEventsCount = recentEvents.length;
        const attendedRecentEventsCount = recentEvents.filter(e => e.is_attended).length;

        if (recentEventsCount > 0) {
            const attendanceRate = attendedRecentEventsCount / recentEventsCount;
            if (attendanceRate < 0.6) {
                errors.push(`Tỷ lệ tham gia sự kiện đã đăng ký trong 60 ngày gần nhất phải đạt 60% (Hiện tại: ${(attendanceRate * 100).toFixed(2)}%).`);
            }
        }

        // 5. Vi phạm nặng (90 ngày)
        const severeViolations = await this.UserWarning.countDocuments({
            user_id: userId,
            violation_level: { $in: [2, 3] },
            created_at: { $gt: ninetyDaysAgo },
        });
        if (severeViolations > 0) {
            errors.push(`Vi phạm: Không được có vi phạm Mức 2-3 trong 90 ngày gần nhất.`);
        }

        // 6. Vi phạm nhẹ (90 ngày)
        const oneViolations = await this.UserWarning.countDocuments({
            user_id: userId,
            violation_level: 1,
            created_at: { $gt: ninetyDaysAgo },
        });
        if (oneViolations >= 3) {
            errors.push(`Vi phạm: Tổng số lần cảnh cáo Mức 1 trong 90 ngày gần nhất không được vượt quá 2 (Hiện tại: ${oneViolations} lần).`);
        }

        const applicationStatus = errors.length === 0 ? "reviewed" : "rejected";
        const responseMessage = errors.length === 0
            ? "Yêu cầu đã vượt qua vòng kiểm tra tự động và đang chờ Admim xem xét hồ sơ."
            : "Yêu cầu không đủ điều kiện tối thiểu để vào vòng xét duyệt tự động.";

        const newApplication = await this.ModeratorApplication.create({
            user_id: userId,
            reason: reason || null,
            status: applicationStatus,
            review_date: applicationStatus === "rejected" ? new Date() : undefined,
            auto_check_errors: errors.length > 0 ? errors : undefined
        });

        return { message: responseMessage, application: newApplication };
    }

    async incrementUserReputation(userId, points, reason, type) {
        if (!userId || !points) throw new Error("UserId và points không được rỗng");

        type = (type || "general").toLowerCase().trim();

        // cập nhật điểm trong ReputationScore
        const updateFieldMap = {
            document: "document_score",
            event: "event_score",
            report: "report_score",
            activity: "activity_score",
            general: null,
        };

        const field = updateFieldMap[type] || null;

        // upsert: tạo record nếu chưa có
        let repScore = await this.ReputationScore.findOne({ user_id: userId });
        if (!repScore) {
            repScore = await this.ReputationScore.create({ user_id: userId });
        }

        if (field) {
            // cộng điểm
            let newScore = (repScore[field] || 0) + points;
            // Giới hạn điểm cộng tối đa
            if (this.MAX_POINTS[field] !== undefined) {
                if (newScore > this.MAX_POINTS[field]) newScore = this.MAX_POINTS[field];
            }
            repScore[field] = newScore;
        }

        // tính lại total_score
        repScore.total_score =
            (repScore.document_score || 0) +
            (repScore.event_score || 0) +
            (repScore.report_score || 0) +
            (repScore.activity_score || 0);

        await repScore.save();

        // tạo log
        await this.ReputationLog.create({
            user_id: userId,
            points_change: points,
            reason: reason,
            type: type,
        });

        const updatedUser = await this.User.findById(userId);
        updatedUser.reputation_score = repScore.total_score;
        await updatedUser.save();

        return repScore;
    }
}