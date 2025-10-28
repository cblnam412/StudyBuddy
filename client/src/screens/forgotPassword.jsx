import React from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../API/api";

/**
 * ForgotPassword
 * - Collects email and POSTs { email } to `${API}/auth/forgot-password`
 * - Shows success message telling user to check email
 * - Basic client-side validation + loading / error handling
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState(null);
  const [message, setMessage] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    const val = (email || "").trim();
    if (!val) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!validateEmail(val)) {
      setError("Email không hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Không thể gửi email. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      setMessage(
        data?.message ||
          "Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến (hoặc spam)."
      );
      setEmail("");

      // optional: redirect to login after a short delay so user sees the message
      setTimeout(() => navigate("/login", { replace: true }), 3500);
    } catch (err) {
      console.error(err);
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-root">
      <div className="forgot-card" role="region" aria-label="Quên mật khẩu">
        <h1 className="brand">Quên mật khẩu</h1>

        <p className="subtitle">
          Vui lòng nhập email bạn đã dùng để đăng ký.
        </p>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="message-box" role="status">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-form" noValidate>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              autoFocus
            />
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden /> : "Gửi yêu cầu"}
          </button>
        </form>

        <div className="actions">
          <Link to="/login" className="link-btn plain">
            Quay về đăng nhập
          </Link>
          <Link to="/register" className="link-btn">
            Đăng ký tài khoản
          </Link>
        </div>
      </div>

      <style>{`
        :root { --primary: #2563eb; --bg: #ffffff; --muted:#6b7280; --danger:#dc2626; }

        .forgot-root {
          min-height: 100vh;
          width: 100vw;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 24px;
          background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
        }
        .forgot-card {
          width:100%;
          max-width:420px;
          background: var(--bg);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(2,6,23,0.07);
        }
        .brand { color: var(--primary); margin: 0 0 6px 0; font-size:20px; font-weight:700; text-align: center; }
        .subtitle { margin: 6px 0 12px 0; color: #0f172a; font-size:14px; text-align: center; }

        .error-box { background: #fff7f7; border:1px solid rgba(220,38,38,0.12); color:var(--danger); padding:10px; border-radius:8px; margin-bottom:12px; }
        .message-box { background: #f0f8ff; border:1px solid rgba(37,99,235,0.08); color: var(--primary); padding:10px; border-radius:8px; margin-bottom:12px; }

        .forgot-form label { display:block; margin-bottom:12px; font-size:14px; color:#111827; }
        .forgot-form input { width:100%; padding:10px 12px; margin-top:6px; border-radius:8px; border:1px solid #e6eefc; font-size:16px; box-sizing:border-box; }

        .submit-btn { width:100%; background: var(--primary); color: white; border: none; padding: 12px; margin-top: 8px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .submit-btn[disabled] { opacity:0.65; cursor:not-allowed; }

        .actions { margin-top:12px; display:flex; gap:12px; align-items:center; justify-content:space-between; }
        .link-btn { background:transparent; border:none; color:var(--primary); cursor:pointer; font-weight:600; text-decoration: none; padding:6px 0; }
        .link-btn.plain { color: var(--muted); font-weight:500; text-decoration: none; }

        .spinner { display:inline-block; width:18px; height:18px; border:3px solid rgba(255,255,255,0.6); border-top-color: rgba(255,255,255,1); border-radius:50%; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width:420px) { .forgot-card { padding: 18px; } }
      `}</style>
    </div>
  );
}
