import React, { useState, useEffect } from "react";
import API from "../../API/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./AdminHomeScreen.module.css";
import { toast } from "react-toastify";
import {
  CheckCircle,
  AlertCircle,
  DoorOpen,
  UserPlus,
  TrendingUp,
  Star,
  Activity,
  Filter,
  Users,
  ChevronDown,
} from "lucide-react";

const ACTION_CONFIG = {  
  restrict_activity: { 
    text: "Hạn chế hoạt động -", 
    color: "#9333ea", 
    bg: "#f3e8ff"     
  },

  ban: { 
    text: "Cấm tài khoản (Ban) -", 
    color: "#be123c", // Rose 700 
    bg: "#ffe4e6"    
  },

  restrict_chat: { text: "Khóa chat -", color: "#ea580c", bg: "#ffedd5" },

  approve_room: { text: "Duyệt phòng:", color: "#16a34a", bg: "#dcfce7" },

  approve_report: { text: "Xử lý báo cáo -", color: "#2563eb", bg: "#dbeafe" },

  reject_room: { text: "Từ chối phòng:", color: "#dc2626", bg: "#fee2e2" },
  reject_report: { text: "Từ chối tố cáo -", color: "#dc2626", bg: "#fee2e2" },

  default: { text: "Hành động khác -", color: "#4b5563", bg: "#f3f4f6" },
};

