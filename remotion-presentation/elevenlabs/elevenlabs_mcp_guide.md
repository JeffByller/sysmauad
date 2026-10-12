# 🔌 Guia de Integração ElevenLabs via MCP (Model Context Protocol)

O **Model Context Protocol (MCP)** permite que assistentes de IA (como Claude Desktop, Claude Code, Cursor e Antigravity) executem ferramentas locais ou remotas diretamente durante a conversa, inclusive gerando arquivos de voz diretamente pelo ElevenLabs.

---

## 1. Configurando o ElevenLabs MCP Server

Existe um servidor MCP oficial e comunitário para ElevenLabs (`elevenlabs-mcp` ou via `npx`):

### Opção A: Configuração no `claude_desktop_config.json` ou `mcp_config.json`

Adicione a seção de servidores no seu arquivo de configuração MCP:

```json
{
  "mcpServers": {
    "elevenlabs": {
      "command": "npx",
      "args": ["-y", "@elevenlabs/mcp-server"],
      "env": {
        "ELEVENLABS_API_KEY": "sua_chave_da_elevenlabs_aqui"
      }
    }
  }
}
```

Ou usando o pacote Python:
```json
{
  "mcpServers": {
    "elevenlabs": {
      "command": "uvx",
      "args": ["elevenlabs-mcp"],
      "env": {
        "ELEVENLABS_API_KEY": "sua_chave_da_elevenlabs_aqui"
      }
    }
  }
}
```

---

## 2. Como Usar Diretamente no Prompt

Após reiniciar o cliente com o MCP ativo, você pode simplesmente enviar instruções em linguagem natural para a IA:

```text
"Utilize a ferramenta elevenlabs_text_to_speech para narrar o arquivo 
elevenlabs/script_narracao.md em português com a voz Rachel ou Daniel 
e salve o resultado em public/audio/narracao.mp3"
```

A IA irá invocar a ferramenta MCP do ElevenLabs, fazer o download dos bytes de áudio e salvar no diretório configurado no projeto Remotion.

---

## 3. Integração com o Remotion

Com o áudio gerado em `public/audio/narracao.mp3`, basta importar `<Audio src={staticFile("audio/narracao.mp3")} />` dentro da Composição no `Root.tsx` do Remotion para obter um vídeo com timing milimetricamente perfeito e locução de estúdio.
