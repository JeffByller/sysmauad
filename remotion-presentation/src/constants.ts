export const VIDEO_CONFIG = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 1800, // 60 seconds at 30 fps
};

export const COLORS = {
  bgDark: '#0A0F1D',
  bgCard: '#111827',
  bgCardHover: '#1F2937',
  border: '#1E293B',
  primary: '#0284C7', // SysMauad Blue
  primaryLight: '#38BDF8',
  primaryGlow: 'rgba(56, 189, 248, 0.25)',
  accentEmerald: '#10B981',
  accentAmber: '#F59E0B',
  accentRose: '#F43F5E',
  accentViolet: '#8B5CF6',
  textLight: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
};

export const SCENES_TIMING = {
  scene1Intro: { start: 0, duration: 270 }, // 0s - 9s (Intro)
  scene2Problem: { start: 270, duration: 270 }, // 9s - 18s (O Problema)
  scene3Solution: { start: 540, duration: 270 }, // 18s - 27s (A Solução)
  scene4Features: { start: 810, duration: 450 }, // 27s - 42s (Funcionalidades & Telas)
  scene5Workflow: { start: 1260, duration: 270 }, // 42s - 51s (Fluxo & Portal)
  scene5WorkflowPortal: { start: 1260, duration: 270 }, // 42s - 51s (Fluxo & Portal)
  scene6Outro: { start: 1530, duration: 270 }, // 51s - 60s (Resultados & Conclusão)
};
