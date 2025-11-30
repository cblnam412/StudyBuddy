import React from "react";
import styles from "./Button.module.css";

export const Button = ({ 
  children, 
  onClick, 
  type = "button", 
  style, 
  icon: Icon, 
  className = "",
  align = "center",
  fontSize,
  originalColor,
  hooverColor, 
  ...props 
}) => {
  
  const alignmentClass = align === "left" ? styles.left : "";

  const dynamicStyle = {
    "--btn-font-size": fontSize, 
    "--original-color": originalColor,
    "--hoover-color": hooverColor,
    ...style, 
  };
  
  return (
    <button
      type={type}
      className={`${styles.btn} ${alignmentClass} ${className}`}
      style={dynamicStyle}
      onClick={onClick}
      {...props}
    >
      <span className={styles.label}>
        {Icon && <Icon className={styles.icon} size={24} />}
        {children}
      </span>
    </button>
  );
};