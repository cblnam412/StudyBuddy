import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SideBarLayout from "../SideBarLayout/SideBarLayout"; 
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import styles from "./UserHomeLayout.module.css";

export function UserHomeLayout() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // menu items for sidebar
  const userMenu = [
    { key: "chat", label: "Chat", href: "/home/chat" },
    { key: "explore", label: "Khám phá phòng mới", href: "/home/explore" },
  ];

  useEffect(() => {
    if (!accessToken) return;

    const SERVER_URL = "http://localhost:3000";
    const socket = io(SERVER_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    window.socket = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err && err.message ? err.message : err);
      if (err && err.message && /unauthor/i.test(err.message)) {
        logout();
        navigate("/login");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("global:user_online", ({ userName }) => {
      setOnlineUsers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
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
  }, [accessToken]);

  const onNavigate = (href, item) => {
    navigate(href);
  };

  // derive activeKey based on location
  const determineActiveKey = () => {
    const p = location.pathname;
    if (p.includes("/home/chat")) return "chat";
    if (p.includes("/home/explore")) return "explore";
    // default home
    if (p === "/home" || p === "/home/") return "home";
    return null;
  };

  const activeKey = determineActiveKey();

  return (
    <div className={styles.container}>
      <SideBarLayout
        logo="Học Nhóm"
        items={userMenu}
        activeKey={activeKey}
        onNavigate={onNavigate}
      />

      <div className={styles.mainWrapper}>
        <div className={styles.pageInner}>
          <Outlet context={{ socket: socketRef.current, onlineUsers }} />
        </div>
      </div>
    </div>
  );
}
