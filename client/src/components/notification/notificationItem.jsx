// src/components/notification/notificationItem.jsx
import React from 'react';
import './notificationItem.css';

// Hàm helper để tạo nội dung thông báo dựa trên type (giống ngôn ngữ bạn chụp)
const getNotificationContent = (notification) => {
  switch (notification.type) {
    case 'group_name_change':
      return (
        <>
          Một quản trị viên đã thay đổi tên của nhóm **{notification.groupName}**... thành **{notification.newGroupName}**.
        </>
      );
    case 'group_privacy_change':
      return (
        <>
          Quản trị viên đã thay đổi quyền riêng tư của nhóm **{notification.groupName}** từ **{notification.oldPrivacy}** thành công...
        </>
      );
    case 'group_new_photos':
      return (
        <>
          **{notification.groupName}** đã thêm **{notification.count}** ảnh mới:... <br />
          <span className="notification-interaction">{notification.interaction} · {notification.comments}</span>
        </>
      );
    case 'event_reminder':
      return (
        <>
          ⏰ Sắp diễn ra sự kiện được nhắc đến trong bài viết của **{notification.groupName}**...
        </>
      );
    default:
      return 'Thông báo mới.';
  }
};

const NotificationItem = ({ notification }) => {
  // Thêm class 'unread' nếu thông báo chưa đọc
  const itemClass = `notification-item ${notification.isRead ? 'read' : 'unread'}`;

  return (
    <div className={itemClass}>
      <div className="notification-content-wrapper">
        {/* Sử dụng dangerouslySetInnerHTML nếu bạn muốn dùng Markdown (như **bold**) trong nội dung.
            Tuy nhiên, tôi giữ lại cách dùng React Fragment và strong tags để an toàn hơn. */}
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