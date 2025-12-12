import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../API/api";
import ReportCard from "../../components/ReportCard/ReportCard";
import InfoCard from "../../components/InfoCard/InfoCard";
import { Button } from "../../components/Button/Button";
import styles from "./ManageReportPage.module.css";
import { X, Clock, AlertCircle } from "lucide-react";

const ITEMS_PER_PAGE = 10;

const STATUS_TRANSLATIONS = {
  pending: "Đã tiếp nhận",
  reviewed: "Chờ xử lý",
  dismissed: "Đã bác bỏ",
  action_taken: "Đã xử lý",
  warninged: "Đã cảnh cáo",
};

const REPORT_TYPE_TRANSLATIONS = {
  spam: "Spam",
  violated_content: "Nội dung không hợp lệ",
  infected_file: "File nhiễm độc",
  offense: "Xúc phạm",
  misuse_authority: "Lạm dụng quyền hạn",
  other: "Khác",
};

const REPORTED_ITEM_TYPE_TRANSLATIONS = {
  message: "Tin nhắn",
  document: "Tài liệu",
  user: "Người dùng",
};

export default function ManageReportPage() {
  const { accessToken } = useAuth();
  const nextPage = useRef(1);
  const maxPage = useRef(null);
  const hasFetched = useRef(false);

  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  
  const selectedReport = reports.find(
    (report) => report._id === selectedReportId
  );

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchReports();
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) {
      nextPage.current = 1;
      maxPage.current = null;
      setReports([]);
      fetchReports();
    }
  }, [statusFilter, typeFilter]);

  async function fetchReports() {
    try {
      if (maxPage.current && (nextPage.current > maxPage.current)) 
          return;

      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: nextPage.current,
        limit: ITEMS_PER_PAGE,
      });
      
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('report_type', typeFilter);

      const res = await fetch(`${API}/report?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        nextPage.current++;
        maxPage.current = data.data.pages;

        setReports((current) => {
          const existingIds = new Set(current.map(r => r._id));
          const newReports = data.data.reports.filter(r => !existingIds.has(r._id));
          return [...current, ...newReports];
        });
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê báo cáo! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê báo cáo ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const hasMorePages = maxPage.current && nextPage.current <= maxPage.current;

  const handleReject = () => {
    console.log("Từ chối báo cáo", selectedReportId);
  };

  const handleApprove = () => {
    console.log("Chấp thuận báo cáo", selectedReportId, adminNote);
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
        <div
          className={`${styles.leftColumn} ${
            selectedReport ? styles.withDetail : ""
          }`}
        >
          <h1 className={styles.pageTitle}>Danh sách báo cáo</h1>

          <div className={styles.filtersWrapper}>
            <div className={styles.filterContainer}>
              <Clock size={20} className={styles.filterIcon} color="blue"/>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_TRANSLATIONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterContainer}>
              <AlertCircle size={20} className={styles.filterIcon} color="#ef4444" />
              <select
                className={styles.filterSelect}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Tất cả loại vi phạm</option>
                {Object.entries(REPORT_TYPE_TRANSLATIONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.reportsList}>
            {reports.map((report) => (
              <ReportCard
                key={report._id}
                data={report}
                isSelected={selectedReportId === report._id}
                onClick={() => setSelectedReportId(report._id)}
              />
            ))}
            
            {hasMorePages && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <Button
                  onClick={fetchReports}
                  disabled={isLoading}
                  hooverColor="#2563eb"
                  style={{ minWidth: '150px' }}
                >
                  {isLoading ? 'Đang tải...' : 'Tải thêm'}
                </Button>
              </div>
            )}
            
            {!hasMorePages && reports.length > 0 && (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>
                Đã hiển thị tất cả báo cáo
              </p>
            )}
            
            {reports.length === 0 && !isLoading && (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                Không tìm thấy báo cáo nào
              </p>
            )}
          </div>
        </div>

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
              <div className={styles.infoCardsGrid}>
                <InfoCard
                  label="NGƯỜI BÁO CÁO"
                  name={selectedReport.reporter_id?.full_name || "N/A"}
                />
                <InfoCard
                  label="LOẠI VI PHẠM"
                  name={REPORT_TYPE_TRANSLATIONS[selectedReport.report_type] || selectedReport.report_type}
                />
              </div>

              <div className={styles.infoCardsGrid}>
                <InfoCard 
                  label="LOẠI BÁO CÁO" 
                  name={REPORTED_ITEM_TYPE_TRANSLATIONS[selectedReport.reported_item_type] || selectedReport.reported_item_type} 
                />
                <InfoCard
                  label="THỜI GIAN BÁO CÁO"
                  name={new Date(selectedReport.created_at).toLocaleDateString('vi-VN')}
                />
              </div>

              <div className={styles.contentSection}>
                <h3 className={styles.sectionTitle}>NỘI DUNG BÁO CÁO</h3>
                <p className={styles.contentText}>{selectedReport.content}</p>
              </div>

              <div className={styles.evidenceSection}>
                <h3 className={styles.sectionTitle}>BẰNG CHỨNG</h3>
                {selectedReport.proof_url ? (
                  <div className={styles.evidenceItem}>
                    <span className={styles.fileIcon}>📄</span>
                    <a href={selectedReport.proof_url} target="_blank" rel="noopener noreferrer">
                      Xem bằng chứng
                    </a>
                  </div>
                ) : (
                  <p>Không có bằng chứng</p>
                )}
              </div>

              <div className={styles.historySection}>
                <h3 className={styles.sectionTitle}>LỊCH SỬ XỬ LÝ</h3>
                <div className={styles.historyItem}>
                  <span className={styles.historyDot}></span>
                  <span className={styles.historyText}>
                    Báo cáo được tạo - {new Date(selectedReport.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {selectedReport.processing_action && (
                  <div className={styles.historyItem}>
                    <span className={styles.historyDot}></span>
                    <span className={styles.historyText}>
                      {selectedReport.processing_action}
                    </span>
                  </div>
                )}
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
