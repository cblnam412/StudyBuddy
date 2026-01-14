import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:3000";

const styles = {
  container: { padding: "32px 40px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: "#334155" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 },
  titleGroup: { display: "flex", flexDirection: "column" },
  title: { fontSize: 30, color: "#0f1724", margin: 0, fontWeight: "700", letterSpacing: "-0.02em" },
  subTitle: { fontSize: 16, color: "#64748b", marginTop: 8, fontWeight: "400" },

  buttonPrimary: { background: "#2563eb", color: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  buttonGreen: { background: "#059669", color: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },

  toolbar: {
    backgroundColor: "#ffffff",
    padding: "16px",
    borderRadius: 12,
    marginBottom: 40,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e2e8f0"
  },
  searchWrapper: { flex: 1, minWidth: "300px", position: "relative" },
  searchIcon: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", width: 20, height: 20 },
  searchInput: {
    width: "100%",
    padding: "10px 12px 10px 42px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
    outline: "none",
    backgroundColor: "#fff",
    transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out"
  },
  filterGroup: { display: "flex", gap: 12, flexWrap: "wrap" },
  selectWrapper: { position: "relative" },
  select: {
    appearance: "none",
    padding: "10px 36px 10px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    outline: "none",
    cursor: "pointer",
    backgroundColor: "#fff",
    fontWeight: "500",
    color: "#334155",
    minWidth: 160,
    transition: "border-color 0.15s ease-in-out"
  },
  selectIcon: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" },


  info: { textAlign: "center", color: "#64748b", marginTop: 80, fontSize: 16, fontWeight: "500", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)", // Shadow nhẹ
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.2s ease-in-out",
    cursor: "default"
  },

  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  roomName: { fontSize: 18, color: "#0f1724", fontWeight: "700", lineHeight: 1.4 },
  roomDesc: { color: "#475569", marginBottom: 20, fontSize: 14, lineHeight: "1.6", flex: 1, fontWeight: "400" },
  meta: { fontSize: 14, marginBottom: 20, color: "#64748b", display: "flex", alignItems: "center", gap: 6, fontWeight: "500" },

  tag: { padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  joinBtn: { background: "#2563eb", color: "#fff", border: "1px solid transparent", borderRadius: 8, padding: "10px", cursor: "pointer", width: "100%", fontSize: 14, fontWeight: "600", marginTop: "auto", transition: "0.2s" },
  pendingBtn: { background: "#fff7ed", color: "#c2410c", border: "1px solid #ffedd5", borderRadius: 8, padding: "10px", cursor: "not-allowed", width: "100%", fontSize: 14, fontWeight: "600", marginTop: "auto" },
  joinedBtn: { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px", cursor: "default", width: "100%", fontSize: 14, fontWeight: "600", marginTop: "auto" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" },
  modalContent: { backgroundColor: "#fff", padding: 32, borderRadius: 16, width: "100%", maxWidth: 450, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" },
  modalTitle: { margin: "0 0 24px 0", fontSize: 20, fontWeight: "700", color: "#0f1724" },
  label: { display: "block", marginBottom: 8, fontSize: 14, fontWeight: "600", color: "#334155" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box", outline: "none" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, minHeight: 100, boxSizing: "border-box", resize: "vertical", outline: "none", fontFamily: "inherit" },
  btnCancel: { background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: "600" },
  btnConfirm: { background: "#2563eb", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: "600" }
};

const SearchIcon = () => (
  <svg style={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="18" height="18" style={styles.selectIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const EmptyIcon = () => (
    <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
);


export default function ExploreRoomsPage() {
  const navigate = useNavigate();
  const { accessToken, userInfo } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMembership, setFilterMembership] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_URL}/room`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401) return;
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

  useEffect(() => { fetchRooms(); }, [accessToken]);

  const getProcessedRooms = () => {
    let result = [...rooms];
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(r => r.room_name.toLowerCase().includes(lowerTerm));
    }
    if (filterStatus !== "all") {
      result = result.filter(r => r.status === filterStatus);
    }
    if (filterMembership !== "all") {
      result = result.filter(r => {
        const isJoined = r.members?.some((member) => {
          const memberId = typeof member === "string" ? member : member._id;
          return memberId === userInfo?._id;
        });
        if (filterMembership === "joined") return isJoined;
        if (filterMembership === "pending") return r.isPending && !isJoined;
        if (filterMembership === "not-joined") return !isJoined && !r.isPending;
        return true;
      });
    }
    result.sort((a, b) => {
      switch (sortOrder) {
        case "a-z": return a.room_name.localeCompare(b.room_name);
        case "z-a": return b.room_name.localeCompare(a.room_name);
        case "oldest": return a._id.localeCompare(b._id);
        case "newest": default: return b._id.localeCompare(a._id);
      }
    });
    return result;
  };

  const processedRooms = getProcessedRooms();

  const openJoinModal = (room) => {
    if (!accessToken) {
        if(window.confirm("Bạn cần đăng nhập để tham gia. Đi đến trang login?")) navigate("/login");
        return;
    }
    if (room.isPending) return;
    if (room.status === "safe-mode") { alert("Phòng Safe Mode tạm đóng."); return; }
    setSelectedRoom(room);
    setJoinMessage("");
    setInviteToken("");
  };

  const closeJoinModal = () => { setSelectedRoom(null); setIsSubmitting(false); };

  const handleSubmitJoin = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setIsSubmitting(true);
    try {
      const payload = { room_id: selectedRoom._id, message: joinMessage };
      if (selectedRoom.status === "private" && inviteToken) payload.invite_token = inviteToken;
      const res = await fetch(`${API_URL}/room/join`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 || res.ok) {
        alert("Gửi yêu cầu thành công!");
        closeJoinModal();
        fetchRooms();
      } else {
        alert(`Lỗi: ${data.message || "Không thể tham gia."}`);
        if (data.message && (data.message.includes("đã gửi") || data.message.includes("đã là thành viên"))) {
            fetchRooms(); closeJoinModal();
        }
      }
    } catch { alert("Lỗi kết nối."); } finally { setIsSubmitting(false); }
  };

  const renderStatusBadge = (status) => {
    let color = "#334155"; let bg = "#f1f5f9"; let text = status;
    if (status === "public") { color = "#047857"; bg = "#d1fae5"; text = "Công khai"; }
    else if (status === "private") { color = "#b91c1c"; bg = "#fee2e2"; text = "Riêng tư"; }
    else if (status === "safe-mode") { color = "#b45309"; bg = "#ffedd5"; text = "Safe Mode"; }
    return <span style={{ ...styles.tag, color, backgroundColor: bg }}>{text}</span>;
  };

  const renderJoinButton = (room) => {
    const isJoined = room.members?.some(m => (typeof m === "string" ? m : m._id) === userInfo?._id);
    if (isJoined) return <button style={styles.joinedBtn} disabled>Đã tham gia</button>;
    if (room.isPending) return <button style={styles.pendingBtn} disabled>Đang chờ duyệt</button>;
    return <button style={styles.joinBtn} onClick={() => openJoinModal(room)}>Tham gia</button>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <h1 style={styles.title}>Khám phá</h1>
          <span style={styles.subTitle}>Tìm và tham gia các cộng đồng phù hợp với bạn.</span>
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button style={styles.buttonGreen} onClick={() => navigate("/user/create-room")}>
             + Tạo phòng
          </button>
          {!accessToken && <button style={styles.buttonPrimary} onClick={() => navigate("/login")}>Đăng nhập</button>}
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <SearchIcon />
          <input
            style={styles.searchInput}
            placeholder="Tìm kiếm phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={styles.filterGroup}>

          <div style={styles.selectWrapper}>
            <select style={styles.select} value={filterMembership} onChange={(e) => setFilterMembership(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="joined">Đã tham gia</option>
              <option value="pending">Chờ duyệt</option>
              <option value="not-joined">Chưa tham gia</option>
            </select>
            <ChevronDownIcon />
          </div>

          <div style={styles.selectWrapper}>
            <select style={styles.select} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="a-z">Tên (A-Z)</option>
              <option value="z-a">Tên (Z-A)</option>
            </select>
            <ChevronDownIcon />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={styles.info}>Đang tải dữ liệu...</div>
      ) : error ? (
        <div style={styles.info} style={{color: '#dc2626'}}>{error}</div>
      ) : processedRooms.length === 0 ? (
        <div style={styles.info}>
           <EmptyIcon />
           <span>Không tìm thấy phòng nào phù hợp.</span>
        </div>
      ) : (
        <div style={styles.grid}>
          {processedRooms.map((r) => (
            <div key={r._id} style={styles.card}>
              <div style={styles.cardHeader}>
                 <div style={styles.roomName}>{r.room_name}</div>
                 {renderStatusBadge(r.status)}
              </div>
              <div style={styles.roomDesc}>{r.description || "Chưa có mô tả."}</div>
              <div style={styles.meta}>
                 <UsersIcon /> <span>{r.memberNumber ?? 0} thành viên</span>
              </div>
              {renderJoinButton(r)}
            </div>
          ))}
        </div>
      )}

      {selectedRoom && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && closeJoinModal()}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Tham gia: {selectedRoom.room_name}</h3>
            <form onSubmit={handleSubmitJoin}>
              {selectedRoom.status === "private" && (
                 <div style={{marginBottom: 20}}>
                    <label style={styles.label}>Mã mời (Token)</label>
                    <input style={styles.input} type="text" placeholder="Nhập mã token..." value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} required />
                 </div>
              )}
              <div style={{marginBottom: 24}}>
                <label style={styles.label}>Lời nhắn (Tùy chọn)</label>
                <textarea style={styles.textarea} placeholder="Gửi lời chào đến quản trị viên..." value={joinMessage} onChange={(e) => setJoinMessage(e.target.value)} />
              </div>
              <div style={{display: "flex", justifyContent: "flex-end", gap: 12}}>
                <button type="button" style={styles.btnCancel} onClick={closeJoinModal} disabled={isSubmitting}>Hủy</button>
                <button type="submit" style={styles.btnConfirm} disabled={isSubmitting}>{isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}