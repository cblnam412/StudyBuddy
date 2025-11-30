import React from "react";
import styles from "./IconButton.module.css";

export const IconButton = ({ icon: Icon, children, onClick, style, ...props }) => {
  return (
    <button 
      className={styles.btn} 
      onClick={onClick} 
      style={style}
      {...props}
    >
      <div className={styles.iconWrapper}>
        {Icon && <Icon size={32} strokeWidth={2} />}
      </div>
      
      <span className={styles.label}>{children}</span>
    </button>
  );
};