import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Info,
  Users,
  Crown,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Plus,
  Image as ImageIcon,
  Paperclip,
  ArrowLeft,
  Calendar,
  Clock,
} from "lucide-react";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button/Button";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:3000";
const SOCKET_URL = "http://localhost:3000";

const styles = {
  iconButton: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    cursor: "pointer",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    flexShrink: 0,
    padding: 0,
    margin: 0,
  },
  ghostButton: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
    padding: 0,
    margin: 0,
  },
  footer: {
    padding: "12px 16px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fff",
    flexShrink: 0,
    position: "relative",
    zIndex: 10,
  },
};

export default function ChatScreen() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { accessToken, userInfo } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [activeRoom, setActiveRoom] = useState(roomId || null);
  const [activeRoomInfo, setActiveRoomInfo] = useState(null);
  const [members, setMembers] = useState([]);

  const [joinRequests, setJoinRequests] = useState([]);
  const [isLeader, setIsLeader] = useState(false);

  const [events, setEvents] = useState([]);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    max_participants: 10,
  });
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTypingUser, setIsTypingUser] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  function extractFileNameFromUrl(url) {
  if (!url) return null;

  const marker = "/documents/";
  const idx = url.indexOf(marker);

  if (idx === -1) return null;

  const encodedName = url.substring(idx + marker.length);
  return decodeURIComponent(encodedName);
};

  useEffect(() => {
    if (!accessToken) return;
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/room/my`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setRooms(data.rooms || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    fetchRooms();
  }, [accessToken]);

  useEffect(() => {
    if (roomId) {
      setActiveRoom(roomId);
      if (rooms.length > 0) {
        const current = rooms.find((r) => r._id === roomId);
        if (current) {
          setActiveRoomInfo(current);
          const amILeader = current.room_role === "leader";
          setIsLeader(amILeader);
          if (amILeader) fetchJoinRequests(roomId);
          else setJoinRequests([]);

          fetchRoomMembers(roomId);
          fetchMessages(roomId);
          fetchRoomEvents(roomId);
        }
      }
    }
  }, [roomId, rooms]);

  const fetchRoomMembers = async (rId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/room/${rId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok && data.data) setMembers(data.data.members || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJoinRequests = async (rId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/room/join-requests?room_id=${rId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (res.ok) setJoinRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (rId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/message/${rId}?limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const loadedMsgs = (data.messages || []).map((msg) => ({
          _id: msg._id,
          content: msg.content,
          document_id: msg.document_id || null,
          user_id: msg.user_id?._id || msg.user_id,
          user_name: msg.user_id?.full_name || "Unknown",
          user_avatar: msg.user_id?.avatarUrl,
          created_at: msg.created_at,
        }));
        setMessages(loadedMsgs);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Lỗi tải tin nhắn:", err);
    }
  };

  const fetchRoomEvents = async (rId) => {
    try {
      const params = new URLSearchParams({
        room_id: rId,
      });
      const res = await fetch(`${API_BASE_URL}/event?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        // Sort events by start_time in descending order (newest first)
        const sortedEvents = (data.data || []).sort((a, b) => 
          new Date(b.start_time) - new Date(a.start_time)
        );
        setEvents(sortedEvents);
      }
    } catch (err) {
      console.error("Lỗi tải sự kiện:", err);
    }
  };

  // --- SỬA HÀM handleApproveRequest ---
    const handleApproveRequest = async (reqId) => {
      if (!window.confirm("Duyệt thành viên này?")) return;
      try {
        const res = await fetch(`${API_BASE_URL}/room/${reqId}/approve`, {
          method: "POST",
          headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
          },
          // [QUAN TRỌNG] Gửi thêm room_id để Middleware kiểm tra quyền Leader
          body: JSON.stringify({
              room_id: activeRoom
          })
        });

        const data = await res.json();

        if (res.ok) {
          setJoinRequests((prev) => prev.filter((req) => req._id !== reqId));
          fetchRoomMembers(activeRoom);
          toast.success("Đã duyệt thành viên!");
        } else {
          console.error("Lỗi server:", data);
          toast.error(data.message || "Lỗi duyệt thành viên");
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi kết nối");
      }
    };

    // --- SỬA HÀM handleRejectRequest ---
    const handleRejectRequest = async (reqId) => {
      const reason = prompt("Lý do từ chối:");
      if (reason === null) return;

      try {
        const res = await fetch(`${API_BASE_URL}/room/${reqId}/reject`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          // [QUAN TRỌNG] Gửi thêm room_id kèm lý do
          body: JSON.stringify({
              reason: reason,
              room_id: activeRoom
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setJoinRequests((prev) => prev.filter((req) => req._id !== reqId));
          toast.success("Đã từ chối yêu cầu");
        } else {
          console.error(data);
          toast.error(data.message || "Lỗi từ chối yêu cầu");
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi kết nối");
      }
    };

  useEffect(() => {
    if (!accessToken) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socketRef.current.on("connect_error", (err) =>
      setConnectionError(err.message)
    );
    socketRef.current.on("connect", () => setConnectionError(null));

    socketRef.current.on("room:new_message", (data) => {
      if (data.room_id === activeRoom) {
        setMessages((prev) => [...prev, 
          data
        ]);
        scrollToBottom();
      }
    });

    socketRef.current.on("room:user_typing", ({ user_name, room_id }) => {
      if (room_id === activeRoom) setIsTypingUser(user_name);
    });
    socketRef.current.on("room:user_stop_typing", ({ room_id }) => {
      if (room_id === activeRoom) setIsTypingUser(null);
    });

    return () => socketRef.current?.disconnect();
  }, [accessToken, activeRoom]);

  useEffect(() => {
    if (socketRef.current && activeRoom) {
      socketRef.current.emit("room:join", activeRoom);
    }
  }, [activeRoom]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeRoom) return;

    if (socketRef.current) {
      socketRef.current.emit("room:message", {
        roomId: activeRoom,
        content: inputText,
        reply_to: null,
      });
      socketRef.current.emit("room:stop_typing", activeRoom);
    }
    setInputText("");
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (socketRef.current && activeRoom) {
      e.target.value.length > 0
        ? socketRef.current.emit("room:typing", activeRoom)
        : socketRef.current.emit("room:stop_typing", activeRoom);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Đang upload:", file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", activeRoom);

    try {
      const res = await fetch(`${API_BASE_URL}/document/upload`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      const isImage = isImageUrl(data.url);
      const fileName = extractFileNameFromUrl(data.url);
      if (res.ok) {
        if (socketRef.current) {
          socketRef.current.emit("room:message", {
            roomId: activeRoom,
            content: isImage ? data.url : fileName,
            reply_to: null,    
            document_id: data.document._id,
          });
        }
      } else {
        alert(`Lỗi Upload: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error("Lỗi:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleDownloadDocument = async (documentId, fileName) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/document/${documentId}/download`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) throw new Error("Download failed");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Không tải được tài liệu");
    console.error(err);
  }
};

  const isImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    return url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i) != null;
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoomName = (r) => r?.room_name || r?.name || "Phòng chưa đặt tên";

  const formatEventDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCreateEvent = async () => {
    try {
      if (!eventFormData.title.trim()) {
        toast.error("Vui lòng nhập tên sự kiện");
        return;
      }
      if (!eventFormData.start_time || !eventFormData.end_time) {
        toast.error("Vui lòng chọn thời gian bắt đầu và kết thúc");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/event`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: activeRoom,
          ...eventFormData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Tạo sự kiện thành công!");
        setShowCreateEventModal(false);
        setEventFormData({
          title: "",
          description: "",
          start_time: "",
          end_time: "",
          max_participants: 10,
        });
        fetchRoomEvents(activeRoom);
      } else {
        toast.error(data.message || "Lỗi tạo sự kiện");
      }
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("Có lỗi xảy ra khi tạo sự kiện");
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetailModal(true);
  };

  const handleCancelEvent = async () => {
    if (!window.confirm("Bạn có chắc muốn hủy sự kiện này?")) return;
    
    try {
      const res = await fetch(
        `${API_BASE_URL}/event/${activeRoom}/${selectedEvent._id}/cancel`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      if (res.ok) {
        toast.success("Đã hủy sự kiện thành công!");
        setShowEventDetailModal(false);
        fetchRoomEvents(activeRoom);
      } else {
        const data = await res.json();
        toast.error(data.message || "Lỗi hủy sự kiện");
      }
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleRegisterFromDetail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/event/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: activeRoom,
          event_id: selectedEvent._id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Đăng ký sự kiện thành công!");
        setShowEventDetailModal(false);
        fetchRoomEvents(activeRoom);
      } else {
        toast.error(data.message || "Lỗi đăng ký sự kiện");
      }
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("Có lỗi xảy ra");
    }
  };

  return (
    <div className="chat-app-wrapper">
      <style>{`
          * { box-sizing: border-box; }
          .chat-app-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; background-color: #ffffff; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 9999; display: flex; overflow: hidden; }

          .sidebar-left { width: 320px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; background: #fff; flex-shrink: 0; }

          .sidebar-header {
              height: 72px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0 16px;
              flex-shrink: 0;
          }

          .header-left-group {
              display: flex;
              align-items: center;
              gap: 12px;
          }

          .header-title {
              margin: 0;
              padding: 0;
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              line-height: 1;
              display: flex;
              align-items: center;
          }

          .search-box { padding: 0 16px 12px; }
          .search-input { width: 100%; background: #f3f4f6; border: none; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 14px; }
          .room-list { flex: 1; overflow-y: auto; padding: 0 8px; }
          .room-item { display: flex; align-items: center; padding: 12px; margin-bottom: 2px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
          .room-item:hover { background-color: #f3f4f6; }
          .room-item.active { background-color: #eff6ff; }
          .room-avatar { width: 48px; height: 48px; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; flex-shrink: 0; }

          .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background-color: #fff; }
          .chat-header { height: 64px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; }
          .message-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; background-image: radial-gradient(#f1f5f9 1px, transparent 1px); background-size: 20px 20px; }

          .msg-row { display: flex; max-width: 70%; margin-bottom: 8px; align-items: flex-end; }
          .msg-row.me { align-self: flex-end; flex-direction: row-reverse; }
          .msg-row.other { align-self: flex-start; }

          .msg-bubble { padding: 8px 12px; border-radius: 18px; font-size: 15px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05); position: relative; min-width: 60px; word-wrap: break-word; }
          .msg-row.me .msg-bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
          .msg-row.other .msg-bubble { background: #ffffff; color: #1f2937; border-bottom-left-radius: 4px; border: 1px solid #f3f4f6; }

          .msg-avatar { width: 28px; height: 28px; border-radius: 50%; background: #cbd5e1; margin: 0 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #fff; object-fit: cover; }
          .msg-sender-name { font-size: 11px; color: #6b7280; margin-bottom: 2px; display: block; margin-left: 4px;}
          .msg-time { font-size: 10px; margin-top: 4px; display: block; opacity: 0.7; text-align: right; }
          .msg-row.other .msg-time { text-align: left; opacity: 0.5; }
          .msg-image { max-width: 100%; max-height: 300px; border-radius: 12px; cursor: pointer; display: block; }
          .msg-link { color: inherit; text-decoration: underline; display: flex; align-items: center; gap: 6px; font-weight: 500; word-break: break-all; }

          .input-wrapper { flex: 1; background: #f3f4f6; border-radius: 20px; padding: 6px 12px; display: flex; align-items: center; }
          .input-wrapper input { background: transparent; border: none; width: 100%; outline: none; font-size: 15px; padding: 4px 0;}

          .sidebar-right { width: 300px; border-left: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow-y: auto; background: #fff; flex-shrink: 0; transition: width 0.3s ease; }
          .req-item { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .req-header { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px; }
          .req-msg { color: #6b7280; font-style: italic; margin-bottom: 8px; font-size: 12px; }
          .req-actions { display: flex; gap: 6px; }
          .btn-approve { background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
          .btn-reject { background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
          .member-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f9fafb; font-size: 13px; }
          .member-avatar { width: 32px; height: 32px; background: #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold; color: #4b5563; font-size: 12px; object-fit: cover; }
          .member-info { flex: 1; overflow: hidden; }
          .member-name { font-weight: 500; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .member-role { font-size: 11px; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px; }
          .role-leader { background: #fef3c7; color: #d97706; }
          .role-member { background: #f3f4f6; color: #6b7280; }
          .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
          }

          .modal-content {
              background: white;
              border-radius: 16px;
              padding: 24px;
              width: 90%;
              max-width: 500px;
              max-height: 90vh;
              overflow-y: auto;
          }

          .modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 16px;
              border-bottom: 1px solid #e5e7eb;
          }

          .modal-title {
              font-size: 1.5rem;
              font-weight: 600;
              margin: 0;
              color: #1a1a1a;
          }

          .modal-close {
              background: none;
              border: none;
              font-size: 1.5rem;
              cursor: pointer;
              color: #999;
              padding: 4px 8px;
          }

          .form-group {
              margin-bottom: 16px;
          }

          .form-label {
              display: block;
              font-weight: 500;
              margin-bottom: 8px;
              color: #374151;
              font-size: 14px;
          }

          .form-input,
          .form-textarea {
              width: 100%;
              padding: 10px 12px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 14px;
              font-family: inherit;
              box-sizing: border-box;
          }

          .form-textarea {
              min-height: 100px;
              resize: vertical;
          }

          .form-input:focus,
          .form-textarea:focus {
              outline: none;
              border-color: #2563eb;
              box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }

          .modal-footer {
              display: flex;
              gap: 12px;
              justify-content: flex-end;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
          }

          .btn-cancel {
              padding: 10px 20px;
              border: 1px solid #d1d5db;
              background: white;
              color: #374151;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
          }

          .btn-cancel:hover {
              background: #f3f4f6;
          }

          .btn-submit {
              padding: 10px 20px;
              border: none;
              background: #2563eb;
              color: white;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
          }

          .btn-submit:hover {
              background: #1d4ed8;
          }

          @media (max-width: 1024px) { .sidebar-right { display: none; } }
        `}</style>

      <div className="sidebar-left">
        <div className="sidebar-header">
          <div className="header-left-group">
            <button
              style={styles.iconButton}
              onClick={() => navigate("/user")}
              title="Quay về trang chủ"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="header-title">Chat</h2>
          </div>
          <button
            style={styles.ghostButton}
            onClick={() => navigate("/user/create-room")}
            title="Tạo phòng mới"
          >
            <Plus size={28} color="#2563eb" />
          </button>
        </div>

        <div className="search-box">
          <input className="search-input" placeholder="Tìm kiếm đoạn chat..." />
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <div
              key={room._id}
              className={`room-item ${activeRoom === room._id ? "active" : ""}`}
              onClick={() => navigate(`/user/chat/${room._id}`)}
            >
              <div
                className="room-avatar"
                style={{ background: getRandomColor(getRoomName(room)) }}
              >
                {getRoomName(room).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <h4
                  style={{
                    margin: "0 0 4px",
                    fontSize: 15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getRoomName(room)}
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  Bấm để chat ngay
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {!activeRoom ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: "#9ca3af",
            }}
          >
            <Users size={64} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p>Chọn một phòng để bắt đầu trò chuyện</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {getRoomName(activeRoomInfo) || "Đang tải..."}
                </h3>
                <div
                  style={{
                    fontSize: 12,
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: "#16a34a",
                      borderRadius: "50%",
                      marginRight: 4,
                    }}
                  ></span>{" "}
                  Online
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isLeader && (
                  <button
                    style={styles.iconButton}
                    onClick={() => setShowCreateEventModal(true)}
                    title="Tạo sự kiện"
                  >
                    <Calendar size={20} />
                  </button>
                )}
                <button
                  style={styles.iconButton}
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  title="Thông tin phòng"
                >
                  <Info size={20} />
                </button>
              </div>
            </div>
            <div className="message-area">
              {messages.map((msg, i) => {
                const isMe =
                  msg.user_id === userInfo?._id ||
                  msg.user_id?._id === userInfo?._id;
                return (
                  <div key={i} className={`msg-row ${isMe ? "me" : "other"}`}>
                    {!isMe &&
                      (msg.user_avatar ? (
                        <img
                          src={msg.user_avatar}
                          alt="A"
                          className="msg-avatar"
                        />
                      ) : (
                        <div
                          className="msg-avatar"
                          style={{ background: getRandomColor(msg.user_name) }}
                        >
                          {msg.user_name?.charAt(0).toUpperCase()}
                        </div>
                      ))}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        maxWidth: "100%",
                      }}
                    >
                      {!isMe && (
                        <span className="msg-sender-name">{msg.user_name}</span>
                      )}
                      <div className="msg-bubble">
                        {isImageUrl(msg.content) ? (
                          <img
                            src={msg.content}
                            alt="sent"
                            className="msg-image"
                            onClick={() => window.open(msg.content, "_blank")}
                          />
                        ) : msg.document_id ? (
                          <div
                            className="msg-link"
                            onClick={() =>
                              handleDownloadDocument(msg.document_id, msg.content)
                            }
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Paperclip size={16} />
                            <span>{msg.content}</span>
                          </div>
                        ) : (
                          <span>{msg.content}</span>
                        )}

                        <span className="msg-time">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                    </div>
                  </div>
                );
              })}
              {isTypingUser && (
                <div style={{ fontSize: 12, color: "#9ca3af", marginLeft: 40 }}>
                  {isTypingUser} đang nhập...
                </div>
              )}
              <div ref={messagesEndRef}></div>
            </div>

            <div style={styles.footer}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />

              <button
                style={styles.iconButton}
                onClick={() => fileInputRef.current.click()}
                title="Gửi ảnh"
              >
                <ImageIcon size={20} />
              </button>

              <button
                style={styles.iconButton}
                onClick={() => fileInputRef.current.click()}
                title="Đính kèm file"
              >
                <Paperclip size={20} />
              </button>

              <div className="input-wrapper">
                <input
                  placeholder="Nhập tin nhắn..."
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onClick={handleSendMessage}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showRightSidebar && activeRoom && (
        <div className="sidebar-right">
          <div
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: getRandomColor(getRoomName(activeRoomInfo)),
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 32,
                marginBottom: 12,
              }}
            >
              {getRoomName(activeRoomInfo).charAt(0).toUpperCase()}
            </div>
            <h3 style={{ margin: "8px 0" }}>{getRoomName(activeRoomInfo)}</h3>
            <span style={{ fontSize: 12, color: "#999" }}>
              ID: {activeRoom}
            </span>
          </div>

          <div className="accordion-list">
            {isLeader && (
              <Accordion title={`Yêu cầu tham gia (${joinRequests.length})`}>
                {joinRequests.length === 0 ? (
                  <div
                    style={{
                      padding: 10,
                      color: "#999",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    Không có yêu cầu
                  </div>
                ) : (
                  joinRequests.map((req) => (
                    <div key={req._id} className="req-item">
                      <div className="req-header">
                        <span>{req.user_id?.full_name}</span>
                      </div>
                      <div className="req-msg">"{req.message}"</div>
                      <div className="req-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveRequest(req._id)}
                        >
                          <Check size={12} /> Duyệt
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleRejectRequest(req._id)}
                        >
                          <X size={12} /> Từ chối
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </Accordion>
            )}
            <Accordion title={`Sự kiện (${events.length})`}>
              {events.length === 0 ? (
                <div
                  style={{
                    padding: 10,
                    color: "#999",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Không có sự kiện
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    padding: "8px 0",
                  }}
                >
                  {events.map((event) => (
                    <div
                      key={event._id}
                      style={{
                        display: "flex",
                        gap: "12px",
                        padding: "12px",
                        background: "white",
                        borderRadius: "8px",
                        border: "2px solid transparent",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                      onClick={() => handleEventClick(event)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#2196F3";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(33, 150, 243, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(0, 0, 0, 0.08)";
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#2196F3",
                        }}
                      >
                        <Calendar size={24} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#1a1a1a",
                            marginBottom: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {event.title}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginBottom: "6px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {event.description}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "black",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Clock size={12} />
                          {formatEventDate(event.start_time)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Accordion>
            <Accordion title={`Thành viên (${members.length})`}>
              {members.map((m) => (
                <div key={m._id} className="member-item">
                  {m.avatar ? (
                    <img src={m.avatar} alt="A" className="member-avatar" />
                  ) : (
                    <div
                      className="member-avatar"
                      style={{ background: getRandomColor(m.full_name) }}
                    >
                      {m.full_name?.charAt(0)}
                    </div>
                  )}
                  <div className="member-info">
                    <div className="member-name">
                      {m.full_name}{" "}
                      {m.room_role === "leader" && (
                        <Crown
                          size={12}
                          color="#d97706"
                          style={{ marginLeft: 4, display: "inline" }}
                          fill="#d97706"
                        />
                      )}
                    </div>
                    <span
                      className={`member-role ${
                        m.room_role === "leader" ? "role-leader" : "role-member"
                      }`}
                    >
                      {m.room_role === "leader" ? "Trưởng nhóm" : "Thành viên"}
                    </span>
                  </div>
                </div>
              ))}
            </Accordion>
            <Accordion title="Tùy chỉnh">
              <div className="list-row">Đổi chủ đề</div>
            </Accordion>
            <Accordion title="Hỗ trợ">
              <div className="list-row" style={{ color: "#dc2626" }}>
                Rời nhóm
              </div>
            </Accordion>
          </div>
        </div>
      )}

      {showCreateEventModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateEventModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo sự kiện mới</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateEventModal(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Tên sự kiện *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập tên sự kiện..."
                value={eventFormData.title}
                onChange={(e) =>
                  setEventFormData({ ...eventFormData, title: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-textarea"
                placeholder="Nhập mô tả sự kiện..."
                value={eventFormData.description}
                onChange={(e) =>
                  setEventFormData({
                    ...eventFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thời gian bắt đầu *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={eventFormData.start_time}
                onChange={(e) =>
                  setEventFormData({
                    ...eventFormData,
                    start_time: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thời gian kết thúc *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={eventFormData.end_time}
                onChange={(e) =>
                  setEventFormData({
                    ...eventFormData,
                    end_time: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số lượng tham gia tối đa</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="100"
                value={eventFormData.max_participants}
                onChange={(e) =>
                  setEventFormData({
                    ...eventFormData,
                    max_participants: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="modal-footer">
              <Button
                onClick={() => setShowCreateEventModal(false)}
                hooverColor="#9ca3af"
              >
                Hủy
              </Button>
              <Button onClick={handleCreateEvent} hooverColor="#66ff66">
                Tạo sự kiện
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventDetailModal && selectedEvent && (
        <div
          className="modal-overlay"
          onClick={() => setShowEventDetailModal(false)}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết sự kiện</h3>
              <button
                className="modal-close"
                onClick={() => setShowEventDetailModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Tên sự kiện</label>
                <div style={{ 
                  padding: "10px 12px", 
                  background: "#f9fafb", 
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600"
                }}>
                  {selectedEvent.title}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Mô tả</label>
                <div style={{ 
                  padding: "10px 12px", 
                  background: "#f9fafb", 
                  borderRadius: "8px",
                  minHeight: "80px",
                  whiteSpace: "pre-wrap"
                }}>
                  {selectedEvent.description || "Không có mô tả"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Thời gian bắt đầu</label>
                  <div style={{ 
                    padding: "10px 12px", 
                    background: "#f9fafb", 
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <Calendar size={16} color="#2563eb" />
                    {formatEventDate(selectedEvent.start_time)}
                  </div>
                </div>

                <div>
                  <label className="form-label">Thời gian kết thúc</label>
                  <div style={{ 
                    padding: "10px 12px", 
                    background: "#f9fafb", 
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <Calendar size={16} color="#2563eb" />
                    {formatEventDate(selectedEvent.end_time)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Số lượng tham gia tối đa</label>
                <div style={{ 
                  padding: "10px 12px", 
                  background: "#f9fafb", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Users size={16} color="#2563eb" />
                  {selectedEvent.max_participants} người
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Trạng thái</label>
                <div style={{ 
                  padding: "10px 12px", 
                  background: selectedEvent.status === "upcoming" ? "#dbeafe" :
                             selectedEvent.status === "ongoing" ? "#dcfce7" :
                             selectedEvent.status === "completed" ? "#f3f4f6" : "#fee2e2",
                  color: selectedEvent.status === "upcoming" ? "#1e40af" :
                         selectedEvent.status === "ongoing" ? "#166534" :
                         selectedEvent.status === "completed" ? "#6b7280" : "#991b1b",
                  borderRadius: "8px",
                  fontWeight: "600",
                  textAlign: "center"
                }}>
                  {selectedEvent.status === "upcoming" ? "Sắp diễn ra" :
                   selectedEvent.status === "ongoing" ? "Đang diễn ra" :
                   selectedEvent.status === "completed" ? "Đã kết thúc" : "Đã hủy"}
                </div>
              </div>

              {/* Registration Status Section - Only for members */}
              {!isLeader && (
                <div style={{ marginBottom: "16px" }}>
                  <label className="form-label">Tình trạng đăng ký</label>
                  <div style={{ 
                    padding: "10px 12px", 
                    background: selectedEvent.isUserRegistered ? "#dcfce7" : "#f9fafb",
                    color: selectedEvent.isUserRegistered ? "#166534" : "#6b7280",
                    borderRadius: "8px",
                    fontWeight: "600",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}>
                    {selectedEvent.isUserRegistered ? (
                      <>
                        <Check size={16} />
                        Đã đăng ký
                      </>
                    ) : (
                      "Chưa đăng ký"
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ gap: "12px" }}>
              <Button
                onClick={() => setShowEventDetailModal(false)}
                hooverColor="#9ca3af"
              >
                Đóng
              </Button>

              {/* Owner buttons */}
              {isLeader && selectedEvent.status === "upcoming" && (
                <Button
                  onClick={handleCancelEvent}
                  hooverColor="#ef4444"
                >
                  Hủy sự kiện
                </Button>
              )}

              {isLeader && selectedEvent.status === "ongoing" && (
                <Button
                  onClick={() => {
                    setShowEventDetailModal(false);
                    navigate(`/user/event/${selectedEvent._id}`);
                  }}
                  hooverColor="#66b3ff"
                >
                  Tham gia
                </Button>
              )}

              {/* Member buttons */}
              {!isLeader && selectedEvent.status === "upcoming" && !selectedEvent.isUserRegistered && (
                <Button
                  onClick={handleRegisterFromDetail}
                  hooverColor="#66ff66"
                  style={{ background: "#10b981" }}
                >
                  Đăng ký
                </Button>
              )}

              {!isLeader && selectedEvent.status === "ongoing" && (
                <Button
                  onClick={() => {
                    setShowEventDetailModal(false);
                    navigate(`/user/event/${selectedEvent._id}`);
                  }}
                  hooverColor="#66b3ff"
                >
                  Tham gia
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="accordion-item" style={{ padding: "8px 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
          padding: "8px 6px",
        }}
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>
      {open && (
        <div style={{ fontSize: 14, color: "#4b5563", padding: "4px 8px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
function getRandomColor(name) {
  if (!name) return "#2563eb";
  const colors = [
    "#2563eb",
    "#db2777",
    "#ea580c",
    "#16a34a",
    "#7c3aed",
    "#0891b2",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
