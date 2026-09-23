import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Printer, FileText, Shirt, Truck, UserCheck, ArrowLeft } from 'lucide-react';
import { getDatePresets, getLocalDateString } from '../utils/dateUtils';

export const PassadorReportView: React.FC = () => {
  const { passadores, orders, insumoEntries, suppliers } = useOrders();
  const { user } = useAuth();
  const isPassadorUser = user?.role === 'passador';

  // Sub-aba do relatório
  const [reportType, setReportType] = useState<'lavados' | 'passadores' | 'fornecedores'>('lavados');

  // Filtros de Unidade (Individual vs Geral)
  const [selectedPassadorId, setSelectedPassadorId] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  // Filtros de Data (America/Sao_Paulo)
  const { todayStr, firstDayOfMonth, lastDayOfMonth } = useMemo(() => getDatePresets(), []);

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [periodPreset, setPeriodPreset] = useState<'hoje' | 'semana' | 'mes' | 'custom'>('mes');

  // Ajusta período rápido
  const setQuickPeriod = (preset: 'hoje' | 'semana' | 'mes') => {
    setPeriodPreset(preset);
    const presets = getDatePresets();
    if (preset === 'hoje') {
      setStartDate(presets.todayStr);
      setEndDate(presets.todayStr);
    } else if (preset === 'semana') {
      setStartDate(presets.sevenDaysAgo);
      setEndDate(presets.todayStr);
    } else if (preset === 'mes') {
      setStartDate(presets.firstDayOfMonth);
      setEndDate(presets.lastDayOfMonth);
    }
  };

  // Se o usuário logado for passador, restringe aos próprios dados
  const visiblePassadores = isPassadorUser && user
    ? passadores.filter(p => p.id === user.id || p.name.toLowerCase() === user.name.toLowerCase())
    : passadores;

  // Lista única de fornecedores para filtro individual
  const uniqueSuppliers = (() => {
    const map = new Map<string, { id: string; name: string; cnpj?: string }>();
    suppliers.forEach(s => {
      if (s.name) map.set(s.name.toLowerCase().trim(), { id: s.id, name: s.name, cnpj: s.cnpj });
    });
    insumoEntries.forEach(ent => {
      if (ent.supplierName && !map.has(ent.supplierName.toLowerCase().trim())) {
        map.set(ent.supplierName.toLowerCase().trim(), {
          id: ent.supplierId || ent.supplierName,
          name: ent.supplierName
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  // 1. DADOS: Tudo que é Lavado (Por Processo - Mantido Direto por Data)
  const processReport = (() => {
    const processMap: Record<string, number> = {};
    orders.forEach(order => {
      const orderDate = getLocalDateString(order.createdAt);
      const isInRange = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
      if (!isInRange) return;
      order.items.forEach(item => {
        const proc = (item.process || 'Sem processo').toUpperCase();
        processMap[proc] = (processMap[proc] || 0) + (order.estimatedPieceCount || 0);
      });
    });
    const entries = Object.entries(processMap).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return { entries, total };
  })();

  // 2. DADOS: Produção de Passadoria
  const allLogs = orders.flatMap(o => o.ironingLogs.map(l => ({ ...l, clientName: o.clientName }))).filter(log => {
    const logDate = getLocalDateString(log.timestamp);
    const isAfterStart = !startDate || logDate >= startDate;
    const isBeforeEnd = !endDate || logDate <= endDate;
    return isAfterStart && isBeforeEnd;
  });

  const passadorReports = visiblePassadores.map(pas => {
    const pasLogs = allLogs.filter(l => l.passadorId === pas.id || l.passadorName?.toLowerCase() === pas.name?.toLowerCase());
    const totalPiecesInPeriod = pasLogs.reduce((sum, l) => sum + l.piecesIroned, 0);
    return {
      ...pas,
      totalPiecesInPeriod: pasLogs.length > 0 ? totalPiecesInPeriod : pas.totalPiecesIroned,
      logs: pasLogs
    };
  });

  // Passador individual selecionado (se houver)
  const selectedPassador = selectedPassadorId !== 'all'
    ? passadorReports.find(p => p.id === selectedPassadorId || p.name === selectedPassadorId)
    : null;

  const displayedPassadores = selectedPassador
    ? [selectedPassador]
    : passadorReports;

  const totalPassadorPieces = displayedPassadores.reduce((sum, p) => sum + p.totalPiecesInPeriod, 0);

  // 3. DADOS: Entradas de Insumos / Fornecedores
  const filteredInsumos = insumoEntries.filter(entry => {
    const entryDate = getLocalDateString(entry.enteredAt);
    const isAfterStart = !startDate || entryDate >= startDate;
    const isBeforeEnd = !endDate || entryDate <= endDate;
    return isAfterStart && isBeforeEnd;
  });

  // Fornecedor individual selecionado (se houver)
  const selectedSupplier = selectedSupplierId !== 'all'
    ? uniqueSuppliers.find(s => s.id === selectedSupplierId || s.name === selectedSupplierId)
    : null;

  const displayedInsumos = selectedSupplier
    ? filteredInsumos.filter(e => e.supplierId === selectedSupplier.id || e.supplierName.toLowerCase() === selectedSupplier.name.toLowerCase())
    : filteredInsumos;

  const totalInsumosValue = displayedInsumos.reduce((sum, e) => sum + e.totalValue, 0);

  // Ação de Impressão Direta
  const handlePrint = () => {
    window.print();
  };

  // Impressão individual por unidade com 1 clique
  const handlePrintIndividualPassador = (passadorId: string) => {
    setSelectedPassadorId(passadorId);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintIndividualSupplier = (supplierIdOrName: string) => {
    setSelectedSupplierId(supplierIdOrName);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Título dinâmico do relatório
  const getReportTitle = () => {
    if (reportType === 'lavados') {
      return 'RELATÓRIO DE TUDO QUE É LAVADO';
    }
    if (reportType === 'passadores') {
      if (selectedPassador) {
        return `EXTRATO INDIVIDUAL DE PASSADORIA: ${selectedPassador.name.toUpperCase()}`;
      }
      return 'RELATÓRIO GERAL DE PRODUÇÃO DE PASSADORIA';
    }
    if (reportType === 'fornecedores') {
      if (selectedSupplier) {
        return `EXTRATO DE ENTRADAS DO FORNECEDOR: ${selectedSupplier.name.toUpperCase()}`;
      }
      return 'RELATÓRIO GERAL DE ENTRADA DE INSUMOS (FORNECEDORES)';
    }
    return 'RELATÓRIO OPERACIONAL';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-mono">
      {/* Controles de Navegação e Filtros (Ocultos na impressão) */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 font-sans transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Impressão & Extratos Operacionais
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Relatórios da Lavanderia
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-800 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm font-mono"
            >
              <Printer className="w-4 h-4" />
              <span>
                {reportType === 'passadores' && selectedPassador
                  ? `Imprimir Passador (${selectedPassador.name})`
                  : reportType === 'fornecedores' && selectedSupplier
                  ? `Imprimir Fornecedor (${selectedSupplier.name})`
                  : 'Imprimir Relatório'}
              </span>
            </button>
          </div>
        </div>

        {/* Seleção do Tipo de Relatório */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReportType('lavados')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              reportType === 'lavados'
                ? 'bg-slate-900 text-white dark:bg-sky-700 dark:text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            1. Tudo que é Lavado (Por Data)
          </button>

          <button
            type="button"
            onClick={() => setReportType('passadores')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              reportType === 'passadores'
                ? 'bg-slate-900 text-white dark:bg-sky-700 dark:text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            2. Produção por Passador
          </button>

          {!isPassadorUser && (
            <button
              type="button"
              onClick={() => setReportType('fornecedores')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                reportType === 'fornecedores'
                  ? 'bg-slate-900 text-white dark:bg-sky-700 dark:text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              3. Entradas / Fornecedores
            </button>
          )}
        </div>

        {/* Filtro de Período Rápido & Datas */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] uppercase mr-1">Período:</span>
            <button
              type="button"
              onClick={() => setQuickPeriod('hoje')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                periodPreset === 'hoje'
                  ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setQuickPeriod('semana')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                periodPreset === 'semana'
                  ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setQuickPeriod('mes')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                periodPreset === 'mes'
                  ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              Mensal
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">De:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
            />
            <span className="text-slate-400">Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* OPÇÃO DE IMPRIMIR POR UNIDADE: PASSADOR INDIVIDUAL */}
        {reportType === 'passadores' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Imprimir por Unidade:
              </span>
              <select
                value={selectedPassadorId}
                onChange={e => setSelectedPassadorId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">TODOS OS PASSADORES (GERAL)</option>
                {visiblePassadores.map(p => (
                  <option key={p.id} value={p.id}>
                    INDIVIDUAL: {p.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {selectedPassadorId !== 'all' ? (
              <button
                type="button"
                onClick={() => setSelectedPassadorId('all')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-bold flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Relatório Geral (Todos)</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                Você pode filtrar um passador acima ou clicar em "Imprimir Individual" em cada linha abaixo.
              </span>
            )}
          </div>
        )}

        {/* OPÇÃO DE IMPRIMIR POR UNIDADE: FORNECEDOR INDIVIDUAL */}
        {reportType === 'fornecedores' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Imprimir por Fornecedor:
              </span>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">TODOS OS FORNECEDORES (GERAL)</option>
                {uniqueSuppliers.map(s => (
                  <option key={s.id || s.name} value={s.id || s.name}>
                    INDIVIDUAL: {s.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplierId !== 'all' ? (
              <button
                type="button"
                onClick={() => setSelectedSupplierId('all')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-bold flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar ao Relatório Geral (Todos)</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                Selecione um fornecedor para emitir o extrato individual de entradas.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FOLHA DO RELATÓRIO — FORMATO SIMPLES E IDÊNTICO AO ENTRADA.PDF */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-md space-y-4 print-sheet text-xs">
        {/* Cabeçalho do Documento */}
        <div className="flex justify-between items-start text-xs font-bold leading-tight">
          <span>LAVANDERIA MAUAD</span>
          <span className="text-center font-mono">{getReportTitle()}</span>
          <span>Pagina: 001</span>
        </div>

        {/* Informações de Emissão */}
        <div className="flex justify-between text-[11px] pt-1">
          <span>EMISSAO: {new Date().toLocaleDateString('pt-BR')} FUNCNR: {user?.name?.toUpperCase() || 'SUPER ADMIN'}</span>
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}, {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>

        {/* Separador tracejado idêntico ao Entrada.PDF */}
        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          ------------------------------------------------------------------------------------------------------------------------
        </div>

        {/* Parâmetros do Relatório */}
        <div className="text-[11px] space-y-0.5">
          <div><strong>PERIODO DE APURACAO:</strong> {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}</div>
          <div><strong>OPERADOR RESPONSAVEL:</strong> {user?.name || 'Super Admin'}</div>
          {reportType === 'passadores' && selectedPassador && (
            <div>
              <strong>UNIDADE / PASSADOR:</strong> {selectedPassador.name.toUpperCase()} {selectedPassador.phone ? `• Tel: ${selectedPassador.phone}` : ''}
            </div>
          )}
          {reportType === 'fornecedores' && selectedSupplier && (
            <div>
              <strong>UNIDADE / FORNECEDOR:</strong> {selectedSupplier.name.toUpperCase()} {selectedSupplier.cnpj ? `• CNPJ: ${selectedSupplier.cnpj}` : ''}
            </div>
          )}
        </div>

        {/* Separador tracejado */}
        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          ------------------------------------------------------------------------------------------------------------------------
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* CORPO DO RELATÓRIO 1: TUDO QUE É LAVADO (MANTIDO DIRETO POR DATA) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {reportType === 'lavados' && (
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-xs">
              <span>LAVADO / PROCESSO</span>
              <span>QUANTIDADE</span>
            </div>

            <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
              ------------------------------------------------------------------------------------------------------------------------
            </div>

            {processReport.entries.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                Nenhum lote lavado registrado no período informado.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {processReport.entries.map(([procName, count]) => (
                  <div key={procName} className="flex justify-between items-center py-0.5">
                    <span className="font-semibold">{procName}</span>
                    <span className="font-bold">{count.toLocaleString('pt-BR')} Pcs</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-2">
              ------------------------------------------------------------------------------------------------------------------------
            </div>

            <div className="flex justify-between font-bold text-sm pt-1">
              <span>QtdTotPecas Lavadas:</span>
              <span>{processReport.total.toLocaleString('pt-BR')} Pcs</span>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* CORPO DO RELATÓRIO 2: PRODUÇÃO POR PASSADOR (INDIVIDUAL OU GERAL) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {reportType === 'passadores' && (
          <div className="space-y-3">
            {selectedPassador ? (
              /* RELATÓRIO INDIVIDUAL DE PASSADOR */
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-xs">
                  <span>HISTÓRICO DE LOTES PASSADOS</span>
                  <span>QUANTIDADE</span>
                </div>

                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
                  ------------------------------------------------------------------------------------------------------------------------
                </div>

                {selectedPassador.logs.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    Nenhuma produção registrada para este colaborador no período informado.
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    {selectedPassador.logs.map((l, idx) => (
                      <div key={l.id || idx} className="flex justify-between items-center py-0.5 border-b border-dashed border-slate-200">
                        <span>
                          <strong>{l.osNumber}</strong> • {l.clientName || 'Cliente'} • {new Date(l.timestamp).toLocaleDateString('pt-BR')} às {new Date(l.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold font-mono">+{l.piecesIroned} Pcs</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-2">
                  ------------------------------------------------------------------------------------------------------------------------
                </div>

                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>Total de Lotes Passados:</span>
                  <span>{selectedPassador.logs.length} lotes</span>
                </div>
                <div className="flex justify-between font-bold text-base text-slate-900 pt-0.5">
                  <span>Qtd Total Peças Passadas ({selectedPassador.name}):</span>
                  <span className="font-mono">{selectedPassador.totalPiecesInPeriod.toLocaleString('pt-BR')} Pcs</span>
                </div>
              </div>
            ) : (
              /* RELATÓRIO GERAL DE TODOS OS PASSADORES */
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-xs">
                  <span>COLABORADOR / PASSADOR</span>
                  <span>QUANTIDADE</span>
                </div>

                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
                  ------------------------------------------------------------------------------------------------------------------------
                </div>

                {passadorReports.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    Nenhum passador com produção registrada no período informado.
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {passadorReports.map(pas => (
                      <div key={pas.id} className="space-y-1 pb-2 border-b border-slate-200">
                        <div className="flex justify-between items-center font-bold py-0.5">
                          <div className="flex items-center gap-2">
                            <span>{pas.name.toUpperCase()}</span>
                            {/* Botão de impressão individual visível na tela */}
                            <button
                              type="button"
                              onClick={() => handlePrintIndividualPassador(pas.id)}
                              className="no-print text-[10px] text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded border border-sky-300 font-bold inline-flex items-center gap-1 transition-colors"
                              title="Imprimir somente este passador individualmente"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Imprimir Individual</span>
                            </button>
                          </div>
                          <span className="font-mono font-bold text-sm">{pas.totalPiecesInPeriod.toLocaleString('pt-BR')} Pcs</span>
                        </div>

                        {/* Detalhamento simples dos pedidos passados por ele */}
                        {pas.logs.length > 0 && (
                          <div className="pl-4 text-[11px] text-slate-600 space-y-0.5">
                            {pas.logs.map(l => (
                              <div key={l.id} className="flex justify-between">
                                <span>{l.osNumber} • {l.clientName} ({new Date(l.timestamp).toLocaleDateString('pt-BR')})</span>
                                <span className="font-mono font-semibold">+{l.piecesIroned} Pcs</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-2">
                  ------------------------------------------------------------------------------------------------------------------------
                </div>

                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>QtdTotPecas Passadas (Todos):</span>
                  <span className="font-mono">{totalPassadorPieces.toLocaleString('pt-BR')} Pcs</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* CORPO DO RELATÓRIO 3: ENTRADAS / FORNECEDORES (INDIVIDUAL OU GERAL) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {reportType === 'fornecedores' && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 font-bold text-xs">
              <span className={selectedSupplier ? 'col-span-3' : 'col-span-4'}>
                {selectedSupplier ? 'DATA / NF' : 'FORNECEDOR'}
              </span>
              <span className={selectedSupplier ? 'col-span-4' : 'col-span-4'}>PRODUTO / INSUMO</span>
              <span className="col-span-1 text-right">QTD</span>
              <span className="col-span-1 text-center">UN</span>
              <span className="col-span-1 text-right">R$/UN</span>
              <span className={selectedSupplier ? 'col-span-2 text-right' : 'col-span-1 text-right'}>TOTAL</span>
            </div>

            <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
              ------------------------------------------------------------------------------------------------------------------------
            </div>

            {displayedInsumos.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                Nenhuma entrada de mercadoria registrada no período informado.
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                {displayedInsumos.map(entry => (
                  <div key={entry.id} className="grid grid-cols-12 items-center py-0.5 border-b border-dashed border-slate-100">
                    <span className={selectedSupplier ? 'col-span-3 font-semibold truncate' : 'col-span-4 font-semibold truncate'}>
                      {selectedSupplier 
                        ? `${new Date(entry.enteredAt).toLocaleDateString('pt-BR')} ${entry.invoiceRef ? `• NF ${entry.invoiceRef}` : ''}`
                        : (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{entry.supplierName}</span>
                            <button
                              type="button"
                              onClick={() => handlePrintIndividualSupplier(entry.supplierId || entry.supplierName)}
                              className="no-print text-[9px] text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-300 font-bold shrink-0"
                              title="Imprimir apenas este fornecedor"
                            >
                              Imprimir
                            </button>
                          </div>
                        )
                      }
                    </span>
                    <span className={selectedSupplier ? 'col-span-4 truncate' : 'col-span-4 truncate'}>{entry.productName}</span>
                    <span className="col-span-1 text-right font-bold font-mono">{entry.quantity}</span>
                    <span className="col-span-1 text-center text-slate-500">{entry.unit}</span>
                    <span className="col-span-1 text-right font-mono">{entry.unitPrice.toFixed(2)}</span>
                    <span className={selectedSupplier ? 'col-span-2 text-right font-bold font-mono' : 'col-span-1 text-right font-bold font-mono'}>
                      {entry.totalValue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-2">
              ------------------------------------------------------------------------------------------------------------------------
            </div>

            <div className="flex justify-between font-bold text-sm pt-1">
              <span>{selectedSupplier ? `Total Comprado (${selectedSupplier.name}):` : 'Total a Pagar Fornecedores:'}</span>
              <span className="font-mono text-base">
                {totalInsumosValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        )}

        {/* Assinaturas no rodapé formatadas para o documento */}
        <div className="pt-12 flex justify-between text-center text-[10px] uppercase font-mono">
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <span>
              {reportType === 'passadores' && selectedPassador 
                ? `ASSINATURA: ${selectedPassador.name.toUpperCase()}`
                : reportType === 'fornecedores' && selectedSupplier
                ? `REPRESENTANTE: ${selectedSupplier.name.toUpperCase()}`
                : 'ENTREGUE POR'}
            </span>
          </div>
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <span>
              {reportType === 'passadores' && selectedPassador
                ? 'CONFERIDO POR (SUPERVISÃO)'
                : reportType === 'fornecedores' && selectedSupplier
                ? 'RECEBIDO POR (ALMOXARIFADO)'
                : 'RECEBIDO POR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
