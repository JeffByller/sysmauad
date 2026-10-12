import React from 'react';
import { COLORS } from '../constants';

interface BadgeProps {
  label: string;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'blue', style }) => {
  const getColors = () => {
    switch (variant) {
      case 'emerald':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: COLORS.accentEmerald, border: 'rgba(16, 185, 129, 0.3)' };
      case 'amber':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: COLORS.accentAmber, border: 'rgba(245, 158, 11, 0.3)' };
      case 'rose':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: COLORS.accentRose, border: 'rgba(244, 63, 94, 0.3)' };
      case 'violet':
        return { bg: 'rgba(139, 92, 246, 0.15)', text: COLORS.accentViolet, border: 'rgba(139, 92, 246, 0.3)' };
      case 'blue':
      default:
        return { bg: 'rgba(56, 189, 248, 0.15)', text: COLORS.primaryLight, border: 'rgba(56, 189, 248, 0.3)' };
    }
  };

  const colors = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 16px',
        borderRadius: '9999px',
        fontSize: '15px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        ...style,
      }}
    >
      {label}
    </span>
  );
};
