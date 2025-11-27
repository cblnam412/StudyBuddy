// src/components/notification/notificationItem.jsx
import React from 'react';
import './notificationItem.css';

// Hàm helper để tạo nội dung thông báo dựa trên type
const getNotificationContent = (notification) => {
  switch (notification.type) {
    case 'request_approved':
      return (
        <>
          Yêu cầu của bạn đã được {notification.requester} duyệt để gia nhập {notification.roomName}.
        </>
      );
    case 'request_rejected':
      return (
        <>
          Yêu cầu {notification.requestType} nhóm {notification.roomName} đã bị {notification.rejecter}** từ chối.
        </>
      );
    case 'room_status_change':
      return (
        <>
         Phòng {notification.roomName} {notification.status}. Hãy kiểm tra ngay!
        </>
      );
    case 'warning_received':
      return (
        <>
          Bạn đã nhận một cảnh báo. Lý do: {notification.reason}. Vui lòng đọc lại quy tắc cộng đồng.
        </>
      );
    default:
      return 'Thông báo mới.';
  }
};

const NotificationItem = ({ notification, onClick }) => {
  // Thêm class 'unread' nếu thông báo chưa đọc
  const itemClass = `notification-item ${notification.isRead ? 'read' : 'unread'}`;

  // Thêm onClick event handler
  return (
    <div className={itemClass} onClick={onClick}>
      <div className="notification-content-wrapper">
        <p className="notification-content">
          {getNotificationContent(notification)}
        </p>
        <span className="notification-time">{notification.time}</span>
      </div>
      {/* Dấu chấm xanh cho thông báo chưa đọc */}
      {!notification.isRead && <div className="notification-dot-unread"></div>}
    </div>
  );
};

export default NotificationItem;