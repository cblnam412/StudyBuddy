import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import API from "../API/api";

/**
 * ResetPassword
 * - Expects a `token` query parameter (e.g. /reset-password?token=abcd)
 * - Posts { token, password } to `${API}/auth/reset-password`
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // get token from query string
  const qs = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = qs.get("token");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState(null);
  const [message, setMessage] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // if token missing, send user back to forgot-password page
    if (!token) {
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validate = () => {
    setError(null);
    const pwd = (password || "").trim();
    const conf = (confirm || "").trim();

    if (!pwd) return setError("Vui lòng nhập mật khẩu mới.");
    if (pwd.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự.");
    if (pwd !== conf) return setError("Mật khẩu nhập lại không khớp.");
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setMessage(null);
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: password.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // show server-sent message if present, otherwise generic
        setError(data?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      setMessage(data?.message || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      setPassword("");
      setConfirm("");

      // redirect to login so user can sign in with new password
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      console.error(err);
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-root">
      <div className="reset-card" role="region" aria-label="Đặt lại mật khẩu">
        <h1 className="brand">Đặt lại mật khẩu</h1>

        <p className="subtitle">
          Nhập mật khẩu mới cho tài khoản. Liên kết sẽ hết hiệu lực nếu token đã
          quá hạn.
        </p>

        {error && <div className="error-box" role="alert">{error}</div>}
        {message && <div className="message-box" role="status">{message}</div>}

        <form onSubmit={handleSubmit} className="reset-form" noValidate>
          <label>
            Mật khẩu mới
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ít nhất 8 ký tự"
              autoFocus
            />
          </label>

          <label>
            Nhập lại mật khẩu
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu"
            />
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden /> : "Đặt lại mật khẩu"}
          </button>
        </form>

        <div className="actions">
          <Link to="/login" className="link-btn plain">Quay về đăng nhập</Link>
          <Link to="/forgotpass" className="link-btn">Gửi lại token</Link>
        </div>
      </div>

      <style>{`
        :root { --primary: #2563eb; --bg: #ffffff; --muted:#6b7280; --danger:#dc2626; }
        .reset-root {
          height: 100vh;
          width: 100vw;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 24px;
          background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
        }
        .reset-card {
          width:100%;
          max-width:420px;
          background: var(--bg);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(2,6,23,0.07);
        }
        .brand { color: var(--primary); margin: 0 0 6px 0; font-size:20px; font-weight:700; }
        .subtitle { margin: 6px 0 12px 0; color: #0f172a; font-size:14px; }

        .error-box { background: #fff7f7; border:1px solid rgba(220,38,38,0.12); color:var(--danger); padding:10px; border-radius:8px; margin-bottom:12px; }
        .message-box { background: #f0f8ff; border:1px solid rgba(37,99,235,0.08); color: var(--primary); padding:10px; border-radius:8px; margin-bottom:12px; }

        .reset-form label { display:block; margin-bottom:12px; font-size:14px; color:#111827; }
        .reset-form input { width:100%; padding:10px 12px; margin-top:6px; border-radius:8px; border:1px solid #e6eefc; font-size:16px; box-sizing:border-box; }

        .submit-btn { width:100%; background: var(--primary); color: white; border: none; padding: 12px; margin-top: 8px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .submit-btn[disabled] { opacity:0.65; cursor:not-allowed; }

        .actions { margin-top:12px; display:flex; gap:12px; align-items:center; justify-content:space-between; }
        .link-btn { background:transparent; border:none; color:var(--primary); cursor:pointer; font-weight:600; text-decoration: none; padding:6px 0; }
        .link-btn.plain { color: var(--muted); font-weight:500; text-decoration: none; }

        .spinner { display:inline-block; width:18px; height:18px; border:3px solid rgba(255,255,255,0.6); border-top-color: rgba(255,255,255,1); border-radius:50%; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width:420px) { .reset-card { padding: 18px; } }
      `}</style>
    </div>
  );
}
