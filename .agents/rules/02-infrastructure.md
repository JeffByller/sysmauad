# Regras de Infraestrutura, Containers e Timezone

## 1. Fuso Horário Obrigatório (America/Sao_Paulo)

- Todo contêiner Docker do stack SysMauad DEVE ter a variável de ambiente:
  ```yaml
  TZ: America/Sao_Paulo
  ```
- O contêiner de banco de dados PostgreSQL deve conter adicionalmente:
  ```yaml
  PGTZ: America/Sao_Paulo
  ```
- Os contêineres devem montar como volume de leitura do host:
  ```yaml
  volumes:
    - /etc/localtime:/etc/localtime:ro
    - /etc/timezone:/etc/timezone:ro
  ```
- Todas as datas geradas pelo backend via `new Date()`, `NOW()` no PostgreSQL ou no frontend devem estar alinhadas no horário de Brasília (UTC-3), prevenindo discrepâncias em filtros de relatórios diários ou no faturamento consolidado.

## 2. Nginx Reverse Proxy e SSL

- O Nginx é o ponto único de entrada público (`80` redirecionando para `443 SSL`).
- Certificados SSL emitidos via Certbot / Let's Encrypt em `/etc/letsencrypt`.
- Rotas de proxy:
  - `/` -> `frontend:8000` (Nginx interno do build SPA)
  - `/api/` -> `backend:3001/` (API Node.js TypeScript)
  - `/evolution/` -> `evolution-api:8080/` (WhatsApp API)
- Headers obrigatórios de encaminhamento:
  `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto https`.

## 3. Evolution API (WhatsApp) e Gestão de Memória

- A imagem `evoapicloud/evolution-api:latest` roda em modo econômico com limites de RAM explícitos:
  ```yaml
  mem_limit: 512m
  memswap_limit: 512m
  environment:
    - NODE_OPTIONS=--max-old-space-size=400
    - CACHE_REDIS_ENABLED=false
    - CACHE_LOCAL_ENABLED=true
  ```
- Isso impede que a instância de WhatsApp consuma a memória do servidor e cause reinicializações indesejadas.
