import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: 'circular' | 'rectangular' | 'rounded' | 'text';
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  style, 
  variant, 
  width, 
  height, 
  borderRadius 
}) => {
  let defaultBorderRadius = '4px';
  if (variant === 'circular') defaultBorderRadius = '50%';
  else if (variant === 'rectangular') defaultBorderRadius = '0px';
  else if (variant === 'rounded') defaultBorderRadius = '8px';
  else if (variant === 'text') defaultBorderRadius = '4px';

  return (
    <div 
      className={`${styles.skeleton} ${className || ''}`} 
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
        borderRadius: borderRadius !== undefined ? borderRadius : defaultBorderRadius,
        ...style
      }} 
    />
  );
};

export default Skeleton;
