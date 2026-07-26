import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
};

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: Icon,
  ...props 
}: ButtonProps) => {
  const btnClasses = `${styles.button} ${styles[variant]} ${styles[size]} ${className}`;
  
  return (
    <button className={btnClasses} {...props}>
      {Icon && <Icon size={18} className={styles.icon} />}
      {children}
    </button>
  );
};

export default Button;
