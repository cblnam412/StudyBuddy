import React from "react";
import API from "../API/api.ts";
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
    faculty: "",
  });

  const [errors, setErrors] = React.useState<Partial<FormState>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const update = (k: keyof FormState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  // client-side validation
  const validate = (): boolean => {
    const e: Partial<FormState> = {};

    if (!form.full_name.trim()) e.full_name = "Họ và tên là bắt buộc.";
    if (!form.studentId.trim()) e.studentId = "Mã số sinh viên là bắt buộc.";
    if (!form.email.trim()) e.email = "Email là bắt buộc.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ.";
    if (!form.phone_number.trim()) {
      e.phone_number = "SĐT là bắt buộc.";
    } else if (!/^[0][0-9]{9}$/.test(form.phone_number.trim())) {
      e.phone_number =
        "SĐT không hợp lệ (phải bắt đầu bằng 0 và gồm đúng 10 chữ số).";
    }

    if (!form.password.trim()) {
      e.password = "Mật khẩu là bắt buộc.";
    } else if (form.password.length < 8) {
      e.password = "Mật khẩu ít nhất phải có 8 ký tự.";
    } else {
      const hasUpper = /[A-Z]/.test(form.password);
      const hasDigit = /\d/.test(form.password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>~`_\-\\\/\[\];'+=]/.test(
        form.password
      );

      if (!hasUpper || !hasDigit || !hasSpecial) {
        e.password =
          "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.";
      }
    }

    if (form.DOB) {
      // an toàn với input kiểu "YYYY-MM-DD" (HTML date) — tránh sai lệch timezone
      let d;
      const isoDate = /^\d{4}-\d{2}-\d{2}$/;
      if (isoDate.test(form.DOB)) {
        const [y, m, day] = form.DOB.split("-").map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(form.DOB);
      }

      const minDOB = new Date(1900, 0, 1); // 01/01/1900
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // chỉ phần ngày

      // chỉ lấy phần ngày của DOB cũng để so sánh chính xác
      const dobDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (isNaN(d.getTime())) {
        e.DOB = "Ngày sinh không hợp lệ.";
      } else if (dobDate < minDOB) {
        e.DOB = "Ngày sinh không được nhỏ hơn 01/01/1900.";
      } else if (dobDate >= today) {
        e.DOB = "Ngày sinh không thể là ngày trong tương lai.";
      }
    } else {
      e.DOB = "Ngày sinh là bắt buộc.";
    }

    if (!form.enrollment_year.trim())
      e.enrollment_year = "Năm nhập học là bắt buộc.";
    if (!form.faculty.trim()) e.faculty = "Khoa là bắt buộc.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
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
          faculty: form.faculty,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerError(data?.message || "Lỗi xác thực. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      const pending = {
        phone: form.phone_number,
        email: form.email,
        studentId: form.studentId,
      };
      sessionStorage.setItem("pendingRegister", JSON.stringify(pending));

      navigate("/verify-otp", {
        state: { contact: form.email },
      });
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
              className={errors.full_name ? "invalid" : ""}
              placeholder="Nguyễn Văn A"
            />
            {errors.full_name && (
              <small className="field-error">{errors.full_name}</small>
            )}
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
              {errors.email && (
                <small className="field-error">{errors.email}</small>
              )}
            </label>

            <label>
              Số điện thoại
              <input
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                placeholder="0xxxxxxxxx"
                value={form.phone_number}
                onChange={(e) =>
                  update(
                    "phone_number",
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                className={errors.phone_number ? "invalid" : ""}
              />
              {errors.phone_number && (
                <small className="field-error">{errors.phone_number}</small>
              )}
            </label>
          </div>

          <div className="row-2">
            <label>
              Mã số sinh viên
              <input
                value={form.studentId}
                onChange={(e) => update("studentId", e.target.value)}
                placeholder="2352xxxx"
                className={errors.studentId ? "invalid" : ""}
              />
              {errors.studentId && (
                <small className="field-error">{errors.studentId}</small>
              )}
            </label>

            <label>
              Ngày sinh
              <input
                type="date"
                value={form.DOB}
                onChange={(e) => update("DOB", e.target.value)}
                className={errors.DOB ? "invalid" : ""}
              />
              {errors.DOB && (
                <small className="field-error">{errors.DOB}</small>
              )}
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
              {errors.enrollment_year && (
                <small className="field-error">{errors.enrollment_year}</small>
              )}
            </label>

            <label>
              Khoa
              <select
                name="faculty"
                id="faculty"
                value={form.faculty}
                onChange={(e) => update("faculty", e.target.value)}
                className={errors.faculty ? "invalid" : ""}
              >
                <option value="">Chọn khoa</option>
                <option value="SE">SE</option>
                <option value="CS">CS</option>
                <option value="IS">IS</option>
                <option value="CE">CE</option>
              </select>
              {errors.faculty && (
                <small className="field-error">{errors.faculty}</small>
              )}
            </label>
          </div>

          <label>
            Mật khẩu
            <div className="pw-row">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={errors.password ? "invalid" : ""}
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {errors.password && (
              <small className="field-error">{errors.password}</small>
            )}
            <small
              className={`pw-hint ${form.password.length >= 8 ? "ok" : "warn"}`}
            >
              {form.password.length >= 8
                ? "Độ dài mật khẩu đạt yêu cầu."
                : `Mật khẩu hiện có ${form.password.length} ký tự — phải ít nhất 8.`}
            </small>
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden /> : "Xác nhận"}
          </button>
        </form>

        <div className="foot">
          Bạn đã có tài khoản? <a href="/login">Đăng nhập</a>
        </div>
      </div>

      <style>{`
        /* small global reset to avoid box-sizing surprises */
        *, *::before, *::after { box-sizing: border-box; }

        :root { --primary: #2563eb; --bg: #ffffff; --muted:#6b7280; --danger:#dc2626; }

        .register-root {
          width: 100vw;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f3f6ff 0%, #ffffff 100%);
          padding: 24px;
        }

        /* make the card use more horizontal space while staying centered */
        .register-card {
          width: 50%;
          max-width: 1100px;   /* wider so it can take more screen width on large displays */
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
          text-align: center;
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

        /* consistent inputs and selects */
        .register-form input,
        .register-form select {
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

        .register-form select { padding-right: 36px; } /* allow room for native arrow */

        .register-form input.invalid,
        .register-form select.invalid { border-color: rgba(220,38,38,0.3); }
        .field-error { color: var(--danger); font-size:12px; margin-top:6px; display:block; }

        /* two-column rows */
        .row-2 { display:flex; gap:12px; align-items:flex-start; }
        /* important: allow flex children to shrink nicely and avoid overflow causing overlap */
        .row-2 > label { flex:1; min-width:0; }

        /* password row */
        .pw-row { display:flex; gap:8px; align-items:center; }
        .pw-row input { flex:1; min-width:0; }

        .toggle-pw {
          background: transparent;
          border: none;
          color: var(--primary);
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          font-weight:600;
        }
        .pw-hint { display:block; margin-top:6px; font-size:12px; }
        .pw-hint.ok { color: green; }
        .pw-hint.warn { color: var(--muted); }

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

        .foot { margin-top: 14px; font-size: 13px; color: var(--muted); text-align: center; }
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

        /* responsive */
        @media (max-width:920px) {
          .register-card { padding: 20px; max-width: 92%; }
        }
        @media (max-width:720px) {
          .row-2 { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
