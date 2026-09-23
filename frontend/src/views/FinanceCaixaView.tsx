import React, { useState, useMemo, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Search, 
  Wallet, 
  FileSpreadsheet, 
  X, 
  Tag, 
  Printer, 
  Calendar, 
  UserCheck, 
  FileText, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Building,
  Phone
} from 'lucide-react';
import { Order } from '../types';

export const FinanceCaixaView: React.FC = () => {
  const { orders, clients, payInvoiceOrder, payMultipleInvoiceOrders } = useOrders();
  const { user } = useAuth();

  // Aba ativa: 'aberto' | 'pago' | 'relatorio'
  const [activeTab, setActiveTab] = useState<'aberto' | 'pago' | 'relatorio'>('aberto');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<Order | null>(null);

  // Form State para Baixa Individual
  const [discountType, setDiscountType] = useState<'fixed' | 'pct'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // ─── ESTADOS DO RELATÓRIO FINANCEIRO POR CLIENTE & FATURA UNIFICADA ─────────
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [periodPreset, setPeriodPreset] = useState<'hoje' | 'semana' | 'mes' | 'custom'>('mes');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'todos' | 'aberto' | 'pago'>('todos');

  // Seleção de OSs para Baixa Unificada
  const [selectedOrderIdsForUnifiedPay, setSelectedOrderIdsForUnifiedPay] = useState<string[]>([]);
  const [isUnifiedPayModalOpen, setIsUnifiedPayModalOpen] = useState(false);
  const [unifiedDiscountType, setUnifiedDiscountType] = useState<'fixed' | 'pct'>('fixed');
  const [unifiedDiscountValue, setUnifiedDiscountValue] = useState<number>(0);
  const [unifiedPaymentMethod, setUnifiedPaymentMethod] = useState<string>('boleto');
  const [unifiedDocRef, setUnifiedDocRef] = useState<string>('');

  // Ajusta período rápido (mesma pegada dos relatórios)
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

  // Lista única consolidada de clientes
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

  // Cliente selecionado atualmente no filtro
  const selectedClientObj = selectedClientId !== 'all'
    ? uniqueClients.find(c => c.id === selectedClientId)
    : null;

  // Filtra OSs para o Relatório Financeiro
  const reportOrders = useMemo(() => {
    return orders.filter(ord => {
      const orderDate = ord.createdAt.split('T')[0];
      const inDateRange = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
      if (!inDateRange) return false;

      // Filtro de Cliente
      if (selectedClientId !== 'all') {
        const matchesId = ord.clientId === selectedClientId;
        const selectedObj = uniqueClients.find(c => c.id === selectedClientId);
        const matchesName = selectedObj ? ord.clientName.toLowerCase() === selectedObj.name.toLowerCase() : false;
        if (!matchesId && !matchesName) return false;
      }

      // Filtro de Status
      const payStat = ord.paymentStatus || 'aberto';
      if (reportStatusFilter === 'aberto' && payStat !== 'aberto') return false;
      if (reportStatusFilter === 'pago' && payStat !== 'pago') return false;

      // Termo de busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = ord.osNumber.toLowerCase().includes(term) ||
                              ord.clientName.toLowerCase().includes(term) ||
                              (ord.corteOs && ord.corteOs.toLowerCase().includes(term)) ||
                              (ord.clientPhone && ord.clientPhone.includes(term));
        if (!matchesSearch) return false;
      }

      return true;
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, startDate, endDate, selectedClientId, reportStatusFilter, searchTerm, uniqueClients]);

  // Totais do Relatório
  const reportOpenOrders = reportOrders.filter(o => (o.paymentStatus || 'aberto') === 'aberto');
  const reportPaidOrders = reportOrders.filter(o => o.paymentStatus === 'pago');
  const reportTotalGross = reportOrders.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);
  const reportTotalOpen = reportOpenOrders.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);
  const reportTotalPaid = reportPaidOrders.reduce((sum, o) => sum + (o.finalPaidAmount || o.totalServiceValue || 0), 0);
  const reportTotalPieces = reportOrders.reduce((sum, o) => sum + (o.estimatedPieceCount || 0), 0);
  const reportTotalWeight = reportOrders.reduce((sum, o) => sum + (o.totalWeightKg || 0), 0);

  // Sincroniza checkboxes de baixa unificada: por padrão seleciona todas as abertas do filtro
  useEffect(() => {
    setSelectedOrderIdsForUnifiedPay(reportOpenOrders.map(o => o.id));
  }, [startDate, endDate, selectedClientId, reportStatusFilter]);

  // Lista das OSs selecionadas para Baixa Unificada
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

  // Calcula o desconto real em R$ para baixa individual
  const getDiscountAmount = (serviceValue: number): number => {
    if (discountType === 'pct') {
      return Math.min(serviceValue, (serviceValue * discountValue) / 100);
    }
    return Math.min(serviceValue, discountValue);
  };

  // Ordens para as abas padrão (aberto / pago)
  const filteredOrders = orders.filter(ord => {
    const payStat = ord.paymentStatus || 'aberto';
    const matchesTab = activeTab === 'aberto' ? payStat === 'aberto' : payStat === 'pago';
    const term = searchTerm.toLowerCase();
    const matchesSearch = ord.osNumber.toLowerCase().includes(term) ||
                          ord.clientName.toLowerCase().includes(term) ||
                          ord.clientPhone.includes(term);
    return matchesTab && matchesSearch;
  });

  // Métricas Gerais do Caixa
  const openOrders = orders.filter(o => (o.paymentStatus || 'aberto') === 'aberto');
  const paidOrders = orders.filter(o => o.paymentStatus === 'pago');

  const totalOpenValue = openOrders.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);
  const totalPaidValue = paidOrders.reduce((sum, o) => sum + (o.finalPaidAmount || o.totalServiceValue || 0), 0);
  const totalDiscountValue = paidOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);

  const handleOpenPayModal = (ord: Order) => {
    setSelectedOrderForPay(ord);
    setDiscountValue(0);
    setDiscountType('fixed');
    setPaymentMethod('pix');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForPay) return;

    const realDiscount = getDiscountAmount(selectedOrderForPay.totalServiceValue || 0);

    payInvoiceOrder(
      selectedOrderForPay.id,
      realDiscount,
      paymentMethod,
      user?.name || 'Ana (Financeiro)'
    );

    setFeedbackMsg(`Baixa efetuada com sucesso para a ${selectedOrderForPay.osNumber}!`);
    setSelectedOrderForPay(null);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Ação de Baixa em Fatura Unificada
  const handleOpenUnifiedPayModal = () => {
    if (selectedOrdersToPay.length === 0) return;
    setUnifiedDiscountValue(0);
    setUnifiedDiscountType('fixed');
    setUnifiedPaymentMethod('boleto');
    setUnifiedDocRef('');
    setIsUnifiedPayModalOpen(true);
  };

  const handleConfirmUnifiedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrdersToPay.length === 0) return;

    const discount = getUnifiedDiscountAmount();
    payMultipleInvoiceOrders(
      selectedOrdersToPay.map(o => o.id),
      discount,
      unifiedPaymentMethod,
      user?.name || 'Ana (Financeiro)',
      unifiedDocRef.trim() || undefined
    );

    setFeedbackMsg(
      `Fatura unificada baixada com sucesso! ${selectedOrdersToPay.length} OSs quitadas no valor total de ${unifiedFinalPayAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${unifiedPaymentMethod.toUpperCase()}).`
    );
    setIsUnifiedPayModalOpen(false);
    setSelectedOrderIdsForUnifiedPay([]);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header (Oculto na impressão) */}
      <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Módulo Financeiro • Gestão de Caixa & Faturas
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Controle Financeiro & Relatório de Serviços
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o faturamento por cliente, emita extratos por período, imprima faturas e dê baixa em lote (fatura única).
          </p>
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0">
          <Wallet className="w-8 h-8" />
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="no-print p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Métricas do Caixa Geral (Oculto na impressão) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">A Receber (Em Aberto)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono block">
            {totalOpenValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">{openOrders.length} fatura(s) pendente(s)</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Recebido (Baixado)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono block">
            {totalPaidValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">{paidOrders.length} fatura(s) paga(s)</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Descontos Concedidos</span>
            <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-2xl font-bold text-sky-700 dark:text-sky-400 font-mono block">
            {totalDiscountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Abatimento acumulado no caixa</span>
        </div>
      </div>

      {/* Barra de Abas Principais (Oculto na impressão) */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('aberto')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'aberto'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Faturas em Aberto ({openOrders.length})
            </button>

            <button
              onClick={() => setActiveTab('pago')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pago'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Faturas Pagas ({paidOrders.length})
            </button>

            <button
              onClick={() => setActiveTab('relatorio')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'relatorio'
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-sky-200 dark:border-sky-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Relatório por Cliente & Fatura Unificada
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar OS, cliente ou corte..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* ─── ABA 3: RELATÓRIO DE SERVIÇOS POR CLIENTE & FATURA UNIFICADA ─── */}
        {activeTab === 'relatorio' && (
          <div className="p-6 space-y-6">
            {/* Painel de Filtros estilo PassadorReportView */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 text-xs">
              {/* Linha 1: Período Rápido & Datas */}
              <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] uppercase mr-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Período:
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickPeriod('hoje')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                      periodPreset === 'hoje'
                        ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Hoje (Dia)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPeriod('semana')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                      periodPreset === 'semana'
                        ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Semanal (7 Dias)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickPeriod('mes')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                      periodPreset === 'mes'
                        ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Mensal (Mês Atual)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setPeriodPreset('custom'); }}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-slate-400">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setPeriodPreset('custom'); }}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Linha 2: Filtro por Cliente & Status */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      Filtrar por Cliente:
                    </span>
                    <select
                      value={selectedClientId}
                      onChange={e => setSelectedClientId(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 max-w-xs truncate"
                    >
                      <option value="all">TODOS OS CLIENTES (GERAL)</option>
                      {uniqueClients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name.toUpperCase()} {c.companyName && c.companyName !== c.name ? `(${c.companyName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] uppercase">Status:</span>
                    <select
                      value={reportStatusFilter}
                      onChange={e => setReportStatusFilter(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      <option value="todos">Todas as Faturas</option>
                      <option value="aberto">Apenas Em Aberto (A Receber)</option>
                      <option value="pago">Apenas Pagas</option>
                    </select>
                  </div>
                </div>

                {/* Botões de Ação: Imprimir e Baixa Unificada */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-sm"
                    title="Imprimir extrato/fatura consolidada"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-600" />
                    <span>{selectedClientObj ? `Imprimir Fatura (${selectedClientObj.name})` : 'Imprimir Relatório Geral'}</span>
                  </button>

                  {selectedOrdersToPay.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenUnifiedPayModal}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 animate-pulse"
                      title="Quitar todas as ordens selecionadas com um único boleto/PIX"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dar Baixa Unificada ({selectedOrdersToPay.length} OSs • {selectedGrossToPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo do Relatório Filtrado */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de OSs</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{reportOrders.length}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Peças Totais</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{reportTotalPieces.toLocaleString('pt-BR')} pçs</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Faturamento Bruto</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{reportTotalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Já Recebido</span>
                <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{reportTotalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Saldo a Receber</span>
                <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">{reportTotalOpen.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>

            {/* Tabela de OSs do Relatório */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {reportOpenOrders.length > 0 && (
                      <th className="p-3 w-8 text-center">
                        <button
                          type="button"
                          onClick={handleSelectAllOpen}
                          title="Selecionar / Desmarcar todas as OSs em aberto"
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {reportOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-sans">
                        Nenhuma ordem de serviço encontrada no período de {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''} a {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}.
                      </td>
                    </tr>
                  ) : (
                    reportOrders.map(ord => {
                      const isPaid = ord.paymentStatus === 'pago';
                      const isSelected = selectedOrderIdsForUnifiedPay.includes(ord.id);
                      const serviceVal = ord.totalServiceValue || 0;

                      return (
                        <tr
                          key={ord.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                            !isPaid && isSelected ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          {reportOpenOrders.length > 0 && (
                            <td className="p-3 text-center">
                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectOrder(ord.id)}
                                  className="text-emerald-600"
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
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {ord.corteOs || ord.items.find(i => i.corteOs)?.corteOs || '—'}
                          </td>
                          <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                            <span>{ord.estimatedPieceCount} pçs</span>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {ord.items.map(i => i.process).join(', ')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {(ord.totalWeightKg || 0).toFixed(1)} kg
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {serviceVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-3 text-center font-sans">
                            {isPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                                PAGO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                                EM ABERTO
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-sans">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(ord)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                                title="Dar baixa apenas nesta OS"
                              >
                                Baixa Avulsa
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono" title={ord.paidAt}>
                                {ord.paidAt ? new Date(ord.paidAt).toLocaleDateString('pt-BR') : 'Baixado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── ABAS 1 E 2: FATURAS EM ABERTO / FATURAS PAGAS ─── */}
        {activeTab !== 'relatorio' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Nº OS</th>
                  <th className="p-4">Cliente / Empresa</th>
                  <th className="p-4">Peças & Processo</th>
                  <th className="p-4 text-right">Valor do Serviço</th>
                  {activeTab === 'pago' && (
                    <>
                      <th className="p-4 text-right">Desconto</th>
                      <th className="p-4 text-right">Valor Pago</th>
                      <th className="p-4 text-center">Forma Pagto</th>
                    </>
                  )}
                  <th className="p-4 text-center">Status Caixa</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                      Nenhuma fatura encontrada nesta categoria ({activeTab === 'aberto' ? 'Em Aberto' : 'Pagas'}).
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(ord => {
                    const serviceVal = ord.totalServiceValue || 0;
                    const isPaid = ord.paymentStatus === 'pago';

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{ord.osNumber}</td>
                        <td className="p-4 font-sans">
                          <strong className="text-slate-900 dark:text-slate-100 block">{ord.clientName}</strong>
                          <span className="text-slate-400 text-[11px] font-mono">{ord.clientPhone}</span>
                        </td>
                        <td className="p-4 font-sans text-slate-700 dark:text-slate-300">
                          <div>{ord.estimatedPieceCount} pçs</div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {ord.items.map(i => i.process).join(', ')}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {serviceVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        {isPaid && (
                          <>
                            <td className="p-4 text-right text-rose-600 dark:text-rose-400">
                              -{(ord.discountAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              {(ord.finalPaidAmount || serviceVal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-4 text-center uppercase font-sans text-[11px]">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {ord.paymentMethod || 'PIX'}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="p-4 text-center font-sans">
                          {isPaid ? (
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                              PAGO
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md text-xs font-semibold border border-amber-200 dark:border-amber-800">
                              EM ABERTO
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-sans">
                          {!isPaid ? (
                            <button
                              onClick={() => handleOpenPayModal(ord)}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                            >
                              Dar Baixa no Caixa
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">
                              {ord.paidAt ? new Date(ord.paidAt).toLocaleDateString('pt-BR') : 'Baixado'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── FOLHA DE IMPRESSÃO CONSOLIDADA (Exibida apenas ao imprimir) ───── */}
      <div className="print-only bg-white text-black p-6 space-y-6 text-xs font-sans">
        {/* Cabeçalho Oficial */}
        <div className="border-b-2 border-black pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-black">MAUAD LAVANDERIA</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-600 font-mono">
              Controle Financeiro & Processamento Têxtil Especializado
            </p>
            <p className="text-[11px] text-slate-700 mt-1">
              Extrato Financeiro Consolidado • Fatura de Serviços
            </p>
          </div>
          <div className="text-right text-[10px] font-mono space-y-0.5">
            <div><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Período:</strong> {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''} até {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</div>
            {selectedClientObj && <div className="text-black font-bold uppercase">Cliente: {selectedClientObj.name}</div>}
          </div>
        </div>

        {/* Dados do Cliente */}
        {selectedClientObj ? (
          <div className="p-3 border border-black rounded bg-slate-50 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-bold text-[10px] uppercase text-slate-500 block">Razão Social / Nome</span>
              <strong className="text-sm">{selectedClientObj.name}</strong>
              {selectedClientObj.companyName && selectedClientObj.companyName !== selectedClientObj.name && (
                <span className="block text-slate-600 text-xs">({selectedClientObj.companyName})</span>
              )}
            </div>
            <div>
              <span className="font-bold text-[10px] uppercase text-slate-500 block">WhatsApp / Telefone</span>
              <span className="font-mono font-semibold">{selectedClientObj.phone || '—'}</span>
            </div>
            {selectedClientObj.cnpjCpf && (
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-500 block">CNPJ / CPF</span>
                <span className="font-mono">{selectedClientObj.cnpjCpf}</span>
              </div>
            )}
            {selectedClientObj.address && (
              <div>
                <span className="font-bold text-[10px] uppercase text-slate-500 block">Endereço</span>
                <span>{selectedClientObj.address}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 border border-slate-400 text-[11px] font-bold uppercase text-center bg-slate-100">
            Demonstrativo Consolidado de Todos os Clientes
          </div>
        )}

        {/* Tabela Impressa de Serviços */}
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-black">
              <th className="border border-black p-1.5 text-left">Data</th>
              <th className="border border-black p-1.5 text-left">Nº OS</th>
              {!selectedClientObj && <th className="border border-black p-1.5 text-left">Cliente</th>}
              <th className="border border-black p-1.5 text-left">Ref / Corte</th>
              <th className="border border-black p-1.5 text-left">Processo / Serviço</th>
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
                {!selectedClientObj && <td className="border border-black p-1.5">{ord.clientName}</td>}
                <td className="border border-black p-1.5 font-mono">{ord.corteOs || ord.items.find(i => i.corteOs)?.corteOs || '—'}</td>
                <td className="border border-black p-1.5">{ord.items.map(i => `${i.clothingType || ''} (${i.process})`).join('; ')}</td>
                <td className="border border-black p-1.5 text-right font-mono">{ord.estimatedPieceCount}</td>
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

        {/* Informações Bancárias para Pagamento */}
        <div className="p-3 border border-dashed border-slate-600 rounded text-[10px] space-y-1">
          <strong>INSTRUÇÕES DE PAGAMENTO (BOLETO / PIX):</strong>
          <p>
            Favor efetuar o pagamento do valor consolidado utilizando o boleto emitido ou transferência via PIX.
          </p>
          <p className="font-mono text-xs">
            Chave PIX Oficial: <strong>contato@sysmauad.com.br</strong> (Mauad Lavanderia Industrial)
          </p>
        </div>

        {/* Assinatura */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px]">
          <div>
            <div className="border-t border-black pt-1">MAUAD LAVANDERIA INDUSTRIAL</div>
            <span className="text-slate-500">Departamento Financeiro</span>
          </div>
          <div>
            <div className="border-t border-black pt-1">RECEBIDO POR (CLIENTE / RESPONSÁVEL)</div>
            <span className="text-slate-500">Data: _____ / _____ / _________</span>
          </div>
        </div>
      </div>

      {/* ─── MODAL: BAIXA EM FATURA UNIFICADA (LOTE / BOLETO ÚNICO) ──────── */}
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
                  <h3 className="font-bold text-base text-white">Baixa em Fatura Unificada</h3>
                  <p className="text-xs text-slate-400 font-mono">Quitação em Lote com Boleto / Pagamento Único</p>
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
            <form onSubmit={handleConfirmUnifiedPayment} className="p-6 space-y-5">
              {/* Resumo da Fatura Unificada */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente da Fatura:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-sans text-sm">
                    {selectedClientObj ? selectedClientObj.name : 'Vários Clientes Selecionados'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordens de Serviço Selecionadas:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {selectedOrdersToPay.length} OS(s) ({selectedPiecesToPay.toLocaleString('pt-BR')} peças)
                  </strong>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
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

              {/* Campos de Desconto & Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Tipo de Desconto
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 w-full">
                    <button
                      type="button"
                      onClick={() => { setUnifiedDiscountType('fixed'); setUnifiedDiscountValue(0); }}
                      className={`flex-1 py-2 text-xs font-bold transition-all ${
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
                      className={`flex-1 py-2 text-xs font-bold transition-all ${
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
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                      {unifiedDiscountType === 'fixed' ? 'R$' : '%'}
                    </span>
                    <input
                      type="number"
                      step={unifiedDiscountType === 'fixed' ? '0.50' : '0.5'}
                      min="0"
                      max={unifiedDiscountType === 'fixed' ? selectedGrossToPay : 100}
                      value={unifiedDiscountValue}
                      onChange={e => setUnifiedDiscountValue(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={unifiedPaymentMethod}
                    onChange={e => setUnifiedPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="boleto">Boleto Bancário (Fatura Única)</option>
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Nº Documento / Boleto Ref.
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Boleto 09/2026 - Lote 1"
                    value={unifiedDocRef}
                    onChange={e => setUnifiedDocRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
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

      {/* ─── MODAL: BAIXA INDIVIDUAL (UMA ÚNICA OS) ───────────────────────── */}
      {selectedOrderForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Dar Baixa na Fatura / Caixa</h3>
                  <p className="text-xs text-slate-400 font-mono">Registro de Pagamento & Desconto</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForPay(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-5">
              {/* Client & OS Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nº da OS:</span>
                  <strong className="text-slate-900 dark:text-slate-100">{selectedOrderForPay.osNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-sans">{selectedOrderForPay.clientName}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Peças & Processo:</span>
                  <span>{selectedOrderForPay.estimatedPieceCount} pçs ({selectedOrderForPay.items.map(i => i.process).join(', ')})</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-sky-700 dark:text-sky-400 pt-1">
                  <span>Valor do Serviço Original:</span>
                  <span>{(selectedOrderForPay.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              {/* Payment Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Tipo de Desconto
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 w-full">
                    <button
                      type="button"
                      onClick={() => { setDiscountType('fixed'); setDiscountValue(0); }}
                      className={`flex-1 py-2 text-xs font-bold transition-all ${
                        discountType === 'fixed'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      R$ Valor Fixo
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiscountType('pct'); setDiscountValue(0); }}
                      className={`flex-1 py-2 text-xs font-bold transition-all ${
                        discountType === 'pct'
                          ? 'bg-sky-700 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      % Porcentagem
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    {discountType === 'fixed' ? 'Desconto (R$)' : 'Desconto (%)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                      {discountType === 'fixed' ? 'R$' : '%'}
                    </span>
                    <input
                      type="number"
                      step={discountType === 'fixed' ? '0.50' : '0.5'}
                      min="0"
                      max={discountType === 'fixed' ? (selectedOrderForPay.totalServiceValue || 0) : 100}
                      value={discountValue}
                      onChange={e => setDiscountValue(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {discountType === 'pct' && discountValue > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      = {getDiscountAmount(selectedOrderForPay.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto / Transferência Bancária</option>
                  <option value="dinheiro">Dinheiro Espécie</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                </select>
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                    Valor Final Pago:
                  </span>
                  {discountValue > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Desconto: -{getDiscountAmount(selectedOrderForPay.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                  {Math.max(0, (selectedOrderForPay.totalServiceValue || 0) - getDiscountAmount(selectedOrderForPay.totalServiceValue || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPay(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Recebimento / Dar Baixa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
