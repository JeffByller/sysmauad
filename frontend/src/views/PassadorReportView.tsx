import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Printer, Calendar, FileText, Shirt, Truck } from 'lucide-react';

export const PassadorReportView: React.FC = () => {
  const { passadores, orders, insumoEntries } = useOrders();
  const { user } = useAuth();
  const isPassadorUser = user?.role === 'passador';

  // Sub-aba do relatório
  const [reportType, setReportType] = useState<'lavados' | 'passadores' | 'fornecedores'>('lavados');

  // Filtros de Data
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [periodPreset, setPeriodPreset] = useState<'hoje' | 'semana' | 'mes' | 'custom'>('mes');

  // Ajusta período rápido
  const setQuickPeriod = (preset: 'hoje' | 'semana' | 'mes') => {
    setPeriodPreset(preset);
    if (preset === 'hoje') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'semana') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(sevenDaysAgo);
      setEndDate(todayStr);
    } else if (preset === 'mes') {
      setStartDate(firstDayOfMonth);
      setEndDate(lastDayOfMonth);
    }
  };

  // Se o usuário logado for passador, restringe aos próprios dados
  const visiblePassadores = isPassadorUser && user
    ? passadores.filter(p => p.id === user.id || p.name.toLowerCase() === user.name.toLowerCase())
    : passadores;

  // 1. DADOS: Tudo que é Lavado (Por Processo)
  const processReport = (() => {
    const processMap: Record<string, number> = {};
    orders.forEach(order => {
      const orderDate = order.createdAt.split('T')[0];
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
    const logDate = log.timestamp.split('T')[0];
    const isAfterStart = !startDate || logDate >= startDate;
    const isBeforeEnd = !endDate || logDate <= endDate;
    return isAfterStart && isBeforeEnd;
  });

  const passadorReports = visiblePassadores.map(pas => {
    const pasLogs = allLogs.filter(l => l.passadorId === pas.id);
    const totalPiecesInPeriod = pasLogs.reduce((sum, l) => sum + l.piecesIroned, 0);
    return {
      ...pas,
      totalPiecesInPeriod: pasLogs.length > 0 ? totalPiecesInPeriod : pas.totalPiecesIroned,
      logs: pasLogs
    };
  });

  const totalPassadorPieces = passadorReports.reduce((sum, p) => sum + p.totalPiecesInPeriod, 0);

  // 3. DADOS: Entradas de Insumos / Fornecedores
  const filteredInsumos = insumoEntries.filter(entry => {
    const entryDate = entry.enteredAt.split('T')[0];
    const isAfterStart = !startDate || entryDate >= startDate;
    const isBeforeEnd = !endDate || entryDate <= endDate;
    return isAfterStart && isBeforeEnd;
  });

  const totalInsumosValue = filteredInsumos.reduce((sum, e) => sum + e.totalValue, 0);

  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    if (reportType === 'lavados') return 'RELATÓRIO DE TUDO QUE É LAVADO';
    if (reportType === 'passadores') return 'RELATÓRIO DE PRODUÇÃO DE PASSADORIA';
    return 'RELATÓRIO DE ENTRADA DE INSUMOS (FORNECEDORES)';
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

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-800 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto font-mono"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </button>
        </div>

        {/* Seleção do Relatório */}
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
            1. Tudo que é Lavado (Processos)
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
            <Shirt className="w-3.5 h-3.5" />
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

        {/* Filtro de Período Rápido */}
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
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FOLHA DO RELATÓRIO — FORMATO SIMPLES E IDÊNTICO AO ENTRADA.PDF */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-md space-y-4 print:border-0 print:shadow-none print:p-0 print:m-0 text-xs">
        {/* Cabeçalho do Documento */}
        <div className="flex justify-between items-start text-xs font-bold leading-tight">
          <span>LAVANDERIA MAUAD</span>
          <span className="text-center">{getReportTitle()}</span>
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
        </div>

        {/* Separador tracejado */}
        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          ------------------------------------------------------------------------------------------------------------------------
        </div>

        {/* CORPO DO RELATÓRIO 1: TUDO QUE É LAVADO (POR PROCESSO) */}
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

        {/* CORPO DO RELATÓRIO 2: PRODUÇÃO POR PASSADOR */}
        {reportType === 'passadores' && (
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
              <div className="space-y-2 text-xs">
                {passadorReports.map(pas => (
                  <div key={pas.id} className="space-y-1">
                    <div className="flex justify-between font-bold py-0.5">
                      <span>{pas.name.toUpperCase()}</span>
                      <span>{pas.totalPiecesInPeriod.toLocaleString('pt-BR')} Pcs</span>
                    </div>
                    {/* Detalhamento simples dos pedidos passados por ele */}
                    {pas.logs.length > 0 && (
                      <div className="pl-4 text-[11px] text-slate-600 space-y-0.5">
                        {pas.logs.map(l => (
                          <div key={l.id} className="flex justify-between">
                            <span>{l.osNumber} • {l.clientName} ({new Date(l.timestamp).toLocaleDateString('pt-BR')})</span>
                            <span>+{l.piecesIroned} Pcs</span>
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
              <span>QtdTotPecas Passadas:</span>
              <span>{totalPassadorPieces.toLocaleString('pt-BR')} Pcs</span>
            </div>
          </div>
        )}

        {/* CORPO DO RELATÓRIO 3: ENTRADAS / FORNECEDORES (Conforme novasideias/ideias.txt e Entr.pdf) */}
        {reportType === 'fornecedores' && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 font-bold text-xs">
              <span className="col-span-4">FORNECEDOR</span>
              <span className="col-span-4">PRODUTO / INSUMO</span>
              <span className="col-span-1 text-right">QTD</span>
              <span className="col-span-1 text-center">UN</span>
              <span className="col-span-1 text-right">R$/UN</span>
              <span className="col-span-1 text-right">TOTAL</span>
            </div>

            <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
              ------------------------------------------------------------------------------------------------------------------------
            </div>

            {filteredInsumos.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                Nenhuma entrada de mercadoria registrada no período informado.
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                {filteredInsumos.map(entry => (
                  <div key={entry.id} className="grid grid-cols-12 items-center py-0.5">
                    <span className="col-span-4 font-semibold truncate">{entry.supplierName}</span>
                    <span className="col-span-4 truncate">{entry.productName}</span>
                    <span className="col-span-1 text-right font-bold">{entry.quantity}</span>
                    <span className="col-span-1 text-center text-slate-500">{entry.unit}</span>
                    <span className="col-span-1 text-right">{entry.unitPrice.toFixed(2)}</span>
                    <span className="col-span-1 text-right font-bold">{entry.totalValue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-2">
              ------------------------------------------------------------------------------------------------------------------------
            </div>

            <div className="flex justify-between font-bold text-sm pt-1">
              <span>Total a Pagar Fornecedores:</span>
              <span>{totalInsumosValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
        )}

        {/* Assinaturas no rodapé idênticas ao Entrada.PDF */}
        <div className="pt-12 flex justify-between text-center text-[10px] uppercase font-mono">
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <span>ENTREGUE POR</span>
          </div>
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <span>RECEBIDO POR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
