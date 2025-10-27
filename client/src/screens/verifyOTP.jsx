// client/src/screens/VerifyOTP.jsx
import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function VerifyOTP({ onSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [pending, setPending] = React.useState(() => {
    try {
      // prefer in-memory state passed by navigate(..., { state })
      const stateContact = location.state?.contact;
      if (stateContact) return { contact: stateContact };

      // fallback to sessionStorage (set by Register)
      return JSON.parse(sessionStorage.getItem("pendingRegister") || "null");
    } catch {
      return null;
    }
  });

  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  // redirect back to register if no pending info
  React.useEffect(() => {
    if (!pending || (!pending.phone && !pending.email && !pending.studentId && !pending.contact)) {
      navigate("/register", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // cooldown timer for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const submitVerify = async (e) => {
    e && e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError("Vui lòng nhập mã OTP.");
      return;
    }

    // build payload using available identifier(s)
    const payload = { otp: otp.trim() };
    if (pending?.phone) payload.phone = pending.phone;
    if (pending?.email) payload.email = pending.email;
    if (pending?.studentId) payload.studentId = pending.studentId;
    if (pending?.contact) {
      // contact could be phone or email string from navigate state
      const c = pending.contact;
      if (/@/.test(c)) payload.email = c;
      else payload.phone = c;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Xác thực OTP thất bại.");
        setLoading(false);
        return;
      }

      // success — expect { token: '...' } from server
      if (data?.token) {
        // notify parent App so it can persist token/user
        try {
          onSuccess && onSuccess({ token: data.token });
        } catch (err) {
          // swallow onSuccess errors so navigation still happens
          console.warn("onSuccess threw:", err);
        }

        // cleanup pending storage
        sessionStorage.removeItem("pendingRegister");

        // navigate to home (replace history so user can't go back to verify)
        navigate("/home", { replace: true });
      } else {
        // no token, but success message — navigate to login or show message
        setError(data?.message || "Xác thực thành công nhưng server không trả token.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi mạng. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    const payload = {};
    if (pending?.phone) payload.phone = pending.phone;
    if (pending?.email) payload.email = pending.email;
    if (pending?.studentId) payload.studentId = pending.studentId;
    if (pending?.contact) {
      const c = pending.contact;
      if (/@/.test(c)) payload.email = c;
      else payload.phone = c;
    }

    if (!payload.phone && !payload.email && !payload.studentId) {
      setError("Không có thông tin liên hệ để gửi lại OTP.");
      return;
    }

    try {
      setResendCooldown(60); // 60s cooldown
      const res = await fetch("/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Không thể gửi lại OTP.");
        setResendCooldown(0);
      } else {
        // optionally show a success toast/message (we reuse error state here)
        setError(data?.message || "OTP đã được gửi lại.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi mạng khi gửi lại OTP.");
      setResendCooldown(0);
    }
  };

  return (
    <div className="verify-root">
      <div className="verify-card">
        <h1 className="brand">Xác thực OTP</h1>

        <p className="subtitle">
          Đã gửi mã xác thực tới{" "}
          <strong>{pending?.phone ?? pending?.email ?? pending?.studentId ?? pending?.contact}</strong>
        </p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={submitVerify} className="verify-form" noValidate>
          <label>
            Mã OTP
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Nhập mã (6 chữ số)"
              maxLength={8}
              autoFocus
            />
          </label>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" aria-hidden /> : "Xác thực"}
          </button>
        </form>

        <div className="actions">
          <button
            type="button"
            onClick={handleResend}
            className="link-btn"
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại mã"}
          </button>

          <Link to="/register" className="link-btn plain">Sửa thông tin đăng ký</Link>
        </div>
      </div>

      <style>{`
        :root { --primary: #2563eb; --bg: #ffffff; --muted:#6b7280; --danger:#dc2626; }
        .verify-root {
          min-height: 100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding: 24px;
          background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
        }
        .verify-card {
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
        .verify-form label { display:block; margin-bottom:12px; font-size:14px; color:#111827; }
        .verify-form input {
          width:100%;
          padding:10px 12px;
          margin-top:6px;
          border-radius:8px;
          border:1px solid #e6eefc;
          font-size:16px;
          box-sizing:border-box;
        }
        .submit-btn {
          width:100%;
          background: var(--primary);
          color: white;
          border: none;
          padding: 12px;
          margin-top: 8px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .submit-btn[disabled] { opacity:0.65; cursor:not-allowed; }
        .actions { margin-top:12px; display:flex; gap:12px; align-items:center; justify-content:space-between; }
        .link-btn { background:transparent; border:none; color:var(--primary); cursor:pointer; font-weight:600; text-decoration: none; padding:6px 0; }
        .link-btn.plain { color: var(--muted); font-weight:500; text-decoration: none; }
        .spinner {
          display:inline-block; width:18px; height:18px; border:3px solid rgba(255,255,255,0.6);
          border-top-color: rgba(255,255,255,1); border-radius:50%; animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
