import React from "react";

export default function HomeScreen({ onLogout }) {
  const styles = {
    page: {
      minHeight: "100vh",
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
      width: 720,
      maxWidth: "95%",
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 6px 24px rgba(20,30,50,0.08)",
      padding: 28,
      textAlign: "center",
    },
    title: { margin: 0, fontSize: 22, color: "#0f1724" },
    subtitle: { marginTop: 8, color: "#546176" },
    button: {
      marginTop: 20,
      padding: "10px 16px",
      borderRadius: 8,
      border: "none",
      background: "#2563eb",
      color: "#fff",
      cursor: "pointer",
      fontSize: 14,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Home</h1>
        <p style={styles.subtitle}>This is a simple screen for testing the app UI.</p>

        <div style={{ marginTop: 18 }}>
          <button
            style={styles.button}
            onClick={() => {
              if (typeof onLogout === "function") onLogout();
              else console.log("Logout clicked");
            }}
          >
            Logout / Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
// ...existing code...