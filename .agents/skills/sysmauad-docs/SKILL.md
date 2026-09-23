---
name: sysmauad-docs
description: >-
  Use this skill when updating system documentation, documenting industrial laundry workflows, logging architectural decisions, or updating the SysMauad README.
---

# SysMauad Documentation & Architecture Knowledge Base

Este guia estabelece os padrões para documentar novas regras de negócio da lavanderia e manter a documentação do projeto atualizada.

## 1. Glossário de Domínio da Lavanderia Industrial

- **OS (Ordem de Serviço)**: Registro de entrada de um lote de confecção com número sequencial (`OS-0001`), cliente, peso total na balança, peso de referência de uma peça e quantidade estimada de peças.
- **Processo / Lavado**: Tratamento químico e mecânico dado ao tecido (ex: *Amaciado*, *Alvejado*, *Hiper Destroyed*, *Hiper Destroyed no Pó*).
- **Receita Química**: Composição de fases químicas (Desengomagem, Estonagem, Alvejamento, Neutralização, Amaciamento). Cada fase tem produtos com dosagem expressa em **porcentagem do peso total do lote** (ex: 0,3% de Enzima, 1% de Desengomante).
- **Passadoria**: Etapa de finalização onde passadores registram a quantidade de peças passadas associadas à OS.
- **Baixa Unificada**: Liquidação financeira em lote de várias OS pertencentes ao mesmo período/cliente em uma única transação, gerando demonstrativo consolidado.

## 2. Padrão de Atualização do README.md

Ao implementar novos módulos ou alterar o fluxo de usuário:
1. Atualizar a seção de **Módulos do Sistema** no `README.md`.
2. Documentar eventuais novas rotas de API em `backend/src/server.ts`.
3. Se novas variáveis de ambiente forem criadas, adicionar ao `.env.example` e na tabela de variáveis do `README.md`.
4. Manter o changelog ou histórico de versões sucinto e focado no valor entregue ao cliente.
