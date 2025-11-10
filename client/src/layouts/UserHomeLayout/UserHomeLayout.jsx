import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SideBarLayout from "../SideBarLayout/SideBarLayout";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";
import styles from "./UserHomeLayout.module.css";

export function UserHomeLayout() {
  const { accessToken, logout } = useAuth();
  const {socketRef, onlineUsers, loadingSocket} = useSocket();

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // menu items for sidebar
  const userMenu = [
    { key: "chat", label: "Chat", href: "/home/chat" },
    { key: "explore", label: "Khám phá phòng mới", href: "/home/explore" },
  ];

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

  if (loadingSocket) {
    return <LoadingSpinner label="Đang kết nối đến máy chủ" />;
  }

  return (
    <>
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
    </>
  );
}
