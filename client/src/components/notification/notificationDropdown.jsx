import React, { useState, useEffect } from 'react';
import NotificationItem from './notificationItem';
import './notificationDropdown.css';

const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'request_approved',
    roomName: 'Phòng Luyện Thi TOEIC 900+',
    requester: 'Quản trị viên',
    time: '3 giờ trước',
    isRead: false,
    category: 'Hôm nay',
    targetScreen: 'room/toeic900'
  },
  {
    id: 'n2',
    type: 'warning_received',
    reason: 'Vi phạm quy tắc ngôn ngữ (spam)',
    time: '4 giờ trước',
    isRead: false,
    category: 'Hôm nay',
    targetScreen: 'profile/warnings'
  },
{
    id: 'n3',
    type: 'warning_received',
    reason: 'Vi phạm quy tắc ngôn ngữ (spam)',
    time: '4 giờ trước',
    isRead: false,
    category: 'Hôm nay',
    targetScreen: 'profile/warnings'
  },
  {
    id: 'n4',
    type: 'room_status_change',
    roomName: 'Phòng Thảo Luận Môn C++',
    status: 'đã chuyển thành công khai',
    time: '1 ngày trước',
    isRead: true,
    category: 'Trước đó',
    targetScreen: 'room/cpp_discussion'
  },
  {
    id: 'n5',
    type: 'request_rejected',
    requestType: 'gia nhập',
    roomName: 'Nhóm Kỹ Năng Mềm',
    rejecter: 'Mod B',
    time: '2 ngày trước',
    isRead: true,
    category: 'Trước đó',
    targetScreen: 'profile/requests'
  },
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

const MAX_INITIAL_DISPLAY = 3;


const NotificationDropdown = () => {
  const [notificationList, setNotificationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setNotificationList(MOCK_NOTIFICATIONS);
      setLoading(false);
    }, 500);
  }, []);

  const handleShowMore = () => {
    setIsExpanded(true);
  };

  const markAsRead = (id) => {
      setNotificationList(prevList => {
          const itemIndex = prevList.findIndex(item => item.id === id);
          if (itemIndex > -1 && !prevList[itemIndex].isRead) {
             const newList = [...prevList];
             newList[itemIndex] = { ...newList[itemIndex], isRead: true };
             return newList;
          }
          return prevList;
      });
  };

  const handleNotificationClick = (notificationId, targetScreen, isRead) => {
      console.log(`ĐIỀU HƯỚNG TỚI: /${targetScreen}`);

      if (!isRead) {
          markAsRead(notificationId);
      }

  };


  if (loading) {
    return (
      <div className="notification-dropdown-container notification-dropdown-loading">
        <p>Đang tải thông báo...</p>
      </div>
    );
  }

  const filterNotifications = () => {
    let currentList = notificationList;

    if (activeTab === 'unread') {
        currentList = currentList.filter(item => !item.isRead);
    }

    const filtered = categorizeNotifications(currentList);
    const result = {};

    for (const category in filtered) {
        let items = filtered[category];

        if (category === 'Trước đó' && !isExpanded && activeTab === 'all') {
             items = items.slice(0, MAX_INITIAL_DISPLAY);
        }

        if (items.length > 0) {
            result[category] = items;
        }
    }
    return result;
  };

  const categorizedNotifications = filterNotifications();
  const categories = Object.keys(categorizedNotifications);

  const unreadCount = notificationList.filter(n => !n.isRead).length;

  const totalPreviousNotifications = notificationList.filter(n => n.category === 'Trước đó').length;
  const hasMoreUnshown = totalPreviousNotifications > MAX_INITIAL_DISPLAY && !isExpanded && activeTab === 'all';


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

              {category === 'Trước đó' && hasMoreUnshown && (
                  <div className="notification-footer">
                    <button
                      className="notification-footer-button"
                      onClick={handleShowMore}
                    >
                      Xem thông báo trước đó ({totalPreviousNotifications - MAX_INITIAL_DISPLAY} mục)
                    </button>
                  </div>
              )}
            </React.Fragment>
          ))
        ) : (
          <p className="no-notifications">
            {activeTab === 'unread' ? 'Tuyệt vời, bạn đã đọc hết thông báo!' : 'Không có thông báo nào.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;