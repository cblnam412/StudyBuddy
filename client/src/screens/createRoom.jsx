import React, { useState, useEffect } from "react";
import API from "../API/api.ts";
import { useNavigate } from "react-router-dom";
import  { useAuth } from "../context/AuthContext.jsx";

/* ------------------ Styles (sao chép/tuỳ chỉnh nếu bạn đã có styles khác) ------------------ */
const styles = {
  container: {
    padding: 40,
    maxWidth: 800,
    margin: "0 auto",
    backgroundColor: "#ffffff",
    minHeight: "100vh",
  },
  title: {
    fontSize: 28,
    color: "#0f1724",
    marginBottom: 30,
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: 10,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: 8,
    fontWeight: "bold",
    color: "#334155",
    fontSize: 14,
  },
  input: {
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 16,
  },
  textarea: {
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 16,
    minHeight: 120,
    resize: "vertical",
  },
  radioGroup: {
    display: "flex",
    gap: 20,
  },
  radioOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  submitButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 25px",
    fontSize: 18,
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 10,
    transition: "background 0.2s ease-in-out",
  },
  backButton: {
    background: "#94a3b8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 25px",
    fontSize: 18,
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 10,
    transition: "background 0.2s ease-in-out",
    marginRight: 10,
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "flex-start",
    marginTop: 30,
  },
};

/* ------------------ Component chính ------------------ */
export default function CreateRoomPage() {
  const navigate = useNavigate();
  const {accessToken} = useAuth();

  const [formData, setFormData] = useState({
    roomName: "",
    description: "",
    status: "public",
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [error, setError] = useState("");
  const [loadingTags, setLoadingTags] = useState(true);

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

        if (!res.ok) {
          console.warn("Không lấy được tag:", res.status);
          setAvailableTags([]);
          return;
        }
        const data = await res.json();
        // Tùy response backend: data.tags hoặc data
        setAvailableTags(data.tags || data || []);
      } catch (err) {
        console.error("Lỗi fetch tag:", err);
        setAvailableTags([]);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleTagSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedTags(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.roomName || formData.roomName.length > 255) {
      setError("Tên phòng không được để trống và không vượt quá 255 ký tự.");
      return;
    }

    // Chuẩn payload theo backend
    const payload = {
      room_name: formData.roomName,
      description: formData.description || null,
      tags: selectedTags, // mảng ID
      reason: null,
      room_status: formData.status,
    };

    try {
      const res = await fetch(`${API}/room-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      // Need to revisit later
      if (res.status === 401) {
        setError("Bạn cần đăng nhập/phiên hết hạn. Chuyển tới trang đăng nhập...");
        setTimeout(() => navigate("/login"), 800);
        return;
      }

      if (!res.ok) {
        setError(result.message || "Không thể gửi yêu cầu tạo phòng.");
        return;
      }

      alert(result.message || "Yêu cầu tạo phòng đã gửi, chờ moderator duyệt.");
      navigate("/home/explore");
    } catch (err) {
      console.error("Lỗi khi gửi request:", err);
      setError("Lỗi kết nối đến máy chủ.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gửi Yêu cầu Tạo Phòng Học Nhóm Mới</h1>

      <p style={{ color: "#64748b", marginBottom: 20 }}>
        Vui lòng điền thông tin chi tiết. Yêu cầu của bạn sẽ được Moderator kiểm duyệt trước khi phòng được tạo.
      </p>

      {error && <div style={{ color: "red", marginBottom: 15 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="roomName">Tên Phòng Học (Tối đa 255 ký tự)</label>
          <input
            id="roomName"
            name="roomName"
            type="text"
            style={styles.input}
            value={formData.roomName}
            onChange={handleChange}
            placeholder="Ví dụ: Luyện thi Hóa hữu cơ"
            maxLength={255}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="description">Mô tả Phòng</label>
          <textarea
            id="description"
            name="description"
            style={styles.textarea}
            value={formData.description}
            onChange={handleChange}
            placeholder="Nêu rõ mục tiêu, nội dung và quy tắc của phòng học."
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Chọn Tags / Chủ đề</label>

          {loadingTags ? (
            <div style={{ color: "#64748b" }}>Đang tải tags...</div>
          ) : availableTags.length === 0 ? (
            <div style={{ color: "#64748b" }}>Không có tags sẵn. Bạn có thể bỏ trống.</div>
          ) : (
            <select multiple onChange={handleTagSelect} style={{ ...styles.input, height: 120 }}>
              {availableTags.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.tagName || t.tagname || t.name}
                </option>
              ))}
            </select>
          )}

          <small style={{ color: "#64748b" }}>
            Giữ Ctrl (Windows) hoặc Command (Mac) để chọn nhiều tag
          </small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Trạng thái Phòng mong muốn</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioOption}>
              <input type="radio" name="status" value="public" checked={formData.status === "public"} onChange={handleChange} />
              Public (Công khai)
            </label>
            <label style={styles.radioOption}>
              <input type="radio" name="status" value="private" checked={formData.status === "private"} onChange={handleChange} />
              Private (Riêng tư)
            </label>
          </div>
        </div>

        <div style={styles.buttonContainer}>
          <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>Quay lại</button>
          <button type="submit" style={styles.submitButton}>Gửi Yêu cầu Tạo Phòng</button>
        </div>
      </form>
    </div>
  );
}
