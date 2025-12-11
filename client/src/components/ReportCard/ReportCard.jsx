import styles from "./ReportCard.module.css";
import { User, FileText, MessageCircle } from 'lucide-react';
import { User as UserIcon } from 'lucide-react';

const ReportCard = ({ data, isSelected, onClick }) => {
  const getVariantConfig = (type) => {
    switch (type) {
      case 'user':
        return { Icon: User, label: 'User' };
      case 'files':
        return { Icon: FileText, label: 'Files' };
      case 'messages':
      default:
        return { Icon: MessageCircle, label: 'Chat' };
    }
  };

  const getStatusConfig = (status) => {
    if (status === 'Đã xử lý') {
      return styles.statusProcessed;
    }
    return styles.statusPending;
  };

  const { Icon, label } = getVariantConfig(data.type);
  const statusClass = getStatusConfig(data.status);

  return (
    <div
      onClick={onClick}
      className={`${styles.reportCard} ${statusClass} ${isSelected ? styles.cardSelected : ''}`}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.typeContainer}>
            <Icon size={18} strokeWidth={2.5} />
            <span>{label}</span>
          </div>
          
          <span className={styles.separator}>•</span>
          
          <span className={styles.statusText}>
            {data.status}
          </span>
        </div>

        <div className={styles.date}>{data.date}</div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{data.title}</h3>
        <p className={styles.context}>{data.context}</p>
      </div>

      <div className={styles.footer}>
        <UserIcon size={14} className={styles.reporterIcon} />
        <span>Báo cáo bởi: <span className={styles.reporterName}>{data.reporter}</span></span>
      </div>
    </div>
  );
};

export default ReportCard;