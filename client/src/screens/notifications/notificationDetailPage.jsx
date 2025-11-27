import React from "react";
import { useParams } from "react-router-dom";
import "./notifications.css";

export default function notificationDetailPage() {
  const { id } = useParams();

  return (
    <div className="notif-detail">
      <h2>Chi tiết thông báo #{id}</h2>
      <p>Thông báo này sẽ lấy nội dung từ API sau.</p>
      <button onClick={() => window.history.back()}>Quay lại</button>
    </div>
  );
}
