// src/screens/notifications/notificationListPage.jsx
import NotificationDropdown from '../../components/notification/notificationDropdown';
import './notifications.css';

const NotificationListPage = () => {
  return (
    <div className="notification-page-mock-center">
        {/* Component này mô phỏng giao diện toàn màn hình nếu bạn cần */}
        <h1>Trang Kiểm tra UI Thông Báo</h1>
        <p>Đây là nơi đặt component NotificationDropdown.</p>
        <div className="mock-dropdown-placement">
            <NotificationDropdown />
        </div>
    </div>
  );
};

export default NotificationListPage;