---
name: sysmauad-dev
description: >-
  Use this skill when developing, testing, refactoring, or building the frontend and backend of the SysMauad application.
---

# SysMauad Development Workflow

Este guia fornece os procedimentos passo a passo para desenvolvimento, compilação e teste no SysMauad.

## 1. Arquitetura dos Diretórios de Código

- `backend/src/`
  - `server.ts`: Endpoints REST Express, controle de autenticação JWT/senhas, lógica de faturamento, integração Evolution API e rotas de auditoria.
  - `db.ts`: Pool de conexão PostgreSQL, inicialização das tabelas no schema `sysmauad`, migrações automáticas e seeds de dados.
  - `security.ts`: Utilitários de hash, sanitização e middleware de controle de acessos.
  - `types.ts`: Tipos TypeScript compartilhados de modelos de dados de lavanderia.
- `frontend/src/`
  - `App.tsx`: Gerenciador de abas e sincronização de hash (`#/client-portal`, `#/client-login`).
  - `components/`: Componentes reutilizáveis (Navbar com navegação atualizada, modais de WhatsApp e QR Scanner).
  - `views/`: Telas de cada módulo (Dashboard, Orders, Stock, GarmentCatalog, Clients, FinanceCaixaView, PassadorReportView, PassadorMobileView, etc.).
  - `index.css`: TailwindCSS e regras globais de `@page { margin: 0; }` para impressão.

## 2. Comandos de Compilação e Rebuild de Contêineres

Sempre que alterar código de frontend ou backend em ambiente Dockerizado:

```bash
# Rebuild apenas do frontend (rápido com Vite)
docker compose build frontend && docker compose up -d frontend

# Rebuild apenas do backend
docker compose build backend && docker compose up -d backend

# Rebuild de toda a stack sem interrupção desnecessária
docker compose up -d --build
```

## 3. Verificação de Logs e Diagnóstico

```bash
# Logs do backend em tempo real
docker logs -f --tail 100 sysmauad-backend

# Logs do frontend (Nginx interno)
docker logs -f --tail 50 sysmauad-frontend

# Logs do WhatsApp (Evolution API)
docker logs -f --tail 50 sysmauad-evolution
```

## 4. Boas Práticas ao Adicionar Funcionalidades

1. **UX Intuitiva**: Não adicione botões redundantes. Se já existe uma pesquisa rápida na tabela, reutilize-a em vez de criar múltiplos botões de filtro.
2. **Hash Navigation**: Se criar uma nova tela pública ou compartilhável, adicione o mapeamento de hash em `frontend/src/App.tsx` e garanta que o logout limpe o hash para evitar problemas de cache.
3. **Persistência de Dados**: Sempre que um status de OS for alterado, ou uma baixa for executada, registre a data/hora respeitando o fuso horário de Brasília (`America/Sao_Paulo`).
