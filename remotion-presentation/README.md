# 🎬 Vídeo de Apresentação SysMauad com Remotion

Projeto de vídeo programático construído em **React 18 + TypeScript** utilizando **Remotion** e as diretrizes do [Claude Remotion Skill](https://github.com/haidrrrry/claude-remotion-skill).

---

## 📐 Estrutura do Vídeo

- **Resolução**: 1920x1080 (Full HD, 16:9)
- **Taxa de Quadros**: 30 FPS
- **Duração Total**: 60 Segundos (1800 Frames)
- **Design System**: Cores corporativas SysMauad (Navy `#0A0F1D`, Sky Blue `#38BDF8`, Emerald `#10B981`, Amber `#F59E0B`, Rose `#F43F5E`)
- **Física de Animação**: Interpolações harmônicas e molas `spring({ damping: 14, stiffness: 100 })` sem cortes bruscos ou transições lineares genéricas.

### Cenas Mapeadas:
1. `Scene1Intro` (0s a 9s): Identidade visual do SysMauad e proposta de valor industrial.
2. `Scene2Problem` (9s a 18s): Os 4 maiores gargalos das lavanderias industriais (contagem manual, químicos no olhômetro, falta de rastreio, atrito com clientes).
3. `Scene3Solution` (18s a 27s): Apresentação do ERP integrado com mockup interativo do Painel Geral.
4. `Scene4Features` (27s a 42s): Demonstração das 4 grandes inovações (Pesagem por Tara, Dosagem Estequiométrica %, Passadoria Mobile com QR Code e Baixa em 1 Clique).
5. `Scene5WorkflowPortal` (42s a 51s): Portal do cliente para confecções e automação de alertas via WhatsApp.
6. `Scene6Outro` (51s a 60s): Contadores animados de métricas (+40% produtividade, -25% custos químicos, 100% rastreio) e encerramento.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ ou 20+ e npm instalados.

### 1. Instalar Dependências
```bash
cd remotion-presentation
npm install
```

### 2. Visualizar no Remotion Studio (Preview Interativo)
Inicia o player web local com depuração quadro a quadro, scrub de timeline e inspeção de componentes:
```bash
npm start
```
Acesse `http://localhost:3000` no seu navegador.

### 3. Renderizar o Vídeo Final em MP4
Para gerar o arquivo `.mp4` Full HD otimizado:
```bash
npm run build
```
O vídeo renderizado será salvo em `out/sysmauad-apresentacao.mp4`.

---

## 🎙️ Narração com IA (ElevenLabs & MCP)

Consulte a pasta `elevenlabs/`:
- `script_narracao.md`: Texto da locução frame-a-frame em português fluente.
- `generate_voiceover.js`: Script automatizado para geração via API do ElevenLabs.
- `elevenlabs_mcp_guide.md`: Guia de configuração para invocar o ElevenLabs diretamente pelo MCP no Claude / Antigravity.
