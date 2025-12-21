import React from "react";
import styles from "./Button.module.css";

export const Button = ({ 
  children, 
  onClick, 
  type = "button", 
  style, 
  className = "",
  align = "center",
  fontSize,
  originalColor,
  hooverColor,
  padding, 
  ...props 
}) => {
  
  const alignmentClass = align === "left" ? styles.left : "";

  const dynamicStyle = {
    "--btn-font-size": fontSize, 
    "--original-color": originalColor,
    "--hoover-color": hooverColor,
    "--btn-padding": padding,
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
        {children}
      </span>
    </button>
  );
};