import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from '../components/Badge';

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 100 },
  });

  const subtitleSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const badgeSpring = spring({
    frame: frame - 28,
    fps,
    config: { damping: 15, mass: 0.5, stiffness: 120 },
  });

  const pulse = Math.sin(frame / 15) * 0.05 + 1;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bgDark,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, rgba(10, 15, 29, 0) 70%)',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${pulse})`,
        }}
      />

      {/* Main Logo & Badge */}
      <div
        style={{
          opacity: badgeSpring,
          transform: `scale(${badgeSpring})`,
          marginBottom: '28px',
        }}
      >
        <Badge label="Solução Industrial de Ponta a Ponta" variant="blue" />
      </div>

      {/* Hero Title */}
      <h1
        style={{
          margin: 0,
          fontSize: '92px',
          fontWeight: 900,
          color: COLORS.textLight,
          letterSpacing: '-0.03em',
          textAlign: 'center',
          transform: `translateY(${interpolate(titleSpring, [0, 1], [50, 0])}px)`,
          opacity: titleSpring,
          lineHeight: 1.05,
        }}
      >
        Sys<span style={{ color: COLORS.primaryLight }}>Mauad</span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          margin: '20px 0 0',
          fontSize: '32px',
          fontWeight: 500,
          color: COLORS.textMuted,
          textAlign: 'center',
          maxWidth: '900px',
          transform: `translateY(${interpolate(subtitleSpring, [0, 1], [30, 0])}px)`,
          opacity: subtitleSpring,
          lineHeight: 1.4,
        }}
      >
        O ERP Especializado para <span style={{ color: COLORS.textLight, fontWeight: 700 }}>Lavanderias Industriais Têxteis</span> e Beneficiamento Jeanswear
      </p>

      {/* Highlights Bar */}
      <div
        style={{
          marginTop: '60px',
          display: 'flex',
          gap: '24px',
          opacity: subtitleSpring,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textDim, fontSize: '18px' }}>
          <span style={{ color: COLORS.accentEmerald }}>●</span> Pesagem por Tara
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textDim, fontSize: '18px' }}>
          <span style={{ color: COLORS.primaryLight }}>●</span> Dosagem Química %
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textDim, fontSize: '18px' }}>
          <span style={{ color: COLORS.accentAmber }}>●</span> QR Code Mobile
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textDim, fontSize: '18px' }}>
          <span style={{ color: COLORS.accentViolet }}>●</span> Portal do Cliente
        </div>
      </div>
    </div>
  );
};
