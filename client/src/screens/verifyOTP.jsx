// client/src/screens/VerifyOTP.jsx
import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import API from "../API/api";
/**
 * VerifyOTP (no auto-login)
 * - Reads pending contact from location.state.contact or sessionStorage.pendingRegister
 * - Validates 6-digit OTP
 * - POST /api/verify-otp with { otp, email }
 * - Expects server to return { user_id } or { message } on success
 * - Shows success message and redirects to /login
 */
export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialPending = () => {
    const stateContact = location?.state?.contact;
    if (stateContact) {
      return typeof stateContact === "string" ? { contact: stateContact } : stateContact;
    }
    try {
      return JSON.parse(sessionStorage.getItem("pendingRegister") || "null");
    } catch {
      return null;
    }
  };

  const [pending, setPending] = React.useState(getInitialPending);
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [message, setMessage] = React.useState(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (location?.state?.contact) {
      setPending(typeof location.state.contact === "string" ? { contact: location.state.contact } : location.state.contact);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state?.contact]);

  React.useEffect(() => {
    if (!pending || (!pending.phone && !pending.email && !pending.studentId && !pending.contact)) {
      navigate("/register", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // NOTE: we only send { email, otp } in the verification request as requested.
  const submitVerify = async (e) => {
    console.log(`Pending...: ${pending.contact} ${pending.email}`);
    e && e.preventDefault();
    setError(null);
    setMessage(null);

    const otpTrim = (otp || "").trim();
    if (!otpTrim) {
      setError("Vui lòng nhập mã OTP.");
      return;
    }
    if (!/^\d{6}$/.test(otpTrim)) {
      setError("Mã OTP phải gồm 6 chữ số.");
      return;
    }

    if (!pending?.email && !pending?.contact) {
      setError("Không tìm thấy email để xác thực.");
      return;
    }

    // prefer explicit email field; if only contact exists and looks like an email, use it
    const emailToSend = pending.email ?? (/@/.test(pending.contact || "") ? pending.contact : null);
    if (!emailToSend) {
      setError("Không tìm thấy email để xác thực.");
      return;
    }

    setLoading(true);
    try {
      // directly set payload to include only email and otp
      const res = await fetch(`${API}/auth/verify-otp-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.contact, otp: otpTrim }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Xác thực OTP thất bại.");
        setLoading(false);
        return;
      }

      // success: server returns { user_id } or { message }
      sessionStorage.removeItem("pendingRegister");

      const uid = data?.user_id;
      const successMsg = uid
        ? `Xác thực thành công. Vui lòng đăng nhập.`
        : (data?.message || "Xác thực thành công. Vui lòng đăng nhập.");

      setMessage(successMsg);

      // redirect to login after a short delay so user sees message
      setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      console.error(err);
      setError("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // resend logic left intact and still supports phone/email if needed
  const buildContactPayload = () => {
    const p = {};
    if (pending?.phone) p.phone = pending.phone;
    if (pending?.email) p.email = pending.email;
    if (pending?.studentId) p.studentId = pending.studentId;
    if (pending?.contact) {
      const c = pending.contact;
      if (/@/.test(c)) p.email = c;
      else p.phone = c;
    }
    return p;
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setMessage(null);

    const payload = buildContactPayload();
    if (!payload.phone && !payload.email && !payload.studentId) {
      setError("Không có thông tin liên hệ để gửi lại OTP.");
      return;
    }

    try {
      setResendCooldown(60);
      const res = await fetch(`${API}/auth/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: pending.contact,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Không thể gửi lại OTP.");
        setResendCooldown(0);
        return;
      }
      setMessage(data?.message || "OTP đã được gửi lại.");
    } catch (err) {
      console.error(err);
      setError("Lỗi mạng khi gửi lại OTP.");
      setResendCooldown(0);
    }
  };

  return (
    <div className="verify-root">
      <div className="verify-card" role="region" aria-label="Xác thực OTP">
        <h1 className="brand">Xác thực OTP</h1>

        <p className="subtitle">
          Đã gửi mã xác thực tới{" "}
          <strong>
            {pending?.email ?? pending?.studentId ?? pending?.contact}
          </strong>
        </p>

        {error && <div className="error-box" role="alert">{error}</div>}
        {message && <div className="message-box" role="status">{message}</div>}

        <form onSubmit={submitVerify} className="verify-form" noValidate>
          <label>
            Mã OTP
            <input
              inputMode="numeric"
              pattern="\\d{6}"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Nhập mã (6 chữ số)"
              maxLength={6}
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
        </div>
      </div>

      <style>{`
        :root { --primary: #2563eb; --bg: #ffffff; --muted:#6b7280; --danger:#dc2626;}
        .verify-root { width: 100vw; min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 24px; background: linear-gradient(180deg, #f7fbff 0%, #ffffff 100%); }
        .verify-card { width:100%; max-width:420px; background: var(--bg); padding: 24px; border-radius: 12px; box-shadow: 0 10px 30px rgba(2,6,23,0.07); }
        .brand { color: var(--primary); margin: 0 0 6px 0; font-size:20px; font-weight:700; }
        .subtitle { margin: 6px 0 12px 0; color: #0f172a; font-size:14px; }
        .error-box { background: #fff7f7; border:1px solid rgba(220,38,38,0.12); color:var(--danger); padding:10px; border-radius:8px; margin-bottom:12px; }
        .message-box { background: #f0f8ff; border:1px solid rgba(37,99,235,0.08); color: var(--primary); padding:10px; border-radius:8px; margin-bottom:12px; }
        .verify-form label { display:block; margin-bottom:12px; font-size:14px; color:#111827; }
        .verify-form input { width:100%; padding:10px 12px; margin-top:6px; border-radius:8px; border:1px solid #e6eefc; font-size:16px; box-sizing:border-box; }
        .submit-btn { width:100%; background: var(--primary); color: white; border: none; padding: 12px; margin-top: 8px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .submit-btn[disabled] { opacity:0.65; cursor:not-allowed; }
        .actions { margin-top:12px; display:flex; gap:12px; align-items:center; justify-content:space-between; }
        .link-btn { background:transparent; border:none; color:var(--primary); cursor:pointer; font-weight:600; text-decoration: none; padding:6px 0; margin-left: auto; margin-right: auto;}
        .link-btn.plain { color: var(--muted); font-weight:500; text-decoration: none; }
        .spinner { display:inline-block; width:18px; height:18px; border:3px solid rgba(255,255,255,0.6); border-top-color: rgba(255,255,255,1); border-radius:50%; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
