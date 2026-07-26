import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
};

const Card = ({ children, className = '', hoverable = false, ...props }: CardProps) => {
  const cardClasses = `${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`;
  
  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;
