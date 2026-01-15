import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Send,
  Info,
  Users,
  Crown,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Paperclip,
  ArrowLeft,
  Calendar,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Flag,
  AlertTriangle,
  Camera,
  Link,
  UserMinus,
  Search,
  FileText,
    MessageSquare,
} from "lucide-react";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/Button/Button";
import { toast } from "react-toastify";
import axios from "axios";
import API from "../../API/api";

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
  dropdownMenu: {
    position: "absolute",
    top: "24px",
    right: "0",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
    minWidth: "120px",
    overflow: "hidden",
  },
  dropdownItem: {
    padding: "8px 12px",
    fontSize: "13px",
    color: "#374151",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    border: "none",
    background: "transparent",
    textAlign: "left",
  },
  eventBanner: {
    padding: "10px 16px",
    background: "#eff6ff",
    borderBottom: "1px solid #dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#1e40af",
    flexShrink: 0,
  },
  bannerBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    marginLeft: "12px",
    whiteSpace: "nowrap",
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

  // Search States
    const [showSearch, setShowSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchResults, setSearchResults] = useState({ messages: [], documents: [] });
    const [isSearching, setIsSearching] = useState(false);

  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomData, setEditRoomData] = useState({
    room_name: "",
    description: ""
  });

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
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const [editingMessage, setEditingMessage] = useState(null);
  const [activeMsgMenu, setActiveMsgMenu] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    messageId: null,
    reason: "spam",
    content: "",
  });
  const [imgError, setImgError] = useState(false);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Hàm mở modal và điền sẵn dữ liệu hiện tại
  const openEditRoomModal = () => {
    setEditRoomData({
      room_name: activeRoomInfo?.room_name || "",
      description: activeRoomInfo?.description || ""
    });
    setShowEditRoomModal(true);
  };
  const handleSearch = async (e) => {
      const keyword = e.target.value;
      setSearchKeyword(keyword);

      if (keyword.trim().length < 2) {
        setSearchResults({ messages: [], documents: [] });
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/message/${activeRoom}/search?keyword=${keyword}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data.data);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm:", err);
      } finally {
        setIsSearching(false);
      }
    };

