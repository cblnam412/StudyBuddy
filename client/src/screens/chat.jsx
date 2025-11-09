import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../API/api";

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [myRooms, setMyRooms] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  
  
  const {accessToken, userID} = useAuth();
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const messagesContainerRef = useRef(null);

  
  // Fetch user's rooms
  useEffect(() => {
    //console.log(`Current user id: ${userID}`);
    const fetchMyRooms = async () => {
      try {
        if (!accessToken) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/room/my`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          setMyRooms(data.rooms || []);
          const currentRoom = data.rooms.find((r) => r._id === roomId);
          if (currentRoom?.room_role === "leader") setIsLeader(true);
        } else {
          console.error("Lỗi lấy phòng:", data.message);
        }
      } catch (err) {
        console.error("Lỗi fetch /room/my:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRooms();
  }, [roomId, accessToken]);

  // Join room and socket listeners
  useEffect(() => {
    if (!roomId) return;

    const socket = window.socket || null;
    if (!socket) {
      console.warn("Socket chưa sẵn sàng trên window.socket.");
      return;
    }
    socketRef.current = socket;

    try {
      socket.emit("room:join", roomId);
    } catch (err) {
      console.error("Error emitting room:join", err);
    }

    // fetch recent messages if endpoint exists
    (async function fetchRecent() {
      try {
        const res = await fetch(`${API}/message/${roomId}/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            setMessages(
              data.messages.map((m) => ({
                id: m._id,
                user_id: typeof m.user_id === "string" ? m.user_id : m.user_id?._id || m.user_id?.id,
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

    const onNewMessage = (m) => {
      // Normalize incoming message and append only if not present
      setMessages((prev) => {
        if (prev.some((x) => x.id === m._id)) return prev;
        return [
          ...prev,
          {
            id: m._id,
            user_id: typeof m.user_id === "string" ? m.user_id : m.user_id?._id || m.user_id?.id,
            sender: m.user_name || (m.user_id && m.user_id.full_name) || "",
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
        { id: `sys-${Date.now()}`, sender: "Hệ thống", text: data.message, status: "system", created_at: new Date().toISOString() },
      ]);
    };

    const onUserTyping = (data) => {
      setMessages((prev) => {
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
      console.warn("Room error:", err);
    };

    socket.on("room:new_message", onNewMessage);
    socket.on("room:system_message", onSystemMessage);
    socket.on("room:user_typing", onUserTyping);
    socket.on("room:user_stop_typing", onUserStopTyping);
    socket.on("room:message_edited", onMessageEdited);
    socket.on("room:message_deleted", onMessageDeleted);
    socket.on("room:error", onRoomError);

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
      } catch (err) {}
      socketRef.current = null;
    };
  }, [roomId, accessToken]);

  // Send: DO NOT optimistic-add. Wait server emit.
  const handleSend = async () => {
    if (!message.trim()) return;
    const socket = socketRef.current;
    try {
      if (!socket) throw new Error("Socket chưa kết nối");
      socket.emit("room:message", { roomId, content: message, reply_to: null });
      setMessage("");
      // do not append locally — server will emit room:new_message
    } catch (err) {
      console.error("Gửi tin nhắn thất bại:", err);
      alert("Gửi tin nhắn thất bại. Vui lòng thử lại.");
    }
  };

  // Typing handling (emit start/stop)
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

  // Requests (leader)
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API}/room/join-requests?room_id=${roomId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ room_id: roomId }),
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
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason, room_id: roomId }),
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

  // scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const isOwnMessage = (msg) => {
    if (!userID || !msg?.user_id) return false;
    // compare as strings (handle object/string)
    return String(msg.user_id) === String(userID);
  };

  // UI states for no room selected
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
        <h2>Danh sách phòng học của bạn</h2>
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
              <p style={{ color: "#64748b" }}>{room.description || "Không có mô tả"}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // chat UI for a specific room
  return (
    <div style={{ padding: 30 }}>
      <h2>Phòng Chat ID: {roomId}</h2>

      <div
        ref={messagesContainerRef}
        style={{
          border: "1px solid #ccc",
          padding: 15,
          borderRadius: 8,
          height: 300,
          overflowY: "auto",
          marginBottom: 10,
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#999" }}>Chưa có tin nhắn nào.</p>
        ) : (
          messages.map((msg) => {
            if (msg.status === "system") {
              return (
                <div key={msg.id} style={{ textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>
                  {msg.text}
                </div>
              );
            }

            if (msg.status === "typing") {
              return (
                <div key={msg.id} style={{ color: "#6b7280", fontStyle: "italic" }}>
                  {msg.sender} {msg.text}
                </div>
              );
            }

            const own = isOwnMessage(msg);
            const bubbleStyle = {
              maxWidth: "70%",
              padding: "8px 12px",
              borderRadius: 12,
              background: own ? "#2563eb" : "#e5e7eb",
              color: own ? "#fff" : "#111827",
              alignSelf: own ? "flex-end" : "flex-start",
            };

            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: own ? "flex-end" : "flex-start" }}>
                {/* show sender for others */}
                {!own && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{msg.sender || "Người dùng"}</div>}
                <div style={bubbleStyle}>
                  {msg.text}
                  {/* optional small timestamp */}
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 6, textAlign: "right" }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={message}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
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
                        border: "1px solid #d1d5db",
                        borderRadius: 4,
                        padding: "4px 8px",
                        marginRight: 6,
                        cursor: "pointer",
                      }}
                      onClick={() => handleApprove(r._id)}
                    >
                      ✅
                    </button>
                    <button
                      style={{
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 4,
                        padding: "4px 8px",
                        cursor: "pointer",
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
