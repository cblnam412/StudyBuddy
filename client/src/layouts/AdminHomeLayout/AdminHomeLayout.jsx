import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SideBarLayout from "../SideBarLayout/SideBarLayout";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";
import styles from "./AdminHomeLayout.module.css";
import { Button } from "../../components/Button/Button";
import {
  LayoutDashboard,
  Tag,
  Bell,
  SquareUserRound,
  MessageSquareWarning,
  ChartColumn,
  GitPullRequest
} from "lucide-react";

export function AdminHomeLayout() {
  const { logout, userInfo } = useAuth();
  const { socketRef, onlineUsers, loadingSocket } = useSocket();

  const navigate = useNavigate();
  const location = useLocation();

  const userMenu = [
    {
      key: "dashboard",
      label: "Trang chủ",
      href: "/admin",
      icon: <LayoutDashboard/>,
    },
    {
      key: "report",
      label: "Báo cáo vi phạm",
      href: "/admin/report",
      icon: <MessageSquareWarning/>,
    },

    {
      key: "requests",
      label: "Xử lý yêu cầu",
      href: "/admin/requests",
      icon: <GitPullRequest/>,
    },
    {
      key: "tag",
      label: "Quản lý tag",
      href: "/admin/tag",
      icon: <Tag/>,
    },
    {
      key: "stats",
      label: "Thống kê",
      href: "/admin/stats",
      icon: <ChartColumn/>,
    },
  ];

  const onNavigate = (href, item) => {
    navigate(href);
  };

  const determineActiveKey = () => {
    const p = location.pathname;

    if (p.includes("/admin/requests")) return "requests";

    if (p.includes("/admin/chat")) return "chat";
    if (p.includes("/admin/report")) return "report";
    if (p.includes("/admin/tag")) return "tag";
    if (p.includes("admin/stats")) return "stats";

    if (p === "/admin" || p === "/admin/" || p === "/home" || p === "/home/") return "dashboard";

    return null;
  };

  const activeKey = determineActiveKey();

  if (loadingSocket) {
    return <LoadingSpinner label="Đang kết nối đến máy chủ" />;
  }

  return (
    <div className={styles.container}>
      <SideBarLayout
        logo={userInfo.system_role === "admin" ? "Admin Page" : "Moderator Page"}
        items={userMenu}
        activeKey={activeKey}
        onNavigate={onNavigate}
        style={{ backgroundColor: '#180f28' }}
      />

      <div className={styles.mainWrapper}>
        <header className={styles.topHeader}> 
          <div className={styles.headerActions}>
            <Button style={{width: "30%", borderRadius: "999px", aspectRatio: "1/1"}} >
              <Bell size={20} />
            </Button>
            <div className={styles.profile}>
              <img
                src={userInfo.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"}
                alt="User"
                onClick={() => navigate("/admin/info")}
                style={{cursor: 'pointer'}}
              />
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