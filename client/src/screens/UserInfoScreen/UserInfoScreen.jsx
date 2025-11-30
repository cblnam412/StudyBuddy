import React, { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button/Button";
import { Edit2, Save, X, Upload, Lock, Mail, ShieldCheck } from "lucide-react";
import API from "../../API/api";
import { toast } from "react-toastify";
import styles from "./UserInfoScreen.module.css";

export default function UserInfoPage() {
  const { userInfo, setUserInfo, accessToken } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showModeratorModal, setShowModeratorModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailData, setEmailData] = useState({
    newEmail: "",
    otp: "",
    otpSent: false,
  });
  const [moderatorReason, setModeratorReason] = useState("");
  const [formData, setFormData] = useState({
    full_name: userInfo.full_name || "",
    email: userInfo.email || "",
    phone_number: userInfo.phone_number || "",
    studentId: userInfo.studentId || "",
    DOB: userInfo.DOB ? userInfo.DOB.split("T")[0] : "",
    address: userInfo.address || "",
    faculty: userInfo.faculty || "",
    enrollment_year: userInfo.enrollment_year || "",
  });
    const [displayedFullName, setDisplayedFullName] = useState(userInfo.full_name || "");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(`${API}/user/update-avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUserInfo((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
        toast.success(data.message || "Cập nhật avatar thành công!");
      } else {
        toast.warning(data.message || "Có lỗi xảy ra khi cập nhật avatar");
      }
    } catch (error) {
      console.error("Failed to upload avatar", error);
      toast.error("Có lỗi xảy ra khi cập nhật avatar");
    }
  };

  const handleSave = async () => {
    try {
      if (formData.full_name.trim() === "")
      {
          toast.warning("Họ tên không được trống!");
          return;
      }
      if (formData.phone_number.trim() === "")
      {
          toast.warning("Số điện thoại không được trống!");
          return;
      }
      
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(formData.phone_number.trim()))
      {
          toast.warning("Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số!");
          return;
      }
      
      if (formData.DOB === "")
      {
          toast.warning("Ngày sinh không được trống!");
          return;
      }
      
      const dobDate = new Date(formData.DOB);
      if (isNaN(dobDate.getTime()))
      {
          toast.warning("Ngày sinh không hợp lệ!");
          return;
      }
      
      if (dobDate > new Date())
      {
          toast.warning("Ngày sinh không thể là ngày trong tương lai!");
          return;
      }
      
      if (dobDate.getFullYear() < 1900)
      {
          console.log(dobDate.getFullYear());
          toast.warning("Năm sinh phải từ 1900 trở về sau!");
          return;
      }
      if (formData.studentId.trim() === "")
      {
          toast.warning("Mã số sinh viên không được trống!");
          return;
      }
      
      const studentIdRegex = /^\d{8}$/;
      if (!studentIdRegex.test(formData.studentId.trim()))
      {
          toast.warning("Mã số sinh viên phải có 8 chữ số!");
          return;
      }
      
      if (formData.address.trim() === "")
      {
          toast.warning("Địa chỉ không được trống!");
          return;
      }
      
      if (formData.enrollment_year === "")
      {
          toast.warning("Năm nhập học không được trống!");
          return;
      }
      
      const currentYear = new Date().getFullYear();
      const enrollmentYear = parseInt(formData.enrollment_year);
      
      if (isNaN(enrollmentYear) || enrollmentYear < 2006)
      {
          toast.warning("Năm nhập học không hợp lệ!");
          return;
      }
      
      if (enrollmentYear > currentYear)
      {
          toast.warning("Năm nhập học không thể là năm trong tương lai!");
          return;
      }
      
      const res = await fetch(`${API}/user/update-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim(),
          studentId: formData.studentId.trim(),
          DOB: formData.DOB,
          address: formData.address.trim(),
          faculty: formData.faculty,
          enrollment_year: formData.enrollment_year,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setUserInfo((prev) => ({ ...prev, ...data.user }));
        setDisplayedFullName(formData.full_name);
        setIsEditing(false);
        toast.success(data.message || "Cập nhật thông tin thành công!");
      } else {
        toast.warning(data.message || "Có lỗi xảy ra khi cập nhật thông tin");
      }
    } catch (error) {
      console.error("Failed to update user info", error);
      toast.error("Có lỗi xảy ra khi cập nhật thông tin");
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: userInfo.full_name || "",
      email: userInfo.email || "",
      phone_number: userInfo.phone_number || "",
      studentId: userInfo.studentId || "",
      DOB: userInfo.DOB ? userInfo.DOB.split("T")[0] : "",
      address: userInfo.address || "",
      faculty: userInfo.faculty || "",
      enrollment_year: userInfo.enrollment_year || "",
    });
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu mới không khớp!");
      return;
    }

    try {
      const res = await fetch(`${API}/user/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Đổi mật khẩu thành công!");
        setShowPasswordModal(false);
        setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.warning(data.message || "Có lỗi xảy ra khi đổi mật khẩu");
      }
    } catch (error) {
      console.error("Failed to change password", error);
      toast.error("Có lỗi xảy ra khi đổi mật khẩu");
    }
  };

  const handleSendEmailOtp = async () => {
    try {
      const res = await fetch(`${API}/user/change-email/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ newEmail: emailData.newEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Mã OTP đã được gửi!");
        setEmailData((prev) => ({ ...prev, otpSent: true }));
      } else {
        toast.warning(data.message || "Có lỗi xảy ra khi gửi OTP");
      }
    } catch (error) {
      console.error("Failed to send OTP", error);
      toast.error("Có lỗi xảy ra khi gửi OTP");
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const res = await fetch(`${API}/user/change-email/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ otp: emailData.otp }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Đổi email thành công!");
        setUserInfo((prev) => ({ ...prev, email: data.newEmail }));
        setFormData((prev) => ({ ...prev, email: data.newEmail }));
        setShowEmailModal(false);
        setEmailData({ newEmail: "", otp: "", otpSent: false });
      } else {
        toast.warning(data.message || "Có lỗi xảy ra khi xác thực OTP");
      }
    } catch (error) {
      console.error("Failed to verify email", error);
      toast.error("Có lỗi xảy ra khi xác thực OTP");
    }
  };

  const handleApplyModerator = async () => {
    if (!moderatorReason.trim()) {
      toast.error("Vui lòng nhập lý do ứng tuyển!");
      return;
    }

    try {
      const res = await fetch(`${API}/user/apply-moderator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: moderatorReason }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Đã gửi đơn ứng tuyển moderator!");
        setShowModeratorModal(false);
        setModeratorReason("");
      } else {
        toast.warning(data.message || "Có lỗi xảy ra khi gửi đơn ứng tuyển");
      }
    } catch (error) {
      console.error("Failed to apply for moderator", error);
      toast.error("Có lỗi xảy ra khi gửi đơn ứng tuyển");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>
              {userInfo.avatarUrl ? (
                <img src={userInfo.avatarUrl} alt="Ảnh đại diện" />
              ) : (
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"
                  alt="Ảnh đại diện"
                />
              )}
            </div>
            <label htmlFor="avatar-upload" className={styles.uploadButton}>
              <Upload size={16} />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
          <div className={styles.basicInfo}>
            <h2>{displayedFullName}</h2>
            <p>Điểm uy tín: {userInfo.reputation_score}</p>
            <p>Số lượt vi phạm: {userInfo.violation_count} </p>
          </div>
        </div>
        <div className={styles.actions}>
          {!isEditing ? (
            <Button
              icon={Edit2}
              onClick={() => setIsEditing(true)}
              originalColor="transparent"
              hooverColor="#007BFF"
              style={{ color: "white" }}
            >
              Chỉnh sửa thông tin
            </Button>
          ) : (
            <div className={styles.editActions}>
              <Button
                icon={Save}
                onClick={handleSave}
                originalColor="transparent"
                hooverColor="#66ff66"
                style={{ color: "white" }}
              >
                Lưu
              </Button>
              <Button
                icon={X}
                onClick={handleCancel}
                originalColor="transparent"
                hooverColor="#dc3545"
                style={{ color: "white" }}
              >
                Hủy
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            className={styles.input}
            placeholder=" "
            disabled={!isEditing}
          />
          <label>Họ và tên</label>
        </div>

        {!isEditing && (
          <div className={styles.infoItem}>
            <input
              type="email"
              value={formData.email}
              className={styles.input}
              placeholder=" "
              disabled
            />
            <label>Email</label>
          </div>
        )}

        <div className={styles.infoItem}>
          <input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleInputChange}
            className={styles.input}
            placeholder=" "
            disabled={!isEditing}
          />
          <label>Số điện thoại</label>
        </div>

        <div className={styles.infoItem}>
          <input
            type="text"
            name="studentId"
            value={formData.studentId}
            onChange={handleInputChange}
            className={styles.input}
            placeholder=" "
            disabled={!isEditing}
          />
          <label>Mã số sinh viên</label>
        </div>

        <div className={styles.infoItem}>
          <input
            type="date"
            name="DOB"
            value={formData.DOB}
            onChange={handleInputChange}
            className={styles.input}
            placeholder=" "
            disabled={!isEditing}
          />
          <label>Ngày sinh</label>
        </div>

        <div className={styles.infoItem}>
          <select
            name="faculty"
            value={formData.faculty}
            onChange={handleInputChange}
            className={styles.input}
            disabled={!isEditing}
          >
            <option value="SE">Công nghệ phần mềm (SE)</option>
            <option value="CS">Khoa học máy tính (CS)</option>
            <option value="CE">Kỹ thuật máy tính (CE)</option>
            <option value="IS">Hệ thống thông tin (IS)</option>
          </select>
          <label>Khoa</label>
        </div>

        <div className={styles.infoItem}>
          <input
            type="number"
            name="enrollment_year"
            value={formData.enrollment_year}
            onChange={handleInputChange}
            className={styles.input}
            placeholder=" "
            disabled={!isEditing}
            min="1900"
            max={new Date().getFullYear()}
          />
          <label>Năm nhập học</label>
        </div>

        <div className={styles.infoItem + " " + styles.fullWidth}>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            className={styles.textarea}
            rows="3"
            placeholder=" "
            disabled={!isEditing}
          />
          <label>Địa chỉ</label>
        </div>
      </div>

      {/* Security Section */}
      <div className={styles.securitySection}>
        <h3>Bảo mật</h3>
        <div className={styles.securityActions}>
          <Button
            icon={Lock}
            onClick={() => setShowPasswordModal(true)}
            originalColor="transparent"
            hooverColor="#f59e0b"
            style={{ color: "#f59e0b", flex: 1 }}
          >
            Đổi mật khẩu
          </Button>
          <Button
            icon={Mail}
            onClick={() => setShowEmailModal(true)}
            originalColor="transparent"
            hooverColor="#8b5cf6"
            style={{ color: "#8b5cf6", flex: 1 }}
          >
            Đổi email
          </Button>
        </div>
      </div>

      {/* Moderator Application Section */}
      {userInfo.system_role === "user" && (
        <div className={styles.securitySection}>
          <h3>Yêu cầu nâng quyền</h3>
          <div className={styles.securityActions}>
            <Button
              icon={ShieldCheck}
              onClick={() => setShowModeratorModal(true)}
              originalColor="transparent"
              hooverColor="#3b82f6"
              style={{ color: "#3b82f6", flex: 1 }}
            >
              Ứng tuyển làm moderator
            </Button>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Đổi mật khẩu</h3>
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, oldPassword: e.target.value }))
                  }
                  className={styles.input}
                  placeholder=" "
                />
                <label>Mật khẩu cũ</label>
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className={styles.input}
                  placeholder=" "
                />
                <label>Mật khẩu mới</label>
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className={styles.input}
                  placeholder=" "
                />
                <label>Xác nhận mật khẩu mới</label>
              </div>
              <div className={styles.modalActions}>
                <Button
                  onClick={handleChangePassword}
                  originalColor="transparent"
                  hooverColor="#66ff66"
                >
                  Xác nhận
                </Button>
                <Button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  originalColor="transparent"
                  hooverColor="#EF4444"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEmailModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Đổi email</h3>
            <div className={styles.modalContent}>
              {!emailData.otpSent ? (
                <>
                  <div className={styles.inputGroup}>
                    <input
                      type="email"
                      value={emailData.newEmail}
                      onChange={(e) =>
                        setEmailData((prev) => ({ ...prev, newEmail: e.target.value }))
                      }
                      className={styles.input}
                      placeholder=" "
                    />
                    <label>Email mới</label>
                  </div>
                  <div className={styles.modalActions}>
                    <Button
                      onClick={handleSendEmailOtp}
                      originalColor="transparent"
                      hooverColor="#66ff66"
                    >
                      Gửi mã OTP
                    </Button>
                    <Button
                      onClick={() => {
                        setShowEmailModal(false);
                        setEmailData({ newEmail: "", otp: "", otpSent: false });
                      }}
                      originalColor="transparent"
                      hooverColor="#EF4444"
                    >
                      Hủy
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      value={emailData.otp}
                      onChange={(e) =>
                        setEmailData((prev) => ({ ...prev, otp: e.target.value }))
                      }
                      className={styles.input}
                      placeholder=" "
                    />
                    <label>Mã OTP</label>
                  </div>
                  <div className={styles.modalActions}>
                    <Button
                      onClick={handleVerifyEmail}
                      originalColor="transparent"
                      hooverColor="#10B981"
                    >
                      Xác nhận
                    </Button>
                    <Button
                      onClick={() => {
                        setShowEmailModal(false);
                        setEmailData({ newEmail: "", otp: "", otpSent: false });
                      }}
                      originalColor="transparent"
                      hooverColor="#EF4444"
                    >
                      Hủy
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showModeratorModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModeratorModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Ứng tuyển làm Moderator</h3>
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <textarea
                  value={moderatorReason}
                  onChange={(e) => setModeratorReason(e.target.value)}
                  className={styles.textarea}
                  rows="5"
                  placeholder=" "
                />
                <label>Lý do ứng tuyển</label>
              </div>
              <div className={styles.modalActions}>
                <Button
                  onClick={handleApplyModerator}
                  originalColor="transparent"
                  hooverColor="#66ff66"
                >
                  Gửi đơn
                </Button>
                <Button
                  onClick={() => {
                    setShowModeratorModal(false);
                    setModeratorReason("");
                  }}
                  originalColor="transparent"
                  hooverColor="#EF4444"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
