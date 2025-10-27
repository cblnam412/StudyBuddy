import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🧭 Lấy danh sách phòng đã tham gia
  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        console.log("🔑 Token đang dùng:", authToken);

        if (!authToken) {
          console.warn("⚠️ Không tìm thấy token trong localStorage.");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:3000/room/my", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        const data = await res.json();
        console.log("📦 Kết quả từ /room/my:", data);

        if (res.ok) {
          setMyRooms(data.rooms || []);
        } else {
          console.error("❌ Lỗi lấy phòng:", data.message);
          setMyRooms([]);
        }
      } catch (err) {
        console.error("🔥 Lỗi fetch /room/my:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRooms();
  }, []);

  // 🧱 Nếu chưa chọn phòng nào
  if (!roomId) {
    if (loading) {
      return (
        <p style={{ textAlign: "center", marginTop: 100 }}>
          Đang tải phòng của bạn...
        </p>
      );
    }

    if (myRooms.length === 0) {
      return (
        <div style={{ textAlign: "center", marginTop: 80 }}>
          <h2>Bạn chưa tham gia phòng học nào.</h2>
          <button
            onClick={() => navigate("/home/explore")}
            style={{
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 25px",
              fontSize: 16,
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            Khám phá phòng mới
          </button>
        </div>
      );
    }

    // 🧭 Nếu có phòng → hiển thị danh sách chọn
    return (
      <div style={{ padding: 30 }}>
        <h2>Danh sách phòng học của bạn ({myRooms.length})</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {myRooms.map((room) => (
            <li
              key={room._id}
              onClick={() => navigate(`/home/chat/${room._id}`)}
              style={{
                background: "#f1f5f9",
                padding: 15,
                borderRadius: 8,
                marginBottom: 10,
                cursor: "pointer",
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#e2e8f0")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#f1f5f9")
              }
            >
              <strong>{room.room_name}</strong>
              <p style={{ color: "#64748b" }}>
                {room.description || "Không có mô tả"}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 💬 Nếu đã chọn phòng cụ thể
  const handleSend = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        { id: messages.length + 1, text: message, sender: "Bạn" },
      ]);
      setMessage("");
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Phòng Chat ID: {roomId}</h2>
      <div
        style={{
          border: "1px solid #ccc",
          padding: 15,
          borderRadius: 8,
          height: 300,
          overflowY: "auto",
          marginBottom: 10,
          background: "#fafafa",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#999" }}>Chưa có tin nhắn nào.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 10 }}>
              <b>{msg.sender}: </b>
              {msg.text}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            flexGrow: 1,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
          placeholder="Nhập tin nhắn..."
        />
        <button
          onClick={handleSend}
          style={{
            padding: "10px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
