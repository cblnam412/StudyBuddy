import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../API/api";
import ReportCard from "../../components/ReportCard/ReportCard";
import InfoCard from "../../components/InfoCard/InfoCard";
import { Button } from "../../components/Button/Button";
import styles from "./ManageReportPage.module.css";
import { toast } from "react-toastify";
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
  const canFetchFilter = useRef(false);

  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportedItemContent, setReportedItemContent] = useState(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  
  const [violationLevel, setViolationLevel] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [banDays, setBanDays] = useState(90);
  const [blockedDays, setBlockedDays] = useState(7);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

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
    if (!canFetchFilter.current) {
      return;
    }
    
    nextPage.current = 1;
    maxPage.current = null;
    setReports([]);
    fetchReports();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    async function loadReportedItem() {
      if (!selectedReport) {
        setReportedItemContent(null);
        return;
      }

      setIsLoading(true);
      try {
        if (selectedReport.reported_item_type === 'message') {
          const content = await fetchMessage(selectedReport.reported_item_id);
          setReportedItemContent(content);
        } else if (selectedReport.reported_item_type === 'document') {
          const url = await fetchDocument(selectedReport.reported_item_id);
          setReportedItemContent(url);
        } else {
          setReportedItemContent(null);
        }
      } catch (error) {
        console.error('Error loading reported item:', error);
        setReportedItemContent(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadReportedItem();
  }, [selectedReportId]);

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

        console.log(data);
      } else {
        toast.warning("Lỗi lấy dữ liệu thống kê báo cáo! ", data.message);
      }
    } catch (err) {
      toast.warning(`Lỗi lấy dữ liệu thống kê báo cáo ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMessage(message_id) {
    try {
      if (!message_id) return "Không tìm thấy tin nhắn";

      const res = await fetch(`${API}/message/${message_id}/detail`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        return data.result.content || "Tin nhắn rỗng";
      } else {
        toast.warning("Lỗi lấy dữ liệu tin nhắn bị báo cáo!");
        return "Không thể tải tin nhắn";
      }
    } catch (error) {
      toast.warning("Lỗi lấy dữ liệu tin nhắn bị báo cáo!");
      return "Không thể tải tin nhắn";
    }
  }

  async function fetchDocument(document_id) {
    try {
      if (!document_id) return null;

      const res = await fetch(`${API}/document/${document_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        return data.result.file_url || null;
      } else {
        toast.warning("Lỗi lấy tài liệu bị báo cáo!");
        return null;
      }
    } catch (error) {
      toast.warning("Lỗi lấy tài liệu bị báo cáo!");
      return null;
    }
  }

  const hasMorePages = maxPage.current && nextPage.current <= maxPage.current;

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.warning("Lý do từ chối phải có ít nhất 5 ký tự");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API}/report/${selectedReportId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason: rejectReason
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success("Đã từ chối báo cáo");
        setReports(prev => prev.map(r => 
          r._id === selectedReportId 
            ? { ...r, status: 'dismissed', processing_action: `Từ chối với lý do: ${rejectReason}` }
            : r
        ));
        setShowRejectModal(false);
        setRejectReason("");
        handleCloseDetail();
      } else {
        toast.error(data.message || "Lỗi khi từ chối báo cáo");
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API}/report/${selectedReportId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        }
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success("Đã chấp thuận báo cáo");
        setReports(prev => prev.map(r => 
          r._id === selectedReportId 
            ? { ...r, status: 'reviewed' }
            : r
        ));
      } else {
        toast.error(data.message || "Lỗi khi chấp thuận báo cáo");
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!violationLevel) {
      toast.warning("Vui lòng chọn mức độ vi phạm");
      return;
    }

    if (!actionNote.trim() || actionNote.trim().length < 5) {
      toast.warning("Ghi chú xử lý phải có ít nhất 5 ký tự");
      return;
    }

    if (violationLevel == 2 && (!blockedDays || blockedDays < 1)) {
      toast.warning("Vui lòng nhập số ngày khóa tính năng hợp lệ");
      return;
    }

    if (violationLevel == 3 && (!banDays || banDays < 1)) {
      toast.warning("Vui lòng nhập số ngày ban hợp lệ");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API}/report/${selectedReportId}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          violationLevel: parseInt(violationLevel),
          actionNote: actionNote,
          ban_days: violationLevel == 3 ? parseInt(banDays) : undefined,
          blocked_days: violationLevel == 2 ? parseInt(blockedDays) : undefined
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success("Đã xử lý báo cáo thành công");
        setReports(prev => prev.map(r => 
          r._id === selectedReportId 
            ? { 
                ...r, 
                status: violationLevel == 1 ? 'warninged' : 'action_taken',
                processing_action: data.data.applied_action
              }
            : r
        ));
        setViolationLevel("");
        setActionNote("");
        setBanDays(90);
        setBlockedDays(7);
        handleCloseDetail();
      } else {
        toast.error(data.message || "Lỗi khi xử lý báo cáo");
      }
    } catch (error) {
      console.error('Process error:', error);
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
                onChange={(e) => { canFetchFilter.current = true; setStatusFilter(e.target.value)} }
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
                onChange={(e) => { canFetchFilter.current = true; setTypeFilter(e.target.value)} }
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

              {selectedReport.reported_item_type === 'message' && reportedItemContent && (
                <div className={styles.contentSection}>
                  <h3 className={styles.sectionTitle}>NỘI DUNG TIN NHẮN BỊ BÁO CÁO</h3>
                  <p className={styles.contentText}>{reportedItemContent}</p>
                </div>
              )}

              {selectedReport.reported_item_type === 'document' && reportedItemContent && (
                <div className={styles.evidenceSection}>
                  <h3 className={styles.sectionTitle}>TÀI LIỆU BỊ BÁO CÁO</h3>
                  <div className={styles.evidenceItem}>
                    <span className={styles.fileIcon}>📄</span>
                    <a href={reportedItemContent} target="_blank" rel="noopener noreferrer">
                      Xem tài liệu
                    </a>
                  </div>
                </div>
              )}

              {selectedReport.reported_item_type === 'document' && !reportedItemContent && (
                <div className={styles.evidenceSection}>
                  <h3 className={styles.sectionTitle}>TÀI LIỆU BỊ BÁO CÁO</h3>
                  <p>Không thể tải tài liệu</p>
                </div>
              )}

              <div className={styles.contentSection}>
                <h3 className={styles.sectionTitle}>NỘI DUNG BÁO CÁO</h3>
                <p className={styles.contentText}>{selectedReport.content}</p>
              </div>

              {/* <div className={styles.evidenceSection}>
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
              </div> */}

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
                        {selectedReport.status === "dismissed" ? "Từ chối với lý do: " : ""}
                        {selectedReport.processing_action.split('reason:')[1]?.trim() || selectedReport.processing_action}
                    </span>
                  </div>
                )}
              </div>

              {selectedReport.status === 'pending' && (
                <div className={styles.actionSection}>
                  <h3 className={styles.sectionTitle}>DUYỆT BÁO CÁO</h3>
                  <div className={styles.actionButtons}>
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      originalColor="white"
                      hooverColor="#EF4444"
                      disabled={isLoading}
                    >
                      Từ chối
                    </Button>
                    <Button
                      onClick={handleApprove}
                      originalColor="white"
                      hooverColor="#66ff66"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Đang xử lý...' : 'Chấp thuận'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedReport.status === 'reviewed' && (
                <div className={styles.actionSection}>
                  <h3 className={styles.sectionTitle}>XỬ LÝ VI PHẠM</h3>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Mức độ vi phạm *</label>
                    <select 
                      className={styles.formSelect}
                      value={violationLevel}
                      onChange={(e) => setViolationLevel(e.target.value)}
                    >
                      <option value="">-- Chọn mức độ --</option>
                      <option value="1">Mức 1 - Nhẹ (Giới hạn chat)</option>
                      <option value="2">Mức 2 - Trung bình (Khóa tính năng)</option>
                      <option value="3">Mức 3 - Nghiêm trọng (Ban tài khoản)</option>
                    </select>
                  </div>

                  {violationLevel == 2 && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Số ngày khóa tính năng *</label>
                      <input 
                        type="number"
                        className={styles.formInput}
                        value={blockedDays}
                        onChange={(e) => setBlockedDays(e.target.value)}
                        min="1"
                        placeholder="Nhập số ngày (mặc định: 7)"
                      />
                    </div>
                  )}

                  {violationLevel == 3 && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Số ngày ban tài khoản *</label>
                      <input 
                        type="number"
                        className={styles.formInput}
                        value={banDays}
                        onChange={(e) => setBanDays(e.target.value)}
                        min="1"
                        placeholder="Nhập số ngày (mặc định: 90)"
                      />
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ghi chú xử lý *</label>
                    <textarea 
                      className={styles.noteTextarea}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Ghi chú"
                      rows="4"
                    />
                  </div>

                  <Button
                    onClick={handleProcess}
                    originalColor="white"
                    hooverColor="#3b82f6"
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  >
                    {isLoading ? 'Đang xử lý...' : 'Xác nhận xử lý'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Từ chối báo cáo</h3>
                <Button
                  icon={X}
                  originalColor="white"
                  onClick={() => setShowRejectModal(false)}
                  hooverColor="#EF4444"
                  style={{ color: "#EF4444", width: "40px", padding: "8px" }}
                />
              </div>
              <div className={styles.modalBody}>
                <label className={styles.formLabel}>Lý do từ chối *</label>
                <textarea 
                  className={styles.noteTextarea}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do từ chối báo cáo"
                  rows="4"
                  autoFocus
                />
              </div>
              <div className={styles.modalFooter}>
                <Button
                  onClick={() => setShowRejectModal(false)}
                  originalColor="white"
                  hooverColor="#6b7280"
                  disabled={isLoading}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleReject}
                  originalColor="white"
                  hooverColor="#EF4444"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
