import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from '../components/Badge';
import { ScreenMockup } from '../components/ScreenMockup';

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 100 },
  });

  const listSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 90 },
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        padding: '60px 100px',
        gap: '60px',
        backgroundColor: COLORS.bgDark,
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Left Column: Solution & Pillars */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '640px' }}>
        <div style={{ opacity: titleSpring }}>
          <Badge label="A Solução Proposta" variant="emerald" />
        </div>
        <h2
          style={{
            margin: '12px 0 0',
            fontSize: '52px',
            fontWeight: 800,
            color: COLORS.textLight,
            letterSpacing: '-0.02em',
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
            lineHeight: 1.15,
          }}
        >
          Gestão Inteligente & Integrada em Tempo Real
        </h2>
        <p
          style={{
            margin: '16px 0 0',
            fontSize: '20px',
            color: COLORS.textMuted,
            lineHeight: 1.5,
            opacity: titleSpring,
          }}
        >
          O <strong style={{ color: COLORS.textLight }}>SysMauad</strong> conecta o recebimento de fardos à entrega final, digitalizando cada etapa com automação inteligente.
        </p>

        {/* Pillars */}
        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            opacity: listSpring,
            transform: `translateY(${interpolate(listSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accentEmerald, fontWeight: 800 }}>✓</div>
            <div>
              <strong style={{ color: COLORS.textLight, fontSize: '18px' }}>Público-Alvo:</strong>
              <span style={{ color: COLORS.textMuted, fontSize: '16px', marginLeft: '6px' }}>Gestores de lavanderias, operadores de máquinas, passadores e confecções clientes.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primaryLight, fontWeight: 800 }}>✓</div>
            <div>
              <strong style={{ color: COLORS.textLight, fontSize: '18px' }}>Arquitetura Confiável:</strong>
              <span style={{ color: COLORS.textMuted, fontSize: '16px', marginLeft: '6px' }}>React 18, Node.js TypeScript, PostgreSQL 16 e Docker com fuso de Brasília.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accentViolet, fontWeight: 800 }}>✓</div>
            <div>
              <strong style={{ color: COLORS.textLight, fontSize: '18px' }}>Interface Limpa e Sem Atritos:</strong>
              <span style={{ color: COLORS.textMuted, fontSize: '16px', marginLeft: '6px' }}>Zero poluição visual, vocabulário natural e telas focadas em produtividade.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Mockup */}
      <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center' }}>
        <ScreenMockup
          type="dashboard"
          title="Painel de Controle em Tempo Real"
          subtitle="Visão unificada de ordens, produtividade e saúde financeira"
          delay={15}
        />
      </div>
    </div>
  );
};
