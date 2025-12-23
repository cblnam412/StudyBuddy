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
} from "lucide-react";

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

  useEffect(() => {
    if (accessToken) {
      fetchReports();
      fetchRoomRequests();
      fetchTopContributors();

      if (userInfo.system_role === "admin") fetchModeratorRequests();
    }
  }, [accessToken]);

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
                      user.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.full_name
                      )}`
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
      </div>
    </div>
  );
}
