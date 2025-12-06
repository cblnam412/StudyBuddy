import React from "react";
import styles from "./SideBarLayout.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, BookOpen } from "lucide-react"; 
import { Button } from "../../components/Button/Button";

export default function SideBarLayout({
  logo = "Học Nhóm",
  items = [],
  activeKey = null,
  onNavigate = (href) => {},
  className = "",
  style = {}
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className={`${styles.sidebar} ${className}`} style={style} aria-label="Sidebar">
      {/* Logo Section */}
      <div className={styles.logo}>
        <BookOpen size={28} />
        {typeof logo === "string" ? <span>{logo}</span> : logo}
      </div>

      <ul className={styles.navList}>
        {items.map((it) => {
          const isActive = it.key === activeKey;
          return (
            <li key={it.key}>
              <Button
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                onClick={() => onNavigate(it.href, it)}
                aria-current={isActive ? "page" : undefined}
                align="left"
                fontSize="16px"
              >
                 {it.icon && <span className={styles.icon}>{it.icon}</span>}
                 <span>{it.label}</span>
              </Button>
            </li>
          );
        })}
      </ul>

      <div>
        <Button
          className={styles.logoutButton}
          icon={LogOut} 
          onClick={() => {
            logout();
            navigate("/login");
          }}
          hooverColor="#EF4444"
          fontSize="16px"
        >
          Đăng xuất
        </Button>
      </div>
    </nav>
  );
}