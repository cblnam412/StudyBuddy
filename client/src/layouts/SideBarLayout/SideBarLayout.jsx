import React from "react";
import styles from "./SideBarLayout.module.css";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SideBarLayout({
  logo = "Học Nhóm", // string or ReactNode
  items = [], // [{ key, label, href, icon? }]
  activeKey = null, // key of currently active item
  onNavigate = (href) => {}, // navigation callback: (href, item) => void
  className = "",
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className={`${styles.sidebar} ${className}`} aria-label="Sidebar">
      <div className={styles.logo}>
        {typeof logo === "string" ? <strong>{logo}</strong> : logo}
      </div>

      <ul className={styles.navList}>
        {items.map((it) => {
          const isActive = it.key === activeKey;
          return (
            <li key={it.key}>
              <button
                type="button"
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                onClick={() => onNavigate(it.href, it)}
                aria-current={isActive ? "page" : undefined}
              >
                {it.icon && <span className={styles.icon}>{it.icon}</span>}
                <span className={styles.label}>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.logoutButton} onClick={() => {
        logout();
        navigate('/login');
      }}>
        Đăng xuất
      </div>
    </nav>
  );
}
