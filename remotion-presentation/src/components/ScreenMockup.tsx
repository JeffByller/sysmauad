import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from './Badge';

export interface ScreenMockupProps {
  type: 'dashboard' | 'new-order' | 'passador-mobile' | 'finance' | 'portal';
  title: string;
  subtitle?: string;
  delay?: number;
}

export const ScreenMockup: React.FC<ScreenMockupProps> = ({
  type,
  title,
  subtitle,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const translateY = interpolate(entrance, [0, 1], [60, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.94, 1]);

  return (
    <div
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        width: '100%',
        maxWidth: type === 'passador-mobile' ? '460px' : '920px',
        backgroundColor: COLORS.bgCard,
        borderRadius: '20px',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Window Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: '#0F172A',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          <span style={{ marginLeft: '12px', fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>
            SysMauad • {type === 'passador-mobile' ? 'Mobile QR' : 'Enterprise'}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: COLORS.primaryLight, fontWeight: 600 }}>
          {type === 'portal' ? 'Portal do Cliente' : 'Sistema Operacional'}
        </div>
      </div>

      {/* Screen Body */}
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textLight }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: COLORS.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>
          <Badge
            label={type === 'passador-mobile' ? 'CHÃO DE FÁBRICA' : type === 'portal' ? 'ACESSO CLIENTE' : 'EM TEMPO REAL'}
            variant={type === 'passador-mobile' ? 'amber' : type === 'portal' ? 'violet' : 'emerald'}
          />
        </div>

        {/* Content depending on screen type */}
        {type === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ padding: '16px', backgroundColor: '#0B132B', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '13px', color: COLORS.textMuted }}>Lotes em Processo</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.primaryLight, marginTop: '4px' }}>24 OS</div>
              <div style={{ fontSize: '12px', color: COLORS.accentEmerald, marginTop: '4px' }}>▲ 100% no prazo</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#0B132B', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '13px', color: COLORS.textMuted }}>Peças Passadas Hoje</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.accentEmerald, marginTop: '4px' }}>3.840</div>
              <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>Meta: 4.000 peças</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#0B132B', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '13px', color: COLORS.textMuted }}>Faturamento Aberto</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.accentAmber, marginTop: '4px' }}>R$ 48.250</div>
              <div style={{ fontSize: '12px', color: COLORS.primaryLight, marginTop: '4px' }}>12 Clientes ativos</div>
            </div>
          </div>
        )}

        {type === 'new-order' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ padding: '12px', backgroundColor: '#0B132B', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: COLORS.textMuted }}>Peso Balança (Bruto)</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.textLight }}>452,00 kg</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0B132B', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: COLORS.textMuted }}>Tara de Caixas</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.accentRose }}>- 24,00 kg</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0B132B', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: COLORS.textMuted }}>Peso Líquido do Lote</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.accentEmerald }}>428,00 kg</div>
              </div>
            </div>
            <div style={{ padding: '14px', backgroundColor: 'rgba(56, 189, 248, 0.08)', borderRadius: '10px', border: `1px dashed ${COLORS.primaryLight}` }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.primaryLight }}>
                ⚡ Cálculo Automático de Peças: 713 Calças Jeans (Ref: 600g/peça)
              </div>
              <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>
                Receita Atribuída: Estonado Hiper Destroyed (0.3% Enzima + 1.2% Amaciante)
              </div>
            </div>
          </div>
        )}

        {type === 'passador-mobile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '130px',
                height: '130px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* QR Code Graphic Representation */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 18px)', gap: '4px' }}>
                {[1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1].map((filled, i) => (
                  <div
                    key={i}
                    style={{
                      width: '18px',
                      height: '18px',
                      backgroundColor: filled ? '#0F172A' : '#E2E8F0',
                      borderRadius: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.accentEmerald }}>OS #1042 • BIPADA COM SUCESSO</div>
              <div style={{ fontSize: '13px', color: COLORS.textMuted }}>Operador: Carlos Silva • Turno Normal</div>
            </div>
            <div style={{ width: '100%', padding: '12px', backgroundColor: '#0B132B', borderRadius: '10px', textAlign: 'center', fontWeight: 600, color: COLORS.primaryLight }}>
              +150 Peças Registradas no Lote
            </div>
          </div>
        )}

        {type === 'finance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#0B132B', borderRadius: '10px' }}>
              <span style={{ fontSize: '14px', color: COLORS.textLight }}>Cliente: Confecções Destaque Têxtil (5 OS selecionadas)</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: COLORS.accentEmerald }}>R$ 14.860,00</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, padding: '10px 14px', backgroundColor: '#0B132B', borderRadius: '8px', fontSize: '13px', color: COLORS.textMuted }}>
                Período: 01/10/2026 a 12/10/2026
              </div>
              <div style={{ padding: '10px 20px', backgroundColor: COLORS.primary, borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                ✓ Dar Baixa em Todos (1 Clique)
              </div>
            </div>
            <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
              Demonstrativo consolidado gerado automaticamente com impressão A4 limpa e envio WhatsApp.
            </div>
          </div>
        )}

        {type === 'portal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '14px', backgroundColor: '#0B132B', borderRadius: '10px', borderLeft: `4px solid ${COLORS.accentEmerald}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: COLORS.textLight, fontSize: '15px' }}>Lote #892 - Jaqueta Jeans Destroyed</span>
                <span style={{ fontSize: '12px', color: COLORS.accentEmerald, fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>Pronto p/ Entrega</span>
              </div>
              <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '6px' }}>
                480 peças conferidas • Fatura disponível para download
              </div>
            </div>
            <div style={{ padding: '14px', backgroundColor: '#0B132B', borderRadius: '10px', borderLeft: `4px solid ${COLORS.primaryLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: COLORS.textLight, fontSize: '15px' }}>Lote #904 - Calça Skinny Marmorizada</span>
                <span style={{ fontSize: '12px', color: COLORS.primaryLight, fontWeight: 600, backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>Em Passadoria</span>
              </div>
              <div style={{ fontSize: '13px', color: COLORS.textMuted, marginTop: '6px' }}>
                620 peças em processamento • Previsão: Hoje às 17h
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
