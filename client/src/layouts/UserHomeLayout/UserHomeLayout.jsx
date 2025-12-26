import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SideBarLayout from "../SideBarLayout/SideBarLayout";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { LoadingSpinner } from "../../components/LoadingSpinner/LoadingSpinner";
import styles from "./UserHomeLayout.module.css";
import { Button } from "../../components/Button/Button";
import NotificationDropdown from "../../components/notification/notificationDropdown";

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

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notificationRef]);


  const userMenu = [
    {
      key: "dashboard",
      label: "Trang chủ",
      href: "/user",
      icon: <LayoutDashboard/>,
    },
    {
      key: "chat",
      label: "Tin nhắn",
      href: "/user/chat",
      icon: <MessageSquare/>,
    },
    {
      key: "explore",
      label: "Khám phá",
      href: "/user/explore",
      icon: <Globe/>,
    },
    {
      key: "event",
      label: "Sự kiện",
      href: "/user/event",
      icon: <CalendarDays/>,
    },
    {
      key: "info",
      label: "Trang cá nhân",
      href: "/user/info",
      icon: <SquareUserRound/>,
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

            <div
              ref={notificationRef}
              style={{ position: "relative", display: "flex", alignItems: "center" }}
            >
              <Button
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: showNotifications ? "#e5e7eb" : undefined
                }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20}/>
              </Button>

              {showNotifications && (
                <div
                  style={{
                    position: "absolute",
                    top: "50px",
                    right: "-80px",
                    zIndex: 1000,
                  }}
                >
                  <NotificationDropdown />
                </div>
              )}
            </div>
            <div className={styles.profile}>
              <img
                src={userInfo.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"}
                alt="User"
                onClick={() => navigate("/user/info")}
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