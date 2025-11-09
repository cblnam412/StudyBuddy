import styles from "./LoadingSpinner.module.css";

export function LoadingSpinner({ label = "Đang tải..." }) {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}></div>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
