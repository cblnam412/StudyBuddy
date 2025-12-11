import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:3000";

const styles = {
  container: { padding: 20, backgroundColor: "#f7f9fc", minHeight: "100vh", boxSizing: "border-box", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, color: "#0f1724", margin: 0, fontWeight: "bold" },
  buttonPrimary: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: "600" },
  buttonGreen: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: "600" },
  info: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 },
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column" },
  roomName: { fontSize: 18, color: "#111827", marginBottom: 6, fontWeight: "600" },
  roomDesc: { color: "#6b7280", marginBottom: 16, fontSize: 14, lineHeight: "1.5", flex: 1 },
  meta: { fontSize: 13, marginBottom: 16, color: "#374151", display: "flex", gap: 10 },
  tag: { padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold" },
  joinBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", width: "100%", fontSize: 14, fontWeight: "500", marginTop: "auto", transition: "0.2s" },
  pendingBtn: { background: "#fbbf24", color: "#78350f", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "not-allowed", width: "100%", fontSize: 14, fontWeight: "500", marginTop: "auto", opacity: 0.8 },
  joinedBtn: { background: "#10b981", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "default", width: "100%", fontSize: 14, fontWeight: "500", marginTop: "auto" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "#fff", padding: 24, borderRadius: 12, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" },
  modalTitle: { margin: "0 0 16px 0", fontSize: 18, fontWeight: "bold" },
  inputGroup: { marginBottom: 16 },
  label: { display: "block", marginBottom: 6, fontSize: 14, fontWeight: "500", color: "#374151" },
  input: { width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, minHeight: 80, boxSizing: "border-box", resize: "vertical" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  btnCancel: { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: 6, cursor: "pointer" },
  btnConfirm: { background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer" }
};

export default function ExploreRoomsPage() {
  const navigate = useNavigate();
  const { accessToken, userInfo } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sentRequestIds, setSentRequestIds] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userInfo && userInfo._id) {
      const storageKey = `sent_requests_${userInfo._id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setSentRequestIds(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [userInfo]);

  const saveRequestToStorage = (roomId) => {
    if (!userInfo || !userInfo._id) return;
    const storageKey = `sent_requests_${userInfo._id}`;
    const newSet = new Set([...sentRequestIds, roomId]);
    const newArray = Array.from(newSet);
    setSentRequestIds(newArray);
    localStorage.setItem(storageKey, JSON.stringify(newArray));
  };

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError("");

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/room`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.status === 401) {
          setError("Phiên đăng nhập hết hạn.");
          return;
        }

        if (!res.ok) throw new Error("Lỗi tải danh sách phòng.");

        const data = await res.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      } catch (err) {
        console.error("fetchRooms error:", err);
        setError("Không thể kết nối tới server.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [accessToken]);

  const openJoinModal = (room) => {
    if (!accessToken) {
      if (window.confirm("Bạn cần đăng nhập để tham gia. Đi đến trang đăng nhập?")) {
        navigate("/login");
      }
      return;
    }

    if (sentRequestIds.includes(room._id)) return;

    if (room.status === "safe-mode") {
      alert("Phòng đang ở chế độ an toàn, tạm thời không nhận thành viên mới.");
      return;
    }

    setSelectedRoom(room);
    setJoinMessage("Xin chào, mình muốn tham gia phòng này!");
    setInviteToken("");
  };

  const closeJoinModal = () => {
    setSelectedRoom(null);
    setIsSubmitting(false);
  };

  const handleSubmitJoin = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setIsSubmitting(true);

    try {
      const payload = {
        room_id: selectedRoom._id,
        message: joinMessage
      };

      if (selectedRoom.status === "private" && inviteToken) {
        payload.invite_token = inviteToken;
      }

      const res = await fetch(`${API_URL}/room/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201 || res.ok) {
        alert("Yêu cầu tham gia đã được gửi thành công!");
        saveRequestToStorage(selectedRoom._id);
        closeJoinModal();
      } else {
        if (data.message && data.message.includes("đã gửi yêu cầu")) {
             alert("Bạn đã gửi yêu cầu trước đó rồi.");
             saveRequestToStorage(selectedRoom._id);
             closeJoinModal();
        } else if (data.message && data.message.includes("đã là thành viên")) {
             alert("Bạn đã là thành viên của phòng này!");
             closeJoinModal();
        } else {
             alert(`Lỗi: ${data.message || "Không thể tham gia phòng."}`);
        }
      }

    } catch (err) {
      console.error("Join error:", err);
      alert("Lỗi kết nối server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateRoom = () => navigate("/user/create-room");
  const onLogin = () => navigate("/login");

  const renderStatusBadge = (status) => {
    let color = "#374151";
    let bg = "#f3f4f6";
    let text = status;

    if (status === "public") { color = "#059669"; bg = "#d1fae5"; text = "Công khai"; }
    else if (status === "private") { color = "#b91c1c"; bg = "#fee2e2"; text = "Riêng tư"; }
    else if (status === "safe-mode") { color = "#d97706"; bg = "#fef3c7"; text = "Safe Mode"; }

    return <span style={{ ...styles.tag, color, backgroundColor: bg }}>{text}</span>;
  };

  const renderJoinButton = (room) => {
      const isPending = sentRequestIds.includes(room._id);
      if (isPending) {
          return (
            <button style={styles.pendingBtn} disabled>Đang chờ duyệt</button>
          );
      }

      return (
        <button
          style={styles.joinBtn}
          onClick={() => openJoinModal(room)}
        >
          Tham gia
        </button>
      );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Khám phá phòng mới</h1>
        <div>
          <button style={{ ...styles.buttonGreen, marginRight: 8 }} onClick={onCreateRoom}>+ Tạo phòng</button>
          {!accessToken && (
             <button style={styles.buttonPrimary} onClick={onLogin}>Đăng nhập</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={styles.info}>Đang tải danh sách phòng...</div>
      ) : error ? (
        <div style={styles.info}>{error}</div>
      ) : rooms.length === 0 ? (
        <div style={styles.info}>Chưa có phòng nào được tạo. Hãy là người đầu tiên!</div>
      ) : (
        <div style={styles.grid}>
          {rooms.map((r) => (
            <div key={r._id} style={styles.card}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                 <div style={styles.roomName}>{r.room_name}</div>
                 {renderStatusBadge(r.status)}
              </div>

              <div style={styles.roomDesc}>
                {r.description ? r.description : "Chưa có mô tả cho phòng này."}
              </div>

              <div style={styles.meta}>
                 <span>{r.memberNumber ?? 0} thành viên</span>
              </div>

              {renderJoinButton(r)}
            </div>
          ))}
        </div>
      )}

      {selectedRoom && (
        <div style={styles.modalOverlay} onClick={(e) => { if(e.target === e.currentTarget) closeJoinModal() }}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Tham gia: {selectedRoom.room_name}</h3>
            <form onSubmit={handleSubmitJoin}>
              {selectedRoom.status === "private" && (
                 <div style={styles.inputGroup}>
                    <label style={styles.label}>Mã mời (Bắt buộc):</label>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="Nhập mã invite token..."
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      required
                    />
                 </div>
              )}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Lời nhắn tới Leader:</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Ví dụ: Xin chào, mình muốn tham gia để học hỏi..."
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  required
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" style={styles.btnCancel} onClick={closeJoinModal} disabled={isSubmitting}>Hủy</button>
                <button type="submit" style={styles.btnConfirm} disabled={isSubmitting}>
                  {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}