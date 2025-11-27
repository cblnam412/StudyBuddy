// src/components/notification/notificationDropdown.jsx
import React, { useState, useEffect } from 'react';
import NotificationItem from './notificationItem';
import './notificationDropdown.css';

// Dữ liệu giả lập (Mock Data) được tích hợp trực tiếp
const MOCK_NOTIFICATIONS = [
  // --- Hôm nay ---
  {
    id: 'n1',
    type: 'group_name_change',
    groupName: 'Cộng Đồng Nhảy Dây',
    newGroupName: 'Yêu Nhảy Dây',
    time: '3 giờ',
    isRead: false,
    category: 'Hôm nay'
  },
  {
    id: 'n2',
    type: 'group_privacy_change',
    groupName: 'Hội Hóng Biến',
    oldPrivacy: 'riêng tư',
    newPrivacy: 'công khai',
    time: '4 giờ',
    isRead: false,
    category: 'Hôm nay'
  },
  // --- Trước đó ---
  {
    id: 'n3',
    type: 'group_new_photos',
    groupName: 'Trường Đại học Công nghệ Thông tin - Đại học Quốc gia TP.HCM',
    count: 10,
    actor: 'UIT',
    time: '11 giờ',
    interaction: '276 cảm xúc',
    comments: '8 bình luận',
    isRead: true,
    category: 'Trước đó'
  },
  {
    id: 'n4',
    type: 'event_reminder',
    groupName: 'Trường Đại học Công nghệ...',
    time: '12 giờ',
    isRead: true,
    category: 'Trước đó'
  },
  {
    id: 'n5',
    type: 'group_privacy_change',
    groupName: 'Tư vấn tuyển sinh Đại học',
    oldPrivacy: 'công khai',
    newPrivacy: 'riêng tư',
    time: '13 giờ',
    isRead: true,
    category: 'Trước đó'
  },
];

// Hàm xử lý phân loại dữ liệu (giả lập API response)
const categorizeNotifications = (data) => {
    return data.reduce((acc, notification) => {
        const category = notification.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(notification);
        return acc;
    }, {});
};


const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' hoặc 'unread'

  useEffect(() => {
    // Giả lập độ trễ tải dữ liệu
    setTimeout(() => {
      const categorizedData = categorizeNotifications(MOCK_NOTIFICATIONS);
      setNotifications(categorizedData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    // Hiển thị trạng thái đang tải
    return (
      <div className="notification-dropdown-container notification-dropdown-loading">
        <p>Đang tải thông báo...</p>
        {/* Nếu bạn có LoadingSpinner.jsx, bạn đặt nó vào đây */}
      </div>
    );
  }

  // Lọc thông báo dựa trên tab active ('Tất cả' hoặc 'Chưa đọc')
  const filterNotifications = () => {
    const filtered = {};
    for (const category in notifications) {
      const items = notifications[category];
      const filteredItems = activeTab === 'all'
        ? items
        : items.filter(item => !item.isRead);

      if (filteredItems.length > 0) {
        filtered[category] = filteredItems;
      }
    }
    return filtered;
  };

  const categorizedNotifications = filterNotifications();
  const categories = Object.keys(categorizedNotifications);

  return (
    <div className="notification-dropdown-container">
      <div className="notification-header">
        <h2>Thông báo</h2>
      </div>

      {/* Tabs Tất cả / Chưa đọc */}
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
          Chưa đọc
        </button>
      </div>

      {/* Danh sách thông báo */}
      <div className="notification-list">
        {categories.length > 0 ? (
          categories.map(category => (
            <React.Fragment key={category}>
              <h3 className="notification-category-title">{category}</h3>
              {categorizedNotifications[category].map(item => (
                <NotificationItem key={item.id} notification={item} />
              ))}
              {/* Nút Xem thêm chỉ xuất hiện sau phần "Trước đó" */}
              {category === 'Trước đó' && (
                  <div className="notification-footer">
                    <button className="notification-footer-button">Xem thông báo trước đó</button>
                  </div>
              )}
            </React.Fragment>
          ))
        ) : (
          <p className="no-notifications">Không có thông báo nào.</p>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;