const handleJumpToMessage = (messageId) => {
    // 1. Tìm element tin nhắn trong DOM
    const element = document.getElementById(`msg-${messageId}`);

    if (element) {
      // 2. Nếu tìm thấy (tin nhắn đang hiển thị), cuộn tới đó
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // 3. Thêm class highlight để nháy sáng
      element.classList.add("highlight-msg");

      // 4. Xóa class sau 2 giây để hết nháy
      setTimeout(() => {
        element.classList.remove("highlight-msg");
      }, 2000);

      // 5. Đóng khung search (tùy chọn, nếu muốn)
      // setShowSearch(false);
    } else {
      // Trường hợp tin nhắn quá cũ chưa tải xuống danh sách
      toast.info("Tin nhắn này nằm ở trang cũ, vui lòng cuộn lên để tải thêm.");
    }
  };
  // Hàm gọi API cập nhật
  const handleUpdateRoomInfo = async () => {
    if (!editRoomData.room_name.trim()) {
      toast.error("Tên phòng không được để trống");
      return;
    }

    try {
      // Gọi API PUT /room/update-info
      const res = await fetch(`${API_BASE_URL}/room/update-info`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          room_id: activeRoom, // Bắt buộc phải gửi room_id vì dùng route update-info
          room_name: editRoomData.room_name,
          description: editRoomData.description
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Cập nhật thông tin phòng thành công!");
        setActiveRoomInfo(prev => ({
          ...prev,
          room_name: editRoomData.room_name,
          description: editRoomData.description
        }));

        setRooms(prev => prev.map(r =>
          r._id === activeRoom
            ? { ...r, room_name: editRoomData.room_name, description: editRoomData.description }
            : r
        ));

        setShowEditRoomModal(false);
      } else {
        toast.error(data.message || "Lỗi cập nhật phòng");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server");
    }
  };

  const handleCreateInviteLink = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/room/invite-link`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ room_id: activeRoom })
        });

        const data = await res.json();
        console.log("Backend response:", data); // Kiểm tra log nếu cần

        if (res.ok) {
          // SỬA Ở ĐÂY: Lấy token từ bên trong object "invite"
          const token = data.invite?.token;

          if (token) {
            // Tạo link đầy đủ để hiển thị
            const link = `${window.location.origin}/invite/${token}`;
            setGeneratedLink(link);
            setShowInviteModal(true);
          } else {
            toast.error("Lỗi: Không tìm thấy mã token trong phản hồi");
          }
        } else {
          toast.error(data.message || "Lỗi tạo link mời");
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi kết nối server");
      }
    };

    const copyLinkToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        toast.success("Đã sao chép vào bộ nhớ tạm!");
    };

  // Calculate the most relevant event to show in the banner
  const bannerEvent = React.useMemo(() => {
    if (!events || events.length === 0) return null;

    const now = new Date();

    // Filter out cancelled or completed events
    const activeEvents = events.filter(
      (e) => e.status !== "cancelled" && e.status !== "completed"
    );

    // Check for ONGOING events first
    const ongoingEvent = activeEvents.find((e) => {
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      return e.status === "ongoing";
    });

    if (ongoingEvent) return { ...ongoingEvent, label: "Đang diễn ra" };

    // Else: Find the NEAREST upcoming event
    // Filter for future and sort ascending here
    const upcomingEvents = activeEvents
      .filter((e) => new Date(e.start_time) > now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (upcomingEvents.length > 0) {
      return { ...upcomingEvents[0], label: "Sắp diễn ra" };
    }

    return null;
  }, [events]);

  useEffect(() => {
    setImgError(false);
  }, [activeRoom]);

  function extractFileNameFromUrl(url) {
    if (!url) return null;
    const marker = "/documents/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const encodedName = url.substring(idx + marker.length);
    return decodeURIComponent(encodedName);
  }

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
    } else {
      setActiveRoom(null);
      setActiveRoomInfo(null);
      setMessages([]);
      setIsLeader(false);
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
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
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
        const loadedMsgs = (data.messages || [])
          .filter((msg) => !msg.event_id)
          .map((msg) => ({
            _id: msg._id,
            content: msg.content,
            document_id: msg.document_id || null,
            user_id: msg.user_id?._id || msg.user_id,
            user_name: msg.user_id?.full_name || "Unknown",
            user_avatar: msg.user_id?.avatarUrl,
            created_at: msg.created_at,
            status: msg.status || "sent",
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
      const params = new URLSearchParams({ room_id: rId });
      const res = await fetch(`${API_BASE_URL}/event?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const sortedEvents = (data.data || []).sort(
          (a, b) => new Date(b.start_time) - new Date(a.start_time)
        );
        setEvents(sortedEvents);
      }
    } catch (err) {
      console.error("Lỗi tải sự kiện:", err);
    }
  };

  const handleKickUser = async (userId, userName) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn kick thành viên ${userName} ra khỏi phòng?`
      )
    )
      return;

    try {
      const res = await fetch(`${API_BASE_URL}/room/kick-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room_id: activeRoom, user_id: userId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Đã mời ${userName} ra khỏi phòng`);
        // Remove user from local state immediately
        setMembers((prev) => prev.filter((m) => m._id !== userId));
      } else {
        toast.error(data.message || "Không thể mời thành viên ra khỏi phòng");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối server");
    }
  };

  const handleRoomAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    const toastId = toast.loading("Đang tải ảnh lên...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roomId", activeRoom);

      const uploadRes = await fetch(`${API_BASE_URL}/document/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok)
        throw new Error(uploadData.message || "Lỗi upload ảnh");

      const newAvatarUrl = uploadData.url;

      console.log("URL ảnh mới:", newAvatarUrl);
      console.log("Room ID:", activeRoom);
      await axios.put(
        `${API_BASE_URL}/room/${activeRoom}`,
        {
          avatar: newAvatarUrl,
          room_id: activeRoom,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      setActiveRoomInfo((prev) => ({ ...prev, avatar: newAvatarUrl }));
      setImgError(false);
      setRooms((prevRooms) =>
        prevRooms.map((r) =>
          r._id === activeRoom ? { ...r, avatar: newAvatarUrl } : r
        )
      );

      toast.update(toastId, {
        render: "Đổi ảnh nhóm thành công!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error(err);
      toast.update(toastId, {
        render: "Lỗi: " + (err.response?.data?.message || err.message),
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = null;
    }
  };

  const handleApproveRequest = async (reqId) => {
    if (!window.confirm("Duyệt thành viên này?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/room/${reqId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room_id: activeRoom }),
      });
      if (res.ok) {
        setJoinRequests((prev) => prev.filter((req) => req._id !== reqId));
        fetchRoomMembers(activeRoom);
        toast.success("Đã duyệt thành viên!");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

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
        body: JSON.stringify({ reason: reason, room_id: activeRoom }),
      });
      if (res.ok) {
        setJoinRequests((prev) => prev.filter((req) => req._id !== reqId));
        toast.success("Đã từ chối yêu cầu");
      }
    } catch (err) {
      toast.error("Lỗi kết nối");
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => setConnectionError(null));
    socketRef.current.on("room:new_message", (data) => {
      if (data.room_id === activeRoom && !data.event_id) {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
      }
    });
    socketRef.current.on("room:message_edited", (data) => {
      if (data.room_id === activeRoom) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data._id
              ? { ...msg, content: data.content, status: "edited" }
              : msg
          )
        );
      }
    });
    socketRef.current.on("room:message_deleted", (data) => {
      if (data.room_id === activeRoom) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.message_id
              ? { ...msg, status: "deleted", content: "Tin nhắn đã bị thu hồi" }
              : msg
          )
        );
      }
    });
    socketRef.current.on("room:user_typing", ({ user_name, room_id }) => {
      if (room_id === activeRoom)
        setTypingUsers((prev) =>
          prev.includes(user_name) ? prev : [...prev, user_name]
        );
    });
    socketRef.current.on("room:user_stop_typing", ({ user_name, room_id }) => {
      if (room_id === activeRoom)
        setTypingUsers((prev) =>
          user_name ? prev.filter((u) => u !== user_name) : []
        );
    });

    socketRef.current.on("user:kicked_from_room", (data) => {
      if (data.room_id === activeRoom) {
        toast.error("Bạn đã bị mời ra khỏi phòng.");
        setActiveRoom(null);
        setMembers([]);
        setMessages([]);
        navigate("/user/chat");

        // Refresh room list to remove the kicked room
        setRooms((prev) => prev.filter((r) => r._id !== data.room_id));
      }
    });

    return () => socketRef.current?.disconnect();
  }, [accessToken, activeRoom]);

  useEffect(() => {
    if (socketRef.current && activeRoom)
      socketRef.current.emit("room:join", activeRoom);
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
      if (editingMessage) {
        socketRef.current.emit("room:edit_message", {
          roomId: activeRoom,
          message_id: editingMessage._id,
          new_content: inputText,
        });
        setEditingMessage(null);
      } else {
        socketRef.current.emit("room:message", {
          roomId: activeRoom,
          content: inputText,
          reply_to: null,
        });
      }
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

  const startEditMessage = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setActiveMsgMenu(null);
    document.querySelector(".input-wrapper input")?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
  };

  const deleteMessage = (msgId) => {
    if (!window.confirm("Bạn có chắc muốn thu hồi tin nhắn này?")) return;
    if (socketRef.current)
      socketRef.current.emit("room:delete_message", {
        roomId: activeRoom,
        message_id: msgId,
      });
    setActiveMsgMenu(null);
  };

  const openReportModal = (msgId) => {
    setReportData({ ...reportData, messageId: msgId });
    setShowReportModal(true);
    setActiveMsgMenu(null);
  };

  const submitReport = async () => {
    if (!reportData.content.trim()) {
      toast.error("Vui lòng nhập nội dung tố cáo");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reported_item_id: reportData.messageId,
          reported_item_type: "message",
          report_type: reportData.reason,
          content: reportData.content,
        }),
      });
      if (res.ok) {
        toast.success("Đã gửi báo cáo thành công");
        setShowReportModal(false);
        setReportData({ messageId: null, reason: "spam", content: "" });
      } else {
        const data = await res.json();
        toast.error(data.message || "Lỗi khi gửi báo cáo");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", activeRoom);
    try {
      const res = await fetch(`${API_BASE_URL}/document/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      const isImage = isImageUrl(data.url);
      const fileName = extractFileNameFromUrl(data.url);
      if (res.ok && socketRef.current) {
        socketRef.current.emit("room:message", {
          roomId: activeRoom,
          content: isImage ? data.url : fileName,
          reply_to: null,
          document_id: data.document._id,
        });
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
        { headers: { Authorization: `Bearer ${accessToken}` } }
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

  const isSameDay = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getSeparatorDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const dateMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const nowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const diffTime = Math.abs(nowMidnight - dateMidnight);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0)
      return `Hôm nay, ${date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    if (diffDays === 1)
      return `Hôm qua, ${date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    if (diffDays < 7) {
      const dayName = date.toLocaleDateString("vi-VN", { weekday: "long" });
      const time = date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${dayName}, ${time}`;
    }
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
        toast.error("Vui lòng chọn thời gian");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/event`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room_id: activeRoom, ...eventFormData }),
      });
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
        const errorData = await res.json();

        toast.error(errorData.message || "Lỗi tạo sự kiện");
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra");
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
      }
    } catch (err) {
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
      if (res.ok) {
        toast.success("Đăng ký sự kiện thành công!");
        setShowEventDetailModal(false);
        fetchRoomEvents(activeRoom);
      } else {
        toast.error("Lỗi đăng ký sự kiện");
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm("Bạn có chắc muốn rời nhóm này không?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/room/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room_id: activeRoom }),
      });
      if (res.ok) {
        toast.success("Đã rời nhóm");
        setRooms((prevRooms) => prevRooms.filter((r) => r._id !== activeRoom));
        setActiveRoom(null);
        setActiveRoomInfo(null);
        setMessages([]);
        navigate("/user/chat");
      } else {
        toast.error("Không thể rời nhóm");
      }
    } catch (err) {
      toast.error("Lỗi kết nối server");
    }
  };

  const handleTransferLeader = async (newLeaderId, newLeaderName) => {
    if (!window.confirm(`Chuyển quyền trưởng nhóm cho ${newLeaderName}?`))
      return;
    try {
      await axios.post(
        `${API}/room/${roomId}/transfer-leader`,
        { newLeaderId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success("Chuyển quyền trưởng nhóm thành công");
      setMembers((prev) =>
        prev.map((m) => {
          if (m.room_role === "leader") return { ...m, room_role: "member" };
          if (m._id === newLeaderId) return { ...m, room_role: "leader" };
          return m;
        })
      );
      setIsLeader(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Chuyển quyền thất bại");
    }
  };

  return (
    <div className="chat-app-wrapper">
      <style>{`
          * { box-sizing: border-box; }
          .typing-area { position: absolute; bottom: 100px; left: 20px; display: flex; align-items: center; z-index: 100; pointer-events: none; }
          .typing-avatar-wrapper { position: relative; margin-left: -10px; transition: all 0.3s ease; }
          .typing-avatar-wrapper:first-child { margin-left: 0; }
          .typing-avatar { width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; background: #e5e7eb; display: flex; align-items: center; justifyContent: center; font-size: 10px; font-weight: bold; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .typing-dots { background: white; width: 32px; height: 32px; border-radius: 50%; border: 2px solid #e5e7eb; display: flex; align-items: center; justifyContent: center; margin-left: -5px; z-index: 100; animation: fadeIn 0.5s; }
          .dot { width: 4px; height: 4px; background: #3b82f6; border-radius: 50%; margin: 0 1px; animation: jump 1s infinite; }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

          .chat-app-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; background-color: #ffffff; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: 9999; display: flex; overflow: hidden; }
          .sidebar-left { width: 320px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; background: #fff; flex-shrink: 0; }
          .sidebar-header { height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; flex-shrink: 0; }
          .header-left-group { display: flex; align-items: center; gap: 12px; }
          .header-title { margin: 0; padding: 0; font-size: 24px; font-weight: bold; color: #2563eb; line-height: 1; display: flex; align-items: center; }
          .search-box { padding: 0 16px 12px; }
          .search-input { width: 100%; background: #f3f4f6; border: none; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 14px; }
          .room-list { flex: 1; overflow-y: auto; padding: 0 8px; }
          .room-item { display: flex; align-items: center; padding: 12px; margin-bottom: 2px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
          .room-item:hover { background-color: #f3f4f6; }
          .room-item.active { background-color: #eff6ff; }
          .room-avatar { width: 48px; height: 48px; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; flex-shrink: 0; }
          .chat-main { position: relative; flex: 1; display: flex; flex-direction: column; min-width: 0; background-color: #fff; }
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
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
          .modal-content { background: white; border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
          .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
          .modal-title { font-size: 1.5rem; font-weight: 600; margin: 0; color: #1a1a1a; }
          .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; padding: 4px 8px; }
          .form-group { margin-bottom: 16px; }
          .form-label { display: block; font-weight: 500; margin-bottom: 8px; color: #374151; font-size: 14px; }
          .form-input, .form-textarea { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; box-sizing: border-box; background-color: #f9fafb !important; }
          .form-textarea { min-height: 100px; resize: vertical; }
          .form-input:focus, .form-textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
          .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
          .btn-cancel { padding: 10px 20px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
          .btn-cancel:hover { background: #f3f4f6; }
          .btn-submit { padding: 10px 20px; border: none; background: #2563eb; color: white; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
          .btn-submit:hover { background: #1d4ed8; }
          .date-separator { text-align: center; font-size: 12px; font-weight: 500; color: #6b7280; margin: 20px 0 10px 0; position: relative; clear: both; }

          .msg-row-container { position: relative; }
          .msg-row:hover .msg-actions { opacity: 1; }
          .msg-actions { opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; padding: 0 8px; }
          .action-icon { cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 50%; }
          .action-icon:hover { background-color: #f3f4f6; color: #4b5563; }
          .deleted-msg { font-style: italic; color: #9ca3af !important; background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; }
          .edited-label { font-size: 10px; color: #9ca3af; margin-left: 4px; font-style: italic; }
                     @keyframes highlight-fade {
                       0% { background-color: rgba(37, 99, 235, 0.2); }
                       100% { background-color: transparent; }
                     }

                     .highlight-msg {
                       animation: highlight-fade 2s ease-out;
                       border-radius: 8px;
                       transition: background-color 0.5s;
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
              {room.avatar ? (
                <img
                  src={room.avatar}
                  alt="Room"
                  className="room-avatar"
                  style={{ objectFit: "cover", background: "none" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}

              <div
                className="room-avatar"
                style={{
                  background: getRandomColor(getRoomName(room)),
                  display: room.avatar ? "none" : "flex",
                }}
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
                  {isLeader && activeRoomInfo?.status === 'private' && (
                    <button
                      style={styles.iconButton}
                      onClick={handleCreateInviteLink}
                      title="Lấy link mời thành viên"
                    >
                      <Link size={20} />
                    </button>
                  )}
              {/* Nút Tìm kiếm */}
                              <button
                                style={{
                                  ...styles.iconButton,
                                  background: showSearch ? "#eff6ff" : "#ffffff",
                                  borderColor: showSearch ? "#2563eb" : "#e5e7eb"
                                }}
                                onClick={() => {
                                  setShowSearch(!showSearch);
                                  if(!showSearch) {
                                      // Focus vào ô input khi mở (nếu cần dùng ref)
                                      setSearchKeyword("");
                                      setSearchResults({ messages: [], documents: [] });
                                  }
                                }}
                                title="Tìm kiếm tin nhắn"
                              >
                                <Search size={20} color={showSearch ? "#2563eb" : "#2563eb"} />
                              </button>
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


            {bannerEvent && (
              <div style={styles.eventBanner}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    overflow: "hidden",
                  }}
                >
                  <Calendar
                    size={18}
                    className={
                      bannerEvent.label === "Đang diễn ra"
                        ? "text-green-600"
                        : "text-blue-600"
                    }
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {bannerEvent.label}: {bannerEvent.title}
                    </span>
                    <span style={{ fontSize: "12px", opacity: 0.8 }}>
                      Thời gian bắt đầu: 1
                      {formatEventDate(bannerEvent.start_time)}
                    </span>
                  </div>
                </div>
                <button
                  style={styles.bannerBtn}
                  onClick={() => handleEventClick(bannerEvent)}
                >
                  Chi tiết
                </button>
              </div>
            )}
{/* SEARCH PANEL - GIAO DIỆN MỚI */}
            {showSearch && (
              <div style={{
                borderBottom: "1px solid #e5e7eb",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                width: "100%", // Chiếm full chiều rộng
                zIndex: 20,
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                // position: "absolute", // ĐÃ BỎ dòng này để không che nội dung
                animation: "fadeIn 0.2s ease-out"
              }}>
                {/* Header của Search Panel */}
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #f3f4f6" }}>
                  <div className="input-wrapper" style={{
                      background: "#f3f4f6",
                      border: "1px solid transparent",
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 12px",
                      borderRadius: "8px",
                      transition: "all 0.2s"
                  }}>
                    <Search size={16} color="#6b7280" style={{marginRight: 8}}/>
                    <input
                      placeholder="Nhập từ khóa để tìm..."
                      value={searchKeyword}
                      onChange={handleSearch}
                      autoFocus
                      style={{
                          fontSize: 14,
                          background: "transparent",
                          border: "none",
                          width: "100%",
                          outline: "none",
                          padding: "10px 0",
                          color: "#1f2937"
                      }}
                    />
                    {isSearching && <span style={{fontSize: 12, color: "#2563eb", fontWeight: 500}}>Đang tìm...</span>}
                  </div>

                  {/* Nút Đóng Search */}
                  <button
                    onClick={() => {
                        setShowSearch(false);
                        setSearchKeyword("");
                        setSearchResults({ messages: [], documents: [] });
                    }}
                    style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px",
                        color: "#6b7280",
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    title="Đóng tìm kiếm"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Danh sách kết quả */}
                <div style={{
                    overflowY: "auto",
                    maxHeight: "40vh", // Giới hạn chiều cao max là 40% màn hình
                    background: "#fff"
                }}>
                  {/* Kết quả Tin nhắn */}
                  {searchResults.messages.length > 0 && (
                    <div style={{ padding: "8px 0" }}>
                      <h4 style={{ fontSize: 11, color: "#9ca3af", margin: "8px 16px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                        Tin nhắn ({searchResults.messages.length})
                      </h4>
                      {searchResults.messages.map(msg => (
                        <div key={msg._id}
                        style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            display: "flex",
                            gap: "12px",
                            borderBottom: "1px solid #f9fafb",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                        onClick={() => handleJumpToMessage(msg._id)}
                        >
                           <div style={{
                               width: 32, height: 32, borderRadius: "50%",
                               background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center",
                               flexShrink: 0
                           }}>
                                {msg.user_avatar ?
                                    <img src={msg.user_avatar} alt="" style={{width: "100%", height: "100%", borderRadius: "50%", objectFit:"cover"}}/>
                                    : <span style={{fontSize: 12, fontWeight: "bold", color: "#6b7280"}}>{msg.user_name?.charAt(0)}</span>
                                }
                           </div>
                           <div style={{flex: 1, overflow: "hidden"}}>
                              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2}}>
                                  <span style={{fontSize: 13, fontWeight: 600, color: "#374151"}}>{msg.user_name}</span>
                                  <span style={{fontSize: 11, color: "#9ca3af"}}>{formatTime(msg.created_at)}</span>
                              </div>
                              <div style={{
                                  fontSize: 13, color: "#4b5563",
                                  display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden"
                              }}>
                                {msg.content}
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Kết quả Tài liệu */}
                  {searchResults.documents.length > 0 && (
                    <div style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
                      <h4 style={{ fontSize: 11, color: "#9ca3af", margin: "8px 16px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                        Tài liệu ({searchResults.documents.length})
                      </h4>
                      {searchResults.documents.map(doc => (
                        <div key={doc._id}
                        style={{
                            padding: "10px 16px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                        onClick={() => window.open(doc.file_url, "_blank")}
                        >
                           <div style={{
                               width: 36, height: 36, borderRadius: "8px",
                               background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center",
                               color: "#2563eb", flexShrink: 0
                           }}>
                               <FileText size={18} />
                           </div>
                           <div style={{overflow: "hidden", flex: 1}}>
                              <div style={{fontSize: 13, fontWeight: "500", color: "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                                {doc.file_name}
                              </div>
                              <div style={{fontSize: 11, color: "#9ca3af"}}>
                                Gửi bởi {doc.uploader_id?.full_name}
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchKeyword.length >= 2 && searchResults.messages.length === 0 && searchResults.documents.length === 0 && !isSearching && (
                     <div style={{padding: "30px 20px", textAlign: "center", color: "#6b7280"}}>
                        <Search size={32} color="#e5e7eb" style={{margin: "0 auto 10px", display: "block"}}/>
                        <span style={{fontSize: 13}}>Không tìm thấy kết quả nào cho "{searchKeyword}"</span>
                     </div>
                  )}
                </div>
              </div>
            )}
            <div
              className="message-area"
              onClick={() => setActiveMsgMenu(null)}
            >
              {messages.map((msg, i) => {
                const isMe =
                  msg.user_id === userInfo?._id ||
                  msg.user_id?._id === userInfo?._id;
                let showSeparator = false;
                const isDeleted = msg.status === "deleted";

                if (i === 0) {
                  showSeparator = true;
                } else {
                  const prevMsg = messages[i - 1];
                  const timeDiff =
                    new Date(msg.created_at) - new Date(prevMsg.created_at);
                  if (
                    !isSameDay(msg.created_at, prevMsg.created_at) ||
                    timeDiff > 1800000
                  ) {
                    showSeparator = true;
                  }
                }

                return (
                  <React.Fragment key={i}>
                    {showSeparator && (
                      <div className="date-separator">
                        {getSeparatorDate(msg.created_at)}
                      </div>
                    )}

                    <div
                      id={`msg-${msg._id}`}
                      className={`msg-row ${isMe ? "me" : "other"}`}
                    >
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
                            style={{
                              background: getRandomColor(msg.user_name),
                            }}
                          >
                            {msg.user_name?.charAt(0).toUpperCase()}
                          </div>
                        ))}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flexDirection: isMe ? "row-reverse" : "row",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            maxWidth: "100%",
                          }}
                        >
                          {!isMe && (
                            <span className="msg-sender-name">
                              {msg.user_name}
                            </span>
                          )}

                          <div
                            className={`msg-bubble ${
                              isDeleted ? "deleted-msg" : ""
                            }`}
                          >
                            {isDeleted ? (
                              <span>Tin nhắn đã bị thu hồi</span>
                            ) : isImageUrl(msg.content) ? (
                              <img
                                src={msg.content}
                                alt="sent"
                                className="msg-image"
                                onClick={() =>
                                  window.open(msg.content, "_blank")
                                }
                              />
                            ) : msg.document_id ? (
                              <div
                                className="msg-link"
                                onClick={() =>
                                  handleDownloadDocument(
                                    msg.document_id,
                                    msg.content
                                  )
                                }
                                style={{
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Paperclip size={16} />{" "}
                                <span>{msg.content}</span>
                              </div>
                            ) : (
                              <span>{msg.content}</span>
                            )}

                            {!isDeleted && msg.status === "edited" && (
                              <span className="edited-label">(đã sửa)</span>
                            )}

                            <span className="msg-time">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>

                        {!isDeleted && (
                          <div
                            className="msg-actions"
                            style={{ position: "relative", margin: "0 8px" }}
                          >
                            <button
                              className="action-icon"
                              style={{ background: "none", border: "none" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMsgMenu(
                                  activeMsgMenu === msg._id ? null : msg._id
                                );
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeMsgMenu === msg._id && (
                              <div style={styles.dropdownMenu}>
                                {isMe ? (
                                  <>
                                    <button
                                      style={styles.dropdownItem}
                                      onClick={() => startEditMessage(msg)}
                                    >
                                      <Edit2 size={14} /> Chỉnh sửa
                                    </button>
                                    <button
                                      style={{
                                        ...styles.dropdownItem,
                                        color: "#ef4444",
                                      }}
                                      onClick={() => deleteMessage(msg._id)}
                                    >
                                      <Trash2 size={14} /> Thu hồi
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    style={{
                                      ...styles.dropdownItem,
                                      color: "#f59e0b",
                                    }}
                                    onClick={() => openReportModal(msg._id)}
                                  >
                                    <Flag size={14} /> Tố cáo
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {typingUsers.length > 0 && (
                <div className="typing-area">
                  {typingUsers.slice(0, 3).map((name, idx) => {
                    const cleanName = name ? name.trim() : "";
                    const member = members.find(
                      (m) => m.full_name && m.full_name.trim() === cleanName
                    );
                    const senderInMsg = messages.find(
                      (m) => m.user_name && m.user_name.trim() === cleanName
                    );
                    const avatarSrc =
                      member?.avatarUrl ||
                      member?.avatar ||
                      senderInMsg?.user_avatar;
                    return (
                      <div
                        key={idx}
                        className="typing-avatar-wrapper"
                        style={{ zIndex: idx }}
                        title={`${name} đang nhập...`}
                      >
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            className="typing-avatar"
                            alt={name.charAt(0)}
                            style={{ objectFit: "cover" }}
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="typing-avatar"
                          style={{
                            background: getRandomColor(name),
                            display: avatarSrc ? "none" : "flex",
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    );
                  })}
                  <div className="typing-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef}></div>
            </div>

            <div style={styles.footer}>
              {editingMessage && (
                <div
                  style={{
                    position: "absolute",
                    top: "-40px",
                    left: 0,
                    width: "100%",
                    background: "#fffbeb",
                    padding: "8px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                    color: "#d97706",
                    borderTop: "1px solid #fcd34d",
                  }}
                >
                  <span>Đang chỉnh sửa tin nhắn...</span>
                  <button
                    onClick={cancelEdit}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#d97706",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />

              <button
                style={{
                  ...styles.iconButton,
                  opacity: editingMessage ? 0.5 : 1,
                }}
                onClick={() => !editingMessage && fileInputRef.current.click()}
                title="Gửi ảnh"
                disabled={!!editingMessage}
              >
                <ImageIcon size={20} />
              </button>

              <button
                style={{
                  ...styles.iconButton,
                  opacity: editingMessage ? 0.5 : 1,
                }}
                onClick={() => !editingMessage && fileInputRef.current.click()}
                title="Đính kèm file"
                disabled={!!editingMessage}
              >
                <Paperclip size={20} />
              </button>

              <div className="input-wrapper">
                <input
                  placeholder={
                    editingMessage ? "Nhập nội dung mới..." : "Nhập tin nhắn..."
                  }
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  autoFocus
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
                position: "relative",
                marginBottom: 12,
                width: 80,
                height: 80,
              }}
            >
              <input
                type="file"
                id="avatar-upload-input"
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleRoomAvatarChange}
              />

              {activeRoomInfo?.avatar && !imgError ? (
                <img
                  src={activeRoomInfo.avatar}
                  alt="Avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#f3f4f6",
                  }}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: getRandomColor(getRoomName(activeRoomInfo)),
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 32,
                  }}
                >
                  {getRoomName(activeRoomInfo).charAt(0).toUpperCase()}
                </div>
              )}

              {isLeader && (
                <label
                  htmlFor="avatar-upload-input"
                  style={{
                    position: "absolute",
                    bottom: -5,
                    right: -5,
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    zIndex: 10,
                    transition: "all 0.2s",
                  }}
                  title="Đổi ảnh nhóm"
                  className="hover:bg-gray-50"
                >
                  <Camera size={18} color="#4b5563" />
                </label>
              )}
            </div>

            <h3 style={{ margin: "8px 0", textAlign: "center" }}>
              {getRoomName(activeRoomInfo)}
            </h3>
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
                  {isLeader && m.room_role !== "leader" && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        title="Chuyển quyền trưởng nhóm"
                        onClick={() => handleTransferLeader(m._id, m.full_name)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#d97706",
                          padding: 4,
                        }}
                      >
                        <Crown size={16} />
                      </button>

                      <button
                        title="Mời ra khỏi phòng"
                        onClick={() => handleKickUser(m._id, m.full_name)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444", // Red color for destructive action
                          padding: 4,
                        }}
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Accordion>
            <Accordion title="Tùy chỉnh">
              {isLeader && (
                              <div
                                className="list-row"
                                onClick={openEditRoomModal}
                                style={{
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginTop: "8px",
                                    color: "#2563eb" // Màu xanh
                                }}
                              >
                                <Edit2 size={16} /> {/* Nhớ import Edit2 từ lucide-react */}
                                Sửa thông tin phòng
                              </div>
                            )}
            </Accordion>
            <Accordion title="Hỗ trợ">
              <div
                className="list-row"
                style={{ color: "#dc2626", cursor: "pointer" }}
                onClick={handleLeaveRoom}
              >
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
              <label className="form-label">Mô tả *</label>
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
              <label className="form-label">Thời gian kết thúc dự kiến*</label>
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
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  {selectedEvent.title}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Mô tả</label>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    minHeight: "80px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedEvent.description || "Không có mô tả"}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">ID</label>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    minHeight: "80px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedEvent._id || "Không tìm thấy"}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label className="form-label">Thời gian bắt đầu</label>
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Calendar size={16} color="#2563eb" />
                    {formatEventDate(selectedEvent.start_time)}
                  </div>
                </div>
                <div>
                  <label className="form-label">
                    Thời gian kết thúc dự kiến
                  </label>
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Calendar size={16} color="#2563eb" />
                    {formatEventDate(selectedEvent.end_time)}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Số lượng tham gia tối đa</label>
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Users size={16} color="#2563eb" />
                  {selectedEvent.max_participants} người
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Trạng thái</label>
                <div
                  style={{
                    padding: "10px 12px",
                    background:
                      selectedEvent.status === "upcoming"
                        ? "#dbeafe"
                        : selectedEvent.status === "ongoing"
                        ? "#dcfce7"
                        : selectedEvent.status === "completed"
                        ? "#f3f4f6"
                        : "#fee2e2",
                    color:
                      selectedEvent.status === "upcoming"
                        ? "#1e40af"
                        : selectedEvent.status === "ongoing"
                        ? "#166534"
                        : selectedEvent.status === "completed"
                        ? "#6b7280"
                        : "#991b1b",
                    borderRadius: "8px",
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  {selectedEvent.status === "upcoming"
                    ? "Sắp diễn ra"
                    : selectedEvent.status === "ongoing"
                    ? "Đang diễn ra"
                    : selectedEvent.status === "completed"
                    ? "Đã kết thúc"
                    : "Đã hủy"}
                </div>
              </div>
              {!isLeader && (
                <div style={{ marginBottom: "16px" }}>
                  <label className="form-label">Tình trạng đăng ký</label>
                  <div
                    style={{
                      padding: "10px 12px",
                      background: selectedEvent.isUserRegistered
                        ? "#dcfce7"
                        : "#f9fafb",
                      color: selectedEvent.isUserRegistered
                        ? "#166534"
                        : "#6b7280",
                      borderRadius: "8px",
                      fontWeight: "600",
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {selectedEvent.isUserRegistered ? (
                      <>
                        {" "}
                        <Check size={16} /> Đã đăng ký{" "}
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
              {isLeader && selectedEvent.status === "upcoming" && (
                <Button onClick={handleCancelEvent} hooverColor="#ef4444">
                  Hủy sự kiện
                </Button>
              )}
              {!isLeader &&
                (selectedEvent.status === "upcoming" ||
                  selectedEvent.status === "ongoing") &&
                !selectedEvent.isUserRegistered && (
                  <Button
                    onClick={handleRegisterFromDetail}
                    hooverColor="#66ff66"
                  >
                    Đăng ký
                  </Button>
                )}
              {(isLeader ||
                (selectedEvent.status === "ongoing" &&
                  selectedEvent.isUserRegistered)) && (
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

      {showReportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowReportModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "18px",
                }}
              >
                <AlertTriangle color="#f59e0b" size={24} /> Tố cáo tin nhắn
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowReportModal(false)}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Lý do tố cáo</label>
              <select
                className="form-input"
                value={reportData.reason}
                onChange={(e) =>
                  setReportData({ ...reportData, reason: e.target.value })
                }
              >
                <option value="spam">Spam / Tin rác</option>
                <option value="violated_content">
                  Nội dung vi phạm / Phản cảm
                </option>
                <option value="infected_file">File chứa mã độc</option>
                <option value="offense">Xúc phạm / Lăng mạ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Chi tiết vi phạm</label>
              <textarea
                className="form-textarea"
                placeholder="Mô tả thêm về vi phạm..."
                value={reportData.content}
                onChange={(e) =>
                  setReportData({ ...reportData, content: e.target.value })
                }
              ></textarea>
            </div>

            <div className="modal-footer">
              <Button
                onClick={() => setShowReportModal(false)}
                hooverColor="#9ca3af"
              >
                Hủy
              </Button>
              <Button
                onClick={submitReport}
                hooverColor="#f87171"
                style={{ background: "#ef4444" }}
              >
                Gửi tố cáo
              </Button>
            </div>
          </div>
        </div>
      )}
      {showInviteModal && (
              <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3 className="modal-title">Mời thành viên</h3>
                    <button className="modal-close" onClick={() => setShowInviteModal(false)}>
                      ×
                    </button>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 10 }}>
                      Gửi liên kết này cho người khác. Họ có thể nhấp vào link và để lại lời nhắn xin tham gia nhóm.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        padding: "10px",
                        background: "#f3f4f6",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        alignItems: "center",
                      }}
                    >
                      <input
                        readOnly
                        value={generatedLink}
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#1f2937",
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <Button onClick={() => setShowInviteModal(false)} hooverColor="#9ca3af">
                      Đóng
                    </Button>
                    <Button onClick={copyLinkToClipboard} hooverColor="#66b3ff">
                      Sao chép Link
                    </Button>
                  </div>
                </div>
              </div>
            )}
        {showEditRoomModal && (
                <div className="modal-overlay" onClick={() => setShowEditRoomModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3 className="modal-title">Cập nhật thông tin phòng</h3>
                      <button className="modal-close" onClick={() => setShowEditRoomModal(false)}>
                        ×
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tên phòng *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editRoomData.room_name}
                        onChange={(e) =>
                          setEditRoomData({ ...editRoomData, room_name: e.target.value })
                        }
                        placeholder="Nhập tên phòng..."
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Mô tả</label>
                      <textarea
                        className="form-textarea"
                        value={editRoomData.description}
                        onChange={(e) =>
                          setEditRoomData({ ...editRoomData, description: e.target.value })
                        }
                        placeholder="Nhập mô tả về phòng này..."
                      />
                    </div>

                    <div className="modal-footer">
                      <Button
                        onClick={() => setShowEditRoomModal(false)}
                        hooverColor="#9ca3af"
                      >
                        Hủy
                      </Button>
                      <Button onClick={handleUpdateRoomInfo} hooverColor="#66ff66">
                        Lưu thay đổi
                      </Button>
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
