import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from '../components/Badge';
import { MetricCounter } from '../components/MetricCounter';

export const Scene6Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 100 },
  });

  const ctaSpring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 100px',
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
          width: '900px',
          height: '900px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(10, 15, 29, 0) 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div style={{ opacity: titleSpring, marginBottom: '16px' }}>
        <Badge label="Resultados Comprovados" variant="emerald" />
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: '56px',
          fontWeight: 900,
          color: COLORS.textLight,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
          opacity: titleSpring,
        }}
      >
        Transformando a Indústria Têxtil
      </h2>

      {/* 3 Key Metrics */}
      <div
        style={{
          marginTop: '45px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          width: '100%',
          maxWidth: '1100px',
        }}
      >
        <MetricCounter
          value={40}
          suffix="%"
          prefix="+"
          label="Aumento na velocidade de fluxo e passadoria"
          startFrame={10}
          durationFrames={40}
          color={COLORS.primaryLight}
        />
        <MetricCounter
          value={25}
          suffix="%"
          prefix="-"
          label="Economia em insumos químicos pesados"
          startFrame={18}
          durationFrames={40}
          color={COLORS.accentEmerald}
        />
        <MetricCounter
          value={100}
          suffix="%"
          label="Rastreabilidade e faturamento sem desvios"
          startFrame={26}
          durationFrames={40}
          color={COLORS.accentAmber}
        />
      </div>

      {/* Final Call to Action */}
      <div
        style={{
          marginTop: '50px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: ctaSpring,
          transform: `translateY(${interpolate(ctaSpring, [0, 1], [25, 0])}px)`,
        }}
      >
        <div style={{ fontSize: '26px', fontWeight: 800, color: COLORS.textLight }}>
          Sys<span style={{ color: COLORS.primaryLight }}>Mauad</span> • Eficiência que gera resultado
        </div>
        <div style={{ fontSize: '16px', color: COLORS.textMuted, marginTop: '8px' }}>
          Tecnologia sob medida para o polo industrial de confecções
        </div>
      </div>
    </div>
  );
};
