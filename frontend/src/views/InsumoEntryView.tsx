import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import {
  PackagePlus, Search, Calendar, X, CheckCircle2,
  FileText, Truck, Building2, Eye, EyeOff, Printer,
  DollarSign, ArrowUpDown, Layers, Phone, Hash
} from 'lucide-react';
import { Pagination } from '../components/common/Pagination';
import { getDatePresets, getLocalDateString } from '../utils/dateUtils';

type SubTab = 'entradas' | 'relatorio';

export const InsumoEntryView: React.FC = () => {
  const { stockItems, insumoEntries, suppliers, addInsumoEntry, addSupplier } = useOrders();
  const { user } = useAuth();

  const [subTab, setSubTab] = useState<SubTab>('entradas');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Controle de visibilidade de dados sensíveis (oculto por padrão)
  const [showValues, setShowValues] = useState<boolean>(false);

  const formatMoney = (val: number, fallback = 'R$ •••••'): string => {
    if (!showValues) return fallback;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Presets de Data (America/Sao_Paulo)
  const { todayStr, firstDayOfMonth, lastDayOfMonth, sevenDaysAgo } = useMemo(() => getDatePresets(), []);

  const [periodPreset, setPeriodPreset] = useState<'hoje' | 'semana' | 'mes' | 'todos' | 'custom'>('mes');
  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(lastDayOfMonth);
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('todos');
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');

  const [entStockItemId, setEntStockItemId] = useState('');
  const [entSupplierId, setEntSupplierId] = useState('');
  const [entQuantity, setEntQuantity] = useState<number>(20);
  const [entUnitPrice, setEntUnitPrice] = useState<number>(0);
  const [entInvoiceRef, setEntInvoiceRef] = useState('');

  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCnpj, setSupCnpj] = useState('');

  const selectedStock = stockItems.find(s => s.id === entStockItemId);
  const entTotalValue = entQuantity * entUnitPrice;

  // Fechar modais ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEntryModalOpen(false);
        setIsSupplierModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApplyPreset = (preset: 'hoje' | 'semana' | 'mes' | 'todos') => {
    setPeriodPreset(preset);
    if (preset === 'hoje') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'semana') {
      setStartDate(sevenDaysAgo);
      setEndDate(todayStr);
    } else if (preset === 'mes') {
      setStartDate(firstDayOfMonth);
      setEndDate(lastDayOfMonth);
    } else if (preset === 'todos') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entStockItemId || !entSupplierId) return;
    const supplier = suppliers.find(s => s.id === entSupplierId)!;
    const stockItem = stockItems.find(s => s.id === entStockItemId)!;
    addInsumoEntry({
      stockItemId: entStockItemId,
      productName: stockItem.name,
      supplierId: entSupplierId,
      supplierName: supplier.name,
      quantity: entQuantity,
      unit: stockItem.unit,
      unitPrice: entUnitPrice,
      totalValue: entTotalValue,
      enteredAt: new Date().toISOString(),
      operatorName: user?.name || 'Operador',
      invoiceRef: entInvoiceRef || undefined,
    });
    setFeedbackMsg(`Entrada de ${entQuantity} ${stockItem.unit} de "${stockItem.name}" registrada! Estoque atualizado.`);
    setIsEntryModalOpen(false);
    setEntStockItemId(''); setEntSupplierId(''); setEntQuantity(20); setEntUnitPrice(0); setEntInvoiceRef('');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    addSupplier({ name: supName.trim(), phone: supPhone || undefined, cnpj: supCnpj || undefined });
    setSupName(''); setSupPhone(''); setSupCnpj('');
    setIsSupplierModalOpen(false);
    setFeedbackMsg(`Fornecedor "${supName.trim()}" cadastrado com sucesso!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredEntries = insumoEntries.filter(e => {
    const term = searchTerm.toLowerCase();
    return e.productName.toLowerCase().includes(term) || e.supplierName.toLowerCase().includes(term);
  });

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
  }, [filteredEntries]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * 20;
    return sortedEntries.slice(start, start + 20);
  }, [sortedEntries, currentPage]);

  // Relatório de Fornecedores Filtrado
  const reportEntries = useMemo(() => {
    return insumoEntries.filter(e => {
      const d = getLocalDateString(e.enteredAt);
      const isAfterStart = !startDate || d >= startDate;
      const isBeforeEnd = !endDate || d <= endDate;
      const matchesSupplier = selectedSupplierFilter === 'todos' || e.supplierId === selectedSupplierFilter || e.supplierName.toLowerCase() === selectedSupplierFilter.toLowerCase();
      const matchesSearch = !reportSearchTerm.trim() || 
        e.productName.toLowerCase().includes(reportSearchTerm.toLowerCase()) || 
        e.supplierName.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        (e.invoiceRef && e.invoiceRef.toLowerCase().includes(reportSearchTerm.toLowerCase()));
      return isAfterStart && isBeforeEnd && matchesSupplier && matchesSearch;
    });
  }, [insumoEntries, startDate, endDate, selectedSupplierFilter, reportSearchTerm]);

  type SupplierGroup = {
    supplierId: string;
    supplierName: string;
    supplierPhone?: string;
    supplierCnpj?: string;
    totalValue: number;
    totalUnits: { [unit: string]: number };
    items: typeof reportEntries;
  };

  const supplierGroups = useMemo(() => {
    const groups = reportEntries.reduce<SupplierGroup[]>((acc, e) => {
      let group = acc.find(g => g.supplierId === e.supplierId || g.supplierName.toLowerCase() === e.supplierName.toLowerCase());
      if (!group) {
        const foundSup = suppliers.find(s => s.id === e.supplierId || s.name.toLowerCase() === e.supplierName.toLowerCase());
        group = {
          supplierId: e.supplierId,
          supplierName: e.supplierName,
          supplierPhone: foundSup?.phone,
          supplierCnpj: foundSup?.cnpj,
          totalValue: 0,
          totalUnits: {},
          items: []
        };
        acc.push(group);
      }
      group.totalValue += e.totalValue;
      group.totalUnits[e.unit] = (group.totalUnits[e.unit] || 0) + e.quantity;
      group.items.push(e);
      return acc;
    }, []);

    // Ordena por maior valor total a pagar
    return groups.sort((a, b) => b.totalValue - a.totalValue);
  }, [reportEntries, suppliers]);

  const grandTotalReport = useMemo(() => {
    return supplierGroups.reduce((sum, g) => sum + g.totalValue, 0);
  }, [supplierGroups]);

  const grandTotalItemsCount = reportEntries.length;

  return (
    <div className="space-y-5">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-teal-600 dark:text-teal-400 font-semibold block mb-0.5">
            Almoxarifado &bull; Compras & Insumos
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Controle de Entradas e Fornecedores</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão de Privacidade Olho */}
          <button
            type="button"
            onClick={() => setShowValues(prev => !prev)}
            className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              showValues 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={showValues ? "Ocultar valores financeiros (privacidade)" : "Exibir valores financeiros"}
          >
            {showValues ? <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showValues ? 'Ocultar Valores' : 'Ver Valores'}</span>
          </button>

          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
          >
            <Building2 className="w-4 h-4 text-teal-600" />Novo Fornecedor
          </button>
          
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
          >
            <PackagePlus className="w-4 h-4" />Registrar Entrada
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>{feedbackMsg}</span>
        </div>
      )}

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setSubTab('entradas')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'entradas'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Histórico de Entradas ({insumoEntries.length})
        </button>
        <button
          onClick={() => setSubTab('relatorio')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'relatorio'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Relatório de Fornecedores & Contas a Pagar
        </button>
      </div>

      {/* ABA 1: Histórico de Entradas */}
      {subTab === 'entradas' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por produto ou fornecedor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Total: {filteredEntries.length} registro(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Preço Unit.</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">NF / Ref.</th>
                  <th className="px-4 py-3">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <PackagePlus className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <span className="block font-medium">
                        {insumoEntries.length === 0 ? 'Nenhuma entrada registrada. Clique em "Registrar Entrada".' : 'Nenhuma entrada encontrada com o filtro atual.'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-mono transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {new Date(e.enteredAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100 font-sans">
                        {e.productName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-sans">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          {e.supplierName}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-teal-700 dark:text-teal-400">
                        +{e.quantity} {e.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400">
                        {formatMoney(e.unitPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {formatMoney(e.totalValue)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-sans">
                        {e.invoiceRef ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                            {e.invoiceRef}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-sans">
                        {e.operatorName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredEntries.length}
            pageSize={20}
            onPageChange={setCurrentPage}
            label="entradas"
          />
        </div>
      )}

      {/* ABA 2: Relatório de Fornecedores & Contas a Pagar */}
      {subTab === 'relatorio' && (
        <div className="space-y-4">
          {/* Barra de Filtros Compacta e Direta */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Presets Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Período:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('hoje')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    periodPreset === 'hoje'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('semana')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    periodPreset === 'semana'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('mes')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    periodPreset === 'mes'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('todos')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    periodPreset === 'todos'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Geral (Todos)
                </button>
              </div>

              {/* Botão de Impressão */}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                title="Imprimir relatório de fornecedores"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Relatório
              </button>
            </div>

            {/* Inputs de Data e Filtros de Fornecedor / Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* De */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-7">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setPeriodPreset('custom'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              {/* Até */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-7">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setPeriodPreset('custom'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              {/* Filtro Fornecedor */}
              <div>
                <select
                  value={selectedSupplierFilter}
                  onChange={e => setSelectedSupplierFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="todos">Todos os Fornecedores</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Busca por Produto ou NF */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar produto ou NF..."
                  value={reportSearchTerm}
                  onChange={e => setReportSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Cards de Resumo & Totalizadores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total a Pagar com Olho de Privacidade */}
            <div className="p-3.5 bg-teal-50/80 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 tracking-wider block">
                  Total a Pagar no Período
                </span>
                <span className="text-xl font-extrabold font-mono text-teal-800 dark:text-teal-300">
                  {formatMoney(grandTotalReport)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowValues(prev => !prev)}
                className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                title={showValues ? "Ocultar valor" : "Ver valor"}
              >
                {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Total de Entradas */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Entradas Registradas
                </span>
                <span className="text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                  {grandTotalItemsCount} <span className="text-xs font-normal text-slate-400">compra(s)</span>
                </span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
                <PackagePlus className="w-4 h-4" />
              </div>
            </div>

            {/* Fornecedores Ativos */}
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Fornecedores no Período
                </span>
                <span className="text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                  {supplierGroups.length} <span className="text-xs font-normal text-slate-400">fornecedor(es)</span>
                </span>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
                <Truck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Listagem Consolidada por Fornecedor */}
          {supplierGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Nenhuma entrada de insumo encontrada no período selecionado.
              </p>
              <span className="text-xs text-slate-400 mt-1 block">
                Ajuste os filtros de data acima ou registre novas entradas.
              </span>
            </div>
          ) : (
            supplierGroups.map(group => (
              <div
                key={group.supplierId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Cabeçalho do Fornecedor */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 rounded-xl">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                        {group.supplierName}
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-sans mt-0.5">
                        <span className="font-mono">{group.items.length} compra(s)</span>
                        {group.supplierPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {group.supplierPhone}
                          </span>
                        )}
                        {group.supplierCnpj && (
                          <span className="font-mono">CNPJ: {group.supplierCnpj}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:text-right justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Total a pagar
                      </span>
                      <span className="font-extrabold font-mono text-teal-700 dark:text-teal-400 text-base">
                        {formatMoney(group.totalValue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Compras do Fornecedor */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2">Data</th>
                        <th className="px-3.5 py-2">Produto</th>
                        <th className="px-3.5 py-2 text-right">Qtd</th>
                        <th className="px-3.5 py-2 text-right">Preço Unit.</th>
                        <th className="px-3.5 py-2 text-right">Subtotal</th>
                        <th className="px-3.5 py-2">NF / Ref.</th>
                        <th className="px-3.5 py-2">Operador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {group.items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400">
                            {new Date(item.enteredAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-3.5 py-2 text-slate-800 dark:text-slate-200 font-sans font-bold">
                            {item.productName}
                          </td>
                          <td className="px-3.5 py-2 text-right text-teal-700 dark:text-teal-400 font-bold">
                            +{item.quantity} {item.unit}
                          </td>
                          <td className="px-3.5 py-2 text-right text-slate-600 dark:text-slate-400">
                            {formatMoney(item.unitPrice)}
                          </td>
                          <td className="px-3.5 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatMoney(item.totalValue)}
                          </td>
                          <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 font-sans">
                            {item.invoiceRef ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                                {item.invoiceRef}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 font-sans">
                            {item.operatorName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Registrar Entrada */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
            <div className="bg-teal-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-teal-500/20 text-teal-300 rounded-xl">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Registrar Entrada de Insumo</h3>
                  <p className="text-[11px] text-teal-200">Estoque atualizado automaticamente</p>
                </div>
              </div>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Produto (Insumo Químico) *
                </label>
                <select
                  value={entStockItemId}
                  onChange={e => setEntStockItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Selecione o produto...</option>
                  {stockItems.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.currentStock} {s.unit} atual)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Fornecedor *
                </label>
                <select
                  value={entSupplierId}
                  onChange={e => setEntSupplierId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Selecione o fornecedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Qtd {selectedStock ? `(${selectedStock.unit})` : ''} *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.5"
                    value={entQuantity}
                    onChange={e => setEntQuantity(Number(e.target.value))}
                    required
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Preço/Un (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entUnitPrice}
                    onChange={e => setEntUnitPrice(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Total
                  </label>
                  <div className="px-2.5 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-mono font-bold text-teal-700 dark:text-teal-400 truncate">
                    {entTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Nota Fiscal / Referência (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: NF-0418, Pedido #123..."
                  value={entInvoiceRef}
                  onChange={e => setEntInvoiceRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Fornecedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />Cadastrar Fornecedor
              </h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Fornecedor *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Química Nordeste Ltda"
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="81 9xxxx-xxxx"
                    value={supPhone}
                    onChange={e => setSupPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="xx.xxx.xxx/0001-xx"
                    value={supCnpj}
                    onChange={e => setSupCnpj(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
