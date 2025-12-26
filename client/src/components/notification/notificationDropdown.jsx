import React, { useState, useEffect } from 'react';
import NotificationItem from './notificationItem';
import './notificationDropdown.css';
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:3000";

const NotificationDropdown = () => {
  const { accessToken } = useAuth();
  const { socketRef } = useSocket();
  const navigate = useNavigate();

  const [notificationList, setNotificationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const mapToFrontend = (data) => {
    return {
        id: data._id,
        isRead: data.is_read,
        time: formatTimeAgo(data.created_at),
        type: data.type,
        title: data.title,
        content: data.content,
        targetScreen: data.metadata?.targetScreen || null,
        category: getCategory(data.created_at),
        rawDate: data.created_at
    };
  };

   const fetchNotifications = async () => {
     try {
         setLoading(true);
         console.log("1. Bắt đầu gọi API thông báo...");

         const res = await fetch(`${API_BASE_URL}/notification`, {
             headers: { Authorization: `Bearer ${accessToken}` }
         });

         console.log("2. Trạng thái API:", res.status);
         const responseData = await res.json();
         console.log("3. Dữ liệu thô từ Server:", responseData);

         let rawList = [];
         if (responseData.success && Array.isArray(responseData.data)) {
             rawList = responseData.data;
         } else if (Array.isArray(responseData.notifications)) {
             rawList = responseData.notifications;
         } else if (Array.isArray(responseData)) {
              rawList = responseData;
         }

         console.log("4. Danh sách tìm thấy:", rawList.length, "mục");

         if (rawList.length > 0) {
             const mappedList = rawList.map(mapToFrontend);
             console.log("5. Dữ liệu sau khi Map:", mappedList);
             setNotificationList(mappedList);
         } else {
             setNotificationList([]);
         }

     } catch (err) {
         console.error("Lỗi TẢI thông báo:", err);
     } finally {
         setLoading(false);
     }
   };

  useEffect(() => {
    if (accessToken) {
        fetchNotifications();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!socketRef.current) return;
    const handleNewNotification = (newNotif) => {
        const mappedNotif = mapToFrontend(newNotif);
        setNotificationList(prev => [mappedNotif, ...prev]);
    };

    socketRef.current.on("notification:new", handleNewNotification);

    return () => {
        socketRef.current.off("notification:new", handleNewNotification);
    };
  }, [socketRef]);

  const markAsRead = async (id) => {
      setNotificationList(prev => prev.map(item =>
          item.id === id ? { ...item, isRead: true } : item
      ));

      try {
          await fetch(`${API_BASE_URL}/notification/${id}/read`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${accessToken}` }
          });
      } catch (err) {
          console.error("Lỗi đánh dấu đã đọc:", err);
      }
  };

  const handleNotificationClick = (notificationId, targetScreen, isRead) => {
      if (!isRead) {
          markAsRead(notificationId);
      }
      if (targetScreen) {
          navigate(`/user/${targetScreen}`);
      }
  };

  const filterNotifications = () => {
    let currentList = notificationList;
    if (activeTab === 'unread') {
        currentList = currentList.filter(item => !item.isRead);
    }

    const categorized = currentList.reduce((acc, notification) => {
        const category = notification.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(notification);
        return acc;
    }, {});

    const result = {};
    for (const category in categorized) {
        let items = categorized[category];
        if (category === 'Trước đó' && !isExpanded && activeTab === 'all') {
             items = items.slice(0, 3);
        }
        if (items.length > 0) result[category] = items;
    }
    return result;
  };

  const categorizedNotifications = filterNotifications();
  const categories = Object.keys(categorizedNotifications);

  const unreadCount = notificationList.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="notification-dropdown-container notification-dropdown-loading">
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="notification-dropdown-container">
      <div className="notification-header">
        <h2>Thông báo</h2>
      </div>

      <div className="notification-tabs">
        <button
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          Tất cả
        </button>
        <button
          className={activeTab === 'unread' ? 'active' : ''}
          onClick={() => setActiveTab('unread')}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <div className="notification-list">
        {categories.length > 0 ? (
          categories.map(category => (
            <React.Fragment key={category}>
              <h3 className="notification-category-title">{category}</h3>
              {categorizedNotifications[category].map(item => (
                <NotificationItem
                    key={item.id}
                    notification={item}
                    onClick={() => handleNotificationClick(item.id, item.targetScreen, item.isRead)}
                />
              ))}
            </React.Fragment>
          ))
        ) : (
          <p className="no-notifications">Không có thông báo nào.</p>
        )}

        {!isExpanded && activeTab === 'all' && notificationList.filter(n => n.category === 'Trước đó').length > 3 && (
            <div className="notification-footer">
                <button className="notification-footer-button" onClick={() => setIsExpanded(true)}>
                    Xem thêm thông báo cũ
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

function formatTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Vừa xong";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

function getCategory(dateString) {
    if (!dateString) return "Trước đó";
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Hôm nay";
    return "Trước đó";
}

export default NotificationDropdown;