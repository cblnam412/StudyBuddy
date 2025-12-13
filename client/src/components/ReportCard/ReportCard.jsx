import styles from "./ReportCard.module.css";
import { User, FileText, MessageCircle } from 'lucide-react';

const REPORTED_ITEM_TYPE_TRANSLATIONS = {
  message: "Tin nhắn",
  document: "Tài liệu",
  user: "Người dùng",
};

const STATUS_TRANSLATIONS = {
  pending: "Đã tiếp nhận",
  reviewed: "Chờ xử lý",
  dismissed: "Đã bác bỏ",
  action_taken: "Đã xử lý",
  warninged: "Đã cảnh cáo",
};

const ReportCard = ({ data, isSelected, onClick }) => {
  const getVariantConfig = (type) => {
    switch (type) {
      case 'user':
        return { Icon: User, label: 'Người dùng' };
      case 'document':
        return { Icon: FileText, label: 'Tài liệu' };
      case 'message':
      default:
        return { Icon: MessageCircle, label: 'Tin nhắn' };
    }
  };

  const getStatusConfig = (status) => {
    if (status === 'dismissed') {
      return styles.statusDismissed;
    }
    if (status === 'reviewed') {
      return styles.statusReviewed;
    }
    if (status === 'action_taken' || status === 'warninged') {
      return styles.statusProcessed;
    }
    return styles.statusPending;
  };

  const { Icon, label } = getVariantConfig(data.reported_item_type);
  const statusClass = getStatusConfig(data.status);
  const statusText = STATUS_TRANSLATIONS[data.status] || data.status;
  const dateText = new Date(data.created_at).toLocaleDateString('vi-VN');

  return (
    <div
      onClick={onClick}
      className={`${styles.reportCard} ${statusClass} ${
        isSelected ? styles.cardSelected : ""
      }`}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.typeContainer}>
            <Icon size={18} strokeWidth={2.5} />
            <span style={{fontSize: "1rem"}}>{label}</span>
          </div>

          <div className={styles.typeStatus}>
            <span className={styles.separator}>•</span>

            <span className={styles.statusText}>{statusText}</span>
          </div>
        </div>

        <div className={styles.date}>{dateText}</div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{data.report_type}</h3>
        <p className={styles.context}>{data.content}</p>
      </div>

      <div className={styles.footer}>
        <span>
          Báo cáo bởi:{" "}
          <span className={styles.reporterName}>
            {data.reporter_id?.full_name || "N/A"}
          </span>
        </span>
      </div>
    </div>
  );
};

export default ReportCard;