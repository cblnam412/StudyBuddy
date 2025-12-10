import { useState } from "react";
import ReportCard from "../../components/ReportCard/ReportCard";
import InfoCard from "../../components/InfoCard/InfoCard";
import SearchInput from "../../components/SearchInput/SearchInput";
import { Button } from "../../components/Button/Button";
import styles from "./ManageReportPage.module.css";
import { X } from "lucide-react";

export default function ManageReportPage() {
  const reports = [
    {
      id: 1,
      type: "chat",
      status: "Chờ xử lý",
      date: "2024-12-05 14:30",
      title: "Nội dung chat không phù hợp",
      context: "General Chat",
      reporter: "Nguyễn A",
      reportedUser: "Trần B",
      room: "General Chat",
      content: "Nội dung chat không phù hợp",
    },
    {
      id: 2,
      type: "file",
      status: "Chờ xử lý",
      date: "2024-12-05 13:15",
      title: "Chia sẻ file trái phép",
      context: "Work Space",
      reporter: "Lê C",
      reportedUser: "Phạm D",
      room: "Work Space",
      content: "File vi phạm bản quyền",
    },
    {
      id: 3,
      type: "user",
      status: "Đã xử lý",
      date: "2024-12-05 11:00",
      title: "Hành vi quấy rối",
      context: "Community",
      reporter: "Hoàng E",
      reportedUser: "Võ F",
      room: "Community",
      content: "Hành vi quấy rối người dùng khác",
    },
  ];

  const [selectedReportId, setSelectedReportId] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const selectedReport = reports.find(
    (report) => report.id === selectedReportId
  );

  const handleReject = () => {
    console.log("Từ chối báo cáo", selectedReportId);
    // Handle reject logic
  };

  const handleApprove = () => {
    console.log("Chấp thuận báo cáo", selectedReportId, adminNote);
    // Handle approve logic
  };

  const handleCloseDetail = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setSelectedReportId(null);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Left Column - Always visible */}
        <div
          className={`${styles.leftColumn} ${
            selectedReport ? styles.withDetail : ""
          }`}
        >
          <h1 className={styles.pageTitle}>Danh sách báo cáo</h1>

          <div className={styles.searchWrapper}>
            <SearchInput />
          </div>

          <div className={styles.reportsList}>
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                data={report}
                isSelected={selectedReportId === report.id}
                onClick={() => setSelectedReportId(report.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Column - Only visible when report selected */}
        {selectedReport && (
          <div
            className={`${styles.rightColumn} ${
              isAnimating ? styles.slideOut : styles.slideIn
            }`}
          >
            <div className={styles.detailHeader}>
              <h2 className={styles.detailTitle}>Chi tiết báo cáo</h2>
              <Button
                icon={X}
                originalColor="white"
                onClick={handleCloseDetail}
                hooverColor="#EF4444"
                style={{ color: "#EF4444", width: "5%"}}
              >
              </Button>
            </div>

            <div className={styles.detailContent}>
              <div className={styles.reportId}>ID: {selectedReport.id}</div>

              <div className={styles.infoCardsGrid}>
                <InfoCard
                  label="NGƯỜI BÁO CÁO"
                  name={selectedReport.reporter}
                />
                <InfoCard
                  label="NGƯỜI BỊ BÁO CÁO"
                  name={selectedReport.reportedUser}
                />
              </div>

              <div className={styles.infoCardsGrid}>
                <InfoCard label="PHÒNG LIÊN QUAN" name={selectedReport.room} />
                <InfoCard
                  label="THỜI GIAN BÁO CÁO"
                  name={selectedReport.date}
                />
              </div>

              <div className={styles.contentSection}>
                <h3 className={styles.sectionTitle}>NỘI DUNG BÁO CÁO</h3>
                <p className={styles.contentText}>{selectedReport.content}</p>
              </div>

              <div className={styles.evidenceSection}>
                <h3 className={styles.sectionTitle}>BẰNG CHỨNG</h3>
                <div className={styles.evidenceItem}>
                  <span className={styles.fileIcon}>📄</span>
                  <span>Message 1</span>
                  <button className={styles.deleteBtn}>🗑️</button>
                </div>
                <div className={styles.evidenceItem}>
                  <span className={styles.fileIcon}>📄</span>
                  <span>Message 2</span>
                  <button className={styles.deleteBtn}>🗑️</button>
                </div>
              </div>

              <div className={styles.noteSection}>
                <h3 className={styles.sectionTitle}>GHI CHÚ XỬ LÝ</h3>
                <textarea
                  className={styles.noteTextarea}
                  placeholder="Nhập ghi chú về hành động xử lý..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={4}
                />
              </div>

              <div className={styles.historySection}>
                <h3 className={styles.sectionTitle}>LỊCH SỬ XỬ LÝ</h3>
                <div className={styles.historyItem}>
                  <span className={styles.historyDot}></span>
                  <span className={styles.historyText}>
                    Báo cáo được tạo - {selectedReport.date}
                  </span>
                </div>
              </div>

              <div className={styles.actionSection}>
                <h3 className={styles.sectionTitle}>DUYỆT BÁO CÁO</h3>
                <div className={styles.actionButtons}>
                  <Button
                    onClick={handleReject}
                    originalColor="white"
                    hooverColor="#EF4444"
                  >
                    Từ chối
                  </Button>
                  <Button
                    onClick={handleApprove}
                    originalColor="white"
                    hooverColor="#66ff66"
                  >
                    Chấp thuận
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
