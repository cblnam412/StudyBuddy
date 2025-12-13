import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SideBarLayout from "../SideBarLayout/SideBarLayout";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";
import styles from "./UserHomeLayout.module.css";
import { Button } from "../../components/Button/Button";
import {
  LayoutDashboard,
  MessageSquare,
  Globe,
  Bell,
  SquareUserRound,
  CalendarDays 
} from "lucide-react";

export function UserHomeLayout() {
  const { logout, userInfo } = useAuth();
  const { socketRef, onlineUsers, loadingSocket } = useSocket();

  const navigate = useNavigate();
  const location = useLocation();

  const userMenu = [
    {
      key: "dashboard",
      label: "Trang chủ",
      href: "/user",
      icon: <LayoutDashboard size={15} />,
    },
    {
      key: "chat",
      label: "Tin nhắn",
      href: "/user/chat",
      icon: <MessageSquare size={15} />,
    },
    {
      key: "explore",
      label: "Khám phá",
      href: "/user/explore",
      icon: <Globe size={15} />,
    },
    {
      key: "event",
      label: "Sự kiện",
      href: "/user/event",
      icon: <CalendarDays  size={15} />,
    },
    {
      key: "info",
      label: "Trang cá nhân",
      href: "/user/info",
      icon: <SquareUserRound size={15} />,
    },
  ];

  const onNavigate = (href, item) => {
    navigate(href);
  };

  const determineActiveKey = () => {
    const p = location.pathname;
    if (p.includes("/user/chat")) return "chat";
    if (p.includes("/user/explore")) return "explore";
    if (p.includes("/user/live")) return "live";
    if (p.includes("/user/event")) return "event";
    if (p.includes("user/info")) return "info";
    if (p === "/user" || p === "/user/") return "dashboard";
    return null;
  };

  const activeKey = determineActiveKey();

  if (loadingSocket) {
    return <LoadingSpinner label="Đang kết nối đến máy chủ" />;
  }

  return (
    <div className={styles.container}>
      <SideBarLayout
        logo="Study Buddy"
        items={userMenu}
        activeKey={activeKey}
        onNavigate={onNavigate}
      />

      <div className={styles.mainWrapper}>
        <header className={styles.topHeader}>
          <div className={styles.headerActions}>
            <Button style={{width: "30%"}}>
              <Bell size={20} />
            </Button>
            <div className={styles.profile}>
              <img src={userInfo.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"} alt="User" onClick={() => navigate("/user/info")}/>
            </div>
          </div>
        </header>

        <div className={styles.pageInner}>
          <Outlet context={{ socket: socketRef.current, onlineUsers }} />
        </div>
      </div>
    </div>
  );
}
