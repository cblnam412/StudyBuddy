// client/src/screens/adminScreen.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ĐẢM BẢO ĐƯỜNG DẪN ĐÚNG
import API from "../API/api";

// --- Styles ---
const styles = {
    container: {
        padding: "24px",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
        paddingBottom: "16px",
        borderBottom: "1px solid #e2e8f0",
    },
    title: {
        fontSize: "28px",
        fontWeight: "700",
        color: "#1e293b",
        margin: 0,
    },
    userBadge: {
        backgroundColor: "#4f46e5",
        color: "white",
        padding: "8px 16px",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: "600",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        marginBottom: "32px",
    },
    card: {
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e2e8f0",
    },
    cardTitle: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "12px",
    },
    statItem: {
        backgroundColor: "#f8fafc",
        padding: "16px",
        borderRadius: "8px",
        textAlign: "center",
        border: "1px solid #e2e8f0",
    },
    statLabel: {
        fontSize: "12px",
        color: "#64748b",
        marginBottom: "4px",
        textTransform: "uppercase",
        fontWeight: "600",
        letterSpacing: "0.5px",
    },
    statValue: {
        fontSize: "24px",
        fontWeight: "700",
        color: "#1e293b",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "16px",
    },
    label: {
        fontWeight: "600",
        color: "#374151",
        fontSize: "14px",
    },
    input: {
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        backgroundColor: "white",
        transition: "all 0.2s",
    },
    select: {
        padding: "10px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        backgroundColor: "white",
    },
    button: {
        background: "#4f46e5",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
        marginRight: '8px',
    },
    buttonSecondary: {
        background: "#6b7280",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
        marginRight: '8px',
    },
    buttonDanger: {
        background: "#dc2626",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    error: {
        color: "#dc2626",
        backgroundColor: "#fef2f2",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "16px",
        fontSize: "14px",
        border: "1px solid #fecaca",
    },
    success: {
        color: "#065f46",
        backgroundColor: "#d1fae5",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "16px",
        fontSize: "14px",
        border: "1px solid #a7f3d0",
    },
    loading: {
        textAlign: "center",
        color: "#6b7280",
        padding: "20px",
        fontSize: "14px",
    },
    tagList: {
        listStyle: "none",
        padding: 0,
        marginTop: '16px',
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
    },
    tagItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white',
    },
    tagItemLast: {
        borderBottom: 'none',
    },
    tagActions: {
        display: 'flex',
        gap: '8px',
    },
    actionRow: {
        display: "flex",
        gap: "12px",
        alignItems: "flex-end",
        flexWrap: "wrap",
    }
};

