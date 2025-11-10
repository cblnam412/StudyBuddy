import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

import API from "../API/api.ts";

const styles = {
  container: { padding: 20, backgroundColor: "#f7f9fc", minHeight: "100vh", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, color: "#0f1724", margin: 0 },
  buttonPrimary: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer" },
  buttonGreen: { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer" },
  info: { textAlign: "center", color: "#6b7280", marginTop: 40 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 6px 18px rgba(20,30,50,0.04)" },
  roomName: { fontSize: 18, color: "#0f1724", marginBottom: 8 },
  roomDesc: { color: "#556", marginBottom: 12 },
  meta: { fontSize: 13, marginBottom: 12 },
  joinBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" },
  disabledBtn: { opacity: 0.6, cursor: "not-allowed" },
};

export default function ExploreRoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState({});

  const { accessToken } = useAuth();

  // 🧭 Lấy danh sách phòng public
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError("");

      if (!accessToken) {
        setError("Bạn chưa đăng nhập. Vui lòng đăng nhập để xem danh sách phòng.");
        setRooms([]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/room`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.status === 401) {
          setError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
          setRooms([]);
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error("Không thể tải danh sách phòng.");

        const data = await res.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : data.rooms || []);
      } catch (err) {
        console.error("fetchRooms error:", err);
        setError("Lỗi khi tải phòng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [accessToken]);

  // 💬 Gửi yêu cầu tham gia
  const handleJoinRoom = async (room) => {
    if (!accessToken) {
      if (window.confirm("Bạn cần đăng nhập để tham gia. Đi đến trang đăng nhập?")) {
        navigate("/login");
      }
      return;
    }

    if (room.status === "safe-mode") {
      alert("Phòng đang ở chế độ safe-mode, không thể gửi yêu cầu tham gia.");
      return;
    }

    setJoining((prev) => ({ ...prev, [room._id]: true }));

    try {
      const res = await fetch(`${API}/room/join-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ room_id: room._id }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        alert("✅ Yêu cầu tham gia đã được gửi. Vui lòng chờ leader duyệt.");
        return;
      }

      if (res.status === 403 && data.message?.toLowerCase().includes("private")) {
        const invite = window.prompt("Phòng private — nhập invite token:");
        if (!invite) return;
        const res2 = await fetch(`${API}/room/join-room`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ room_id: room._id, invite_token: invite }),
        });
        const data2 = await res2.json().catch(() => ({}));
        if (res2.ok) alert(data2.message || "Đã tham gia phòng thành công!");
        else alert(data2.message || "Không thể tham gia phòng private.");
        return;
      }

      alert(data.message || "Không thể tham gia phòng.");
    } catch (err) {
      console.error("join-room error:", err);
      alert("Không thể kết nối tới server.");
    } finally {
      setJoining((prev) => ({ ...prev, [room._id]: false }));
    }
  };

  const onCreateRoom = () => navigate("/home/create-room");
  const onLogin = () => navigate("/login");

  // 🧩 Render
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Khám phá phòng mới</h1>
        <div>
          <button style={{ ...styles.buttonGreen, marginRight: 8 }} onClick={onCreateRoom}>
            + Tạo phòng
          </button>
          <button style={styles.buttonPrimary} onClick={onLogin}>
            {accessToken ? "Đã đăng nhập" : "Đăng nhập"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.info}>Đang tải danh sách phòng...</div>
      ) : error ? (
        <div style={styles.info}>
          <div>{error}</div>
          {!accessToken && (
            <div style={{ marginTop: 12 }}>
              <button style={styles.buttonPrimary} onClick={onLogin}>
                Đến trang đăng nhập
              </button>
            </div>
          )}
        </div>
      ) : rooms.length === 0 ? (
        <div style={styles.info}>Không tìm thấy phòng nào.</div>
      ) : (
        <div style={styles.grid}>
          {rooms.map((r) => (
            <div key={r._id} style={styles.card}>
              <div style={styles.roomName}>{r.room_name}</div>
              <div style={styles.roomDesc}>{r.description || "Không có mô tả"}</div>
              <div style={styles.meta}>
                Loại: <b>{r.status}</b> • Thành viên: {r.memberNumber ?? "-"}
              </div>

              <button
                style={{
                  ...styles.joinBtn,
                  ...(joining[r._id] ? styles.disabledBtn : {}),
                }}
                onClick={() => handleJoinRoom(r)}
                disabled={joining[r._id]}
              >
                {joining[r._id] ? "Đang gửi..." : "Tham gia"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
