# Diretrizes e Regras do Projeto SysMauad

Este documento define os princípios, padrões de arquitetura, convenções de código e regras operacionais que devem ser rigorosamente seguidos ao manter ou evoluir o **SysMauad**.

---

## 1. Princípios de UX / UI e Filosofia de Design

1. **Simplicidade e Eliminação de Redundâncias**:
   - Evitar duplicar filtros, botões ou ações que executam a mesma finalidade na mesma tela.
   - Exemplo: Na tela Financeira, um único campo de busca e status atende tanto a visualização individual quanto a consolidada; a ação de baixa é unificada ("Dar baixa em todos") baseada nas seleções.
   - Manter títulos de documentos e relatórios concisos, focando na identificação da empresa e tipo de documento (ex: `MAUAD LAVANDERIA` seguido de `DEMONSTRATIVO CONSOLIDADO` ou `FATURA DE SERVIÇOS • [CLIENTE]`).

2. **Responsividade e Usabilidade de Chão de Fábrica**:
   - Operadores de passadoria utilizam dispositivos móveis. A interface móvel (`/passador-mobile`) deve possuir botões grandes, feedback tátil/visual imediato e suporte a leitor de QR Code.
   - O sistema principal deve ser fluido no desktop com navegação intuitiva: `Painel > Pedidos > Estoque > Peças > Clientes > Financeiro > Relatórios > Passador > Usuários`.

3. **Portal do Cliente e Sessões Públicas**:
   - O acesso ao portal do cliente é roteado via HashRouter (`#/client-portal` e `#/client-login`).
   - Evitar conflitos de cache no navegador: se o cliente efetuar logout, o token e os dados locais devem ser totalmente limpos e redirecionar para `#/client-login`.

---

## 2. Padrões de Desenvolvimento Frontend

- **Stack**: React 18, TypeScript, Vite, TailwindCSS, Lucide React Icons.
- **Roteamento**: Navegação interna por abas com sincronização com `window.location.hash` (`HashRouter` / listener de hash) para garantir compatibilidade com o proxy reverso Nginx sem rotas 404.
- **Datas e Moeda**:
  - Toda data exibida ao usuário deve usar o fuso horário oficial de Brasília (`America/Sao_Paulo`) e formato brasileiro (`DD/MM/YYYY` ou `DD/MM/YYYY às HH:mm`).
  - Valores monetários devem ser formatados via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Componentização e CSS**:
  - Priorizar classes utilitárias do TailwindCSS.
  - Não utilizar estilos inline arbitrários a menos que seja estritamente dinâmico (ex: gráficos com cálculo de percentual inline).

---

## 3. Padrões de Desenvolvimento Backend

- **Stack**: Node.js 20+, Express, TypeScript, `pg` (PostgreSQL Client Pool).
- **Tratamento de Dados**:
  - Queries SQL parametrizadas para evitar SQL Injection.
  - Nomes de tabelas e colunas em `snake_case` no PostgreSQL dentro do schema `sysmauad`.
  - Tratamento de exceções com logs estruturados na tabela `sysmauad.audit_logs` para operações administrativas e críticas.
- **Cálculo de Insumos Químicos**:
  - As receitas de lavado aplicam dosagens **percentuais sobre o peso total do lote** (ex: 0,3% de enzima, 1% de amaciante sobre os kg totais do lote de lavagem).

---

## 4. Padrões de Impressão e Relatórios Físicos

1. **Supressão de Cabeçalhos e Rodapés do Navegador**:
   - Todo documento impresso deve utilizar `@page { margin: 0; size: auto; }` no CSS global.
   - Isso elimina automaticamente as marcações nativas que os navegadores inserem (data, hora, URL do sistema e contadores `1/1`).
2. **Margens Físicas Seguras**:
   - Os elementos impressos devem receber classes `.print-sheet` ou `.print-only`, com espaçamento interno de `padding: 12mm 15mm !important` para que o conteúdo nunca encoste nas bordas físicas da folha A4.
3. **Contraste e Economia de Tinta**:
   - Fundo estritamente branco (`#ffffff !important`) e texto preto puro (`#000000 !important`).

---

## 5. Regras de Infraestrutura e Fuso Horário

1. **Fuso Horário Obrigatório (`America/Sao_Paulo`)**:
   - Todos os 5 contêineres Docker (`postgres`, `backend`, `frontend`, `evolution-api`, `nginx`) devem ter:
     - `TZ: America/Sao_Paulo`
     - Montagem de volumes de sistema: `/etc/localtime:/etc/localtime:ro` e `/etc/timezone:/etc/timezone:ro`.
   - O PostgreSQL deve manter `PGTZ: America/Sao_Paulo`.
   - Nenhuma data/hora deve divergir do horário de Brasília, garantindo que relatórios e filtros diários operem com coerência entre a aplicação e o banco de dados.
2. **Gerenciamento de Recursos**:
   - O contêiner `sysmauad-evolution` (Evolution API WhatsApp) deve manter limite de memória estrito (`mem_limit: 512m`, `--max-old-space-size=400`) e cache local em memória para evitar estouro de memória no servidor.

---

## 6. Convenções de Git e Deploy

- Branches: `main` é a branch de produção.
- Commits estruturados:
  - `feat(...)`: Novas funcionalidades.
  - `fix(...)`: Correções de bugs ou ajustes visuais.
  - `chore(...)`: Manutenção de dependências ou infraestrutura.
  - `docs(...)`: Documentação e skills.
- Após alterações em arquivos do frontend ou backend que rodam em contêineres, reconstruir os serviços afetados via `docker compose build <serviço> && docker compose up -d <serviço>`.
