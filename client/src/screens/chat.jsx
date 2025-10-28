import React, { useState, useEffect, useRef } from "react";
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
  // Socket refs & typing timer
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

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

  // -------------------------------
  // Socket: join room, listeners
  // -------------------------------
  useEffect(() => {
    // Get the global socket created in UserHomeScreen
    const socket = window.socket || null;
    if (!socket) {
      console.warn("Socket chưa sẵn sàng trên window.socket. Hãy đảm bảo UserHomeScreen đã mount và kết nối.");
      return;
    }
    console.log("Sucessfuly get global socket!")
    socketRef.current = socket;

    // Join the room
    try {
      socket.emit("room:join", roomId);
    } catch (err) {
      console.error("Error emitting room:join", err);
    }

    // Try to fetch recent messages (optional; backend may not support this route)
    (async function fetchRecent() {
      try {
        const res = await fetch(`${API}/room/${roomId}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            // Normalize messages to local shape
            setMessages(
              data.messages.map((m) => ({
                id: m._id,
                user_id: m.user_id,
                sender: m.user_name || m.user_id?.full_name || "",
                text: m.content,
                status: m.status || "sent",
                created_at: m.created_at,
              }))
            );
          }
        }
      } catch (err) {
        // ignore if endpoint doesn't exist
      }
    })();

    // Event handlers
    const onNewMessage = (m) => {
      // m is expected to contain _id, user_id, user_name, content, room_id, status, created_at
      setMessages((prev) => {
        // prevent dup
        if (prev.some((x) => x.id === m._id)) return prev;
        return [
          ...prev,
          {
            id: m._id,
            user_id: m.user_id,
            sender: m.user_name || "",
            text: m.content,
            status: m.status,
            created_at: m.created_at,
          },
        ];
      });
    };

    const onSystemMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${Date.now()}`, sender: "Hệ thống", text: data.message, status: "system" },
      ]);
    };

    const onUserTyping = (data) => {
      // Show typing indicator (we'll store it as a temporary message)
      setMessages((prev) => {
        // Add a typing indicator if not exists
        const key = `typing-${data.user_id}`;
        if (prev.some((m) => m.id === key)) return prev;
        return [...prev, { id: key, sender: data.user_name || "", text: "đang nhập...", status: "typing" }];
      });
    };

    const onUserStopTyping = (data) => {
      setMessages((prev) => prev.filter((m) => m.id !== `typing-${data.user_id}`));
    };

    const onMessageEdited = (m) => {
      setMessages((prev) => prev.map((msg) => (msg.id === m._id ? { ...msg, text: m.content, status: m.status } : msg)));
    };

    const onMessageDeleted = (d) => {
      setMessages((prev) => prev.map((msg) => (msg.id === d.message_id ? { ...msg, text: "[Tin nhắn đã bị xóa]", status: "deleted" } : msg)));
    };

    const onRoomError = (err) => {
      console.log("Room error:", err);
      // show error in UI as system message
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: "Hệ thống", text: err.message || "Lỗi phòng", status: "error" },
      ]);
    };

    socket.on("room:new_message", onNewMessage);
    socket.on("room:system_message", onSystemMessage);
    socket.on("room:user_typing", onUserTyping);
    socket.on("room:user_stop_typing", onUserStopTyping);
    socket.on("room:message_edited", onMessageEdited);
    socket.on("room:message_deleted", onMessageDeleted);
    socket.on("room:error", onRoomError);

    // cleanup on unmount or roomId change
    return () => {
      try {
        if (socket) {
          socket.emit("room:stop_typing", roomId);
          socket.emit("room:leave", roomId);

          socket.off("room:new_message", onNewMessage);
          socket.off("room:system_message", onSystemMessage);
          socket.off("room:user_typing", onUserTyping);
          socket.off("room:user_stop_typing", onUserStopTyping);
          socket.off("room:message_edited", onMessageEdited);
          socket.off("room:message_deleted", onMessageDeleted);
          socket.off("room:error", onRoomError);
        }
      } catch (err) {
        // ignore
      }
      socketRef.current = null;
    };
  }, [roomId, token]);

  // 💬 Gửi tin nhắn (emit to room)
  const handleSend = async () => {
    if (!message.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, sender: "Bạn", text: message, status: "sending", created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);

    const socket = socketRef.current;
    try {
      if (!socket) throw new Error("Socket chưa kết nối");

      socket.emit("room:message", { roomId, content: message, reply_to: null });
      setMessage("");

      // The server will emit room:new_message when saved — we will append then. Optionally remove optimistic after some time if no ack.
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }, 5000);
    } catch (err) {
      console.error("Gửi tin nhắn thất bại:", err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    }
  };

  // Typing handling
  const handleInputChange = (e) => {
    setMessage(e.target.value);

    const socket = socketRef.current;
    if (!socket) return;

    if (!isTypingRef.current) {
      try {
        socket.emit("room:typing", roomId);
        isTypingRef.current = true;
      } catch (err) {}
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      try {
        socket.emit("room:stop_typing", roomId);
      } catch (err) {}
      isTypingRef.current = false;
    }, 1500);
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
      const res = await fetch(`${API}/room/${reqId}/approve`, {
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
      const res = await fetch(`${API}/room/${reqId}/reject`, {
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
          onChange={handleInputChange}
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
