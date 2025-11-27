// src/components/notification/notificationDropdown.jsx
import React, { useState, useEffect } from 'react';
import NotificationItem from './notificationItem';
import './notificationDropdown.css'; // Giả sử bạn có CSS tương ứng

// DỮ LIỆU GIẢ LẬP ĐÃ CẬP NHẬT THEO CHỦ ĐỀ CỦA BẠN
const MOCK_NOTIFICATIONS = [
  // --- Hôm nay ---
  {
    id: 'n1',
    type: 'request_approved', // Yêu cầu được duyệt
    roomName: 'Phòng Luyện Thi TOEIC 900+',
    requester: 'Quản trị viên',
    time: '3 giờ trước',
    isRead: false,
    category: 'Hôm nay',
    targetScreen: 'room/toeic900' // Màn hình đích khi click
  },
  {
    id: 'n2',
    type: 'warning_received', // Cảnh cáo
    reason: 'Vi phạm quy tắc ngôn ngữ (spam)',
    time: '4 giờ trước',
    isRead: false,
    category: 'Hôm nay',
    targetScreen: 'profile/warnings'
  },
{
    id: 'n3',
    type: 'warning_received', // Cảnh cáo
    reason: 'Vi phạm quy tắc ngôn ngữ (spam)',
    time: '4 giờ trước',
    isRead: false,
    category: 'Hôm nay',
    targetScreen: 'profile/warnings'
  },
  // --- Trước đó ---
  {
    id: 'n4',
    type: 'room_status_change', // Thay đổi trạng thái phòng
    roomName: 'Phòng Thảo Luận Môn C++',
    status: 'đã chuyển thành công khai',
    time: '1 ngày trước',
    isRead: true,
    category: 'Trước đó',
    targetScreen: 'room/cpp_discussion'
  },
  {
    id: 'n5',
    type: 'request_rejected', // Yêu cầu bị từ chối
    requestType: 'gia nhập',
    roomName: 'Nhóm Kỹ Năng Mềm',
    rejecter: 'Mod B',
    time: '2 ngày trước',
    isRead: true,
    category: 'Trước đó',
    targetScreen: 'profile/requests'
  },
  // **THÊM MỘT SỐ DỮ LIỆU ĐỂ TEST VIỆC MỞ RỘNG**
  {
    id: 'n6',
    type: 'room_status_change',
    roomName: 'Phòng Game Dev',
    status: 'đã bị khóa tạm thời',
    time: '3 ngày trước',
    isRead: true,
    category: 'Trước đó',
    targetScreen: 'room/game_dev'
  },
  {
    id: 'n7',
    type: 'request_approved',
    roomName: 'Phòng Tiếng Nhật Sơ Cấp',
    requester: 'Admin C',
    time: '4 ngày trước',
    isRead: true,
    category: 'Trước đó',
    targetScreen: 'room/japanese_basic'
  }

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
    // Logic điều hướng cuộn (nếu cần)
    // Ví dụ: scrollElement.scrollTop = 0;
  };

  // HÀM XỬ LÝ CLICK THÔNG BÁO (GIẢ LẬP ĐIỀU HƯỚNG)
  const handleNotificationClick = (targetScreen) => {
      // Logic điều hướng thực tế sẽ dùng react-router-dom/nextjs router.
      console.log(`ĐIỀU HƯỚNG TỚI: /${targetScreen}`);
      // Thêm logic đóng dropdown sau khi điều hướng
      // closeDropdown();
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
         // Chỉ giới hạn thông báo trong mục "Trước đó" nếu chưa mở rộng và đang ở tab 'all'
         if (category === 'Trước đó') {
             // Lấy số lượng thông báo đã hiển thị của mục "Hôm nay" (để đảm bảo không bị quá tải nếu "Hôm nay" có nhiều hơn MAX_INITIAL_DISPLAY)
             // Tùy chỉnh: Lấy MAX_INITIAL_DISPLAY cho mỗi category
             filteredItems = filteredItems.slice(0, MAX_INITIAL_DISPLAY);
         }
      }

      if (filteredItems.length > 0) {
        filtered[category] = filteredItems;
      }
    }
    return filtered;
  };

  const categorizedNotifications = filterNotifications();
  const categories = Object.keys(categorizedNotifications);

  // Kiểm tra xem còn thông báo nào chưa được hiển thị không
  // So sánh tổng số lượng item "Trước đó" với số lượng item "Trước đó" đang hiển thị
  const hasMoreUnshown = notifications['Trước đó']
    && notifications['Trước đó'].length > MAX_INITIAL_DISPLAY
    && !isExpanded
    && activeTab === 'all';


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
                // TRUYỀN HÀM XỬ LÝ CLICK XUỐNG COMPONENT CON
                <NotificationItem
                    key={item.id}
                    notification={item}
                    onClick={() => handleNotificationClick(item.targetScreen)} // Gắn event handler
                />
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