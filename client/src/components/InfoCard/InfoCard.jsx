import styles from "./InfoCard.module.css";

const InfoCard = ({ name }) => {
  return (
    <div className={styles.infoCard}>
      <h4 className={styles.labelReporter}>NGƯỜI BÁO CÁO</h4>
      <p className={styles.nameReporter}>{name}</p>
    </div>
  );
};

export default InfoCard;