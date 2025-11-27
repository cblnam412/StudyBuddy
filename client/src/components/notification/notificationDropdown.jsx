// src/components/notification/notificationDropdown.jsx
import React, { useState, useEffect } from 'react';
import NotificationItem from './notificationItem';
import './notificationDropdown.css'; // Giả sử bạn có CSS tương ứng

// Dữ liệu giả lập (Mock Data) được tích hợp trực tiếp
const MOCK_NOTIFICATIONS = [
  // ... (Dữ liệu giả lập không thay đổi)
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
  // **THÊM MỘT SỐ DỮ LIỆU ĐỂ TEST VIỆC MỞ RỘNG (GỌI LÀ OLDER)**
  {
    id: 'n6',
    type: 'group_new_photos',
    groupName: 'Nhóm Test 1',
    count: 5,
    actor: 'Admin',
    time: '1 ngày',
    interaction: '10 cảm xúc',
    comments: '1 bình luận',
    isRead: true,
    category: 'Trước đó'
  },
  {
    id: 'n7',
    type: 'event_reminder',
    groupName: 'Nhóm Test 2',
    time: '2 ngày',
    isRead: true,
    category: 'Trước đó'
  },
  // ... (Thêm nhiều thông báo khác nếu cần)
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

// **SỐ LƯỢNG THÔNG BÁO TỐI ĐA HIỂN THỊ BAN ĐẦU CHO MỖI DANH MỤC**
const MAX_INITIAL_DISPLAY = 3;


const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' hoặc 'unread'

  // 1. STATE MỚI: Theo dõi trạng thái đã mở rộng hay chưa
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Giả lập độ trễ tải dữ liệu
    setTimeout(() => {
      const categorizedData = categorizeNotifications(MOCK_NOTIFICATIONS);
      setNotifications(categorizedData);
      setLoading(false);
    }, 500);
  }, []);

  // 3. HÀM CHUYỂN ĐỔI TRẠNG THÁI MỞ RỘNG
  const handleShowMore = () => {
    setIsExpanded(true);
    // Nếu bạn muốn cuộn (scroll) xuống thông báo mới, bạn có thể thực hiện ở đây.
  };

  if (loading) {
    // Hiển thị trạng thái đang tải
    return (
      <div className="notification-dropdown-container notification-dropdown-loading">
        <p>Đang tải thông báo...</p>
      </div>
    );
  }

  // 2. CẬP NHẬT HÀM LỌC: Thêm logic giới hạn số lượng thông báo
  const filterNotifications = () => {
    const filtered = {};
    for (const category in notifications) {
      // 1. Lọc theo tab ('Tất cả' hoặc 'Chưa đọc')
      let items = notifications[category];
      let filteredItems = activeTab === 'all'
        ? items
        : items.filter(item => !item.isRead);

      // 2. Lọc theo trạng thái mở rộng (Chỉ giới hạn nếu activeTab là 'all' và chưa expanded)
      if (!isExpanded && activeTab === 'all') {
         // Chỉ hiển thị MAX_INITIAL_DISPLAY mục cho mỗi category nếu chưa mở rộng và đang ở tab 'all'
         filteredItems = filteredItems.slice(0, MAX_INITIAL_DISPLAY);
      }

      // Hoặc: Chỉ giới hạn thông báo trong mục "Trước đó" nếu chưa mở rộng (Tùy theo UX/UI)
      /* if (category === 'Trước đó' && !isExpanded) {
         filteredItems = filteredItems.slice(0, MAX_INITIAL_DISPLAY);
      }
      */

      if (filteredItems.length > 0) {
        filtered[category] = filteredItems;
      }
    }
    return filtered;
  };

  const categorizedNotifications = filterNotifications();
  const categories = Object.keys(categorizedNotifications);

  // Kiểm tra xem còn thông báo nào chưa được hiển thị không
  const hasMoreUnshown = notifications['Trước đó']
    && (notifications['Trước đó'].length > categorizedNotifications['Trước đó']?.length)
    && !isExpanded;

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

              {/* CẬP NHẬT: Hiển thị nút "Xem thông báo trước đó" dựa trên điều kiện */}
              {category === 'Trước đó' && hasMoreUnshown && (
                  <div className="notification-footer">
                    {/* Gắn hàm xử lý sự kiện */}
                    <button
                      className="notification-footer-button"
                      onClick={handleShowMore}
                    >
                      Xem thông báo trước đó
                    </button>
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