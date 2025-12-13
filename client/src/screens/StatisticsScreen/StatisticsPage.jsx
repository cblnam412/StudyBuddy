import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../API/api";
import { toast } from "react-toastify";
import { Button } from "../../components/Button/Button";
import styles from "./StatisticsPage.module.css";
import {
  Download,
  Users,
  MessageSquare,
  Wifi,
  CheckCircle,
} from "lucide-react";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function StatisticsPage() {
  const { accessToken } = useAuth();

  const [statsData, setStatsData] = useState({
    rooms: 0,
    usersCount: 0,
    onlineCount: 0,
    handleRate: 0,
  });

  const [otherStats, setOtherStats] = useState({
    documentCounts: 0,
    eventCount: 0,
    violationCount: 0,
    tags: 0,
  });

  const [roomRequestsStats, setRoomRequestsStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
  });

  const [documentStats, setDocumentStats] = useState({
    downloadCount: 0,
    uploadCount: 0,
  });

  const [moderatorRequestsStats, setModeratorRequestsStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [roomsByState, setRoomsByState] = useState({});
  const [usersByRole, setUsersByRole] = useState({});

  // Prepare data for MUI X Charts
  const roomsStateData = [
    { id: 0, value: roomsByState.public, label: "Public", color: "#2196F3" },
    { id: 1, value: roomsByState.private, label: "Private", color: "#1565C0" },
    {
      id: 2,
      value: roomsByState.archived,
      label: "Archived",
      color: "#0D47A1",
    },
    {
      id: 3,
      value: roomsByState["safe-mode"],
      label: "Safe mode",
      color: "#000000",
    },
  ];

  const requestStateData = [
    {
      id: 0,
      value: roomRequestsStats.approved,
      label: "Approved",
      color: "#4CAF50",
    },
    {
      id: 1,
      value: roomRequestsStats.pending,
      label: "Pending",
      color: "#FF9800",
    },
    {
      id: 2,
      value: roomRequestsStats.rejected,
      label: "Rejected",
      color: "#F44336",
    },
    {
      id: 3,
      value: roomRequestsStats.expired,
      label: "Expired",
      color: "#9E9E9E",
    },
  ];

  const userRoleData = [
    { role: "User", count: usersByRole.user },
    { role: "Moderator", count: usersByRole.moderator },
    { role: "Admin", count: usersByRole.admin },
  ];

  const documentData = [
    { name: "Upload", count: documentStats.uploadCount },
    { name: "Download", count: documentStats.downloadCount },
  ];

  const modRequestData = [
    { status: "Pending", count: moderatorRequestsStats.pending },
    { status: "Approved", count: moderatorRequestsStats.approved },
    { status: "Rejected", count: moderatorRequestsStats.rejected },
  ];

  useEffect(() => {
    if (accessToken) {
      fetchUserStats();
      fetchOnlineUsersCount();
      fetchRoomStats();
      fetchTags();
      fetchRoomRequests();
      fetchReportRatio();
      fetchReports();
      fetchEvents();
      fetchDocuments();
      fetchModeratorRequests();
    }
  }, [accessToken]);

  async function fetchUserStats() {
    try {
      const res = await fetch(`${API}/admin/get-user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setUsersByRole(data);
        const sum = data.admin + data.moderator + data.user;
        setStatsData((current) => ({ ...current, usersCount: sum }));
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê người dùng! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê người dùng ${err.message}`);
    }
  }

  async function fetchOnlineUsersCount() {
    try {
      const res = await fetch(`${API}/admin/get-user-online`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setStatsData((current) => ({
          ...current,
          onlineCount: data.onlineCount,
        }));
      } else {
        toast.warning(
          "Lỗi lấy dữ liệu thống kê người dùng trực tuyến! ",
          data.message
        );
      }
    } catch (err) {
      toast.warning(
        `Lỗi lấy dữ liệu thống kê người dùng trực tuyến! ${err.message}`
      );
    }
  }

  async function fetchRoomStats() {
    try {
      const res = await fetch(`${API}/admin/get-room`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setRoomsByState(data);
        const sum =
          data.public + data.private + data.archived + data["safe-mode"];
        setStatsData((current) => ({ ...current, rooms: sum }));
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê phòng! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê phòng ${err.message}`);
    }
  }

  async function fetchTags() {
    try {
      const res = await fetch(`${API}/tag`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setOtherStats((current) => ({ ...current, tags: data.length }));
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê tags! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê tags ${err.message}`);
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

        setRoomRequestsStats(counts);
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

  async function fetchReportRatio() {
    try {
      const res = await fetch(`${API}/admin/report-ratio`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setStatsData((current) => ({ ...current, handleRate: data.ratio }));
        setOtherStats((current) => ({
          ...current,
          violationCount: data.total,
        }));
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê tỉ lệ báo cáo! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê tỉ lệ báo cáo ${err.message}`);
    }
  }

  async function fetchReports() {
    try {
      const res = await fetch(`${API}/report`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        //console.log(data);
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê báo cáo! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê báo cáo ${err.message}`);
    }
  }

  async function fetchEvents() {
    try {
      const res = await fetch(`${API}/event`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setOtherStats((current) => ({
          ...current,
          eventCount: data.data.length,
        }));
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê sự kiện! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê sự kiện ${err.message}`);
    }
  }

  async function fetchDocuments() {
    try {
      const uploadDocRes = await fetch(`${API}/document`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const downloadDocRes = await fetch(`${API}/document/downloaded`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const uploadDocData = await uploadDocRes.json();
      const downloadDocData = await downloadDocRes.json();

      if (uploadDocRes.ok && downloadDocRes.ok) {
        setDocumentStats((current) => ({
          ...current,
          uploadCount: uploadDocData.documents.length,
        }));
        setDocumentStats((current) => ({
          ...current,
          downloadCount: downloadDocData.total_documents,
        }));
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê tài liệu! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê tài liệu ${err.message}`);
    }
  }

  async function fetchModeratorRequests() {
    try {
      const res = await fetch(
        `${API}/admin/moderator-applications?limit=10000`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const modRequestData = await res.json();

      if (!res.ok) {
        const msg = modRequestData?.message || "Unknown error";
        toast.warning(
          `Lỗi lấy dữ liệu thống kê yêu cầu thăng quyền moderator: ${msg}`
        );
        return;
      }

      const apps = Array.isArray(modRequestData.apps)
        ? modRequestData.apps
        : [];

      const stats = apps.reduce(
        (acc, app) => {
          const status = (app?.status || "").toString().toLowerCase();
          if (status === "pending") acc.pending++;
          else if (status === "approved") acc.approved++;
          else if (status === "rejected") acc.rejected++;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 }
      );

      setModeratorRequestsStats(stats);
    } catch (err) {
      toast.warning(
        `Lỗi lấy dữ liệu thống kê yêu cầu thăng quyền moderator: ${err.message}`
      );
    }
  }

  const handleExportPDF = async () => {
    try {
      toast.info("Đang tạo báo cáo PDF...");

      const element = document.querySelector(`.${styles.container}`);

      // Hide the export button temporarily
      const exportButton = document.querySelector(`.${styles.headerActions}`);
      if (exportButton) exportButton.style.visibility = "hidden";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Restore button visibility
      if (exportButton) exportButton.style.visibility = "visible";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        autoPaging: "text",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Bao_cao_thong_ke_${new Date()
        .toLocaleDateString("vi-VN")
        .replace(/\//g, "-")}.pdf`;
      pdf.save(fileName);

      toast.success("Xuất báo cáo thành công!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Lỗi khi xuất báo cáo PDF!");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <div>
          <h1 className={styles.mainTitle}>Thống kê</h1>
          <p className={styles.subtitle}>
            Xem chi tiết hoạt động và số liệu của hệ thống
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* <Button
            icon={Filter}
            originalColor="#fff"
            hooverColor="#f5f5f5"
            className={styles.filterBtn}
          >
            Lọc theo thời gian: {filterMonth}
          </Button> */}
          <Button icon={Download} onClick={handleExportPDF}>
            Xuất báo cáo
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "#2196F3" }}>
            <MessageSquare size={32} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statsData.rooms}</div>
            <div className={styles.statLabel}>Số phòng </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "#2196F3" }}>
            <Users size={32} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>
              {statsData.usersCount.toLocaleString()}
            </div>
            <div className={styles.statLabel}>Người dùng</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "#2196F3" }}>
            <Wifi size={32} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statsData.onlineCount}</div>
            <div className={styles.statLabel}>Người dùng đang online</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "#2196F3" }}>
            <CheckCircle size={32} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statsData.handleRate}%</div>
            <div className={styles.statLabel}>Tỉ lệ xử lý báo cáo</div>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Phòng theo trạng thái</h2>
          <div className={styles.chartContainer}>
            <PieChart
              series={[
                {
                  data: roomsStateData,
                  highlightScope: { faded: "global", highlighted: "item" },
                  faded: {
                    innerRadius: 30,
                    additionalRadius: -30,
                    color: "gray",
                  },
                },
              ]}
              height={300}
              slotProps={{
                legend: {
                  direction: "row",
                  position: { vertical: "bottom", horizontal: "middle" },
                  padding: 0,
                  itemmarkwidth: 12,
                  itemmarkheight: 12,
                  markgap: 5,
                  itemgap: 20,
                },
              }}
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Người dùng theo vai trò</h2>
          <div className={styles.chartContainer}>
            <BarChart
              xAxis={[
                {
                  scaleType: "band",
                  data: userRoleData.map((d) => d.role),
                  colorMap: {
                    type: "ordinal",
                    colors: ["#2196F3", "#9C27B0", "#F44336"],
                  },
                },
              ]}
              series={[
                {
                  data: userRoleData.map((d) => d.count),
                },
              ]}
              height={300}
              margin={{ top: 0, right: 50, bottom: 0, left: 50 }}
              //colors={["#2196F3", "#9C27B0", "#F44336"]}
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Thống kê tài liệu</h2>
          <div className={styles.chartContainer}>
            <BarChart
              xAxis={[
                {
                  scaleType: "band",
                  data: documentData.map((d) => d.name),
                  colorMap: {
                    type: "ordinal",
                    colors: ["#2196F3", "#4CAF50"],
                  },
                },
              ]}
              series={[
                {
                  data: documentData.map((d) => d.count),
                },
              ]}
              height={300}
              margin={{ top: 0, right: 50, bottom: 0, left: 50 }}
              //colors={["#2196F3", "#4CAF50"]}
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Yêu cầu tạo phòng</h2>
          <div className={styles.chartContainer}>
            <PieChart
              series={[
                {
                  data: requestStateData,
                  highlightScope: { faded: "global", highlighted: "item" },
                  faded: {
                    innerRadius: 30,
                    additionalRadius: -30,
                    color: "gray",
                  },
                },
              ]}
              height={300}
              slotProps={{
                legend: {
                  direction: "row",
                  position: { vertical: "bottom", horizontal: "middle" },
                  padding: 0,
                  itemmarkwidth: 12,
                  itemmarkheight: 12,
                  markgap: 5,
                  itemgap: 20,
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Thống kê yêu cầu thăng quyền moderator</h2>
          <div className={styles.chartContainer}>
            <BarChart
              xAxis={[
                {
                  scaleType: "band",
                  data: modRequestData.map((d) => d.status),
                  colorMap: {
                    type: "ordinal",
                    colors: ["#9E9E9E", "#4CAF50", "#F44336"],
                  },
                },
              ]}
              series={[
                {
                  data: modRequestData.map((d) => d.count),
                },
              ]}
              height={300}
              margin={{ top: 0, right: 50, bottom: 0, left: 50 }}
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Thống kê khác</h2>
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Số tags</span>
              <span
                className={styles.activityValue}
                style={{ color: "#9C27B0" }}
              >
                {otherStats.tags.toLocaleString()}
              </span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Sự kiện</span>
              <span
                className={styles.activityValue}
                style={{ color: "#00BCD4" }}
              >
                {otherStats.eventCount.toLocaleString()}
              </span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Báo cáo vi phạm</span>
              <span
                className={styles.activityValue}
                style={{ color: "#FF5722" }}
              >
                {otherStats.violationCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
