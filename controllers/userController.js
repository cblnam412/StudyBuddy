import { User, ModeratorApplication, UserWarning, Document , EventUser} from "../models/index.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendVerificationEmail from "../utils/sendEmail.js";
import { supabase } from "./documentController.js";
import path from "path";

export const viewUserInfo = async (req, res) => {
    try {
        res.json({
            message: "Lấy thông tin profile người dùng thành công.",
            user: req.user
        })
    } catch(error){
        res.status(500).json({message: "LỖI SERVER: ", error: error.message});
    }
};

export const updateUserInfo = async (req, res) => {
    try {
        const { full_name, phone_number, address, email, faculty } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        if (full_name) user.full_name = full_name;
        if (phone_number) user.phone_number = phone_number;
        if (address) user.address = address;
        if (email) user.email = email;
        if (faculty) user.faculty = faculty;

        await user.save();

        const updatedUser = await User.findById(user._id).select("-password -resetPasswordToken -resetPasswordExpires -create_at -update_at -__v");
        res.json({ message: "Cập nhật thông tin thành công", user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: "LỖI SERVER: ", error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");
        if(!user){
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if(!isMatch) {
            return res.status(400).json({ message: "Mật khẩu cũ không đúng." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Đổi mật khẩu thành công." });
    } catch (error) {
        res.status(500).json({ message: "LỖI SERVER: ", error: error.message });
    }
};

export const sendEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const user = await User.findById(req.user._id).select("+password");
        if(!user){
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        req.user.emailChangeOtp = otp;
        req.user.emailChangeNew = newEmail;
        req.user.emailChangeExpires = Date.now() + 10 * 60 * 1000; // 10 phút

        await req.user.save();
        await sendVerificationEmail(newEmail, otp);

        res.json({ message: "Mã OTP đã được gửi tới email mới." });
    } catch (error) {
        res.status(500).json({ message: "LỖI SERVER: ", error: error.message });
    }
};

export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if(!user){
        return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    if (!user.emailChangeOtp || user.emailChangeOtp !== otp || user.emailChangeExpires < Date.now()) {
      return res.status(400).json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn." });
    }

    user.email = user.emailChangeNew;
    user.emailChangeOtp = undefined;
    user.emailChangeNew = undefined;
    user.emailChangeExpires = undefined;

    await user.save();

    res.json({ message: "Đổi email thành công.", newEmail: user.email });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xác thực OTP", error: error.message });
  }
};


export const updateAvatar = async (req, res) => {
    try {
        const file = req.file;
        const userId = req.user._id;

        if (!file) {
            return res.status(400).json({ message: "Thiếu file ảnh" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        if (!file.mimetype.startsWith("image/")) {
            return res.status(400).json({ message: "Chỉ cho phép upload ảnh (jpg, png, webp, ...)" });
        }

        if (file.size > 1024 * 1024 * 3) {
            return res.status(400).json({ message: "Dung lượng ảnh tối đa 5MB" });
        }

        const ext = path.extname(file.originalname);
        const fileName = `${userId}_${Date.now()}${ext}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true, 
            });

        if (uploadError) {
            return res.status(500).json({ message: "Upload thất bại", error: uploadError.message });
        }

        const { data: publicData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);
        const publicUrl = publicData.publicUrl;

        if (user.avatarUrl && user.avatarUrl.includes("avatars")) {
            try {
                const oldPath = user.avatarUrl.split("/avatars/")[1];
                await supabase.storage.from("avatars").remove([oldPath]);
            } catch (err) {
                console.warn("Không thể xóa avatar cũ:", err.message);
            }
        }

        user.avatarUrl = publicUrl;
        await user.save();

        return res.json({
            message: "Cập nhật avatar thành công",
            avatarUrl: publicUrl,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
}


export const applyForModerator = async (req, res) => {
    try {
        const userId = req.user._id;
        const { reason } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng." });
        }

        if (user.system_role !== "user") {
            return res.status(400).json({ message: `Bạn đã có quyền ${user.system_role}` });
        }

        const existingApplication = await ModeratorApplication.findOne({
            user_id: userId,
        });

        if (existingApplication) {
            if (existingApplication.status === "reviewed" || existingApplication.status === "approved") {
                return res.status(400).json({ message: "Bạn đã có yêu cầu đang chờ duyệt hoặc đã được duyệt." });
            } else if (existingApplication.status === "rejected") {
                const reviewDate = existingApplication.review_date || latestApplication.created_at;
                const nextAllowedDate = new Date(reviewDate.getTime() + 30 * 24 * 60 * 60 * 1000);

                if (Date.now() < nextAllowedDate.getTime()) {
                    const remainingDays = Math.ceil((nextAllowedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return res.status(400).json({
                        message: `Yêu cầu của bạn đã bị từ chối trước đây. Vui lòng thử lại sau ${remainingDays} ngày nữa.`,
                        next_allowed_date: nextAllowedDate,
                    });
                }
            }
        }

        const errors = [];

        //1
        const activeDays = (Date.now() - user.create_at.getTime()) / (1000 * 60 * 60 * 24);
        if (activeDays < 30) {
            errors.push(`Thời gian hoạt động tối thiểu phải là 30 ngày (Hiện tại: ${Math.floor(activeDays)} ngày).`);
        }

        //2
        if (user.reputation_score < 70) {
            errors.push(`Điểm danh tiếng tối thiểu phải là 70 (Hiện tại: ${user.reputation_score}).`);
        }
        //3
        const activeDocumentsCount = await Document.countDocuments({
            uploader_id: userId,
            status: "active", 
        });
        const attendedEventsCount = await EventUser.countDocuments({
            user_id: userId,
            is_attended: true,
        });

        if (activeDocumentsCount < 8 && attendedEventsCount < 12) {
            errors.push(`Đóng góp nội dung chưa đủ: cần có >= 8 tài liệu hợp lệ HOẶC >= 12 sự kiện đã tham gia. (Tài liệu: ${activeDocumentsCount}, Sự kiện: ${attendedEventsCount})`);
        }

        //4??? WTF thật luôn? Check làm qq gì vậy chèn
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

        const recentEventsCount = await EventUser.countDocuments({
            user_id: userId,
            registered_at: { $gt: sixtyDaysAgo},
        });

        const attendedRecentEventsCount = await EventUser.countDocuments({
            user_id: userId,
            is_attended: true,
            registered_at: { $gt: sixtyDaysAgo},
        });

        if (recentEventsCount > 0) {
            const attendanceRate = attendedRecentEventsCount / recentEventsCount;
            if (attendanceRate < 0.6) {
                errors.push(`Tỷ lệ tham gia sự kiện đã đăng ký trong 60 ngày gần nhất phải đạt 60% (Hiện tại: ${(attendanceRate * 100).toFixed(2)}%).`);
            }
        }

        //5
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const severeViolations = await UserWarning.countDocuments({
            user_id: userId,
            violation_level: { $in: [2, 3] }, 
            created_at: { $gt: ninetyDaysAgo },
        });

        if (severeViolations > 0) {
            errors.push(`Vi phạm: Không được có vi phạm Mức 2-3 trong 90 ngày gần nhất.`);
        }
        //6
        const oneViolations = await UserWarning.countDocuments({
            user_id: userId,
            violation_level: 1,
            created_at: { $gt: ninetyDaysAgo },
        });

        if (oneViolations >= 3) {
            errors.push(`Vi phạm: Tổng số lần cảnh cáo Mức 1 trong 90 ngày gần nhất không được vượt quá 2 (Hiện tại: ${oneViolations} lần).`);
        }

        let applicationStatus;
        let responseMessage;

        if (errors.length === 0) {
            applicationStatus = "reviewed";
            responseMessage = "Yêu cầu đã vượt qua vòng kiểm tra tự động và đang chờ Admim xem xét hồ sơ.";
        } else {
            applicationStatus = "rejected"; 
            responseMessage = "Yêu cầu không đủ điều kiện tối thiểu để vào vòng xét duyệt tự động.";
        }

        const newApplication = await ModeratorApplication.create({
            user_id: userId,
            reason: reason || null,
            status: applicationStatus,
            review_date: applicationStatus === "rejected" ? new Date() : undefined,
            auto_check_errors: errors.length > 0 ? errors : undefined
        });


        res.status(201).json({
            message: responseMessage,
            application: newApplication
        });

    } catch (error) {
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
}