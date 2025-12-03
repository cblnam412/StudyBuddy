import React, { useState, useEffect } from "react";
import API from "../../API/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./UserHomeScreen.module.css";
import { toast } from "react-toastify";
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  Star,
  Calendar,
  Download,
  Upload,
} from "lucide-react";

export function UserHomeScreen() {
  const { userInfo, accessToken } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(null);

  useEffect(() => {
    if (accessToken) 
    {
      fetchRoomNumber();
      fetchEvents();
    }
  }, [accessToken]);

  async function fetchRoomNumber() {
    try {
      const res = await fetch(`${API}/room/my`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        if (data.rooms.length > 0) {
          setNumberOfRooms(data.rooms.length);
        }
      } else {
        toast.warning("Lỗi lấy dữ liệu phòng! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu phòng ${err.message}`);
    }
  }

  async function fetchEvents() {
    try {
      const params = new URLSearchParams({
        registered_by: "me",
        status: "upcoming",
      });

      const res = await fetch(`${API}/event?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setUpcomingEvents(data.data);
      } else {
        console.log("Fail", data.message || res.statusText);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function formatCustomDate(isoString) {
  const date = new Date(isoString);

  // Check if date is invalid
  if (isNaN(date.getTime())) return "Invalid Date";

  // Extract parts and pad with leading zeros
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();

  // Return formatted string: hh:mm dd/mm/yyyy
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

  const stats = [
    {
      label: "Phòng đã tham gia",
      value: numberOfRooms,
      icon: Users,
      color: "#667eea",
    },
    {
      label: "Số ngày đăng nhập liên tiếp",
      value: userInfo?.streak_count || 0,
      icon: FileText,
      color: "#764ba2",
    },
    {
      label: "Tài liệu đã tải",
      value: userInfo?.solved_questions || 0,
      icon: Download,
      color: "#f093fb",
    },
    {
      label: "Tài liệu đã đóng góp",
      value: userInfo?.study_hours || 0,
      icon: Upload,
      color: "#4facfe",
    },
  ];

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Chào mừng trở lại, {userInfo?.full_name || "Bạn"}!</h1>
          <p>Sẵn sàng học tập cùng cộng đồng hôm nay chưa?</p>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <stat.icon size={32} style={{ color: stat.color }} />
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
        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Upcoming Events */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>
                <Calendar size={20} /> Sự kiện sắp tới
              </h2>
            </div>
            <div className={styles.eventsList}>
              {(upcomingEvents && upcomingEvents.length != 0) ? 
              (upcomingEvents.map((event) => (
                <div key={event._id} className={styles.eventCard}>
                  <div className={styles.eventTime}>
                    <Clock size={16} />
                    <span>{formatCustomDate(event.start_time)}</span>
                  </div>
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                </div>))) : <p>Bạn không có sự kiện nào sắp diễn ra!</p> }
             
            </div>
          </section>

          {/* Top Contributors */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>
                <TrendingUp size={20} />
                Thành viên tích cực đóng góp
              </h2>
            </div>
            <div className={styles.contributorsList}>
              {[1, 2, 3].map((rank) => (
                <div key={rank} className={styles.contributorCard}>
                  <div className={styles.rank}>{rank}</div>
                  <img
                    src={`https://ui-avatars.com/api/?name=User${rank}&background=random`}
                    alt={`User ${rank}`}
                    className={styles.contributorAvatar}
                  />
                  <div className={styles.contributorInfo}>
                    <h4>Người dùng {rank}</h4>
                    <p>{100 - rank * 10} điểm uy tín</p>
                  </div>
                  <Star size={16} className={styles.starIcon} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