export default function AdminHomeScreen() {
  const { userInfo, accessToken, userID } = useAuth();
  const navigate = useNavigate();
  const [numberOfSolvedReports, setNumberOfSolvedReports] = useState(0);
  const [numberOfUnsolvedReports, setNumberOfUnsolvedReports] = useState(0);
  const [numberOfPendingRoomRequests, setNumberOfPendingRoomRequests] =
    useState(0);
  const [
    numberOfPendingModeratorRequests,
    setNumberOfPendingModeratorRequests,
  ] = useState(0);
  const [topContributors, setTopContributors] = useState([]);

  // Activity log states
  const [activities, setActivities] = useState([]);
  const [moderatorList, setModeratorList] = useState([]);
  const [filters, setFilters] = useState({
    type: "", // "room_request" or "report"
    moderator: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (accessToken) {
      fetchReports();
      fetchRoomRequests();
      fetchTopContributors();

      if (userInfo.system_role === "admin") {
        fetchModeratorRequests();
        fetchActivities();
        fetchModeratorList();
      }
    }
  }, [accessToken, filters]);

  async function fetchReports() {
    try {
      const res = await fetch(`${API}/report?limit=1000`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        let sumSolved = 0;
        let sumUnsolved = 0;

        const arr = data.data.reports;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].reviewer_id === userID) sumSolved++;
          if (arr[i].status === "pending" || arr[i].status === "reviewed")
            sumUnsolved++;
        }

        setNumberOfSolvedReports(sumSolved);
        setNumberOfUnsolvedReports(sumUnsolved);
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê báo cáo! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê báo cáo ${err.message}`);
    }
  }

  async function fetchRoomRequests() {
    try {
      const res = await fetch(`${API}/room-request`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        const counts = data.reduce(
          (acc, request) => {
            const status = request.status;
            if (acc.hasOwnProperty(status)) {
              acc[status]++;
            }
            return acc;
          },
          {
            pending: 0,
            approved: 0,
            rejected: 0,
            expired: 0,
          }
        );

        setNumberOfPendingRoomRequests(counts.pending);
      } else {
        toast.warning(
          "Lỗi lấy dữ liệu thống kê yêu cầu tạo phòng! ",
          data.message
        );
      }
    } catch (err) {
      toast.warning(
        `Lỗi lấy dữ liệu thống kê yêu cầu tạo phòng ${err.message}`
      );
    }
  }

  async function fetchTopContributors() {
    try {
      const res = await fetch(`${API}/user/top-reputation?limit=10`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setTopContributors(data.users || []);
      } else {
        console.log("Lỗi lấy người dùng tích cực:", data.message);
      }
    } catch (err) {
      console.error("Lỗi lấy người dùng tích cực:", err.message);
    }
  }

  async function fetchModeratorRequests() {
    try {
      const res = await fetch(`${API}/admin/moderator-applications`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        let totalPendingRequest = 0;

        const arr = data.apps;
        for (let i = 0; i < arr.length; i++)
          if (arr[i].status === "reviewed") totalPendingRequest++;

        setNumberOfPendingModeratorRequests(totalPendingRequest);
      } else {
        console.log("Lỗi lấy yêu cầu thăng quyền:", data.message);
      }
    } catch (err) {
      console.error("Lỗi lấy yêu cầu thăng quyền:", err.message);
    }
  }

  async function fetchModeratorList() {
    try {
      const res = await fetch(`${API}/admin/moderators-list`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) setModeratorList(data);
    } catch (err) {
      console.error("Error fetching moderators:", err);
    }
  }

  async function fetchActivities(page = 1, isLoadMore = false) {
    try {
      if (isLoadMore) setIsLoadingMore(true);

      let query = `limit=10&page=${page}`;
      if (filters.type) query += `&target_type=${filters.type}`;
      if (filters.moderator) query += `&moderatorId=${filters.moderator}`;

      const res = await fetch(`${API}/admin/moderator-activities?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();

      if (res.ok) {
        if (isLoadMore) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities || []);
        }
        setTotalPages(data.pages);
        setCurrentPage(data.page);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = [
    {
      label: "Số báo cáo đã duyệt",
      value: numberOfSolvedReports || 0,
      icon: CheckCircle,
      color: "#667eea",
    },
    {
      label: "Số báo cáo chưa xử lý",
      value: numberOfUnsolvedReports || 0,
      icon: AlertCircle,
      color: "#764ba2",
    },
    {
      label: "Số yêu cầu tạo phòng còn chờ",
      value: numberOfPendingRoomRequests || 0,
      icon: DoorOpen,
      color: "#f093fb",
    },
    ...(userInfo?.system_role === "admin"
      ? [
          {
            label: "Số yêu cầu thăng quyền còn chờ",
            value: numberOfPendingModeratorRequests || 0,
            icon: UserPlus,
            color: "#4facfe",
          },
        ]
      : []),
  ];

  const renderActivityContent = (act) => {
    const config = ACTION_CONFIG[act.action] || ACTION_CONFIG.default;

    let targetTitle = "";
    let metaInfo = null;

    // 1. Handle Room Requests
    if (act.target_type === "room_request" && act.room_request_id) {
      targetTitle = `${act.room_request_id.room_name}`;
      metaInfo = (
        <div
          style={{ marginTop: "4px", fontSize: "0.85rem", color: "#4b5563" }}
        >
          Lý do: {act.room_request_id.reason}
        </div>
      );
    }
    // 2. Handle Reports
    else if (act.target_type === "report" && act.report_id) {
      targetTitle = `Nội dung vi phạm: "${act.report_id.content}"`;
      metaInfo = (
        <div
          style={{ marginTop: "4px", fontSize: "0.85rem", color: "#4b5563" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "2px",
            }}
          >
            <span>Mã báo cáo:</span>
            <code
              style={{
                fontFamily: "monospace",
                background: "#f3f4f6",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "0.8rem",
              }}
            >
              {act.report_id._id}
            </code>
          </div>
          <div>Loại vi phạm: {act.report_id.report_type}</div>
        </div>
      );
    }

    return (
      <div className={styles.activityDetails}>
        <p style={{ margin: 0, wordBreak: "break-all"}}>
          <span
            style={{
              color: config.color,
              fontWeight: "bold",
              marginRight: "8px",
              whiteSpace: "nowrap",
            }}
          >
            {config.text}
          </span>
          <span className={styles.targetName}>{targetTitle}</span>
        </p>

        {metaInfo}

        {/* Hide Note/Details for room requests only */}
        {act.target_type !== "room_request" && act.details && (
          <small
            style={{
              color: "#9ca3af",
              display: "block",
              marginTop: "4px",
              fontStyle: "italic",
            }}
          >
            Ghi chú: {act.details}
          </small>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Chào mừng trở lại, {userInfo?.full_name || "Bạn"}!</h1>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <stat.icon
                  size={32}
                  className={styles.icon}
                  style={{ color: stat.color }}
                />
                <div className={styles.statInfo}>
                  <h3>{stat.value}</h3>
                  <p>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Top Contributors */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              <TrendingUp size={20} />
              Thành viên tích cực đóng góp
            </h2>
          </div>
          <div className={styles.contributorsList}>
            {topContributors.length > 0 ? (
              topContributors.map((user, index) => (
                <div key={user._id} className={styles.contributorCard}>
                  <div className={styles.rank}>{index + 1}</div>

                  <img
                    src={
                      user.avatarUrl || "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png"
                    }
                    alt={user.full_name}
                    className={styles.contributorAvatar}
                  />

                  <div className={styles.contributorInfo}>
                    <h4>{user.full_name}</h4>
                    <p>{user.reputation_score} điểm uy tín</p>
                  </div>

                  <Star size={16} className={styles.starIcon} />
                </div>
              ))
            ) : (
              <p>Chưa có dữ liệu đóng góp.</p>
            )}
          </div>
        </section>

        {userInfo?.system_role === "admin" && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>
                <Activity size={20} />
                Nhật ký hoạt động
              </h2>

              {/* Filter Controls */}
              <div className={styles.filterControls}>
                <div className={styles.selectWrapper}>
                  <Filter size={14} className={styles.leftIcon} />
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    className={styles.customSelect}
                  >
                    <option value="">Tất cả hành động</option>
                    <option value="room_request">Duyệt phòng</option>
                    <option value="report">Xử lý báo cáo</option>
                  </select>

                  <ChevronDown size={16} className={styles.rightIcon} />
                </div>

                <div className={styles.selectWrapper}>
                  <Users size={16} className={styles.leftIcon} />

                  <select
                    name="moderator"
                    value={filters.moderator}
                    onChange={handleFilterChange}
                    className={styles.customSelect}
                  >
                    <option value="">Tất cả người duyệt</option>
                    {moderatorList.map((mod) => (
                      <option key={mod._id} value={mod._id}>
                        {mod.full_name} ({mod.system_role})
                      </option>
                    ))}
                  </select>

                  <ChevronDown size={16} className={styles.rightIcon} />
                </div>
              </div>
            </div>

            <div className={styles.activityList}>
              {activities.length > 0 ? (
                <>
                  {activities.map((act) => (
                    <div key={act._id} className={styles.activityCard}>
                      {/* Moderator Info */}
                      <div className={styles.activityUser}>
                        <img
                          src={
                            act.moderator_id?.avatarUrl ||
                            `https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png`
                          }
                          alt="avatar"
                          className={styles.miniAvatar}
                        />
                        <div>
                          <h4>{act.moderator_id?.full_name || "Unknown"}</h4>
                          <span className={styles.roleTag}>
                            {act.moderator_id?.system_role}
                          </span>
                        </div>
                      </div>

                      {/* New Rendered Content */}
                      {renderActivityContent(act)}

                      {/* Date */}
                      <div className={styles.activityTime}>
                        {formatDate(act.created_at)}
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {currentPage < totalPages && (
                    <button
                      onClick={() => fetchActivities(currentPage + 1, true)}
                      disabled={isLoadingMore}
                      className={styles.loadMoreBtn}
                    >
                      {isLoadingMore ? "Đang tải..." : "Xem thêm hoạt động"}
                    </button>
                  )}
                </>
              ) : (
                <p className={styles.emptyState}>Không có hoạt động nào.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
