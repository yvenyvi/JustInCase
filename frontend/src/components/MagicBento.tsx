import React, { useRef, useEffect, useState, type ReactNode } from 'react';
import styles from './MagicBento.module.css';

interface MagicBentoCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  spotlightRadius?: number;
  enableTilt?: boolean;
}

export const MagicBentoCard: React.FC<MagicBentoCardProps> = ({
  children,
  className = '',
  glowColor = '252, 163, 17',
  spotlightRadius = 280,
  enableTilt = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--glow-x', `${x}px`);
      card.style.setProperty('--glow-y', `${y}px`);

      if (enableTilt) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((centerY - y) / rect.height) * 8;
        const rotateY = ((x - centerX) / rect.width) * 8;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      }
    };

    const handleMouseLeave = () => {
      card.style.transform = '';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enableTilt]);

  return (
    <div
      ref={cardRef}
      className={`${styles.magicCard} ${className}`}
      style={{
        '--glow-color': glowColor,
        '--glow-radius': `${spotlightRadius}px`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default MagicBentoCard;
