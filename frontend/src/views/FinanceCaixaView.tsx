import React, { useState, useMemo, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Wallet, 
  X, 
  Tag, 
  Printer, 
  Calendar, 
  CheckSquare, 
  Square, 
  Building2,
  Receipt,
  History,
  FileText,
  ShieldCheck,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Order } from '../types';
import { getDatePresets, getLocalDateString } from '../utils/dateUtils';
import { Pagination } from '../components/common/Pagination';

export const FinanceCaixaView: React.FC = () => {
  const { orders, clients, payMultipleInvoiceOrders } = useOrders();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Paginação simples de 20 registros por página
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // Estados para Auditoria & Histórico Financeiro
  const [selectedOrderForHistory, setSelectedOrderForHistory] = useState<Order | null>(null);

  // ─── PERÍODO & DATAS (Fuso Horário America/Sao_Paulo) ─────────────────────────
  const { todayStr, firstDayOfMonth, lastDayOfMonth, sevenDaysAgo } = useMemo(() => getDatePresets(), []);

  const [periodPreset, setPeriodPreset] = useState<'hoje' | 'semana' | 'mes' | 'custom'>('mes');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [reportStatusFilter, setReportStatusFilter] = useState<'todos' | 'aberto' | 'pago'>('todos');

  // Reset da página ao alterar filtros ou busca
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, reportStatusFilter, searchTerm]);

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

  // ─── CLIENTES CONSOLIDADOS ──────────────────────────────────────────────────
  const uniqueClients = useMemo(() => {
    const map = new Map<string, { id: string; name: string; companyName?: string; phone?: string; cnpjCpf?: string; address?: string }>();
    clients.forEach(c => {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        phone: c.phone,
        cnpjCpf: c.cnpjCpf,
        address: c.address
      });
    });
    orders.forEach(o => {
      const key = o.clientId || o.clientName.toLowerCase();
      if (!map.has(key) && !Array.from(map.values()).some(c => c.name.toLowerCase() === o.clientName.toLowerCase())) {
        map.set(key, {
          id: o.clientId || `cli-${o.clientName.toLowerCase().replace(/\s+/g, '-')}`,
          name: o.clientName,
          companyName: o.clientName,
          phone: o.clientPhone,
          address: o.clientAddress
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, orders]);

  // ─── FILTRAGEM DE ORDENS DE SERVIÇO ─────────────────────────────────────────
  const reportOrders = useMemo(() => {
    return orders.filter(ord => {
      const orderDate = getLocalDateString(ord.createdAt);
      const inDateRange = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
      if (!inDateRange) return false;

      // Filtro de Status
      const payStat = ord.paymentStatus || 'aberto';
      if (reportStatusFilter === 'aberto' && payStat !== 'aberto') return false;
      if (reportStatusFilter === 'pago' && payStat !== 'pago') return false;

      // Busca geral: filtra por nome do cliente, telefone, CNPJ, Nº OS ou corte
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          ord.osNumber.toLowerCase().includes(term) ||
          ord.clientName.toLowerCase().includes(term) ||
          (ord.corteOs && ord.corteOs.toLowerCase().includes(term)) ||
          (ord.clientPhone && ord.clientPhone.includes(term));
        if (!matchesSearch) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, startDate, endDate, reportStatusFilter, searchTerm]);

  // Paginação dos 20 registros mais recentes em tela
  const paginatedReportOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return reportOrders.slice(start, start + PAGE_SIZE);
  }, [reportOrders, currentPage]);

  // Identifica se todas as ordens filtradas pertencem a um mesmo cliente (para fatura personalizada)
  const filteredClient = useMemo(() => {
    if (reportOrders.length === 0) return null;
    const firstClientKey = (reportOrders[0].clientId || reportOrders[0].clientName).toLowerCase();
    const isSingleClient = reportOrders.every(o => (o.clientId || o.clientName).toLowerCase() === firstClientKey);

    if (isSingleClient) {
      const found = uniqueClients.find(c => 
        (reportOrders[0].clientId && c.id === reportOrders[0].clientId) ||
        c.name.toLowerCase() === reportOrders[0].clientName.toLowerCase()
      );
      if (found) return found;
      return {
        id: reportOrders[0].clientId || 'cli',
        name: reportOrders[0].clientName,
        companyName: reportOrders[0].clientName,
        phone: reportOrders[0].clientPhone,
        address: reportOrders[0].clientAddress
      };
    }
    return null;
  }, [reportOrders, uniqueClients]);

  // ─── TOTAIS GERAIS DO PERÍODO FILTRADO ──────────────────────────────────────
  const reportOpenOrders = reportOrders.filter(o => (o.paymentStatus || 'aberto') === 'aberto');
  const reportPaidOrders = reportOrders.filter(o => o.paymentStatus === 'pago');
  const reportTotalGross = reportOrders.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);
  const reportTotalOpen = reportOpenOrders.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);
  const reportTotalPaid = reportPaidOrders.reduce((sum, o) => sum + (o.finalPaidAmount || o.totalServiceValue || 0), 0);
  const reportTotalDiscount = reportPaidOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const reportTotalPieces = reportOrders.reduce((sum, o) => sum + (o.estimatedPieceCount || 0), 0);
  const reportTotalWeight = reportOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);

  // ─── SELEÇÃO PARA BAIXA EM TODOS / UNIFICADA ────────────────────────────────
  const [selectedOrderIdsForUnifiedPay, setSelectedOrderIdsForUnifiedPay] = useState<string[]>([]);
  const [isUnifiedPayModalOpen, setIsUnifiedPayModalOpen] = useState(false);
  const [unifiedDiscountType, setUnifiedDiscountType] = useState<'fixed' | 'pct'>('fixed');
  const [unifiedDiscountValue, setUnifiedDiscountValue] = useState<number>(0);
  const [unifiedPaymentMethod, setUnifiedPaymentMethod] = useState<string>('pix');
  const [unifiedReceiverName, setUnifiedReceiverName] = useState<string>('');
  const [unifiedNotes, setUnifiedNotes] = useState<string>('');
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);

  // Ao alterar filtros ou busca, limpa seleções (não seleciona todos por padrão)
  useEffect(() => {
    setSelectedOrderIdsForUnifiedPay([]);
  }, [startDate, endDate, reportStatusFilter, searchTerm]);

  const selectedOrdersToPay = reportOpenOrders.filter(o => selectedOrderIdsForUnifiedPay.includes(o.id));
  const selectedGrossToPay = selectedOrdersToPay.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);
  const selectedPiecesToPay = selectedOrdersToPay.reduce((sum, o) => sum + (o.estimatedPieceCount || 0), 0);

  const getUnifiedDiscountAmount = (): number => {
    if (unifiedDiscountType === 'pct') {
      return Math.min(selectedGrossToPay, (selectedGrossToPay * unifiedDiscountValue) / 100);
    }
    return Math.min(selectedGrossToPay, unifiedDiscountValue);
  };
  const unifiedFinalPayAmount = Math.max(0, selectedGrossToPay - getUnifiedDiscountAmount());

  // Toggle de seleção individual / geral
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIdsForUnifiedPay(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOpen = () => {
    if (selectedOrderIdsForUnifiedPay.length === reportOpenOrders.length) {
      setSelectedOrderIdsForUnifiedPay([]);
    } else {
      setSelectedOrderIdsForUnifiedPay(reportOpenOrders.map(o => o.id));
    }
  };

  // Abrir Modal de Baixa
  const handleOpenUnifiedPayModal = () => {
    // Se nenhuma estiver marcada, seleciona todas as abertas do filtro
    if (selectedOrdersToPay.length === 0) {
      if (reportOpenOrders.length === 0) return;
      setSelectedOrderIdsForUnifiedPay(reportOpenOrders.map(o => o.id));
    }
    setUnifiedDiscountValue(0);
    setUnifiedDiscountType('fixed');
    setUnifiedPaymentMethod('pix');
    setUnifiedReceiverName(user?.name || 'Ana (Financeiro)');
    setUnifiedNotes('');
    setIsUnifiedPayModalOpen(true);
  };

  // Abrir Modal de Baixa para uma OS individual
  const handleOpenSinglePayModal = (ord: Order) => {
    setSelectedOrderIdsForUnifiedPay([ord.id]);
    setUnifiedDiscountValue(0);
    setUnifiedDiscountType('fixed');
    setUnifiedPaymentMethod('pix');
    setUnifiedReceiverName(user?.name || 'Ana (Financeiro)');
    setUnifiedNotes('');
    setIsUnifiedPayModalOpen(true);
  };

  const handleConfirmUnifiedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const ordersToExecute = selectedOrdersToPay.length > 0 ? selectedOrdersToPay : reportOpenOrders;
    if (ordersToExecute.length === 0) return;

    const discount = getUnifiedDiscountAmount();
    const receiver = unifiedReceiverName.trim() || user?.name || 'Ana (Financeiro)';
    const operator = user?.name || 'Ana (Financeiro)';

    payMultipleInvoiceOrders(
      ordersToExecute.map(o => o.id),
      discount,
      unifiedPaymentMethod,
      operator,
      undefined,
      receiver,
      unifiedNotes.trim() || undefined
    );

    setFeedbackMsg(
      `Baixa confirmada! ${ordersToExecute.length} OS(s) quitadas — ${unifiedFinalPayAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${unifiedPaymentMethod.toUpperCase()}). Recebido por: ${receiver}.`
    );
    setIsUnifiedPayModalOpen(false);
    setSelectedOrderIdsForUnifiedPay([]);
    setShowPrintConfirm(true);
    setTimeout(() => setFeedbackMsg(null), 8000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header (Oculto na impressão) */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1 font-bold">
            Módulo Financeiro • Extrato & Controle de Faturas
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Gestão Financeira & Faturamento de Serviços
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe ordens em aberto e quitadas, filtre por qualquer cliente ou período, imprima extratos e faturas consolidadas e dê baixa unificada.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0">
          <Wallet className="w-8 h-8" />
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="no-print p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Modal Confirmação de Impressão Pós-Baixa */}
      {showPrintConfirm && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Baixa realizada com sucesso!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Deseja imprimir o comprovante agora?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPrintConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Não, obrigado
              </button>
              <button
                onClick={() => { setShowPrintConfirm(false); window.print(); }}
                className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ─── CARDS DE MÉTRICAS GERAIS (Oculto na impressão) ───────────────── */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: A Receber */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">A Receber (Em Aberto)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono block">
            {reportTotalOpen.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            {reportOpenOrders.length} fatura(s) pendente(s)
          </span>
        </div>

        {/* Card 2: Já Recebido */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Recebido</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
            {reportTotalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            {reportPaidOrders.length} fatura(s) quitada(s)
          </span>
        </div>

        {/* Card 3: Descontos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Descontos Concedidos</span>
            <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-2xl font-bold text-sky-700 dark:text-sky-400 font-mono block">
            {reportTotalDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            Abatimentos registrados
          </span>
        </div>

        {/* Card 4: Faturamento Total */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Faturamento Bruto</span>
            <Receipt className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono block">
            {reportTotalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            {reportTotalPieces.toLocaleString('pt-BR')} peças ({reportTotalWeight.toFixed(1)} kg)
          </span>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL: FILTRO CONSOLIDADO E TABELA ───────────────── */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Barra de Filtros Integrada */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-4">
          {/* Linha Superior: Busca Rápida por Cliente/OS e Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Pesquisar por cliente, Nº OS, telefone, corte..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Limpar pesquisa"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold whitespace-nowrap">
                Status:
              </span>
              <select
                value={reportStatusFilter}
                onChange={e => setReportStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              >
                <option value="todos">Todas as Faturas ({orders.length})</option>
                <option value="aberto">Apenas Em Aberto ({orders.filter(o => (o.paymentStatus || 'aberto') === 'aberto').length})</option>
                <option value="pago">Apenas Pagas ({orders.filter(o => o.paymentStatus === 'pago').length})</option>
              </select>
            </div>
          </div>

          {/* Linha Inferior: Período e Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
            {/* Presets de Período e Seletores de Data */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuickPeriod('hoje')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    periodPreset === 'hoje'
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPeriod('semana')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    periodPreset === 'semana'
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPeriod('mes')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    periodPreset === 'mes'
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Mês
                </button>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-400 text-[11px] uppercase">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setPeriodPreset('custom'); }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 shadow-sm"
                />
                <span className="text-slate-400 text-[11px] uppercase">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setPeriodPreset('custom'); }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 shadow-sm"
                />
              </div>
            </div>

            {/* Botões de Ação Direta */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-sm"
                title="Imprimir relatório ou fatura consolidada do que está filtrado"
              >
                <Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>
                  {filteredClient ? `Imprimir Fatura (${filteredClient.name})` : 'Imprimir Relatório'}
                </span>
              </button>

              {reportOpenOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenUnifiedPayModal}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                  title="Dar baixa unificada em todas as ordens em aberto selecionadas"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Dar baixa em todos
                    {selectedOrdersToPay.length > 0 && selectedOrdersToPay.length < reportOpenOrders.length 
                      ? ` (${selectedOrdersToPay.length})` 
                      : ''}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabela Unificada de Serviços */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                {reportOpenOrders.length > 0 && (
                  <th className="p-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllOpen}
                      title="Selecionar / Desmarcar todas as OSs em aberto"
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      {selectedOrderIdsForUnifiedPay.length === reportOpenOrders.length && reportOpenOrders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-3">Data</th>
                <th className="p-3">Nº OS</th>
                <th className="p-3">Cliente / Confecção</th>
                <th className="p-3">Ref / Corte</th>
                <th className="p-3">Peças & Processo</th>
                <th className="p-3 text-right">Peso (kg)</th>
                <th className="p-3 text-right">Valor R$</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Baixa / Pagamento</th>
                <th className="p-3 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {reportOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400 font-sans">
                    Nenhuma ordem de serviço encontrada com os filtros e busca aplicados.
                  </td>
                </tr>
              ) : (
                paginatedReportOrders.map(ord => {
                  const isPaid = ord.paymentStatus === 'pago';
                  const isSelected = selectedOrderIdsForUnifiedPay.includes(ord.id);
                  const serviceVal = ord.totalServiceValue || 0;

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        !isPaid && isSelected ? 'bg-emerald-100 dark:bg-emerald-900/30 border-l-2 border-l-emerald-500' : ''
                      }`}
                    >
                      {reportOpenOrders.length > 0 && (
                        <td className="p-3 text-center">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOrder(ord.id)}
                              className="text-emerald-600"
                              title={isSelected ? 'Desmarcar OS' : 'Selecionar OS para baixa'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="p-3 text-slate-500 font-sans">
                        {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {ord.osNumber}
                      </td>
                      <td className="p-3 font-sans">
                        <strong className="text-slate-900 dark:text-slate-100 block">{ord.clientName}</strong>
                        {ord.clientPhone && (
                          <span className="text-slate-400 text-[10px] font-mono">{ord.clientPhone}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {ord.corteOs || ord.items.find(i => i.corteOs)?.corteOs || '—'}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {ord.estimatedPieceCount} pçs
                        </span>
                        {ord.items.length > 1 ? (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 mt-0.5 font-mono">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{it.process}:</span>
                                <span>{ord.isRelavado ? 'R$ 0,00' : (it.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            ))}
                            <div className="font-bold text-sky-700 dark:text-sky-400 text-[10px] pt-0.5 border-t border-slate-200 dark:border-slate-700">
                              Total Nota: {ord.isRelavado ? 'R$ 0,00' : (ord.items.reduce((s, it) => s + (it.unitPrice || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {ord.items[0]?.process || 'Lavado'}
                            {ord.items[0]?.unitPrice ? ` (${(ord.items[0].unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {(ord.totalWeightKg || 0).toFixed(1)} kg
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {serviceVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {isPaid ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                            PAGO
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                            EM ABERTO
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-sans">
                        {isPaid ? (
                          <div className="text-right">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block uppercase">
                              {ord.paymentMethod || 'QUITADO'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {ord.paidAt ? new Date(ord.paidAt).toLocaleDateString('pt-BR') : 'Baixado'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botão de Histórico e Auditoria Financeira */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForHistory(ord)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Consultar Histórico & Auditoria Financeira"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Ação Rápida de Baixa Individual se estiver em aberto */}
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleOpenSinglePayModal(ord)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                              title="Dar baixa nesta OS"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação Financeira de 20 registros mais recentes */}
        <Pagination
          currentPage={currentPage}
          totalItems={reportOrders.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          label="faturas"
        />
      </div>

      {/* ─── FOLHA DE IMPRESSÃO / PDF (Exibida exclusivamente ao imprimir) ─── */}
      <div className="print-only bg-white text-black space-y-5 text-xs font-sans">
        {/* Cabeçalho Oficial Simplificado */}
        <div className="border-b-2 border-black pb-3 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-black leading-none">MAUAD LAVANDERIA</h1>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block mt-1">
              {filteredClient ? `FATURA DE SERVIÇOS • ${filteredClient.name.toUpperCase()}` : 'DEMONSTRATIVO CONSOLIDADO'}
            </span>
          </div>
          <div className="text-right text-[11px] font-mono space-y-0.5">
            <div><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Período:</strong> {startDate ? startDate.split('-').reverse().join('/') : ''} até {endDate ? endDate.split('-').reverse().join('/') : ''}</div>
          </div>
        </div>

        {/* Dados do Cliente (exibido se filtrado por um cliente) */}
        {filteredClient && (
          <div className="p-3 border border-black rounded bg-slate-50 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Razão Social / Nome</span>
              <strong className="text-sm">{filteredClient.name}</strong>
              {filteredClient.companyName && filteredClient.companyName !== filteredClient.name && (
                <span className="block text-slate-600 text-xs">({filteredClient.companyName})</span>
              )}
            </div>
            <div>
              <span className="font-bold text-[10px] uppercase text-slate-500 block">WhatsApp / Telefone</span>
              <span className="font-mono font-semibold">{filteredClient.phone || '—'}</span>
            </div>
            {filteredClient.cnpjCpf && (
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-500 block">CNPJ / CPF</span>
                <span className="font-mono">{filteredClient.cnpjCpf}</span>
              </div>
            )}
            {filteredClient.address && (
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-500 block">Endereço</span>
                <span>{filteredClient.address}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabela Impressa de Serviços */}
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-black">
              <th className="border border-black p-1.5 text-left">Data</th>
              <th className="border border-black p-1.5 text-left">Nº OS</th>
              {!filteredClient && <th className="border border-black p-1.5 text-left">Cliente</th>}
              <th className="border border-black p-1.5 text-left">Ref / Corte</th>
              <th className="border border-black p-1.5 text-left">Quantidade & Lavagem</th>
              <th className="border border-black p-1.5 text-right">Peças</th>
              <th className="border border-black p-1.5 text-right">Peso (kg)</th>
              <th className="border border-black p-1.5 text-right">Valor R$</th>
              <th className="border border-black p-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {reportOrders.map(ord => (
              <tr key={ord.id} className="border-b border-slate-300">
                <td className="border border-black p-1.5 font-mono">{new Date(ord.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="border border-black p-1.5 font-mono font-bold">{ord.osNumber}</td>
                {!filteredClient && <td className="border border-black p-1.5">{ord.clientName}</td>}
                <td className="border border-black p-1.5 font-mono">
                  <div>{ord.estimatedPieceCount} pçs</div>
                  {ord.items.length > 1 ? (
                    <div className="text-[10px] text-slate-800 space-y-0.5 mt-0.5">
                      {ord.items.map((it, idx) => (
                        <div key={idx}>
                          • {it.process}: {ord.isRelavado ? 'R$ 0,00' : (it.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      ))}
                      <div className="font-bold border-t border-slate-400 pt-0.5">
                        Total Nota: {ord.isRelavado ? 'R$ 0,00' : (ord.items.reduce((s, it) => s + (it.unitPrice || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-700">
                      {ord.items[0]?.process || 'Lavado'}
                      {ord.items[0]?.unitPrice ? ` (${(ord.items[0].unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` : ''}
                    </div>
                  )}
                </td>
                <td className="border border-black p-1.5 text-right font-mono">{(ord.totalWeightKg || 0).toFixed(1)}</td>
                <td className="border border-black p-1.5 text-right font-mono font-bold">
                  {(ord.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="border border-black p-1.5 text-center font-bold">
                  {ord.paymentStatus === 'pago' ? 'PAGO' : 'A RECEBER'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Quadro de Totais da Fatura */}
        <div className="border-2 border-black p-3 bg-slate-50 flex justify-between items-center text-xs">
          <div className="space-y-0.5">
            <div><strong>Total de OSs:</strong> {reportOrders.length} ordens</div>
            <div><strong>Total de Peças:</strong> {reportTotalPieces.toLocaleString('pt-BR')} peças</div>
            <div><strong>Peso Total:</strong> {reportTotalWeight.toFixed(1)} kg</div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-slate-600">Subtotal dos Serviços: <strong>{reportTotalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
            <div className="text-emerald-700">Total Já Quitado: <strong>{reportTotalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
            <div className="text-base font-extrabold text-black pt-1 border-t border-black">
              SALDO DA FATURA (A PAGAR): {reportTotalOpen.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        {/* Recibo e Detalhamento de Baixa / Quitação no PDF (quando houver pagas) */}
        {reportPaidOrders.length > 0 && (
          <div className="border border-black p-2.5 bg-slate-50 text-[11px] space-y-1">
            <div className="font-bold text-black border-b border-black pb-0.5 flex justify-between">
              <span>COMPROVANTE DE RECEBIMENTO & QUITAÇÃO FINANCEIRA</span>
              <span>{reportPaidOrders.length} OS(s) QUITADA(S)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5 text-[10px]">
              <div>
                <span><strong>Quem Recebeu o Pagamento:</strong> {reportPaidOrders[0].receiverName || reportPaidOrders[0].paidByOperator || 'Departamento Financeiro'}</span>
                <span className="block"><strong>Forma de Pagamento:</strong> {(reportPaidOrders[0].paymentMethod || 'QUITADO').toUpperCase()}</span>
              </div>
              <div>
                <span><strong>Data da Quitação:</strong> {reportPaidOrders[0].paidAt ? new Date(reportPaidOrders[0].paidAt).toLocaleDateString('pt-BR') : 'Registrado'} {reportPaidOrders[0].paidAt ? `às ${new Date(reportPaidOrders[0].paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                <span className="block"><strong>Total Quitado:</strong> {reportTotalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                {reportPaidOrders[0].paymentNotes && (
                  <span className="block text-slate-700 italic"><strong>Obs:</strong> {reportPaidOrders[0].paymentNotes}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assinatura */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
          <div>
            <div className="border-t border-black pt-1 font-bold">
              {reportPaidOrders.length > 0 && reportPaidOrders[0].receiverName
                ? `RECEBIDO POR: ${reportPaidOrders[0].receiverName.toUpperCase()}`
                : 'MAUAD LAVANDERIA INDUSTRIAL'}
            </div>
            <span className="text-slate-500">Departamento Financeiro / Caixa</span>
          </div>
          <div>
            <div className="border-t border-black pt-1">CLIENTE / SACADO / RESPONSÁVEL</div>
            <span className="text-slate-500">Data: _____ / _____ / _________</span>
          </div>
        </div>
      </div>

      {/* ─── MODAL: DAR BAIXA EM TODOS / UNIFICADA ─────────────────────────── */}
      {isUnifiedPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Confirmar Baixa de Pagamento</h3>
                  <p className="text-xs text-slate-400 font-mono">Quitação Financeira e Registro no Histórico</p>
                </div>
              </div>
              <button
                onClick={() => setIsUnifiedPayModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmUnifiedPayment} className="p-6 space-y-4">
              {/* Resumo da Fatura Unificada */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente da Fatura:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-sans text-sm">
                    {filteredClient ? filteredClient.name : 'Vários Clientes Selecionados'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordens de Serviço Selecionadas:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {selectedOrdersToPay.length} OS(s) ({selectedPiecesToPay.toLocaleString('pt-BR')} peças)
                  </strong>
                </div>
                <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
                  {selectedOrdersToPay.map(o => (
                    <span key={o.id} className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">
                      {o.osNumber}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Subtotal Bruto ({selectedOrdersToPay.length} OSs):</span>
                  <span>{selectedGrossToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              {/* Campos de Desconto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Tipo de Desconto
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 w-full">
                    <button
                      type="button"
                      onClick={() => { setUnifiedDiscountType('fixed'); setUnifiedDiscountValue(0); }}
                      className={`flex-1 py-1.5 text-xs font-bold transition-all ${
                        unifiedDiscountType === 'fixed'
                           ? 'bg-emerald-700 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      R$ Fixo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUnifiedDiscountType('pct'); setUnifiedDiscountValue(0); }}
                      className={`flex-1 py-1.5 text-xs font-bold transition-all ${
                        unifiedDiscountType === 'pct'
                          ? 'bg-sky-700 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      % Porcento
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    {unifiedDiscountType === 'fixed' ? 'Desconto no Lote (R$)' : 'Desconto no Lote (%)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">
                      {unifiedDiscountType === 'fixed' ? 'R$' : '%'}
                    </span>
                    <input
                      type="number"
                      step={unifiedDiscountType === 'fixed' ? '0.50' : '0.5'}
                      min="0"
                      max={unifiedDiscountType === 'fixed' ? selectedGrossToPay : 100}
                      value={unifiedDiscountValue}
                      onChange={e => setUnifiedDiscountValue(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Forma de Pagamento & Quem Recebeu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Forma de Pagamento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={unifiedPaymentMethod}
                    onChange={e => setUnifiedPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Quem Recebeu o Pagamento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana (Financeiro) ou Mauad"
                    value={unifiedReceiverName}
                    onChange={e => setUnifiedReceiverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Nome da pessoa ou setor que recebeu os valores
                  </span>
                </div>
              </div>

              {/* Observação (Opcional) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Observação (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago via PIX pelo responsável financeiro"
                  value={unifiedNotes}
                  onChange={e => setUnifiedNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Registrado de forma permanente no histórico e nos comprovantes
                </span>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                    Valor Total Quitado ({selectedOrdersToPay.length} OSs):
                  </span>
                  {unifiedDiscountValue > 0 && (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                      Desconto Rateado: -{getUnifiedDiscountAmount().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                  {unifiedFinalPayAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnifiedPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Baixa de {selectedOrdersToPay.length} OSs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: HISTÓRICO & AUDITORIA FINANCEIRA DA OS (Tarefa 1) ──────── */}
      {selectedOrderForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden transition-colors">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Histórico & Auditoria Financeira • OS {selectedOrderForHistory.osNumber}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Cliente: {selectedOrderForHistory.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForHistory(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans">
              {/* Resumo da Ordem */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Valor Bruto</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">
                    {(selectedOrderForHistory.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Desconto</span>
                  <strong className="text-rose-600 dark:text-rose-400 text-sm">
                    {(selectedOrderForHistory.discountAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Valor Quitado</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 text-sm">
                    {(selectedOrderForHistory.finalPaidAmount || (selectedOrderForHistory.totalServiceValue || 0) - (selectedOrderForHistory.discountAmount || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Status Financeiro</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedOrderForHistory.paymentStatus === 'pago'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {selectedOrderForHistory.paymentStatus === 'pago' ? 'PAGO / QUITADO' : 'EM ABERTO'}
                  </span>
                </div>
              </div>

              {/* Seção 1: Histórico Permanente de Baixas e Pagamentos */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Registro Permanente de Baixas & Pagamentos
                </h4>

                {(!selectedOrderForHistory.paymentHistory || selectedOrderForHistory.paymentHistory.length === 0) ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 font-mono text-xs">
                    {selectedOrderForHistory.paymentStatus === 'pago' ? (
                      <div className="space-y-1 text-left">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Quem Recebeu:</span>
                          <strong>{selectedOrderForHistory.receiverName || selectedOrderForHistory.paidByOperator || 'Caixa'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Data e Hora:</span>
                          <span>{selectedOrderForHistory.paidAt ? new Date(selectedOrderForHistory.paidAt).toLocaleString('pt-BR') : 'Data não informada'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Usuário do Sistema:</span>
                          <span>{selectedOrderForHistory.paidByOperator || 'Sistema'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Forma de Pagamento:</span>
                          <span>{(selectedOrderForHistory.paymentMethod || 'Dinheiro').toUpperCase()}</span>
                        </div>
                        {selectedOrderForHistory.paymentNotes && (
                          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-slate-500">Observações:</span>
                            <span className="italic">{selectedOrderForHistory.paymentNotes}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      'Nenhum pagamento registrado até o momento. Esta ordem de serviço está em aberto.'
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrderForHistory.paymentHistory.map((p, idx) => (
                      <div key={p.id || idx} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60 font-mono text-xs space-y-1">
                        <div className="flex justify-between items-center border-b border-emerald-200 dark:border-emerald-800/60 pb-1">
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">
                            {p.action ? p.action.toUpperCase() : 'BAIXA FINANCEIRA'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(p.paidAt).toLocaleDateString('pt-BR')} às {new Date(p.paidAt).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">QUEM RECEBEU</span>
                            <strong className="text-slate-900 dark:text-slate-100">{p.receiverName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">USUÁRIO QUE BAIXOU</span>
                            <span>{p.performedBy}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">VALOR PAGO / FORMA</span>
                            <strong className="text-emerald-700 dark:text-emerald-400">
                              {(p.finalPaidAmount || p.amountPaid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({p.paymentMethod.toUpperCase()})
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">{p.docRef ? 'DOC / REF' : 'SITUAÇÃO'}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.docRef || 'QUITADO'}</span>
                          </div>
                        </div>
                        {p.notes && (
                          <div className="pt-1.5 border-t border-emerald-100 dark:border-emerald-800/40 text-[11px] text-slate-700 dark:text-slate-300">
                            <span className="font-bold">Observação:</span> {p.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 2: Linha do Tempo e Ações Gerais da OS */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Todas as Ações & Eventos Registrados na OS
                </h4>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {selectedOrderForHistory.history?.map((h, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <strong className="text-slate-900 dark:text-slate-100 block sm:inline mr-2">
                          [{h.operator || 'Operador'}]
                        </strong>
                        <span className="text-slate-600 dark:text-slate-300">{h.note || 'Status atualizado'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(h.timestamp).toLocaleDateString('pt-BR')} às {new Date(h.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedOrderForHistory(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