// --- Component chính ---
export default function AdminScreen() {
    const navigate = useNavigate();
    const { accessToken, user: userInfo } = useAuth(); // SỬ DỤNG useAuth

    const [stats, setStats] = useState({
        users: { admin: 0, moderator: 0, user: 0 },
        online: { onlineCount: 0 },
        rooms: { public: 0, private: 0, archived: 0, "safe-mode": 0 }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // State cho Set Role
    const [userIdToSetRole, setUserIdToSetRole] = useState("");
    const [newRole, setNewRole] = useState("user");
    const [roleChangeLoading, setRoleChangeLoading] = useState(false);
    const [roleChangeError, setRoleChangeError] = useState("");
    const [roleChangeSuccess, setRoleChangeSuccess] = useState("");

    // State cho Quản lý Tags
    const [tags, setTags] = useState([]);
    const [loadingTags, setLoadingTags] = useState(false);
    const [tagError, setTagError] = useState("");
    const [newTagName, setNewTagName] = useState("");
    const [createTagLoading, setCreateTagLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef(null);

    // State cho Quản lý Room Requests
    const [roomRequests, setRoomRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // --- Fetch Dữ liệu ---
    const fetchAdminData = async () => {
        if (!accessToken) {
            setError("Chưa đăng nhập hoặc token không hợp lệ.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        setTagError("");

        try {
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken từ useAuth
            };

            console.log("Fetching admin data with token:", accessToken);
            console.log("Current user role:", userInfo?.role);

            // Tạo các promises cho API calls
            const apiPromises = [
                fetch(`${API}/admin/get-user`, { headers }),
                fetch(`${API}/admin/get-user-online`, { headers }),
                fetch(`${API}/admin/get-room`, { headers }),
                fetch(`${API}/tag`, { headers }),
            ];

            // Thêm room requests nếu user là moderator hoặc admin
            if (userInfo?.role === 'moderator' || userInfo?.role === 'admin' || true) {
                apiPromises.push(fetch(`${API}/room-request`, { headers }));
            }

            const results = await Promise.allSettled(apiPromises);

            console.log("API results:", results);

            // Xử lý kết quả stats
            const usersData = results[0].status === 'fulfilled' && results[0].value.ok
                ? await results[0].value.json()
                : { admin: 0, moderator: 0, user: 0 };

            const onlineData = results[1].status === 'fulfilled' && results[1].value.ok
                ? await results[1].value.json()
                : { onlineCount: 0 };

            const roomsData = results[2].status === 'fulfilled' && results[2].value.ok
                ? await results[2].value.json()
                : { public: 0, private: 0, archived: 0, "safe-mode": 0 };

            // Xử lý tags
            if (results[3].status === 'fulfilled' && results[3].value.ok) {
                const tagsData = await results[3].value.json();
                setTags(Array.isArray(tagsData) ? tagsData : []);
            } else {
                console.warn("Không thể tải danh sách tags");
                setTags([]);
            }

            // Xử lý room requests (chỉ cho moderator/admin)
            if (results[4] && results[4].status === 'fulfilled' && results[4].value.ok) {
                const requestsData = await results[4].value.json();
                setRoomRequests(Array.isArray(requestsData) ? requestsData : []);
            }

            // Set stats tổng hợp
            setStats({
                users: usersData,
                online: onlineData,
                rooms: roomsData
            });

        } catch (err) {
            console.error("Lỗi fetch admin data:", err);
            setError("Lỗi khi tải dữ liệu: " + err.message);
        } finally {
            setLoading(false);
            setLoadingTags(false);
            setLoadingRequests(false);
        }
    };

    // THÊM useEffect mới để fetch data khi component mount
    useEffect(() => {
        if (accessToken) {
            fetchAdminData();
        } else {
            setError("Chưa đăng nhập hoặc token không hợp lệ.");
            setLoading(false);
        }
    }, [accessToken]);

    // --- Xử lý Set Role (Chỉ cho Admin) ---
    const handleSetRole = async (e) => {
        e.preventDefault();
        if (userInfo?.role !== 'admin') {
            setRoleChangeError("Chỉ Admin mới có quyền thay đổi vai trò người dùng.");
            return;
        }

        setRoleChangeLoading(true);
        setRoleChangeError("");
        setRoleChangeSuccess("");

        if (!userIdToSetRole.trim()) {
            setRoleChangeError("Vui lòng nhập User ID.");
            setRoleChangeLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API}/admin/set-role`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken
                },
                body: JSON.stringify({ userId: userIdToSetRole, newRole }),
            });

            const data = await res.json();

            if (res.status === 401 || res.status === 403) {
                throw new Error("Bạn không có quyền thực hiện hành động này.");
            }
            if (!res.ok) {
                throw new Error(data.message || "Không thể cập nhật vai trò.");
            }

            setRoleChangeSuccess(
                data.message || `Đã cập nhật vai trò cho user ${userIdToSetRole} thành ${newRole}.`
            );
            setUserIdToSetRole("");
            fetchAdminData();
        } catch (err) {
            console.error("Lỗi set role:", err);
            setRoleChangeError(err.message || "Lỗi không xác định.");
        } finally {
            setRoleChangeLoading(false);
        }
    };

    // --- Xử lý Tạo Tag (Chỉ cho Moderator/Admin) ---
    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (userInfo?.role !== 'moderator' && userInfo?.role !== 'admin') {
            setTagError("Chỉ Moderator và Admin mới có quyền quản lý tags.");
            return;
        }

        if (!newTagName.trim()) {
            setTagError("Tên tag không được để trống.");
            return;
        }
        setCreateTagLoading(true);
        setTagError("");
        setRoleChangeSuccess("");

        try {
            const res = await fetch(`${API}/tag`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken
                },
                body: JSON.stringify({ tagName: newTagName.trim() }),
            });
            const data = await res.json();
            if (res.status === 401 || res.status === 403) {
                throw new Error("Bạn không có quyền thực hiện hành động này.");
            }
            if (!res.ok) {
                throw new Error(data.message || "Không thể tạo tag.");
            }
            setRoleChangeSuccess(data.message || "Tạo tag thành công!");
            setNewTagName("");
            fetchAdminData();
        } catch (err) {
            console.error("Lỗi tạo tag:", err);
            setTagError(err.message || "Lỗi không xác định khi tạo tag.");
        } finally {
            setCreateTagLoading(false);
        }
    };

    // --- Xử lý Import Tags (Chỉ cho Moderator/Admin) ---
    const handleImportTags = async () => {
        if (userInfo?.role !== 'moderator' && userInfo?.role !== 'admin') {
            setTagError("Chỉ Moderator và Admin mới có quyền quản lý tags.");
            return;
        }

        if (!selectedFile) {
            setTagError("Vui lòng chọn file Excel để import.");
            return;
        }
        setImportLoading(true);
        setTagError("");
        setRoleChangeSuccess("");

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const res = await fetch(`${API}/tag/import-excel`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken
                },
                body: formData,
            });
            const data = await res.json();
            if (res.status === 401 || res.status === 403) {
                throw new Error("Bạn không có quyền thực hiện hành động này.");
            }
            if (!res.ok) {
                throw new Error(data.message || "Import tags thất bại.");
            }

            let successMsg = data.message || "Import thành công!";
            if (data.created?.length > 0) successMsg += ` Đã tạo ${data.created.length} tags.`;
            if (data.skipped?.length > 0) successMsg += ` Bỏ qua ${data.skipped.length} tags đã tồn tại.`;
            if (data.invalid?.length > 0) successMsg += ` Có ${data.invalid.length} tags không hợp lệ.`;

            setRoleChangeSuccess(successMsg);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            fetchAdminData();
        } catch (err) {
            console.error("Lỗi import tags:", err);
            setTagError(err.message || "Lỗi không xác định khi import tags.");
        } finally {
            setImportLoading(false);
        }
    };

    // --- Xử lý Xóa Tag (Chỉ cho Moderator/Admin) ---
    const handleDeleteTag = async (tagId, tagName) => {
        if (userInfo?.role !== 'moderator' && userInfo?.role !== 'admin') {
            setTagError("Chỉ Moderator và Admin mới có quyền quản lý tags.");
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa tag "${tagName}" không?`)) {
            return;
        }
        setTagError("");
        setRoleChangeSuccess("");

        try {
            const res = await fetch(`${API}/tag/${tagId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken
                },
            });
            const data = await res.json();
            if (res.status === 401 || res.status === 403) {
                throw new Error("Bạn không có quyền thực hiện hành động này.");
            }
            if (!res.ok) {
                throw new Error(data.message || "Không thể xóa tag.");
            }
            setRoleChangeSuccess(data.message || `Đã xóa tag "${tagName}".`);
            fetchAdminData();
        } catch (err) {
            console.error("Lỗi xóa tag:", err);
            setTagError(err.message || "Lỗi không xác định khi xóa tag.");
        }
    };

    // --- Xử lý Room Requests (Chỉ cho Moderator/Admin) ---
    const handleApproveRequest = async (requestId) => {
        if (!window.confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) {
            return;
        }

        try {
            const res = await fetch(`${API}/room-request/${requestId}/approve`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken
                },
            });

            if (!res.ok) throw new Error("Không thể duyệt yêu cầu");
            setRoleChangeSuccess("Đã duyệt yêu cầu tạo phòng!");
            fetchAdminData();
        } catch (err) {
            console.error("Lỗi duyệt yêu cầu:", err);
            setRoleChangeError("Lỗi khi duyệt yêu cầu: " + err.message);
        }
    };

    const handleRejectRequest = async (requestId) => {
        if (!window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) {
            return;
        }

        try {
            const res = await fetch(`${API}/room-request/${requestId}/reject`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`, // SỬ DỤNG accessToken
                },
            });

            if (!res.ok) throw new Error("Không thể từ chối yêu cầu");
            setRoleChangeSuccess("Đã từ chối yêu cầu tạo phòng!");
            fetchAdminData();
        } catch (err) {
            console.error("Lỗi từ chối yêu cầu:", err);
            setRoleChangeError("Lỗi khi từ chối yêu cầu: " + err.message);
        }
    };

    // --- Render Helper ---
    const renderStatItem = (label, value) => (
        <div style={styles.statItem}>
            <div style={styles.statLabel}>{label}</div>
            <div style={styles.statValue}>{value !== null && value !== undefined ? value : "0"}</div>
        </div>
    );

    // Nếu chưa đăng nhập
    if (!accessToken) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>
                    Bạn chưa đăng nhập. Vui lòng <a href="/login" style={{ color: '#4f46e5', textDecoration: 'underline' }}>đăng nhập</a> để tiếp tục.
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>Admin Dashboard</h1>
                {userInfo && (
                    <div style={styles.userBadge}>
                        {userInfo.role?.toUpperCase()} • {userInfo.email || "User"}
                    </div>
                )}
            </div>

            {loading && <div style={styles.loading}>Đang tải dữ liệu...</div>}
            {error && <div style={styles.error}>{error}</div>}

            {!loading && (
                <div style={styles.grid}>
                    {/* Thống kê chung */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>📊 Thống kê chung</h2>
                        <div style={styles.statsGrid}>
                            {renderStatItem("Online Users", stats.online?.onlineCount)}
                            {renderStatItem("Admin", stats.users?.admin)}
                            {renderStatItem("Moderator", stats.users?.moderator)}
                            {renderStatItem("User", stats.users?.user)}
                            {renderStatItem("Public Rooms", stats.rooms?.public)}
                            {renderStatItem("Private Rooms", stats.rooms?.private)}
                            {renderStatItem("Archived Rooms", stats.rooms?.archived)}
                            {renderStatItem("Safe Mode", stats.rooms?.["safe-mode"])}
                        </div>
                    </div>

                    {/* Set Role - Chỉ hiện cho Admin */}
                    {(userInfo?.role === 'admin' || true) && (
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>👑 Thay đổi vai trò</h2>
                            {roleChangeError && <div style={styles.error}>{roleChangeError}</div>}
                            {roleChangeSuccess && <div style={styles.success}>{roleChangeSuccess}</div>}

                            <form onSubmit={handleSetRole}>
                                <div style={styles.actionRow}>
                                    <div style={{ ...styles.formGroup, flex: 2 }}>
                                        <label style={styles.label}>User ID:</label>
                                        <input
                                            type="text"
                                            value={userIdToSetRole}
                                            onChange={(e) => setUserIdToSetRole(e.target.value)}
                                            style={styles.input}
                                            placeholder="Nhập User ID"
                                            required
                                        />
                                    </div>
                                    <div style={{ ...styles.formGroup, flex: 1 }}>
                                        <label style={styles.label}>Vai trò:</label>
                                        <select
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            style={styles.select}
                                        >
                                            <option value="user">User</option>
                                            <option value="moderator">Moderator</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        style={styles.button}
                                        disabled={roleChangeLoading}
                                    >
                                        {roleChangeLoading ? "Đang xử lý..." : "Cập nhật"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Room Requests - Chỉ hiện cho Moderator/Admin */}
                    {(userInfo?.role === 'moderator' || userInfo?.role === 'admin' || true) && (
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>📨 Yêu cầu tạo phòng ({roomRequests.length})</h2>
                            {loadingRequests ? (
                                <div style={styles.loading}>Đang tải yêu cầu...</div>
                            ) : roomRequests.length === 0 ? (
                                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>Không có yêu cầu nào đang chờ xử lý.</p>
                            ) : (
                                <div style={styles.tagList}>
                                    {roomRequests.map((request, index) => (
                                        <div key={request._id} style={{
                                            ...styles.tagItem,
                                            ...(index === roomRequests.length - 1 ? styles.tagItemLast : {})
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ display: 'block', marginBottom: '4px' }}>{request.room_name}</strong>
                                                <small style={{ color: '#6b7280', display: 'block' }}>
                                                    Người yêu cầu: {request.requester_id?.email || "Unknown"}
                                                </small>
                                                <small style={{ color: '#6b7280' }}>
                                                    Trạng thái: {request.room_status} • {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                                                </small>
                                            </div>
                                            <div style={styles.tagActions}>
                                                <button
                                                    onClick={() => handleApproveRequest(request._id)}
                                                    style={styles.button}
                                                >
                                                    Duyệt
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(request._id)}
                                                    style={styles.buttonDanger}
                                                >
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quản lý Tags - Chỉ hiện cho Moderator/Admin */}
                    {(userInfo?.role === 'moderator' || userInfo?.role === 'admin' || true) && (
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>🏷️ Quản lý Tags</h2>
                            {tagError && <div style={styles.error}>{tagError}</div>}
                            {roleChangeSuccess && <div style={styles.success}>{roleChangeSuccess}</div>}

                            {/* Tạo tag mới */}
                            <form onSubmit={handleCreateTag} style={{ marginBottom: '20px' }}>
                                <div style={styles.actionRow}>
                                    <div style={{ ...styles.formGroup, flex: 1 }}>
                                        <label style={styles.label}>Tên tag mới:</label>
                                        <input
                                            type="text"
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            style={styles.input}
                                            placeholder="javascript, react, ..."
                                            maxLength={10}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={styles.button}
                                        disabled={createTagLoading}
                                    >
                                        {createTagLoading ? "Đang xử lý..." : "Thêm Tag"}
                                    </button>
                                </div>
                                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                                    Tối đa 10 ký tự, chỉ gồm a-z, 0-9, -, _
                                </small>
                            </form>

                            {/* Import tags */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={styles.actionRow}>
                                    <div style={{ ...styles.formGroup, flex: 1 }}>
                                        <label style={styles.label}>Import từ Excel:</label>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            accept=".xlsx"
                                            style={{ ...styles.input, padding: '8px' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleImportTags}
                                        style={styles.buttonSecondary}
                                        disabled={importLoading || !selectedFile}
                                    >
                                        {importLoading ? "Đang import..." : "Import"}
                                    </button>
                                </div>
                            </div>

                            {/* Danh sách tags */}
                            <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '12px' }}>
                                Danh sách Tags ({tags.length})
                            </h3>
                            {loadingTags ? (
                                <div style={styles.loading}>Đang tải tags...</div>
                            ) : tags.length === 0 ? (
                                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>Chưa có tag nào.</p>
                            ) : (
                                <ul style={styles.tagList}>
                                    {tags.map((tag, index) => (
                                        <li key={tag._id} style={{
                                            ...styles.tagItem,
                                            ...(index === tags.length - 1 ? styles.tagItemLast : {})
                                        }}>
                                            <span style={{ fontWeight: '500' }}>{tag.tagName}</span>
                                            <button
                                                onClick={() => handleDeleteTag(tag._id, tag.tagName)}
                                                style={styles.buttonDanger}
                                            >
                                                Xóa
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}