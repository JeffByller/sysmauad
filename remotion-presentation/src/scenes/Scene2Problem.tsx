import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../constants';
import { Badge } from '../components/Badge';

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 100 },
  });

  const problems = [
    {
      title: 'Contagem Manual Falha',
      desc: 'Milhares de peças recebidas em sacos e fardos; conferência manual gera atrasos e divergências de estoque.',
      tag: 'Gargalo Operacional',
      delay: 15,
    },
    {
      title: 'Desperdício de Insumos Químicos',
      desc: 'Dosagem no "olhômetro" nas máquinas de lavar, sem cálculo exato sobre o peso real do lote.',
      tag: 'Alto Custo',
      delay: 30,
    },
    {
      title: 'Chão de Fábrica Sem Rastreio',
      desc: 'Falta de controle na passadoria, sem métricas individuais de produtividade e rendimento de turnos.',
      tag: 'Baixa Eficiência',
      delay: 45,
    },
    {
      title: 'Fricção e Insegurança com Clientes',
      desc: 'Confecções cobrando prazos no WhatsApp sem visibilidade do status das ordens e faturas desorganizadas.',
      tag: 'Atrito Comercial',
      delay: 60,
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 100px',
        backgroundColor: COLORS.bgDark,
        position: 'relative',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ opacity: titleSpring }}>
          <Badge label="O Desafio do Polo Têxtil" variant="rose" />
        </div>
        <h2
          style={{
            margin: '8px 0 0',
            fontSize: '52px',
            fontWeight: 800,
            color: COLORS.textLight,
            letterSpacing: '-0.02em',
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
          }}
        >
          O Problema Identificado
        </h2>
        <p style={{ margin: 0, fontSize: '20px', color: COLORS.textMuted }}>
          Lavanderias industriais enfrentam dores críticas no controle de ponta a ponta:
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div
        style={{
          marginTop: '45px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
        }}
      >
        {problems.map((prob, index) => {
          const cardSpring = spring({
            frame: frame - prob.delay,
            fps,
            config: { damping: 14, mass: 0.7, stiffness: 90 },
          });

          return (
            <div
              key={index}
              style={{
                padding: '28px 32px',
                backgroundColor: COLORS.bgCard,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                borderLeft: `5px solid ${COLORS.accentRose}`,
                transform: `translateY(${interpolate(cardSpring, [0, 1], [40, 0])}px)`,
                opacity: cardSpring,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: COLORS.accentRose, fontWeight: 700, textTransform: 'uppercase' }}>
                  {prob.tag}
                </span>
                <span style={{ fontSize: '18px', color: COLORS.textDim, fontWeight: 800 }}>
                  0{index + 1}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: COLORS.textLight }}>
                {prob.title}
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: '16px', color: COLORS.textMuted, lineHeight: 1.5 }}>
                {prob.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
