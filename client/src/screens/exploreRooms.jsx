import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const styles = {
  container: {
    padding: 20,
    backgroundColor: "#f7f9fc",
    minHeight: "100vh",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: "#0f1724",
    margin: 0,
  },
  createRoomButton: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  statusText: {
    textAlign: "center",
    fontSize: 18,
    color: "#6b7280",
    marginTop: 50,
  },
  roomList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
  },
  roomCard: {
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(20,30,50,0.05)",
    padding: 20,
    cursor: "pointer",
    transition: "transform 0.2s ease-in-out",
  },
  roomName: {
    fontSize: 18,
    color: "#2563eb",
    marginBottom: 8,
  },
  roomDescription: {
    fontSize: 14,
    color: "#546176",
    marginBottom: 12,
  },
  joinButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 15px",
    fontSize: 14,
    cursor: "pointer",
    transition: "background 0.2s ease-in-out",
  },
};

export default function ExploreRoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredButton, setHoveredButton] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ Lấy token từ localStorage
        const token = localStorage.getItem("token") || localStorage.getItem("user");
        if (!token) {
          setError("Bạn cần đăng nhập để xem danh sách phòng.");
          navigate("/login");
          return;
        }

        // ✅ Gọi API kèm Authorization header
        const res = await fetch("http://localhost:3000/room", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${JSON.parse(token)}`,
          },
        });

        if (res.status === 401) {
          setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!res.ok) throw new Error("Không thể tải dữ liệu phòng");

        const data = await res.json();
        // Nếu API trả về mảng phòng
        setRooms(data.rooms || data);
      } catch (err) {
        console.error(err);
        setError("Lỗi khi tải dữ liệu phòng. Vui lòng thử lại sau.");
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [navigate]);

  const handleJoinRoom = (roomId) => {
    navigate(`/home/chat/${roomId}`);
  };

  const handleCreateRoom = () => {
    navigate("/home/create-room");
  };

  if (loading) {
    return <div style={styles.statusText}>Đang tải danh sách phòng...</div>;
  }

  if (error) {
    return <div style={styles.statusText}>{error}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <h1 style={styles.title}>
          Khám phá phòng mới ({rooms.length} phòng có sẵn)
        </h1>
        <button
          style={{
            ...styles.createRoomButton,
            background: hoveredButton ? "#059669" : "#10b981",
          }}
          onClick={handleCreateRoom}
          onMouseEnter={() => setHoveredButton(true)}
          onMouseLeave={() => setHoveredButton(false)}
        >
          + Tạo phòng mới
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={styles.statusText}>Không tìm thấy phòng học nào.</div>
      ) : (
        <div style={styles.roomList}>
          {rooms.map((room) => (
            <div
              key={room._id}
              style={styles.roomCard}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
            >
              <h2 style={styles.roomName}>{room.room_name}</h2>
              <p style={styles.roomDescription}>
                {room.description || "Chủ đề học tập chung."}
              </p>
              <button
                style={styles.joinButton}
                onClick={() => handleJoinRoom(room._id)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
              >
                Tham gia
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
