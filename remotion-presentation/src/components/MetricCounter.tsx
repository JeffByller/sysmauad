import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS } from '../constants';

interface MetricCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  startFrame?: number;
  durationFrames?: number;
  decimals?: number;
  color?: string;
}

export const MetricCounter: React.FC<MetricCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  label,
  startFrame = 0,
  durationFrames = 45,
  decimals = 0,
  color = COLORS.primaryLight,
}) => {
  const frame = useCurrentFrame();

  const currentNumber = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, value],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const formatted = decimals > 0 ? currentNumber.toFixed(decimals) : Math.round(currentNumber).toLocaleString('pt-BR');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 32px',
        backgroundColor: COLORS.bgCard,
        borderRadius: '16px',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          fontSize: '44px',
          fontWeight: 800,
          color: color,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1.1,
        }}
      >
        {prefix}{formatted}{suffix}
      </div>
      <div
        style={{
          marginTop: '8px',
          fontSize: '16px',
          color: COLORS.textMuted,
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  );
};
