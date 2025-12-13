import React, { useState, useEffect } from "react";
import API from "../API/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, CheckCircle, Globe, Lock, Loader2, Send } from "lucide-react";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [formData, setFormData] = useState({
    roomName: "",
    description: "",
    status: "public",
  });

  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState("");
  const [loadingTags, setLoadingTags] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoadingTags(true);
        const res = await fetch(`${API}/tag`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableTags(Array.isArray(data) ? data : (data.tags || []));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, [accessToken]);

  const toggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");

      if (!formData.roomName.trim()) {
        setError("Vui lòng đặt tên cho phòng học.");
        return;
      }

      if (!formData.description.trim()) {
        setError("Vui lòng nhập mô tả cho phòng học.");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          room_name: formData.roomName,
          description: formData.description,
          tags: selectedTags,
          room_status: formData.status,
          reason: formData.description,
        };

        const res = await fetch(`${API}/room-request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Lỗi gửi yêu cầu");

        alert("Gửi yêu cầu thành công!");
        navigate("/user/explore");
      } catch (err) {
        setError(err.message || "Lỗi kết nối server.");
      } finally {
        setIsSubmitting(false);
      }
    };

  const styles = {
    wrapper: {
      position: "relative",
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px 20px",
      fontFamily: "'Inter', sans-serif",
    },
    backButtonAbs: {
      position: "absolute",
      top: "30px",
      left: "40px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      border: "none",
      background: "white",
      padding: "10px 16px",
      borderRadius: "30px",
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
      fontSize: "14px",
      fontWeight: "600",
      color: "#475569",
      cursor: "pointer",
      zIndex: 10,
      transition: "transform 0.2s",
    },
    card: {
      width: "100%",
      maxWidth: "900px",
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
      border: "1px solid #e2e8f0",
      overflow: "hidden",
    },
    header: {
      padding: "40px 0 20px 0",
      textAlign: "center",
      borderBottom: "1px solid #f1f5f9",
    },
    title: {
      fontSize: "26px",
      fontWeight: "800",
      color: "#0f172a",
      margin: "0 0 8px 0",
    },
    subtitle: {
      color: "#64748b",
      fontSize: "15px",
      margin: 0,
    },
    body: {
      padding: "40px 60px",
      display: "flex",
      flexDirection: "column",
      gap: "30px",
    },
    group: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      alignItems: "flex-start",
      width: "100%",
    },
    label: {
      fontSize: "15px",
      fontWeight: "600",
      color: "#334155",
      marginLeft: "2px",
    },

    input: {
      width: "100%",
      padding: "14px 18px",
      borderRadius: "10px",
      border: "1px solid #cbd5e1",
      fontSize: "16px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      backgroundColor: "#fff",
      boxSizing: "border-box",
      height: "52px",
    },
    textarea: {
      width: "100%",
      padding: "14px 18px",
      borderRadius: "10px",
      border: "1px solid #cbd5e1",
      fontSize: "16px",
      outline: "none",
      minHeight: "150px",
      resize: "vertical",
      backgroundColor: "#fff",
      fontFamily: "inherit",
      boxSizing: "border-box",
    },
    tagsArea: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      width: "100%",
    },
    tag: (selected) => ({
      padding: "8px 16px",
      borderRadius: "20px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      border: "1px solid",
      borderColor: selected ? "#3b82f6" : "#e2e8f0",
      backgroundColor: selected ? "#eff6ff" : "#ffffff",
      color: selected ? "#2563eb" : "#475569",
      transition: "all 0.2s",
    }),
    modeGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      width: "100%",
    },
    modeCard: (active) => ({
      padding: "20px",
      borderRadius: "12px",
      border: "2px solid",
      borderColor: active ? "#3b82f6" : "#e2e8f0",
      backgroundColor: active ? "#f0f9ff" : "#ffffff",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "8px"
    }),
    submitBtn: {
      marginTop: "10px",
      width: "100%",
      height: "54px",
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      borderRadius: "10px",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
    },
    error: {
      padding: "12px",
      backgroundColor: "#fef2f2",
      color: "#dc2626",
      borderRadius: "8px",
      fontSize: "14px",
      textAlign: "center",
      border: "1px solid #fecaca",
      width: "100%",
    }
  };

  return (
    <div style={styles.wrapper}>
      <style>{`
        .custom-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .back-btn:hover { transform: translateX(-3px); background-color: #f1f5f9; }
      `}</style>
      <button onClick={() => navigate(-1)} style={styles.backButtonAbs} className="back-btn">
        <ArrowLeft size={18} /> Quay lại
      </button>

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Tạo Phòng Mới</h1>
          <p style={styles.subtitle}>Điền thông tin để gửi yêu cầu mở phòng học nhóm.</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.group}>
            <label style={styles.label}>Tên phòng học <span style={{color: '#ef4444'}}>*</span></label>
            <input
              style={styles.input}
              className="custom-input"
              placeholder="Ví dụ: Ôn thi Đại số tuyến tính"
              value={formData.roomName}
              onChange={e => setFormData({...formData, roomName: e.target.value})}
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Mô tả chi tiết</label>
            <textarea
              style={styles.textarea}
              className="custom-input"
              placeholder="Nội dung chính, mục tiêu của nhóm học..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Chủ đề (Tags)</label>
            <div style={styles.tagsArea}>
              {loadingTags ? <p style={{color: '#94a3b8', fontSize: 14}}>Đang tải...</p> :
                availableTags.length === 0 ? <p style={{color: '#94a3b8', fontSize: 14}}>Không có tags</p> :
                availableTags.map(tag => (
                  <div
                    key={tag._id}
                    style={styles.tag(selectedTags.includes(tag._id))}
                    onClick={() => toggleTag(tag._id)}
                  >
                    {tag.tagName || tag.name}
                  </div>
                ))
              }
            </div>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Chế độ phòng</label>
            <div style={styles.modeGrid}>
              <div
                style={styles.modeCard(formData.status === 'public')}
                onClick={() => setFormData({...formData, status: 'public'})}
              >
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: 8}}>
                    <Globe size={28} color={formData.status === 'public' ? "#2563eb" : "#64748b"} />
                </div>
                <div style={{fontWeight: '700', fontSize: '16px', color: '#0f172a'}}>Công khai</div>
                <div style={{fontSize: '13px', color: '#64748b'}}>Ai cũng có thể tìm thấy</div>
                {formData.status === 'public' && <CheckCircle size={18} color="#2563eb" style={{marginTop: 5}}/>}
              </div>

              <div
                style={styles.modeCard(formData.status === 'private')}
                onClick={() => setFormData({...formData, status: 'private'})}
              >
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: 8}}>
                    <Lock size={28} color={formData.status === 'private' ? "#2563eb" : "#64748b"} />
                </div>
                <div style={{fontWeight: '700', fontSize: '16px', color: '#0f172a'}}>Riêng tư</div>
                <div style={{fontSize: '13px', color: '#64748b'}}>Chỉ thành viên được mời</div>
                {formData.status === 'private' && <CheckCircle size={18} color="#2563eb" style={{marginTop: 5}}/>}
              </div>
            </div>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="spin" /> : <>Gửi yêu cầu tạo phòng <Send size={18}/></>}
          </button>
        </form>
      </div>
    </div>
  );
}