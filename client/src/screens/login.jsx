import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../API/api";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const resetError = () => setError("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetError();

    if (!username.trim() || !password) {
      setError("Please enter username and password!");
      return;
    }

    const res = await fetch(`http://localhost:3000/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrPhone: username.trim(),
        password: password,
      }),
    });

    const body = await res.json().catch(() => ({})); // Return empty object if parsing fails

    if (!res.ok) {
      setError(body.message);
    }

    // hmm
    const { token } = body;
    if (!token) throw new Error("No token returned from server");

    localStorage.setItem("authToken", token);

    if (typeof onSuccess === "function") onSuccess(body);

    setLoading(false);
  };

  const styles = {
    page: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg,#f7f9fc,#ffffff)",
      fontFamily:
        "Inter, Roboto, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
      padding: 20,
      boxSizing: "border-box",
    },
    card: {
      width: 360,
      maxWidth: "95%",
      background: "#ffffff",
      borderRadius: 12,
      boxShadow: "0 6px 24px rgba(20,30,50,0.08)",
      padding: "28px 24px",
      margin: 0,
    },
    title: {
      margin: 0,
      marginBottom: 8,
      fontSize: 20,
      color: "#0f1724",
      textAlign: "center",
    },
    subtitle: {
      margin: 0,
      marginBottom: 18,
      color: "#546176",
      fontSize: 13,
    },
    form: { display: "flex", flexDirection: "column", gap: 12 },
    label: { fontSize: 13, color: "#374151", marginBottom: 6 },
    input: {
      height: 44,
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #e6e9ef",
      fontSize: 14,
      outline: "none",
      background: "#fbfdff",
      marginLeft: "20px",
      width: "250px",
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    checkbox: { marginRight: 8 },
    button: {
      marginTop: 6,
      height: 44,
      borderRadius: 8,
      border: "none",
      background: "#2563eb",
      color: "#fff",
      fontSize: 15,
      cursor: "pointer",
      boxShadow: "0 6px 18px rgba(37,99,235,0.14)",
    },
    error: { color: "#b91c1c", fontSize: 13, marginTop: 6 },
    smallLink: { fontSize: 13, color: "#2563eb", textDecoration: "none" },
    footer: {
      marginTop: 12,
      fontSize: 13,
      color: "#6b7280",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit} aria-label="Login form">
        <div>
          <h1 style={styles.title}>Sign in</h1>
        </div>

        <div style={styles.form}>
          <div>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={resetError}
              style={styles.input}
              placeholder="you@example.com or username"
            />
          </div>

          <div>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={resetError}
              style={styles.input}
              placeholder="••••••••"
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  aria-label="Show password"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={styles.checkbox}
                />
                Show
              </label>
              <a
                href="#"
                style={styles.smallLink}
                onClick={() => {navigate('/forgotpass')}}
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {error && (
            <div role="alert" style={styles.error}>
              {error}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          Don't have an account?{" "}
          <a
            href="#"
            style={styles.smallLink}
            onClick={() => {navigate('/register')}}
          >
            Sign up
          </a>
        </div>
      </form>
    </div>
  );
}
// ...existing code...
