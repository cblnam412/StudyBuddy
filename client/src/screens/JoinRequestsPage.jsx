import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState({}); // theo id request

  const rawToken =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("user");
  const token = rawToken ? rawToken.replaceAll('"', "").replaceAll("'", "") : null;

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/room/join-requests`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          setError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setRequests(data.requests || []);
      } catch (err) {
        console.error(err);
        setError("Không thể tải danh sách yêu cầu.");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [token]);

  const handleApprove = async (reqId) => {
    setProcessing((p) => ({ ...p, [reqId]: true }));
    try {
      const res = await fetch(`${API}/room/${reqId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Đã duyệt yêu cầu!");
        setRequests((prev) => prev.filter((r) => r._id !== reqId));
      } else {
        alert(data.message || "Không thể duyệt yêu cầu.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối.");
    } finally {
      setProcessing((p) => ({ ...p, [reqId]: false }));
    }
  };

  const handleReject = async (reqId) => {
    const reason = window.prompt("Nhập lý do từ chối (tùy chọn):");
    if (reason === null) return;
    setProcessing((p) => ({ ...p, [reqId]: true }));
    try {
      const res = await fetch(`${API}/room/${reqId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("❌ Đã từ chối yêu cầu.");
        setRequests((prev) => prev.filter((r) => r._id !== reqId));
      } else {
        alert(data.message || "Không thể từ chối yêu cầu.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối.");
    } finally {
      setProcessing((p) => ({ ...p, [reqId]: false }));
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Đang tải yêu cầu...</p>;
  if (error) return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;
  if (requests.length === 0) return <p style={{ textAlign: "center" }}>Không có yêu cầu chờ duyệt.</p>;

  return (
    <div style={{ padding: 30 }}>
      <h2>📋 Yêu cầu tham gia phòng ({requests.length})</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {requests.map((r) => (
          <li
            key={r._id}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              marginBottom: 10,
              padding: 16,
            }}
          >
            <p><b>Người gửi:</b> {r.user_id?.full_name || "Ẩn danh"}</p>
            <p><b>Phòng:</b> {r.room_id?.room_name || "Không xác định"}</p>
            {r.message && <p><b>Tin nhắn:</b> {r.message}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                onClick={() => handleApprove(r._id)}
                disabled={processing[r._id]}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                {processing[r._id] ? "Đang duyệt..." : "Duyệt"}
              </button>
              <button
                onClick={() => handleReject(r._id)}
                disabled={processing[r._id]}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                {processing[r._id] ? "Đang xử lý..." : "Từ chối"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
