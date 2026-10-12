import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from '../components/Badge';
import { ScreenMockup } from '../components/ScreenMockup';

export const Scene5WorkflowPortal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 100 },
  });

  const contentSpring = spring({
    frame: frame - 15,
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
      {/* Left Column: Portal and WhatsApp benefits */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '620px' }}>
        <div style={{ opacity: titleSpring }}>
          <Badge label="Experiência do Cliente & Automação" variant="violet" />
        </div>
        <h2
          style={{
            margin: '12px 0 0',
            fontSize: '48px',
            fontWeight: 800,
            color: COLORS.textLight,
            letterSpacing: '-0.02em',
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
            lineHeight: 1.15,
          }}
        >
          Portal do Cliente & Alertas via WhatsApp
        </h2>
        <p
          style={{
            margin: '16px 0 0',
            fontSize: '19px',
            color: COLORS.textMuted,
            lineHeight: 1.5,
            opacity: titleSpring,
          }}
        >
          As marcas de confecção acompanham seus lotes em tempo real pelo navegador ou smartphone, sem sobrecarregar a recepção da lavanderia.
        </p>

        {/* Feature Cards */}
        <div
          style={{
            marginTop: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            opacity: contentSpring,
            transform: `translateY(${interpolate(contentSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ padding: '18px 22px', backgroundColor: COLORS.bgCard, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, color: COLORS.textLight, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔐</span> Autoatendimento Seguro 24/7
            </div>
            <div style={{ fontSize: '14px', color: COLORS.textMuted, marginTop: '4px' }}>
              Acesso exclusivo por telefone e senha com histórico de ordens e faturas baixáveis em PDF.
            </div>
          </div>

          <div style={{ padding: '18px 22px', backgroundColor: COLORS.bgCard, borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontWeight: 700, color: COLORS.accentEmerald, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💬</span> Notificações WhatsApp Automatizadas
            </div>
            <div style={{ fontSize: '14px', color: COLORS.textMuted, marginTop: '4px' }}>
              Avisos instantâneos via Evolution API: "Seu lote #1042 está pronto para faturamento e expedição".
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Portal Mockup */}
      <div style={{ flex: 1.1, display: 'flex', justifyContent: 'center' }}>
        <ScreenMockup
          type="portal"
          title="Visão da Marca Parceira"
          subtitle="Acompanhamento transparente de cada lote de produção"
          delay={15}
        />
      </div>
    </div>
  );
};
