import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeStatus = 'default' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = {
  children: ReactNode;
  status?: BadgeStatus;
  className?: string;
};

const Badge = ({ children, status = 'default', className = '' }: BadgeProps) => {
  const badgeClasses = `${styles.badge} ${styles[status]} ${className}`;
  
  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
};

export default Badge;
