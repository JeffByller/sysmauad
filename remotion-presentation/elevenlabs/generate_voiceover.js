/**
 * Script de geração automatizada de áudio para apresentação SysMauad via ElevenLabs API
 * Uso:
 *   export ELEVENLABS_API_KEY="sua_chave_aqui"
 *   node elevenlabs/generate_voiceover.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.ELEVENLABS_API_KEY;
// ID de voz padrão (ex: Rachel / Daniel / Adam)
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; 

const SCRIPT_TEXT = `No universo dinâmico da indústria têxtil e do jeanswear, a eficiência operacional define o lucro e o crescimento. Conheça o SysMauad: o sistema de gestão definitivo, projetado exclusivamente para lavanderias industriais.

Por anos, lavanderias sofreram com contagens manuais imprecisas, desperdício alarmante de químicos nas máquinas, falta de rastreabilidade na passadoria e clientes cobrando status de pedidos a todo instante.

O SysMauad transforma esse cenário. Uma plataforma completa que conecta o recebimento de fardos até a entrega final com dados em tempo real, eliminando planilhas, papéis e atritos de comunicação.

Abertura de ordens por pesagem inteligente com desconto automático da tara das caixas. Dosagem química estequiométrica calculada com precisão sobre os quilos do lote. E no chão de fábrica, operadores registram cada peça em segundos utilizando celulares com leitor de QR Code integrado.

E para as marcas parceiras: um portal de autoatendimento vinte e quatro horas para acompanhar a produção e baixar faturas, com notificações automáticas via WhatsApp a cada etapa concluída.

Mais de quarenta por cento de ganho em produtividade e controle total do seu negócio. SysMauad: a tecnologia que move a lavanderia industrial do futuro.`;

async function generateVoiceover() {
  if (!API_KEY) {
    console.warn('\n⚠️  ELEVENLABS_API_KEY não foi encontrada nas variáveis de ambiente.');
    console.log('💡 Para gerar a narração com voz de IA ultra-realista:');
    console.log('   1. Obtenha sua chave gratuita em https://elevenlabs.io');
    console.log('   2. Execute: export ELEVENLABS_API_KEY="sua_chave"');
    console.log('   3. Reexecute: node elevenlabs/generate_voiceover.js\n');
    console.log('📄 O roteiro completo está disponível em elevenlabs/script_narracao.md.');
    return;
  }

  console.log('🎙️ Solicitando geração de áudio no ElevenLabs...');
  const outputDir = path.resolve(__dirname, '../public/audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'narracao.mp3');

  const payload = JSON.stringify({
    text: SCRIPT_TEXT,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.55,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true,
    },
  });

  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${VOICE_ID}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode !== 200) {
      console.error(`❌ Erro da API ElevenLabs: Status ${res.statusCode} ${res.statusMessage}`);
      res.pipe(process.stderr);
      return;
    }

    const fileStream = fs.createWriteStream(outputPath);
    res.pipe(fileStream);

    fileStream.on('finish', () => {
      console.log(`✅ Áudio gerado com sucesso e salvo em: ${outputPath}`);
      console.log('🎬 Agora você pode executar o renderizador do Remotion com áudio integrado!');
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Erro na requisição: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

generateVoiceover();
