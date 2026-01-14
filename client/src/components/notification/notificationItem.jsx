import React from 'react';
import './notificationItem.css';

// const getNotificationContent = (notification) => {
//   switch (notification.type) {
//     case 'request_approved':
//       return (
//         <>
//           Yêu cầu của bạn đã được {notification.requester} duyệt để gia nhập {notification.roomName}.
//         </>
//       );
//     case 'request_rejected':
//       return (
//         <>
//           Yêu cầu {notification.requestType} nhóm {notification.roomName} đã bị {notification.rejecter} từ chối.
//         </>
//       );
//     case 'room_status_change':
//       return (
//         <>
//          Phòng {notification.roomName} {notification.status}. Hãy kiểm tra ngay!
//         </>
//       );
//     case 'warning_received':
//       return (
//         <>
//           Bạn đã nhận một cảnh báo. Lý do: {notification.reason}. Vui lòng đọc lại quy tắc cộng đồng.
//         </>
//       );
//     default:
//       return 'Thông báo mới.';
//   }
// };

const NOTIFICATION_STYLE = {
  info: {
    color: "#2563eb",      // blue-600
    bg: "#eff6ff",         // blue-50
    icon: "ℹ️",
  },
  request_approved: {
    color: "#16a34a",      // green-600
    bg: "#f0fdf4",         // green-50
    icon: "✅",
  },
  request_rejected: {
    color: "#dc2626",      // red-600
    bg: "#fef2f2",         // red-50
    icon: "❌",
  },
  warning_received: {
    color: "#ca8a04",      // yellow-600
    bg: "#fefce8",         // yellow-50
    icon: "⚠️",
  },
  default: {
    color: "#374151",      // gray-700
    bg: "#f9fafb",         // gray-50
    icon: "🔔",
  },
};

const getNotificationStyle = (notification) => {
  return (
    NOTIFICATION_STYLE[notification.type] ||
    NOTIFICATION_STYLE.default
  );
};

const getNotificationContent = (notification) => {
  // Ưu tiên content từ backend
  if (notification.content) {
    return notification.content;
  }

  // fallback cũ (nếu sau này có type đặc biệt)
  switch (notification.type) {
    case 'request_approved':
      return `Yêu cầu của bạn đã được duyệt để gia nhập ${notification.roomName}.`;
    case 'request_rejected':
      return `Yêu cầu của bạn đã bị từ chối.`;
    case 'room_status_change':
      return `Trạng thái phòng đã thay đổi.`;
    case 'warning_received':
      return `Bạn đã nhận một cảnh báo.`;
    default:
      return 'Thông báo mới';
  }
};

const NotificationItem = ({ notification, onClick }) => {
  const style = getNotificationStyle(notification);

  return (
    <div
      className={`notification-item ${
        notification.isRead ? "read" : "unread"
      }`}
      onClick={onClick}
      style={{
        backgroundColor: notification.is_read
          ? "#ffffff"
          : style.bg,
        borderLeft: `4px solid ${style.color}`,
      }}
    >
      <div className="notification-content-wrapper">
        <div className="notification-header-row">
          <span className="notification-icon">
            {style.icon}
          </span>

          <h4
            className="notification-title"
            style={{ color: style.color }}
          >
            {notification.title}
          </h4>
        </div>

        <p className="notification-content">
          {notification.content}
        </p>

        <span className="notification-time">
          {notification.time}
        </span>
      </div>

      {!notification.isRead && (
        <div className="notification-dot-unread"></div>
      )}
    </div>
  );
};

export default NotificationItem;