import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../API/api";

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [myRooms, setMyRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // ⚙️ Duyệt yêu cầu tham gia
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isLeader, setIsLeader] = useState(false);

  const token = localStorage.getItem("authToken");

  // 🧭 Lấy danh sách phòng đã tham gia
  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        if (!token) {
          console.warn("⚠️ Không tìm thấy token trong localStorage.");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:3000/room/my", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          setMyRooms(data.rooms || []);

          // Nếu user là leader trong phòng hiện tại
          const currentRoom = data.rooms.find((r) => r._id === roomId);
          if (currentRoom?.room_role === "leader") setIsLeader(true);
          console.log("💬 Phòng của tôi:", data.rooms);
        } else {
          console.error("❌ Lỗi lấy phòng:", data.message);
        }
      } catch (err) {
        console.error("🔥 Lỗi fetch /room/my:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRooms();
  }, [roomId, token]);

  // 💬 Gửi tin nhắn tạm thời
  const handleSend = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        { id: messages.length + 1, text: message, sender: "Bạn" },
      ]);
      setMessage("");
    }
  };

  // ⚙️ Lấy danh sách yêu cầu tham gia (leader)
  const fetchRequests = async () => {
    console.log("Fetching requests " + roomId);
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API}/room/join-requests?room_id=${roomId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Lỗi tải yêu cầu:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (reqId) => {
    if (!window.confirm("Xác nhận duyệt yêu cầu này?")) return;
    try {
      const res = await fetch(`http://localhost:3000/room/${reqId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: roomId,
        }),
      });
      const data = await res.json();
      alert(data.message || "Đã duyệt yêu cầu.");
      fetchRequests();
    } catch (err) {
      alert("Lỗi khi duyệt yêu cầu.");
    }
  };

  const handleReject = async (reqId) => {
    const reason = prompt("Nhập lý do từ chối (hoặc để trống):");
    try {
      const res = await fetch(`http://localhost:3000/room/${reqId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          reason,
          room_id: roomId,
         }),
      });
      const data = await res.json();
      alert(data.message || "Đã từ chối yêu cầu.");
      fetchRequests();
    } catch (err) {
      alert("Lỗi khi từ chối yêu cầu.");
    }
  };

  const toggleRequests = () => {
    if (!showRequests) fetchRequests();
    setShowRequests(!showRequests);
  };

  // 🧱 Nếu chưa chọn phòng
  if (!roomId) {
    if (loading)
      return (
        <p style={{ textAlign: "center", marginTop: 100 }}>
          Đang tải phòng của bạn...
        </p>
      );
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
              }}
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

  // 🧱 Nếu đã chọn phòng cụ thể
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

        {/* ✅ Nút duyệt yêu cầu chỉ hiện với leader */}
        {isLeader && (
          <button
            onClick={() => toggleRequests()}
            style={{
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              marginLeft: 10,
              cursor: "pointer",
            }}
          >
            📩 Duyệt yêu cầu
          </button>
        )}
      </div>

      {/* 🧾 Modal hiển thị danh sách yêu cầu */}
      {showRequests && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowRequests(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              width: 420,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Yêu cầu tham gia</h3>
            {loadingRequests ? (
              <p>Đang tải...</p>
            ) : requests.length === 0 ? (
              <p>Không có yêu cầu nào.</p>
            ) : (
              requests.map((r) => (
                <div
                  key={r._id}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "10px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <b>{r.user_id?.full_name}</b> – {r.room_id?.room_name}
                  </div>
                  <div>
                    <button
                      style={{
                        background: "#fff",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        marginRight: 6,
                      }}
                      onClick={() => handleApprove(r._id)}
                    >
                      ✅
                    </button>
                    <button
                      style={{
                        background: "#fff",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                      }}
                      onClick={() => handleReject(r._id)}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
