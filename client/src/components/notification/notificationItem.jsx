import React, { useEffect, useRef } from "react";
import "./notificationItem.css";

const NotificationItem = ({ notification, onClick }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const domClick = () => {
      console.log("DOM CLICK TRIGGERED:", notification.id);
    };

    el.addEventListener("click", domClick);

    return () => {
      el.removeEventListener("click", domClick);
    };
  }, [notification.id]);

  return (
    <div
      ref={ref}
      className={`notification-item ${
        notification.isRead ? "read" : "unread"
      }`}
      onClick={(e) => {
        console.log("REACT onClick FIRED:", notification.id);
        e.stopPropagation();
        onClick();
      }}
      style={{
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      <div
        className="notification-content-wrapper"
        style={{ pointerEvents: "none" }}
      >
        <h4>{notification.title}</h4>
        <p>{notification.content}</p>
        <small>{notification.time}</small>
      </div>
    </div>
  );
};

export default NotificationItem;
