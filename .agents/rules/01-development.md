# Regras de Desenvolvimento (Frontend & Backend)

## 1. Frontend (React 18 + Vite + TailwindCSS)

- **TypeScript Estrito**: Tipar todas as props de componentes, respostas de API e payloads de estado (`interface` ou `type` explícitos em `frontend/src/types/`).
- **Navegação & Roteamento**:
  - A aplicação utiliza arquitetura baseada em abas sincronizadas com Hash (`window.location.hash`).
  - Telas públicas/clientes devem usar hashes específicos: `#/client-login`, `#/client-signup`, `#/client-portal`.
  - Ao alternar para o painel administrativo, limpar hashes residuais de telas públicas usando `history.replaceState` para evitar reaberturas acidentais após logout.
  - Tratar sessões de cliente de forma isolada: dados em `localStorage` devem ser limpos no logout do portal.
- **Padrões de UI**:
  - Evitar duplicações de filtros e botões. Se um campo de busca textual e um dropdown de status já filtram a tabela (ex: Financeiro), não adicionar botões redundantes de "Filtrar por Cliente".
  - Agrupamentos de ações em lote devem exibir feedback claro (ex: "Dar baixa em todos (X selecionados)").
  - Ícones padronizados via `lucide-react`.

## 2. Backend (Node.js + Express + TypeScript)

- **Acesso ao Banco de Dados**:
  - Usar sempre `query(sql, params)` com consultas parametrizadas do pool PostgreSQL.
  - Todas as tabelas residem no schema dedicado `sysmauad`.
  - Tratamento de transações com `BEGIN`, `COMMIT` e `ROLLBACK` para operações com múltiplas tabelas (ex: criação de OS e baixa de insumos de estoque).
- **Cálculo de Processamento Têxtil / Receitas Químicas**:
  - Receitas de lavagem são parametrizadas por percentual:
    $$\text{Dosagem (kg/g)} = \text{Peso Total do Lote (kg)} \times \left(\frac{\text{Porcentagem do Produto}}{100}\right)$$
  - Atualizar o saldo de estoque físico quando um lote entrar em processamento ou for concluído.
- **Auditoria de Operações**:
  - Alterações cadastrais de clientes, remoção de pedidos, reset de senhas e alterações em configurações de faturamento devem registrar entrada em `sysmauad.audit_logs`.
