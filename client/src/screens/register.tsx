import React from "react";
import API from "../API/api"
import { useNavigate } from "react-router-dom";

type FormState = {
  full_name: string;
  email: string;
  phone_number: string;
  studentId: string;
  DOB: string; // yyyy-mm-dd
  password: string;
  address: string;
  enrollment_year: string;
  faculty: string;
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState<FormState>({
    full_name: "",
    email: "",
    phone_number: "",
    studentId: "",
    DOB: "",
    password: "",
    address: "",
    enrollment_year: "",
    faculty: ""
  });

  const [errors, setErrors] = React.useState<Partial<FormState>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const update = (k: keyof FormState, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  // client-side validation
  const validate = (): boolean => {
    const e: Partial<FormState> = {};

    if (!form.full_name.trim()) e.full_name = "Họ và tên là bắt buộc.";
    if (!form.studentId.trim()) e.studentId = "Mã số sinh viên là bắt buộc.";
    if (!form.email.trim()) e.email = "Email là bắt buộc.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ.";
    if (!form.phone_number.trim()) e.phone_number = "SĐT là bắt buộc.";
    else if (!/^\+?\d{7,15}$/.test(form.phone_number))
      e.phone_number = "SĐT không hợp lệ (7-15 chữ số, có thể có +).";

    if (!form.password.trim()) e.password = "Mật khẩu là bắt buộc.";
    else if (form.password.length < 6)
      e.password = "Mật khẩu tối thiểu 6 ký tự.";

    if (form.DOB) {
      const d = new Date(form.DOB);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (isNaN(d.getTime())) e.DOB = "Ngày sinh không hợp lệ.";
      else if (d >= yesterday) e.DOB = "Ngày sinh không thể là ngày trong tương lai.";
    } else {
      e.DOB = "Ngày sinh là bắt buộc.";
    }

    if (!form.enrollment_year.trim())
      e.enrollment_year = "Năm nhập học là bắt buộc.";
    if (!form.faculty.trim()) e.faculty = "Khoa/Fakultät là bắt buộc.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      // adapt endpoint if yours differs (e.g. /api/checkInfo)
      const res = await fetch(`${API}/auth/check-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number,
          studentId: form.studentId,
          DOB: form.DOB,
          password: form.password,
          address: form.address,
          enrollment_year: form.enrollment_year,
          faculty: form.faculty
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // best-effort: try to show server validation message
        setServerError(data?.message || "Lỗi xác thực. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      // success — server says "Gửi OTP"
      // store pending info temporarily so VerifyOTP can use it
      const pending = {
        phone: form.phone_number,
        email: form.email,
        studentId: form.studentId
      };
      sessionStorage.setItem("pendingRegister", JSON.stringify(pending));

      // navigate to verify-otp; also pass contact in location.state (in-memory)
      navigate("/verify-otp", { state: { contact: form.phone_number || form.email } });
    } catch (err: any) {
      console.error(err);
      setServerError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-root">
      <div className="register-card">
        <h1 className="brand">Đăng ký</h1>

        {serverError && <div className="server-error">{serverError}</div>}

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          <label>
            Họ và tên
            <input
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="Nguyễn Văn A"
              className={errors.full_name ? "invalid" : ""}
            />
            {errors.full_name && <small className="field-error">{errors.full_name}</small>}
          </label>

          <div className="row-2">
            <label>
              Email
              <input
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="email@domain.com"
                className={errors.email ? "invalid" : ""}
              />
              {errors.email && <small className="field-error">{errors.email}</small>}
            </label>

            <label>
              Số điện thoại
              <input
                value={form.phone_number}
                onChange={(e) => update("phone_number", e.target.value)}
                placeholder="+849xxxxxxxx"
                className={errors.phone_number ? "invalid" : ""}
              />
              {errors.phone_number && <small className="field-error">{errors.phone_number}</small>}
            </label>
          </div>

          <div className="row-2">
            <label>
              Mã số sinh viên
              <input
                value={form.studentId}
                onChange={(e) => update("studentId", e.target.value)}
                placeholder="2019xxxxx"
                className={errors.studentId ? "invalid" : ""}
              />
              {errors.studentId && <small className="field-error">{errors.studentId}</small>}
            </label>

            <label>
              Ngày sinh
              <input
                type="date"
                value={form.DOB}
                onChange={(e) => update("DOB", e.target.value)}
                className={errors.DOB ? "invalid" : ""}
              />
              {errors.DOB && <small className="field-error">{errors.DOB}</small>}
            </label>
          </div>

          <label>
            Địa chỉ
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Địa chỉ thường trú"
            />
          </label>

          <div className="row-2">
            <label>
              Năm nhập học
              <input
                value={form.enrollment_year}
                onChange={(e) => update("enrollment_year", e.target.value)}
                placeholder="2020"
                className={errors.enrollment_year ? "invalid" : ""}
              />
              {errors.enrollment_year && <small className="field-error">{errors.enrollment_year}</small>}
            </label>

            <label>
              Khoa
              <input
                value={form.faculty}
                onChange={(e) => update("faculty", e.target.value)}
                placeholder="CNTT"
                className={errors.faculty ? "invalid" : ""}
              />
              {errors.faculty && <small className="field-error">{errors.faculty}</small>}
            </label>
          </div>

          <label>
            Mật khẩu
            <div className="pw-row">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className={errors.password ? "invalid" : ""}
              />
              <button type="button" className="toggle-pw" onClick={() => setShowPassword(s => !s)}>
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {errors.password && <small className="field-error">{errors.password}</small>}
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden /> : "Gửi OTP & Tiếp tục"}
          </button>
        </form>

        <div className="foot">
          Bạn đã có tài khoản? <a href="/login">Đăng nhập</a>
        </div>
      </div>

      {/* small CSS-in-component for quick drop-in; you can move these rules to App.css */}
      <style>{`
        :root { --primary: #2563eb; --bg: #ffffff; --muted:#6b7280; --danger:#dc2626; }
        .register-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f3f6ff 0%, #ffffff 100%);
          padding: 24px;
        }
        .register-card {
          width: 100%;
          max-width: 720px;
          background: var(--bg);
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(16,24,40,0.08);
          padding: 28px;
          box-sizing: border-box;
        }
        .brand {
          color: var(--primary);
          margin: 0 0 12px 0;
          font-size: 22px;
          font-weight: 700;
        }
        .server-error {
          background: #fff0f1;
          border: 1px solid rgba(220,38,38,0.12);
          color: var(--danger);
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .register-form label { display:block; margin-bottom:12px; font-size:14px; color:#111827; }
        .register-form input {
          width:100%;
          padding:10px 12px;
          margin-top:6px;
          border-radius:8px;
          border:1px solid #e6eefc;
          box-shadow:none;
          outline:none;
          font-size:14px;
          background:#fff;
        }
        .register-form input.invalid { border-color: rgba(220,38,38,0.3); }
        .field-error { color: var(--danger); font-size:12px; margin-top:6px; display:block; }
        .row-2 { display:flex; gap:12px; }
        .row-2 > label { flex:1; }
        .pw-row { display:flex; gap:8px; align-items:center; }
        .pw-row input { flex:1; }
        .toggle-pw {
          background: transparent;
          border: none;
          color: var(--primary);
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          font-weight:600;
        }
        .submit-btn {
          width:100%;
          background: var(--primary);
          color: white;
          border: none;
          padding: 12px;
          margin-top: 6px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .submit-btn[disabled] { opacity: 0.65; cursor: not-allowed; }
        .foot { margin-top: 14px; font-size: 13px; color: var(--muted); }
        .foot a { color: var(--primary); text-decoration: none; font-weight: 600; }
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,0.6);
          border-top-color: rgba(255,255,255,1);
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width:720px) {
          .row-2 { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
