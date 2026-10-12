import React from 'react';
import { Composition, Sequence } from 'remotion';
import { SCENES_TIMING, VIDEO_CONFIG } from './constants';
import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Problem } from './scenes/Scene2Problem';
import { Scene3Solution } from './scenes/Scene3Solution';
import { Scene4Features } from './scenes/Scene4Features';
import { Scene5WorkflowPortal } from './scenes/Scene5WorkflowPortal';
import { Scene6Outro } from './scenes/Scene6Outro';

export const SysMauadMainVideo: React.FC = () => {
  return (
    <div style={{ flex: 1, backgroundColor: '#0A0F1D', width: '100%', height: '100%', display: 'flex' }}>
      {/* Cena 1: Abertura (0s - 9s) */}
      <Sequence
        from={SCENES_TIMING.scene1Intro.start}
        durationInFrames={SCENES_TIMING.scene1Intro.duration}
        name="1. Intro & Identidade"
      >
        <Scene1Intro />
      </Sequence>

      {/* Cena 2: O Problema (9s - 18s) */}
      <Sequence
        from={SCENES_TIMING.scene2Problem.start}
        durationInFrames={SCENES_TIMING.scene2Problem.duration}
        name="2. O Problema Identificado"
      >
        <Scene2Problem />
      </Sequence>

      {/* Cena 3: A Solução Proposta (18s - 27s) */}
      <Sequence
        from={SCENES_TIMING.scene3Solution.start}
        durationInFrames={SCENES_TIMING.scene3Solution.duration}
        name="3. Solução SysMauad ERP"
      >
        <Scene3Solution />
      </Sequence>

      {/* Cena 4: Funcionalidades & Chão de Fábrica (27s - 42s) */}
      <Sequence
        from={SCENES_TIMING.scene4Features.start}
        durationInFrames={SCENES_TIMING.scene4Features.duration}
        name="4. Funcionalidades & Telas"
      >
        <Scene4Features />
      </Sequence>

      {/* Cena 5: Portal do Cliente & WhatsApp (42s - 51s) */}
      <Sequence
        from={SCENES_TIMING.scene5WorkflowPortal.start}
        durationInFrames={SCENES_TIMING.scene5WorkflowPortal.duration}
        name="5. Portal do Cliente & Alertas"
      >
        <Scene5WorkflowPortal />
      </Sequence>

      {/* Cena 6: Resultados & Conclusão (51s - 60s) */}
      <Sequence
        from={SCENES_TIMING.scene6Outro.start}
        durationInFrames={SCENES_TIMING.scene6Outro.duration}
        name="6. Métricas & Conclusão"
      >
        <Scene6Outro />
      </Sequence>
    </div>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SysMauadPresentation"
        component={SysMauadMainVideo}
        durationInFrames={VIDEO_CONFIG.durationInFrames}
        fps={VIDEO_CONFIG.fps}
        width={VIDEO_CONFIG.width}
        height={VIDEO_CONFIG.height}
      />
    </>
  );
};
