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
        <BookOpen size={30} className={styles.icon}/>
        {typeof logo === "string" ? <span className={styles.logoText}>{logo}</span> : logo}
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
                 <span className={styles.label}>{it.label}</span>
              </Button>
            </li>
          );
        })}
      </ul>

        <Button
          className={styles.logoutButton}
          icon={LogOut} 
          onClick={() => {
            logout();
            navigate("/login");
          }}
          hooverColor="#EF4444"
        >
          <span className={styles.icon}>{<LogOut/>}</span>
          <span className={styles.label}>Đăng xuất</span>
        </Button>
    </nav>
  );
}