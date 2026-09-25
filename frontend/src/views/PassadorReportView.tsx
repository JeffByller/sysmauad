import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Printer, FileText, Shirt, Truck, UserCheck, ArrowLeft, Layers, ListFilter, CheckCircle2, Clock, Play, PackageCheck, Scale, CheckCircle, DollarSign, Edit3 } from 'lucide-react';
import { getDatePresets, getLocalDateString } from '../utils/dateUtils';
import { OrderStatus } from '../types';

export const PassadorReportView: React.FC = () => {
  const { passadores, orders, insumoEntries, suppliers, updatePassador } = useOrders();
  const { user } = useAuth();
  const isPassadorUser = user?.role === 'passador';

  // Sub-aba do relatório
  const [reportType, setReportType] = useState<'lavados' | 'passadores' | 'fornecedores'>('lavados');

  // Parâmetros operacionais para a aba "Tudo que é Lavado" (correspondentes ao menu Painel)
  const [lavadoStatusFilter, setLavadoStatusFilter] = useState<
    'todos' | 'recebido' | 'em_andamento' | 'pronto' | 'entregue' | 'na_lavanderia'
  >('todos');

  // Modo de visualização/impressão: Completo, Apenas Lista de Pedidos ou Apenas Resumo de Lavados
  const [lavadoViewMode, setLavadoViewMode] = useState<'completo' | 'pedidos' | 'processos'>('completo');

  // Filtros de Unidade (Individual vs Geral)
  const [selectedPassadorId, setSelectedPassadorId] = useState<string>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  // Ajuste de Taxa / Valor por Peça de Passadoria
  const [editingRatePassadorId, setEditingRatePassadorId] = useState<string | null>(null);
  const [rateInputValue, setRateInputValue] = useState<string>('0.15');
  const [rateSaving, setRateSaving] = useState(false);

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

  // 1. DADOS: Pedidos Filtrados por Período e Parâmetro Operacional (Abas do Menu Painel)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = getLocalDateString(order.createdAt);

      if (lavadoStatusFilter === 'todos') {
        return (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
      }

      if (lavadoStatusFilter === 'recebido') {
        const inRange = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
        return inRange && order.status === 'recebido';
      }

      if (lavadoStatusFilter === 'em_andamento') {
        if (order.status !== 'em_andamento') return false;
        const progEvt = order.history?.find(h => h.status === 'em_andamento');
        const progDate = progEvt ? getLocalDateString(progEvt.timestamp) : orderDate;
        return (!startDate || progDate >= startDate || orderDate >= startDate) && (!endDate || progDate <= endDate);
      }

      if (lavadoStatusFilter === 'pronto') {
        if (order.status !== 'pronto') return false;
        const readyEvt = order.history?.find(h => h.status === 'pronto');
        const readyDate = readyEvt ? getLocalDateString(readyEvt.timestamp) : orderDate;
        return (!startDate || readyDate >= startDate || orderDate >= startDate) && (!endDate || readyDate <= endDate);
      }

      if (lavadoStatusFilter === 'entregue') {
        if (order.status !== 'entregue') return false;
        const delivEvt = order.history?.find(h => h.status === 'entregue');
        const delivDate = delivEvt ? getLocalDateString(delivEvt.timestamp) : getLocalDateString(order.updatedAt || order.createdAt);
        return (!startDate || delivDate >= startDate) && (!endDate || delivDate <= endDate);
      }

      if (lavadoStatusFilter === 'na_lavanderia') {
        // Todas as peças atualmente dentro da lavanderia (não entregues) até a data fim
        if (order.status === 'entregue') return false;
        return !endDate || orderDate <= endDate;
      }

      return true;
    });
  }, [orders, lavadoStatusFilter, startDate, endDate]);

  // Contadores por status para os botões do menu Painel
  const lavadoCounts = useMemo(() => {
    let todos = 0;
    let recebido = 0;
    let em_andamento = 0;
    let pronto = 0;
    let entregue = 0;
    let na_lavanderia = 0;

    orders.forEach(order => {
      const orderDate = getLocalDateString(order.createdAt);
      const inDateRange = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);

      if (inDateRange) {
        todos++;
        if (order.status === 'recebido') recebido++;
      }

      if (order.status === 'em_andamento') {
        const progEvt = order.history?.find(h => h.status === 'em_andamento');
        const progDate = progEvt ? getLocalDateString(progEvt.timestamp) : orderDate;
        if ((!startDate || progDate >= startDate || orderDate >= startDate) && (!endDate || progDate <= endDate)) {
          em_andamento++;
        }
      }

      if (order.status === 'pronto') {
        const readyEvt = order.history?.find(h => h.status === 'pronto');
        const readyDate = readyEvt ? getLocalDateString(readyEvt.timestamp) : orderDate;
        if ((!startDate || readyDate >= startDate || orderDate >= startDate) && (!endDate || readyDate <= endDate)) {
          pronto++;
        }
      }

      if (order.status === 'entregue') {
        const delivEvt = order.history?.find(h => h.status === 'entregue');
        const delivDate = delivEvt ? getLocalDateString(delivEvt.timestamp) : getLocalDateString(order.updatedAt || order.createdAt);
        if ((!startDate || delivDate >= startDate) && (!endDate || delivDate <= endDate)) {
          entregue++;
        }
      }

      if (order.status !== 'entregue' && (!endDate || orderDate <= endDate)) {
        na_lavanderia++;
      }
    });

    return { todos, recebido, em_andamento, pronto, entregue, na_lavanderia };
  }, [orders, startDate, endDate]);

  // Totais dos pedidos filtrados
  const totalLavadoPieces = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.estimatedPieceCount || 0), 0);
  }, [filteredOrders]);

  const totalLavadoKg = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);
  }, [filteredOrders]);

  // Resumo consolidado por processo de lavado com base nos pedidos filtrados
  const processReport = useMemo(() => {
    const processMap: Record<string, { count: number; pieces: number; kg: number }> = {};
    filteredOrders.forEach(order => {
      const proc = (order.items?.[0]?.process || 'Sem processo').toUpperCase().trim();
      if (!processMap[proc]) {
        processMap[proc] = { count: 0, pieces: 0, kg: 0 };
      }
      processMap[proc].count += 1;
      processMap[proc].pieces += (order.estimatedPieceCount || 0);
      processMap[proc].kg += (order.totalWeightKg || 0);
    });

    const entries = Object.entries(processMap).sort((a, b) => b[1].pieces - a[1].pieces);
    const totalPieces = entries.reduce((s, [, v]) => s + v.pieces, 0);
    const totalKg = entries.reduce((s, [, v]) => s + v.kg, 0);
    const totalLotes = entries.reduce((s, [, v]) => s + v.count, 0);

    return { entries, totalPieces, totalKg, totalLotes };
  }, [filteredOrders]);

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
    const pieces = pasLogs.length > 0 ? totalPiecesInPeriod : pas.totalPiecesIroned;
    const rate = pas.ratePerPiece !== undefined ? pas.ratePerPiece : 0.15;
    const totalValue = pieces * rate;

    return {
      ...pas,
      ratePerPiece: rate,
      totalPiecesInPeriod: pieces,
      totalValueInPeriod: totalValue,
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
  const totalPassadorValue = displayedPassadores.reduce((sum, p) => sum + p.totalValueInPeriod, 0);

  const handleSaveRate = async (passadorId: string, newRate: number) => {
    if (isNaN(newRate) || newRate < 0) return;
    setRateSaving(true);
    await updatePassador(passadorId, { ratePerPiece: newRate });
    setRateSaving(false);
    setEditingRatePassadorId(null);
  };

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

  // Helper para legenda amigável do filtro de status do Painel
  const getStatusFilterLabel = (status: typeof lavadoStatusFilter) => {
    switch (status) {
      case 'recebido': return '1. ENTRADAS / PEDIDO FEITO (RECEBIDOS)';
      case 'em_andamento': return '2. EM ANDAMENTO / PROCESSAMENTO (LAVANDO)';
      case 'pronto': return '3. PRONTO P/ RETIRADA (A SER ENTREGUE)';
      case 'entregue': return '4. ENTREGUES (SAÍDAS)';
      case 'na_lavanderia': return 'NA LAVANDERIA (NÃO ENTREGUES / EM ABERTO)';
      default: return 'TODOS OS STATUS (GERAL)';
    }
  };

  const getViewModeLabel = (mode: typeof lavadoViewMode) => {
    switch (mode) {
      case 'pedidos': return 'LISTAGEM DETALHADA DE PEDIDOS / LOTES';
      case 'processos': return 'RESUMO CONSOLIDADO POR PROCESSO DE LAVADO';
      default: return 'COMPLETO (RESUMO DE LAVADOS + LISTA DE PEDIDOS)';
    }
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'recebido': return '1. Feito';
      case 'em_andamento': return '2. Andamento';
      case 'pronto': return '3. Pronto';
      case 'entregue': return '4. Entregue';
      default: return status;
    }
  };

  // Título dinâmico do relatório
  const getReportTitle = () => {
    if (reportType === 'lavados') {
      switch (lavadoStatusFilter) {
        case 'recebido': return 'RELATÓRIO DE ENTRADAS — PEDIDOS RECEBIDOS';
        case 'em_andamento': return 'RELATÓRIO DE PROCESSAMENTO — EM ANDAMENTO';
        case 'pronto': return 'RELATÓRIO DE PEDIDOS PRONTOS P/ RETIRADA';
        case 'entregue': return 'RELATÓRIO DE PEDIDOS ENTREGUES';
        case 'na_lavanderia': return 'RELATÓRIO DE PEÇAS ATUALMENTE NA LAVANDERIA';
        default: return 'RELATÓRIO DE TUDO QUE É LAVADO — GERAL';
      }
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

        {/* PARÂMETROS OPERACIONAIS: TUDO QUE É LAVADO (CORRESPONDENTES AO MENU PAINEL) */}
        {reportType === 'lavados' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 font-sans">
            {/* Linha 1: Filtro de Status das Abas do Painel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Filtrar por Status / Abas do Painel:
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {filteredOrders.length} lote(s) • {totalLavadoPieces.toLocaleString('pt-BR')} peças
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLavadoStatusFilter('todos')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all text-left flex flex-col justify-between border ${
                    lavadoStatusFilter === 'todos'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-sky-700 dark:border-sky-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">Geral</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold">Todos</span>
                    <span className="text-xs font-mono font-black">{lavadoCounts.todos}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLavadoStatusFilter('recebido')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all text-left flex flex-col justify-between border ${
                    lavadoStatusFilter === 'recebido'
                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">1. Entradas</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold">Pedido Feito</span>
                    <span className="text-xs font-mono font-black">{lavadoCounts.recebido}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLavadoStatusFilter('em_andamento')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all text-left flex flex-col justify-between border ${
                    lavadoStatusFilter === 'em_andamento'
                      ? 'bg-sky-700 text-white border-sky-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">2. Lavagem</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold">Andamento</span>
                    <span className="text-xs font-mono font-black">{lavadoCounts.em_andamento}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLavadoStatusFilter('pronto')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all text-left flex flex-col justify-between border ${
                    lavadoStatusFilter === 'pronto'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">3. Prontos</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold">A Entregar</span>
                    <span className="text-xs font-mono font-black">{lavadoCounts.pronto}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLavadoStatusFilter('entregue')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all text-left flex flex-col justify-between border ${
                    lavadoStatusFilter === 'entregue'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm dark:bg-slate-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">4. Saídas</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold">Entregues</span>
                    <span className="text-xs font-mono font-black">{lavadoCounts.entregue}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLavadoStatusFilter('na_lavanderia')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all text-left flex flex-col justify-between border ${
                    lavadoStatusFilter === 'na_lavanderia'
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">Fábrica</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold">Na Lavanderia</span>
                    <span className="text-xs font-mono font-black">{lavadoCounts.na_lavanderia}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Linha 2: Modo de Impressão e Resumo Rápido */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Formato de Impressão:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setLavadoViewMode('completo')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      lavadoViewMode === 'completo'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Completo (Resumo + Lista)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLavadoViewMode('pedidos')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      lavadoViewMode === 'pedidos'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Lista de Pedidos / Lotes
                  </button>
                  <button
                    type="button"
                    onClick={() => setLavadoViewMode('processos')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      lavadoViewMode === 'processos'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Apenas Resumo de Lavados
                  </button>
                </div>
              </div>

              {/* Indicadores rápidos de Lotes, Peças e Kg */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-300">
                  Lotes: <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredOrders.length}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Peças: <strong className="text-sky-700 dark:text-sky-400 font-bold">{totalLavadoPieces.toLocaleString('pt-BR')}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  Peso: <strong className="text-slate-900 dark:text-slate-100 font-bold">{totalLavadoKg.toFixed(2)} kg</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* OPÇÃO DE IMPRIMIR POR UNIDADE: PASSADOR INDIVIDUAL */}
        {reportType === 'passadores' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
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
                      INDIVIDUAL: {p.name.toUpperCase()} (R$ {(p.ratePerPiece ?? 0.15).toFixed(2)}/pç)
                    </option>
                  ))}
                </select>
              </div>

              {/* Indicador e ajuste de Valor por Peça */}
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 font-mono text-xs">
                <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Taxa p/ Peça:
                </span>
                {editingRatePassadorId ? (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={rateInputValue}
                      onChange={e => setRateInputValue(e.target.value)}
                      className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-emerald-400 rounded text-xs font-bold text-slate-900 dark:text-slate-100"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={rateSaving}
                      onClick={() => handleSaveRate(editingRatePassadorId, parseFloat(rateInputValue))}
                      className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700"
                    >
                      {rateSaving ? '...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRatePassadorId(null)}
                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-300"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <strong className="text-emerald-900 dark:text-emerald-200 font-black">
                      {selectedPassador 
                        ? `R$ ${(selectedPassador.ratePerPiece ?? 0.15).toFixed(2)}`
                        : `R$ ${(visiblePassadores[0]?.ratePerPiece ?? 0.15).toFixed(2)}`}
                    </strong>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">/ pç</span>
                    {!isPassadorUser && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedPassador || visiblePassadores[0];
                          if (target) {
                            setEditingRatePassadorId(target.id);
                            setRateInputValue((target.ratePerPiece ?? 0.15).toFixed(2));
                          }
                        }}
                        className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline font-bold flex items-center gap-0.5 ml-1"
                        title="Alterar valor por peça"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Alterar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
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
          {reportType === 'lavados' && (
            <>
              <div><strong>FILTRO OPERACIONAL:</strong> {getStatusFilterLabel(lavadoStatusFilter)}</div>
              <div><strong>FORMATO DO EXTRATO:</strong> {getViewModeLabel(lavadoViewMode)}</div>
            </>
          )}
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
        {/* CORPO DO RELATÓRIO 1: TUDO QUE É LAVADO (COM PARÂMETROS E FILTROS) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {reportType === 'lavados' && (
          <div className="space-y-4">
            {/* Resumo Rápido de Cabeçalho */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded flex justify-between items-center text-[11px] font-bold">
              <span>RESUMO DO PERÍODO:</span>
              <div className="flex gap-4 font-mono">
                <span>LOTES: <strong>{filteredOrders.length}</strong></span>
                <span>TOTAL DE PEÇAS: <strong>{totalLavadoPieces.toLocaleString('pt-BR')} Pcs</strong></span>
                <span>PESO TOTAL: <strong>{totalLavadoKg.toFixed(2)} kg</strong></span>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-sans">
                Nenhum pedido ou lote encontrado para os parâmetros selecionados ({getStatusFilterLabel(lavadoStatusFilter)} no período de {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}).
              </div>
            ) : (
              <>
                {/* 1. SEÇÃO CONSOLIDADA POR PROCESSO / LAVADO */}
                {(lavadoViewMode === 'completo' || lavadoViewMode === 'processos') && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center font-bold text-xs pb-1 border-b border-slate-300">
                      <span>CONSOLIDADO POR PROCESSO DE LAVADO</span>
                      <span className="text-[10px] text-slate-500 font-normal">DISTRIBUIÇÃO DA PRODUÇÃO</span>
                    </div>

                    <div className="grid grid-cols-12 font-bold text-[11px] text-slate-700 py-1 border-b border-dashed border-slate-200">
                      <span className="col-span-5">LAVADO / RECEITA</span>
                      <span className="col-span-2 text-center">LOTES</span>
                      <span className="col-span-2 text-right">PESO (KG)</span>
                      <span className="col-span-3 text-right">QUANTIDADE (PÇS)</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {processReport.entries.map(([procName, data]) => {
                        const pct = totalLavadoPieces > 0 ? ((data.pieces / totalLavadoPieces) * 100).toFixed(1) : '0';
                        return (
                          <div key={procName} className="grid grid-cols-12 items-center py-0.5 border-b border-dotted border-slate-100 font-mono">
                            <span className="col-span-5 font-sans font-bold text-slate-800 truncate" title={procName}>
                              {procName}
                            </span>
                            <span className="col-span-2 text-center text-slate-600">
                              {data.count} lote(s)
                            </span>
                            <span className="col-span-2 text-right text-slate-600">
                              {data.kg.toFixed(2)} kg
                            </span>
                            <span className="col-span-3 text-right font-bold text-slate-900">
                              {data.pieces.toLocaleString('pt-BR')} Pcs <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-12 items-center pt-1.5 border-t border-slate-300 font-bold text-xs font-mono">
                      <span className="col-span-5 font-sans">SUBTOTAL LAVAGEM:</span>
                      <span className="col-span-2 text-center">{processReport.totalLotes} lotes</span>
                      <span className="col-span-2 text-right">{processReport.totalKg.toFixed(2)} kg</span>
                      <span className="col-span-3 text-right text-sm">{processReport.totalPieces.toLocaleString('pt-BR')} Pcs</span>
                    </div>
                  </div>
                )}

                {/* Separador se ambos forem exibidos */}
                {lavadoViewMode === 'completo' && (
                  <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-1">
                    ------------------------------------------------------------------------------------------------------------------------
                  </div>
                )}

                {/* 2. SEÇÃO LISTAGEM DETALHADA DE PEDIDOS / LOTES */}
                {(lavadoViewMode === 'completo' || lavadoViewMode === 'pedidos') && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center font-bold text-xs pb-1 border-b border-slate-300">
                      <span>LISTAGEM DETALHADA DOS PEDIDOS / LOTES</span>
                      <span className="text-[10px] text-slate-500 font-normal">{filteredOrders.length} registros</span>
                    </div>

                    {/* Cabeçalho da Tabela de Pedidos */}
                    <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-700 py-1 border-b border-dashed border-slate-200">
                      <span className="col-span-2">PEDIDO / OS</span>
                      <span className="col-span-3">CLIENTE</span>
                      <span className="col-span-2">ROUPA / CORTE</span>
                      <span className="col-span-2">LAVADO / RECEITA</span>
                      <span className="col-span-1 text-right">PÇS</span>
                      <span className="col-span-1 text-right">KG</span>
                      <span className="col-span-1 text-center">STATUS</span>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono">
                      {filteredOrders.map(order => {
                        const firstItem = order.items?.[0];
                        const clothing = firstItem?.clothingType || 'Peça';
                        const corte = order.corteOs || firstItem?.corteOs;
                        const processName = firstItem?.process || '—';
                        const entryDate = getLocalDateString(order.createdAt).split('-').reverse().slice(0, 2).join('/');

                        return (
                          <div key={order.id} className="grid grid-cols-12 items-center py-1 border-b border-dotted border-slate-100 hover:bg-slate-50">
                            {/* Coluna 1: OS e Data */}
                            <span className="col-span-2 truncate">
                              <strong className="text-slate-900">{order.osNumber}</strong>
                              <span className="text-[10px] text-slate-400 block">{entryDate}</span>
                            </span>

                            {/* Coluna 2: Cliente */}
                            <span className="col-span-3 font-sans truncate pr-1" title={order.clientName}>
                              <span className="font-semibold text-slate-800">{order.clientName}</span>
                            </span>

                            {/* Coluna 3: Roupa e Corte */}
                            <span className="col-span-2 truncate text-[10px] text-slate-600">
                              <span className="font-medium text-slate-800 block truncate">{clothing}</span>
                              {corte && <span className="text-slate-400 block truncate">CORTE: {corte}</span>}
                            </span>

                            {/* Coluna 4: Lavado / Processo */}
                            <span className="col-span-2 truncate text-slate-700 font-sans text-[11px]">
                              {processName}
                            </span>

                            {/* Coluna 5: Peças */}
                            <span className="col-span-1 text-right font-bold text-slate-900">
                              {order.estimatedPieceCount || 0}
                            </span>

                            {/* Coluna 6: Peso Kg */}
                            <span className="col-span-1 text-right text-slate-600 text-[10px]">
                              {(order.totalWeightKg || 0).toFixed(1)}
                            </span>

                            {/* Coluna 7: Status */}
                            <span className="col-span-1 text-center">
                              <span className="text-[9px] uppercase px-1 py-0.5 rounded font-sans font-bold border border-slate-300">
                                {getOrderStatusBadge(order.status)}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Separador e Totais Finais do Relatório */}
                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-1">
                  ------------------------------------------------------------------------------------------------------------------------
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 font-bold text-xs pt-1">
                  <span>TOTAL GERAL APURADO ({getStatusFilterLabel(lavadoStatusFilter)}):</span>
                  <div className="flex items-center gap-6 font-mono text-sm">
                    <span>{filteredOrders.length} lotes</span>
                    <span>{totalLavadoKg.toFixed(2)} kg</span>
                    <span className="text-base text-slate-900 font-black">{totalLavadoPieces.toLocaleString('pt-BR')} Pcs</span>
                  </div>
                </div>
              </>
            )}
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
                <div className="flex justify-between font-bold text-xs pb-1 border-b border-slate-300">
                  <span>HISTÓRICO DE LOTES PASSADOS</span>
                  <span>QUANTIDADE & VALOR</span>
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
                      <div key={l.id || idx} className="flex justify-between items-center py-1 border-b border-dashed border-slate-200">
                        <span>
                          <strong>{l.osNumber}</strong> • {l.clientName || 'Cliente'} • {new Date(l.timestamp).toLocaleDateString('pt-BR')} às {new Date(l.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900">+{l.piecesIroned} Pcs</span>
                          <span className="text-slate-500 text-[10px] ml-2">
                            ({Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.piecesIroned * (selectedPassador.ratePerPiece ?? 0.15))})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-2">
                  ------------------------------------------------------------------------------------------------------------------------
                </div>

                <div className="space-y-1 pt-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span>Total de Lotes Passados:</span>
                    <span>{selectedPassador.logs.length} lotes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor Unitário da Roupa Passada:</span>
                    <span className="font-bold text-slate-800">
                      {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPassador.ratePerPiece ?? 0.15)} / peça
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                    <span>Qtd Total Peças Passadas ({selectedPassador.name}):</span>
                    <span>{selectedPassador.totalPiecesInPeriod.toLocaleString('pt-BR')} Pcs</span>
                  </div>
                  <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t border-slate-300">
                    <span>VALOR TOTAL A RECEBER / A PAGAR:</span>
                    <span className="text-lg font-black text-emerald-800">
                      {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPassador.totalValueInPeriod)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* RELATÓRIO GERAL DE TODOS OS PASSADORES */
              <div className="space-y-2">
                <div className="grid grid-cols-12 font-bold text-xs uppercase pb-1 border-b border-slate-300">
                  <span className="col-span-5">COLABORADOR / PASSADOR</span>
                  <span className="col-span-2 text-center">LOTES</span>
                  <span className="col-span-2 text-right">QUANTIDADE</span>
                  <span className="col-span-1 text-right">VALOR/PÇ</span>
                  <span className="col-span-2 text-right">TOTAL A PAGAR</span>
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
                        <div className="grid grid-cols-12 items-center font-bold py-1">
                          <div className="col-span-5 flex items-center gap-2">
                            <span className="truncate">{pas.name.toUpperCase()}</span>
                            {/* Botão de impressão individual visível na tela */}
                            <button
                              type="button"
                              onClick={() => handlePrintIndividualPassador(pas.id)}
                              className="no-print text-[10px] text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded border border-sky-300 font-bold inline-flex items-center gap-1 transition-colors"
                              title="Imprimir somente este passador individualmente"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Imprimir</span>
                            </button>
                          </div>
                          <span className="col-span-2 text-center font-mono text-slate-600">
                            {pas.logs.length} lote(s)
                          </span>
                          <span className="col-span-2 text-right font-mono font-bold text-sm text-slate-900">
                            {pas.totalPiecesInPeriod.toLocaleString('pt-BR')} Pcs
                          </span>
                          <span className="col-span-1 text-right font-mono text-slate-600">
                            {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pas.ratePerPiece ?? 0.15)}
                          </span>
                          <span className="col-span-2 text-right font-mono font-bold text-sm text-emerald-800">
                            {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pas.totalValueInPeriod)}
                          </span>
                        </div>

                        {/* Detalhamento simples dos pedidos passados por ele */}
                        {pas.logs.length > 0 && (
                          <div className="pl-4 text-[11px] text-slate-600 space-y-0.5 font-mono">
                            {pas.logs.map(l => (
                              <div key={l.id} className="flex justify-between">
                                <span>{l.osNumber} • {l.clientName} ({new Date(l.timestamp).toLocaleDateString('pt-BR')})</span>
                                <span className="font-semibold">
                                  +{l.piecesIroned} Pcs ({Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.piecesIroned * (pas.ratePerPiece ?? 0.15))})
                                </span>
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

                <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 font-bold text-sm pt-1">
                  <span>TOTAL GERAL PASSADORIA (TODOS):</span>
                  <div className="flex items-center gap-6 font-mono text-sm">
                    <span>{passadorReports.reduce((s, p) => s + p.logs.length, 0)} lotes</span>
                    <span className="text-base text-slate-900 font-bold">{totalPassadorPieces.toLocaleString('pt-BR')} Pcs</span>
                    <span className="text-base text-emerald-800 font-black">
                      {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPassadorValue)}
                    </span>
                  </div>
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
