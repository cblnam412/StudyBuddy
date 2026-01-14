import React, { useState, useEffect } from "react";
import NotificationItem from "./notificationItem";
import "./notificationDropdown.css";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:3000";

const normalizeNotificationResponse = (json) => {
  if (Array.isArray(json.data)) {
    // GET ALL
    return json.data;
  }

  if (json.data?.notifications) {
    // GET UNREAD
    return json.data.notifications;
  }

  return [];
};

const NotificationDropdown = () => {
  const { accessToken } = useAuth();
  const { socketRef } = useSocket();
  const navigate = useNavigate();

  const [notificationList, setNotificationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const mapToFrontend = (data) => {
    console.log("NOTI RAW:", data);

    return {
      id: data._id,
      type: data.type,
      title: data.title,
      content: data.content,
      isRead: Boolean(data.is_read),
      time: formatTimeAgo(data.created_at),
      targetScreen: data.metadata?.targetScreen || null,
      rawDate: data.created_at,
    };
  };

  // const fetchNotifications = async () => {
  //   if (!accessToken) return;

  //   try {
  //     console.log("CALL API /notification");
  //     setLoading(true);

  //     const res = await fetch(`${API_BASE_URL}/notification`, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //     });

  //     console.log("STATUS:", res.status);

  //     const json = await res.json();
  //     console.log("RESPONSE:", json);

  //     if (!json.success) {
  //       setNotificationList([]);
  //       return;
  //     }

  //     setNotificationList(json.data.map(mapToFrontend));
  //   } catch (err) {
  //     console.error("FETCH ERROR:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchNotifications = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);

      const endpoint =
        activeTab === "unread"
          ? "/notification/unread-count"
          : "/notification";

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();

      if (!json.success) {
        setNotificationList([]);
        return;
      }

      const rawList = normalizeNotificationResponse(json);

      setNotificationList(rawList.map(mapToFrontend));
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setNotificationList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [accessToken, activeTab]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewNotification = (notif) => {
      console.log("SOCKET NOTI:", notif);
      setNotificationList((prev) => [
        mapToFrontend(notif),
        ...prev,
      ]);
    };

    socketRef.current.on("notification:new", handleNewNotification);

    return () => {
      socketRef.current.off("notification:new", handleNewNotification);
    };
  }, [socketRef]);

  const markAsRead = async (id) => {
    setNotificationList((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      )
    );

    try {
      await fetch(`${API_BASE_URL}/notification/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {}
  };

  const handleClick = (item) => {
    if (!item.isRead) markAsRead(item.id);
    if (item.targetScreen)
      navigate(`/user/${item.targetScreen}`);
  };

  const unreadCount = notificationList.filter(
    (n) => !n.isRead
  ).length;

  if (loading) return <p>Đang tải...</p>;

  return (
    <div className="notification-dropdown-container">
      <div className="notification-header">
        <h2>Thông báo</h2>
      </div>

      <div className="notification-tabs">
        <button
          className={activeTab === "all" ? "active" : ""}
          onClick={() => setActiveTab("all")}
        >
          Tất cả
        </button>
        <button
          className={activeTab === "unread" ? "active" : ""}
          onClick={() => setActiveTab("unread")}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <div className="notification-list">
        {notificationList
          .filter(
            (n) => activeTab === "all" || !n.isRead
          )
          .map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onClick={() => handleClick(item)}
            />
          ))}

        {notificationList.length === 0 && (
          <p>Không có thông báo</p>
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(dateString) {
  if (!dateString) return "";

  const diff = Math.floor(
    (Date.now() - new Date(dateString)) / 1000
  );

  if (diff < 60) return "Vừa xong";
  if (diff < 3600)
    return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)} giờ trước`;

  return new Date(dateString).toLocaleDateString("vi-VN");
}

export default NotificationDropdown;
