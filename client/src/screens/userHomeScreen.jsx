import { Outlet, useNavigate } from "react-router-dom";
import {useRef, useState, useEffect} from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext"

const SIDEBAR_WIDTH = "240px";

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily:
      "Inter, Roboto, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    width: "100%",
  },
  sidebar: {
    width: SIDEBAR_WIDTH, // 240px
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    padding: "20px 0",
    display: "flex",
    flexDirection: "column",
    boxShadow: "2px 0 8px rgba(0,0,0,0.2)",

    position: "fixed",
    height: "100vh",
    top: 0,
    left: 0,
    zIndex: 100,
  },
  logo: {
    textAlign: "center",
    marginBottom: 30,
    fontSize: 22,
    fontWeight: "bold",
    color: "#cbd5e1",
  },
  navItem: (isActive) => ({
    padding: "12px 20px",
    cursor: "pointer",
    borderLeft: "4px solid transparent",
    transition: "all 0.2s ease-in-out",
    backgroundColor: isActive ? "#334155" : "transparent",
    borderLeftColor: isActive ? "#2563eb" : "transparent",
    color: isActive ? "#ffffff" : "#e2e8f0",
  }),
  mainWrapper: {
    // Đẩy nội dung sang phải để tránh Sidebar cố định
    marginLeft: SIDEBAR_WIDTH,

    // Buộc chiều rộng nội dung chiếm hết phần còn lại của màn hình
    width: `calc(100vw - ${SIDEBAR_WIDTH})`,

    minHeight: "100vh",
    backgroundColor: "#f7f9fc",
    overflowY: "auto",
  },
  logoutButton: {
    marginTop: "auto",
    marginBottom: 10,
    padding: "12px 20px",
    background: "none",
    border: "none",
    color: "#f87171",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 16,
    transition: "all 0.2s ease-in-out",
  },
};

export default function UserHomeScreen() {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const {logout, accessToken} = useAuth();

  useEffect(() => {
    console.log("Starting to connect socket");

    const SERVER_URL = "http://localhost:3000";

    const socket = io(SERVER_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    window.socket = socket;

    // ??
    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message || err);
      if (err && err.message && /unauthor/i.test(err.message)) {
        logout();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("global:user_online", ({ userName }) => {
      setOnlineUsers((prev) => {
        if (prev.includes(userName)) return prev;
        return [...prev, userName];
      });
    });

    socket.on("global:user_offline", ({ userName }) => {
      setOnlineUsers((prev) => prev.filter((n) => n !== userName));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);
  const handleNavigation = (path) => {
    navigate(path);
  };

  const isChatActive = currentPath.includes("/chat") || currentPath === "/home";
  const isExploreActive = currentPath.includes("/explore");

  return (
    <div style={styles.container}>
      {/* 1. Sidebar (CỐ ĐỊNH) */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>Học Nhóm</div>

        {/* Menu Chat */}
        <div
          style={{
            ...styles.navItem(isChatActive),
            ":hover": { backgroundColor: "#334155" },
          }}
          onClick={() => handleNavigation("/home/chat")}
        >
          Chat
        </div>

        {/* Menu Khám phá phòng mới */}
        <div
          style={{
            ...styles.navItem(isExploreActive),
            ":hover": { backgroundColor: "#334155" },
          }}
          onClick={() => handleNavigation("/home/explore")}
        >
          Khám phá phòng mới
        </div>

        {/* Nút Đăng xuất */}
        <button
          style={{
            ...styles.logoutButton,
            ":hover": { backgroundColor: "#334155" },
          }}
          onClick={logout}
        >
          Đăng xuất
        </button>
      </div>

      {/* 2. Main Content Wrapper */}
      <div style={styles.mainWrapper}>
        <Outlet />
      </div>
    </div>
  );
}
