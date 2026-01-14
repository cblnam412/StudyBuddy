import React, { useState, useEffect, useRef } from "react";
import NotificationItem from "./notificationItem";
import "./notificationDropdown.css";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";

const BellIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="bell-icon"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const API_BASE_URL = "http://localhost:3000";

const normalizeNotificationResponse = (json) => {
  if (Array.isArray(json.data)) return json.data;
  if (json.data?.notifications) return json.data.notifications;
  return [];
};

const NotificationDropdown = () => {
  const { accessToken } = useAuth();
  const { socketRef } = useSocket();
  const navigate = useNavigate();

  const [notificationList, setNotificationList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef(null);

  const mapToFrontend = (data) => ({
    id: data._id,
    type: data.type,
    title: data.title,
    content: data.content,
    isRead: Boolean(data.is_read),
    time: new Date(data.created_at).toLocaleString("vi-VN"),
    metadata: data.metadata || {},
    targetScreen: data.metadata?.targetScreen || null,
  });

  const fetchNotifications = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notification`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      const rawList = normalizeNotificationResponse(json);
      const mappedList = rawList.map(mapToFrontend);

      setNotificationList(mappedList);
      setUnreadCount(mappedList.filter(n => !n.isRead).length);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchNotifications(); }, [accessToken]);

  useEffect(() => {
    if (!socketRef.current) return;
    const handleNew = (newNoti) => {
        setNotificationList(prev => [mapToFrontend(newNoti), ...prev]);
        if (!isOpen) {
            setUnreadCount(prev => prev + 1);
        }
    };
    socketRef.current.on("notification:new", handleNew);
    return () => socketRef.current.off("notification:new", handleNew);
  }, [socketRef, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
      try {
          await fetch(`${API_BASE_URL}/notification/read-all`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${accessToken}` },
          });
          setNotificationList(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (e) {
          console.error("Lỗi mark all read", e);
      }
  };

  const handleBellClick = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
        setUnreadCount(0);
        markAllAsRead();
    }
  };

  const handleClickItem = async (item) => {
    setIsOpen(false);
    if (!item.isRead) {
        setNotificationList(prev => prev.map(n => n.id === item.id ? {...n, isRead: true} : n));
        try {
            await fetch(`${API_BASE_URL}/notification/${item.id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${accessToken}` } });
        } catch {}
    }

    if (item.metadata?.roomId) {
        navigate(`/user/chat/${item.metadata.roomId}`);
    } else if (item.targetScreen) {
        navigate(`/user/${item.targetScreen}`);
    }
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={handleBellClick}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-container">
          <div className="notification-header">
            <h3>Thông báo</h3>
          </div>

          <div className="notification-list">
            {notificationList.length > 0 ? (
              notificationList.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={item}
                  onClick={() => handleClickItem(item)}
                />
              ))
            ) : (
              <div className="empty-notification">Không có thông báo nào</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;