# Regras de Impressão e Relatórios Físicos

## 1. Supressão Global de Metadados do Navegador

- Ao imprimir documentos industriais (ordens de serviço, receitas de lavado, relatórios diários de passadoria e extratos de faturamento), o navegador não deve imprimir data/hora automática no cabeçalho ou URLs no rodapé (`https://sysmauad... 1/1`).
- Essa supressão é garantida pela regra CSS global em `frontend/src/index.css`:
  ```css
  @page {
    margin: 0;
    size: auto;
  }
  @media print {
    @page {
      margin: 0;
      size: auto;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
    }
  }
  ```

## 2. Margens Físicas Seguras e Classes de Impressão

- Como o `@page { margin: 0; }` remove as margens da página, os elementos impressos DEVEM aplicar espaçamento interno via padding para evitar que o conteúdo encoste nas bordas do papel:
  - Usar a classe `.print-sheet` ou `.print-only` nos contêineres raiz de impressão.
  - Essas classes aplicam:
    ```css
    padding: 12mm 15mm !important;
    ```
- Os elementos exclusivos de tela recebem `.no-print` para serem ocultados na impressão.

## 3. Padrão de Cabeçalho dos Documentos

- Título principal limpo: `MAUAD LAVANDERIA` em caixa alta e negrito (`text-xl font-black uppercase`).
- Subtítulo objetivo:
  - Demonstrativo geral: `DEMONSTRATIVO CONSOLIDADO`.
  - Fatura de cliente específico: `FATURA DE SERVIÇOS • [NOME DO CLIENTE]`.
  - Ordem de serviço: `ORDEM DE SERVIÇO • OS-XXXX`.
  - Ficha de lavado: `RECEITA / FICHA DO LAVADO`.
- Bloco lateral direito: Data de emissão e período de apuração em formato monoespaçado legível.
- Não incluir slogans ou textos longos como "Controle Operacional & Processamento Têxtil Especializado" para preservar a clareza e economia visual do documento.
