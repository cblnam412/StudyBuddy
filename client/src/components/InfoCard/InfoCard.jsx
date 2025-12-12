import styles from "./InfoCard.module.css";

const InfoCard = ({ label, name }) => {
  return (
    <div className={styles.infoCard}>
      <h4 className={styles.labelReporter}>{label}</h4>
      <p className={styles.nameReporter}>{name}</p>
    </div>
  );
};

export default InfoCard;