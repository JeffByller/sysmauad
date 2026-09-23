---
name: sysmauad-infra
description: >-
  Use this skill when managing, configuring, diagnosing, or maintaining the Docker containers, PostgreSQL database, Nginx reverse proxy, and timezones of SysMauad.
---

# SysMauad Infrastructure & Operations Runbook

Este runbook documenta a topologia e as operações de infraestrutura do sistema.

## 1. Topologia de Contêineres

| Contêiner | Imagem / Base | Porta Host | Finalidade |
|-----------|---------------|------------|------------|
| `sysmauad-postgres` | `postgres:16-alpine` | `5432:5432` | Banco relacional com schema `sysmauad` e dados de volume persistente |
| `sysmauad-evolution` | `evoapicloud/evolution-api:latest` | `8080:8080` | Gateway de WhatsApp com limite de memória de 512MB e cache local |
| `sysmauad-backend` | Node.js 20 Alpine / TS | `3001:3001` | API REST do sistema |
| `sysmauad-frontend` | Nginx Alpine (Vite Build) | `8000:8000` (interno) | SPA estático servido internamente |
| `sysmauad-nginx` | `nginx:alpine` | `80:80`, `443:443` | Reverse proxy com SSL Let's Encrypt |

## 2. Verificação de Timezone e Horário do Servidor

Para evitar anomalias em relatórios com filtros de data, todos os serviços devem estar sincronizados com o horário oficial do Brasil (`America/Sao_Paulo`):

```bash
# Validar hora do PostgreSQL
docker exec sysmauad-postgres date

# Validar hora do Backend
docker exec sysmauad-backend date

# Validar hora do Host Debian
date
```
Todas as saídas devem apontar o mesmo dia e horário com offset `-03` (Horário de Brasília).

## 3. Operações no Banco de Dados PostgreSQL

```bash
# Conectar via psql diretamente ao banco
docker exec -it sysmauad-postgres psql -U sysmauad_user -d sysmauad

# Executar backup manual do banco de dados
docker exec sysmauad-postgres pg_dump -U sysmauad_user sysmauad > /opt/sysmauad/data/backup_manual_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
cat /caminho/do/backup.sql | docker exec -i sysmauad-postgres psql -U sysmauad_user -d sysmauad
```

## 4. Manutenção do Nginx e SSL Let's Encrypt

- Configuração em `/opt/sysmauad/nginx/default.conf`.
- Certificados montados a partir de `/etc/letsencrypt/live/sysmauad.jeffgsan.com.br/`.
- Para testar e recarregar a configuração do Nginx sem parar o serviço:
  ```bash
  docker exec sysmauad-nginx nginx -t
  docker exec sysmauad-nginx nginx -s reload
  ```
