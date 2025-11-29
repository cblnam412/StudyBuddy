import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../API/api.ts";
import "./AuthPage.css";
import { useAuth } from "../context/AuthContext";

type RegisterFormState = {
  full_name: string;
  email: string;
  phone_number: string;
  studentId: string;
  DOB: string;
  password: string;
  address: string;
  enrollment_year: string;
  faculty: string;
};

type LoginFormState = {
  emailOrPhone: string;
  password: string;
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [registerForm, setRegisterForm] = useState<RegisterFormState>({
    full_name: "", email: "", phone_number: "", studentId: "", DOB: "",
    password: "", address: "", enrollment_year: "", faculty: ""
  });
  const [registerErrors, setRegisterErrors] =
    useState<Partial<RegisterFormState>>({});
  const [registerServerError, setRegisterServerError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const updateRegister = (k: keyof RegisterFormState, v: string) =>
    setRegisterForm(prev => ({ ...prev, [k]: v }));

  const validateRegister = (): boolean => {
    const e: Partial<RegisterFormState> = {};

    if (!registerForm.full_name.trim()) e.full_name = "Họ và tên là bắt buộc.";
    if (!registerForm.studentId.trim()) e.studentId = "Mã số sinh viên là bắt buộc.";
    if (!registerForm.email.trim()) e.email = "Email là bắt buộc.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email))
      e.email = "Email không hợp lệ.";
    if (!registerForm.phone_number.trim()) e.phone_number = "SĐT là bắt buộc.";
    if (!registerForm.password.trim()) e.password = "Mật khẩu là bắt buộc.";
    if (!registerForm.DOB) e.DOB = "Ngày sinh là bắt buộc.";
    if (!registerForm.enrollment_year.trim()) e.enrollment_year = "Năm nhập học là bắt buộc.";
    if (!registerForm.faculty.trim()) e.faculty = "Khoa là bắt buộc.";

    setRegisterErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegisterSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setRegisterServerError(null);
    if (!validateRegister()) return;

    setRegisterLoading(true);
    try {
      const res = await fetch(`${API}/auth/check-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRegisterServerError(data?.message || "Lỗi xác thực.");
        return;
      }

      sessionStorage.setItem("pendingRegister", JSON.stringify({
        phone: registerForm.phone_number,
        email: registerForm.email,
        studentId: registerForm.studentId,
      }));

      navigate("/verify-otp", { state: { contact: registerForm.email } });

    } catch {
      setRegisterServerError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const [loginForm, setLoginForm] =
    useState<LoginFormState>({ emailOrPhone: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleLoginSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      await login(loginForm.emailOrPhone, loginForm.password);
      navigate("/home/explore");
    } catch (err: any) {
      setLoginError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoginLoading(false);
    }
  };


  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="auth-root">
      <div className={`auth-container ${isSignUp ? "right-panel-active" : ""}`}>
        <div className="form-container sign-in-container">
          <form onSubmit={handleLoginSubmit}>
            <h1>Chào mừng trở lại!</h1>

            <input
              placeholder="Email hoặc SĐT"
              value={loginForm.emailOrPhone}
              onChange={(e) => setLoginForm({ ...loginForm, emailOrPhone: e.target.value })}
            />

            <div className="password-input-group">
              <input
                className="password-input"
                placeholder="Mật khẩu"
                type={showLoginPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />

              <label className="show-pw-label">
                <input
                  type="checkbox"
                  checked={showLoginPassword}
                  onChange={e => setShowLoginPassword(e.target.checked)}
                />
                Hiện
              </label>
            </div>

            <div style={{ textAlign: "right", marginBottom: 12 }}>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => navigate("/forgotpass")}
                style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 13 }}
              >
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Đang đăng nhập…" : "ĐĂNG NHẬP"}
            </button>

            {loginError && <div className="error-message">{loginError}</div>}
          </form>
        </div>


        <div className="form-container sign-up-container">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Tạo tài khoản</h1>

            <div className="input-group-row">
                <input placeholder="Họ và tên" value={registerForm.full_name}
                  onChange={e => updateRegister("full_name", e.target.value)} />
                {registerErrors.full_name && <div className="error-field">{registerErrors.full_name}</div>}
            </div>

            <div className="input-group-row">
                <input placeholder="Email" value={registerForm.email}
                  onChange={e => updateRegister("email", e.target.value)} />
                {registerErrors.email && <div className="error-field">{registerErrors.email}</div>}
            </div>

            <div className="input-group-row">
                <input placeholder="Mã số sinh viên" value={registerForm.studentId}
                  onChange={e => updateRegister("studentId", e.target.value)} />
                {registerErrors.studentId && <div className="error-field">{registerErrors.studentId}</div>}
            </div>

            <div className="input-row-split">
                <div className="input-group-row split-item">
                    <input placeholder="SĐT" value={registerForm.phone_number}
                    onChange={e => updateRegister("phone_number", e.target.value.replace(/\D/g,'').slice(0,10))} />
                    {registerErrors.phone_number && <div className="error-field">{registerErrors.phone_number}</div>}
                </div>

                <div className="input-group-row split-item">
                    <input type="date" value={registerForm.DOB} className="date-input"
                    onChange={e => updateRegister("DOB", e.target.value)} />
                    {registerErrors.DOB && <div className="error-field">{registerErrors.DOB}</div>}
                </div>
            </div>

            <div className="input-row-split">
                <div className="input-group-row split-item">
                    <select value={registerForm.faculty} className="select-input"
                    onChange={e => updateRegister("faculty", e.target.value)}>
                    <option value="" disabled>Chọn Khoa</option>
                    <option value="SE">Kỹ thuật Phần mềm (SE)</option>
                    <option value="CS">Khoa học Máy tính (CS)</option>
                    <option value="IS">Hệ thống Thông tin (IS)</option>
                    <option value="CE">Kỹ thuật Máy tính (CE)</option>
                    </select>
                    {registerErrors.faculty && <div className="error-field">{registerErrors.faculty}</div>}
                </div>

                <div className="input-group-row split-item">
                    <input placeholder="Năm nhập học (YYYY)" value={registerForm.enrollment_year}
                    onChange={e => updateRegister("enrollment_year", e.target.value.replace(/\D/g,'').slice(0,4))} />
                    {registerErrors.enrollment_year && <div className="error-field">{registerErrors.enrollment_year}</div>}
                </div>
            </div>

            <div className="input-group-row">
                <input placeholder="Địa chỉ" value={registerForm.address}
                onChange={e => updateRegister("address", e.target.value)} />
                {registerErrors.address && <div className="error-field">{registerErrors.address}</div>}
            </div>

            <div className="password-input-group">
                <input
                    className="password-input"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="Mật khẩu"
                    value={registerForm.password}
                    onChange={e => updateRegister("password", e.target.value)}
                />

                <label className="show-pw-label">
                    <input
                        type="checkbox"
                        checked={showRegisterPassword}
                        onChange={e => setShowRegisterPassword(e.target.checked)}
                    />
                    Hiện
                </label>
            </div>
            {registerErrors.password && <div className="error-field full-width">{registerErrors.password}</div>}

            <button type="submit" disabled={registerLoading} style={{ marginTop: '16px' }}>
              {registerLoading ? "Đang đăng ký…" : "ĐĂNG KÝ"}
            </button>

            {registerServerError &&
              <div className="error-message">{registerServerError}</div>}
          </form>
        </div>

        <div className="overlay-container">
          <div className="overlay">

            <div className="overlay-panel overlay-left">
              <h1>Quay lại thôi!</h1>
              <p>Nếu bạn đã có tài khoản, vui lòng đăng nhập để kết nối với cộng đồng Buddy Study.</p>
              <button className="ghost" onClick={() => setIsSignUp(false)}>ĐĂNG NHẬP</button>
            </div>

            <div className="overlay-panel overlay-right">
              <h1>Buddy Study Xin Chào!</h1>
              <p>Nhập thông tin cá nhân của bạn và bắt đầu hành trình với chúng tôi.</p>
              <button className="ghost" onClick={() => setIsSignUp(true)}>ĐĂNG KÝ</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-switch-buttons">
        <button
            style={{ display: isSignUp ? 'block' : 'none' }}
            onClick={() => setIsSignUp(false)}>
                QUAY LẠI ĐĂNG NHẬP
        </button>
        <button
            style={{ display: !isSignUp ? 'block' : 'none' }}
            onClick={() => setIsSignUp(true)}>
                ĐĂNG KÝ TÀI KHOẢN MỚI
        </button>
      </div>
    </div>
  );
}