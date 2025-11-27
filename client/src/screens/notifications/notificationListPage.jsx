import NotificationDropdown from '../../components/notification/notificationDropdown';
import './notifications.css';

const NotificationListPage = () => {
  return (
    <div className="notification-page-mock-center">
        <div className="mock-dropdown-placement">
            <NotificationDropdown />
        </div>
    </div>
  );
};

export default NotificationListPage;