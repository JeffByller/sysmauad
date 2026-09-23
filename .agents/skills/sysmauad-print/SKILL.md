---
name: sysmauad-print
description: >-
  Use this skill when designing, adjusting, or creating printable layouts, PDF exports, thermal receipts, or A4 sheets for SysMauad without browser header/footer artifacts.
---

# SysMauad Printing & Document Export Standards

Este documento padroniza a geração de documentos impressos e relatórios para a operação de lavanderia.

## 1. Regra de Ouro da Impressão no SysMauad

Nenhum documento impresso gerado pelo sistema deve conter o cabeçalho automático do navegador (com data, hora e título do documento) ou o rodapé automático (com URL `https://sysmauad...` e contagem `1/1`).

Para garantir isso:
1. `frontend/src/index.css` define `@page { margin: 0; size: auto; }`.
2. O contêiner pai que envolve o conteúdo imprimível DEVE ter a classe `.print-sheet` ou `.print-only`.
3. Essas classes utilizam `padding: 12mm 15mm !important` para criar a margem de segurança física do papel sem acionar os cabeçalhos do navegador.

## 2. Tipos de Documentos Suportados

1. **Demonstrativo Financeiro Consolidado / Fatura** ([`FinanceCaixaView.tsx`](file:///opt/sysmauad/frontend/src/views/FinanceCaixaView.tsx)):
   - Cabeçalho objetivo: `MAUAD LAVANDERIA` | `DEMONSTRATIVO CONSOLIDADO` ou `FATURA DE SERVIÇOS • [NOME DO CLIENTE]`.
   - Período apurado e data/hora de emissão.
   - Tabela consolidada com OS, datas, peças, tipo de lavado, valor unitário e total.
   - Resumo financeiro com valor total bruto, descontos e valor líquido a pagar.

2. **Nota de Entrada da OS** ([`OrderPrintView.tsx`](file:///opt/sysmauad/frontend/src/views/OrderPrintView.tsx)):
   - Dados do cliente, data de entrada, pesagem total, peso de referência e peças estimadas.
   - Tipos de vestuário e processos selecionados.

3. **Ficha Técnica do Lavado / Receita Química** ([`OrderPrintView.tsx`](file:///opt/sysmauad/frontend/src/views/OrderPrintView.tsx)):
   - Fases da lavagem (Desengomagem, Estonagem, Alvejamento, Amaciar) com a dosagem calculada em gramas/kg de cada insumo químico.

4. **Relatório de Produção da Passadoria** ([`PassadorReportView.tsx`](file:///opt/sysmauad/frontend/src/views/PassadorReportView.tsx)):
   - Fechamento de produção por dia/semana/mês por operador/passador com total de peças e comissões.
