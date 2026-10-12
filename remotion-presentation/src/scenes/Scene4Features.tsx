import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from '../components/Badge';
import { ScreenMockup } from '../components/ScreenMockup';

export const Scene4Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Switch between Feature Sub-scenes:
  // 0 - 225 frames (first 7.5s): Weighing & Chemicals
  // 225 - 450 frames (next 7.5s): Mobile QR & Consolidated Finance
  const isSecondHalf = frame >= 225;
  const subFrame = isSecondHalf ? frame - 225 : frame;

  const animSpring = spring({
    frame: subFrame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 100 },
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '50px 100px',
        backgroundColor: COLORS.bgDark,
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Badge
            label={isSecondHalf ? 'Chão de Fábrica & Caixa' : 'Engenharia de Produção & Pesagem'}
            variant={isSecondHalf ? 'amber' : 'blue'}
          />
          <h2
            style={{
              margin: '8px 0 0',
              fontSize: '44px',
              fontWeight: 800,
              color: COLORS.textLight,
              letterSpacing: '-0.02em',
            }}
          >
            {isSecondHalf ? 'Passadoria Mobile & Financeiro Consolidado' : 'Pesagem com Tara & Dosagem Estequiométrica'}
          </h2>
        </div>
        <div style={{ fontSize: '16px', color: COLORS.textMuted, fontWeight: 600 }}>
          {isSecondHalf ? 'Fase 2 de 2' : 'Fase 1 de 2'}
        </div>
      </div>

      {/* Main Feature Display */}
      <div
        style={{
          marginTop: '36px',
          display: 'flex',
          gap: '50px',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: animSpring,
          transform: `translateY(${interpolate(animSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        {!isSecondHalf ? (
          <>
            {/* Feature 1 & 2 Text Description */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '24px', backgroundColor: COLORS.bgCard, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.primaryLight, marginBottom: '6px' }}>
                  ⚖️ Pesagem com Tara & Contagem Precisa
                </div>
                <p style={{ margin: 0, fontSize: '15px', color: COLORS.textMuted, lineHeight: 1.5 }}>
                  Basta colocar o fardo na balança: o sistema abate a tara das caixas e estima com exatidão a quantidade de calças, shorts ou jaquetas pela gramatura de referência.
                </p>
              </div>

              <div style={{ padding: '24px', backgroundColor: COLORS.bgCard, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.accentEmerald, marginBottom: '6px' }}>
                  🧪 Dosagem Química Estequiométrica (%)
                </div>
                <p style={{ margin: 0, fontSize: '15px', color: COLORS.textMuted, lineHeight: 1.5 }}>
                  As receitas aplicam percentuais exatos sobre o peso líquido do lote. Elimina o desperdício de enzimas, amaciantes e resinas, reduzindo custos em até 25%.
                </p>
              </div>
            </div>

            {/* Feature Mockup */}
            <div style={{ flex: 1.2 }}>
              <ScreenMockup
                type="new-order"
                title="Abertura de OS & Cálculo de Lote"
                subtitle="Estimativa instantânea de peças e dosagem química vinculada"
              />
            </div>
          </>
        ) : (
          <>
            {/* Feature 3 & 4 Text Description */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '24px', backgroundColor: COLORS.bgCard, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.accentAmber, marginBottom: '6px' }}>
                  📱 Passador Mobile com Câmera QR Code
                </div>
                <p style={{ margin: 0, fontSize: '15px', color: COLORS.textMuted, lineHeight: 1.5 }}>
                  Operadores no galpão usam smartphones para bipar a etiqueta da OS em 1 segundo. Rastreia produtividade por operador e turno sem anotações em papel.
                </p>
              </div>

              <div style={{ padding: '24px', backgroundColor: COLORS.bgCard, borderRadius: '16px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.accentViolet, marginBottom: '6px' }}>
                  💳 Faturamento & Baixa em 1 Clique
                </div>
                <p style={{ margin: 0, fontSize: '15px', color: COLORS.textMuted, lineHeight: 1.5 }}>
                  Liquida todas as OS de um cliente com o botão "Dar baixa em todos", gerando recibo consolidado sem itens redundantes e cálculo automático de descontos.
                </p>
              </div>
            </div>

            {/* Feature Mockup */}
            <div style={{ flex: 1.2, display: 'flex', justifyContent: 'center' }}>
              <ScreenMockup
                type="passador-mobile"
                title="Terminal de Passadoria"
                subtitle="Feedback instantâneo e registro em tempo real"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
