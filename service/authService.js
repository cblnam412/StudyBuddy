import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"
import mongoose from "mongoose";

export class AuthService {
    constructor(userModel, pendingUserModel, emailUtil, sendReset) {
        this.User = userModel;
        this.PendingUser = pendingUserModel;
        this.sendVerificationEmail = emailUtil;
        this.sendResetPasswordEmail = sendReset;
    }

    async Register(userData) {
        const { full_name, email, phone_number, studentId, DOB, password, address, enrollment_year, faculty } = userData;

        const session = await mongoose.startSession();
        try {

            if (!email) {
                throw new Error("Thiếu thông tin xác thực!");
            }

            await session.withTransaction(async () => {
                const existingUser = await this.User.findOne({
                    $or: [{ email }, { phone_number }, { studentId }]
                }).session(session);

                const pendingUser = await this.PendingUser.findOne({
                    $or: [{ email }, { phone_number }, { studentId }]
                }).session(session);

                if (existingUser || pendingUser) {
                    let message;

                    if (existingUser?.studentId === studentId) {
                        message = "Mã số sinh viên này đã được sử dụng.";
                    } else if (existingUser?.email === email) {
                        message = "Email này đã được sử dụng.";
                    } else if (pendingUser?.email === email) {
                        message = "Email đang được chờ xác thực.";
                    } else if (existingUser?.phone_number === phone_number) {
                        message = "Số điện thoại này đã được sử dụng.";
                    } else if (pendingUser?.studentId === studentId) {
                        message = "Mã số sinh viên này đang được chờ xác thực.";
                    } else if (pendingUser?.phone_number === phone_number) {
                        message = "Số điện thoại đang được chờ xác thực.";
                    }
                    throw new Error(message);
                }

                const currentYear = new Date().getFullYear();
                const enrollment = Number(enrollment_year);
                //console.log(enrollment);

                if (!enrollment || isNaN(enrollment) || enrollment.toString().trim() === "") {
                    throw new Error("Năm nhập học phải là số và không được để trống");
                } else if (enrollment < 1900 || enrollment > currentYear) {
                    throw new Error(`Năm nhập học phải nằm trong khoảng 1900 đến ${currentYear}`);
                }

                let dateOfBirth;
                if (DOB) {
                    dateOfBirth = new Date(DOB);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (isNaN(dateOfBirth.getTime())) throw new Error("Ngày sinh không hợp lệ.");
                    if (dateOfBirth >= yesterday) throw new Error("Ngày sinh không thể là ngày trong tương lai.");
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const otp = (Math.floor(100000 + Math.random() * 900000)).toString();

                await this.PendingUser.deleteMany({ email }, { session });

                await this.PendingUser.create(
                    [{
                        full_name, email, phone_number, studentId, DOB: dateOfBirth,
                        password: hashedPassword, address, enrollment_year, faculty,
                        otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                    }],
                    { session }
                );

                await this.sendVerificationEmail(email, otp);
            });

            return email;
        } catch (error) {
            throw error;
        } finally {
            session.endSession();
        }
    }

    async SendEmail(Data) {
        try {
            const { email } = Data;

            const pending = await this.PendingUser.findOne({ email });
            if (!pending) throw new Error("Chưa đăng ký thông tin hoặc thông tin đã hết hạn");

            // tạo OTP ngẫu nhiên có 6 số
            const otp = (Math.floor(100000 + Math.random() * 900000)).toString();

            pending.otp = otp;
            await pending.save();

            await this.sendVerificationEmail(email, otp);

            return;
        } catch (err) {
            throw err;
        }
    }

    async VerifyOTP(Data) {
        try {
            const { email, otp } = Data;

            const pending = await this.PendingUser.findOne({ email });
            if (!pending) throw new Error("Chưa đăng ký thông tin hoặc thông tin đã hết hạn");

            console.log("sai here");
            if (pending.otp !== otp) throw new Error("Mã OTP không đúng");

            

            // sau khi xác nhận otp hợp lệ thì chính thức tạo tài khoản user
            const newUser = new this.User({
                full_name: pending.full_name,
                email: pending.email,
                phone_number: pending.phone_number,
                studentId: pending.studentId,
                DOB: pending.DOB,
                password: pending.password,
                address: pending.address,
                enrollment_year: pending.enrollment_year,
                faculty: pending.faculty,
                status: "active"
            });

            await newUser.save();
            await this.PendingUser.deleteOne({ email });

            return newUser;
        } catch (err) {
            throw err;
        }
    }

    async Login(Data) {
        try {
            const { emailOrPhone, password } = Data;
            const user = await this.User.findOne({
                $or: [{ email: emailOrPhone }, { phone_number: emailOrPhone }]
            });
            if (!user) throw new Error("Tài khoản không tồn tại");

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) throw new Error("Sai mật khẩu");

            const token = jwt.sign({ id: user._id, role: user.system_role }, process.env.JWT_SECRET, {
                expiresIn: "1d",
            });

            return { token, user: {
                ...user.toObject(),
            } };
            
        } catch (err) {
            throw err;
        }
    }

    async ForgotPassword(Data) {
        try {
            const { email } = Data;
            const user = await this.User.findOne({ email });
            if (!user) {
                throw new Error("Không tìm thấy email.");
            }

            const resetToken = crypto.randomBytes(32).toString("hex");
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
            await user.save();
            const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
            await this.sendResetPasswordEmail(email, resetUrl);

            return true;
        } catch (err) {
            throw err;
        }
    }

    async ResetPassword(Data) {
        try {
            const { token, newPassword } = Data;
            const user = await this.User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: Date.now() }
            });
            if (!user) throw new Error("Token không hợp lệ hoặc đã hết hạn.");

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            return true;
        } catch (err) {
            throw err;
        }
    }

    async updateLoginStreak(userId) {
        const user = await this.User.findById(userId);
        const today = new Date();
        const last = user.last_login;

        // normalize ngày (loại giờ, phút) để tránh lệch timezone
        const normalize = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

        const todayNormalized = normalize(today);

        // lần đầu đăng nhập thì set
        if (!last) {
            user.streak_count = 1;
            user.last_login = todayNormalized;
            await user.save();
            return user.streak_count;
        }

        const lastNormalized = normalize(last);

        const diffDays = Math.floor(
            (todayNormalized - lastNormalized) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 0) {
            // đăng nhập cùng ngày, không tăng streak
            return user.streak_count;
        }
        if (diffDays === 1) {
            // đăng nhập liên tiếp, tăng streak
            user.streak_count += 1;
        } else {
            // đăng nhập cách vài ngày, reset streak
            user.streak_count = 1;
        }

        user.last_login = todayNormalized;
        await user.save();

        return user.streak_count;
    }

}