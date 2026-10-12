#!/usr/bin/env bash
set -e

# Navega até o diretório do script
cd "$(dirname "$0")"

echo "=========================================================="
echo "🎬 Renderizador de Vídeo SysMauad (Remotion + ElevenLabs)"
echo "=========================================================="

mkdir -p out
mkdir -p public/audio

# 1. Checagem do ElevenLabs para geração de voz
if [ -n "$ELEVENLABS_API_KEY" ]; then
    echo "🎙️ Chave ELEVENLABS_API_KEY detectada! Gerando narração com IA..."
    docker run --rm \
        -e ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY" \
        -e ELEVENLABS_VOICE_ID="${ELEVENLABS_VOICE_ID:-21m00Tcm4TlvDq8ikWAM}" \
        -v "$(pwd)":/app -w /app \
        node:20-alpine node elevenlabs/generate_voiceover.js
else
    echo "ℹ️  ELEVENLABS_API_KEY não informada."
    echo "   O vídeo será gerado com animações visuais, métricas e gráficos."
    echo "   (Para incluir voz de estúdio: ELEVENLABS_API_KEY=sua_chave ./render.sh)"
fi

echo ""
echo "📦 Construindo ambiente de renderização Docker (Node + Chromium + FFmpeg)..."
docker build -t sysmauad-remotion-renderer -f Dockerfile .

echo ""
echo "🎥 Renderizando vídeo Full HD (1920x1080 @ 30fps)..."
docker run --rm \
    -v "$(pwd)/src":/app/src \
    -v "$(pwd)/out":/app/out \
    -v "$(pwd)/public":/app/public \
    sysmauad-remotion-renderer

echo ""
echo "=========================================================="
echo "✅ Renderização concluída com sucesso!"
echo "📁 Arquivo de vídeo disponível em:"
echo "   $(pwd)/out/sysmauad-apresentacao.mp4"
echo "=========================================================="
