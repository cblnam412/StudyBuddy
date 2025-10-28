import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const sidebarStyle = {
  width: "260px",
  backgroundColor: "#1e293b",
  color: "#fff",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  padding: "20px 15px",
  boxSizing: "border-box",
};

const roomItem = {
  padding: "10px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginBottom: "8px",
  transition: "background 0.2s ease",
};

export default function RoomSidebar() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/room/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setRooms(data.rooms || []);
        else console.error("Không tải được danh sách phòng:", data.message);
      } catch (err) {
        console.error("Lỗi fetch my rooms:", err);
      }
    };
    fetchMyRooms();
  }, []);

  return (
    <div style={sidebarStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 20 }}>Phòng của tôi</h2>

      {rooms.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Bạn chưa tham gia phòng nào.</p>
      ) : (
        rooms.map((room) => (
          <div
            key={room._id}
            style={{
              ...roomItem,
              backgroundColor: "#334155",
            }}
            onClick={() => navigate(`/home/chat/${room._id}`)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#475569")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#334155")}
          >
            {room.room_name}
          </div>
        ))
      )}

      <button
        style={{
          marginTop: "auto",
          padding: "10px 15px",
          borderRadius: 8,
          background: "#22c55e",
          border: "none",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
        onClick={() => navigate("/home/explore")}
      >
        + Khám phá phòng mới
      </button>
    </div>
  );
}
