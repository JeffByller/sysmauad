import React, { useState, useMemo, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Printer, 
  MessageSquare, 
  Filter, 
  Play, 
  PackageCheck, 
  Scale, 
  RotateCcw, 
  AlertTriangle, 
  Check, 
  X,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { Pagination } from '../components/common/Pagination';

interface OrderListViewProps {
  onNavigate: (tab: string, param?: string, printMode?: 'ambos' | 'nota' | 'receita' | 'saida') => void;
}

export const OrderListView: React.FC<OrderListViewProps> = ({ onNavigate }) => {
  const { orders, updateOrderStatus, updateOrderWeight, stalledOrderAlertDays } = useOrders();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Paginação: 20 registros mais recentes por página
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // Estado para Fechamento de Saída / Faturamento
  const [closingSaidaOrder, setClosingSaidaOrder] = useState<Order | null>(null);
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);

  // Estado para Edição Rápida de Peso
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editWeightKg, setEditWeightKg] = useState<number>(0);
  const [editPieceCount, setEditPieceCount] = useState<number>(0);
  const [autoCalcPieces, setAutoCalcPieces] = useState<boolean>(true);
  const [editReason, setEditReason] = useState<string>('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset da página quando filtros ou busca mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleConfirmSaida = async () => {
    if (!closingSaidaOrder) return;
    setIsCompletingDelivery(true);
    await updateOrderStatus(closingSaidaOrder.id, 'entregue', user?.name || 'Operador', 'Saída registrada e entregue ao cliente.');
    setIsCompletingDelivery(false);
    setToastMessage(`Saída da O.S. ${closingSaidaOrder.osNumber} concluída com sucesso!`);
    setClosingSaidaOrder(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper para verificar se a OS está parada (sem movimentação >= stalledOrderAlertDays e não entregue)
  const getOrderStalledInfo = (ord: Order) => {
    if (ord.status === 'entregue') return { isStalled: false, days: 0 };
    const lastActivity = (ord.history && ord.history.length > 0)
      ? ord.history[ord.history.length - 1].timestamp
      : (ord.updatedAt || ord.createdAt || new Date().toISOString());
    const diffDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    const alertThreshold = stalledOrderAlertDays > 0 ? stalledOrderAlertDays : 3;
    return { isStalled: diffDays >= alertThreshold, days: diffDays };
  };

  const stalledOrders = orders.filter(ord => getOrderStalledInfo(ord).isStalled);

  // Ordena sempre do mais recente para o mais antigo
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return sortedOrders.filter(ord => {
      const matchesSearch = (ord.osNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (ord.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (ord.clientPhone || '').includes(searchTerm);
      
      let matchesStatus = true;
      if (statusFilter === 'todos') {
        matchesStatus = true;
      } else if (statusFilter === 'paradas') {
        matchesStatus = getOrderStalledInfo(ord).isStalled;
      } else if (statusFilter === 'relavados') {
        matchesStatus = Boolean(ord.isRelavado);
      } else {
        matchesStatus = ord.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [sortedOrders, searchTerm, statusFilter]);

  // Paginação dos 20 registros
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const handleOpenEditWeight = (ord: Order) => {
    setEditingOrder(ord);
    setEditWeightKg(ord.totalWeightKg);
    setEditPieceCount(ord.estimatedPieceCount);
    setAutoCalcPieces(true);
    setEditReason('');
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setEditWeightKg(val);
    if (autoCalcPieces && val > 0 && editingOrder && editingOrder.refPieceWeightGrams > 0) {
      setEditPieceCount(Math.round((val * 1000) / editingOrder.refPieceWeightGrams));
    }
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || editWeightKg <= 0) return;
    setIsSavingWeight(true);
    const res = await updateOrderWeight(editingOrder.id, editWeightKg, editPieceCount, editReason, user?.name);
    setIsSavingWeight(false);
    if (res.success) {
      setEditingOrder(null);
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'recebido':
        return <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700">1. Pedido Feito</span>;
      case 'em_andamento':
        return <span className="px-2.5 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded-md text-xs font-semibold border border-sky-200 dark:border-sky-800">2. Em Andamento</span>;
      case 'pronto':
        return <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800">3. Pronto</span>;
      case 'entregue':
        return <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-md text-xs font-semibold border border-indigo-200 dark:border-indigo-800">4. Entregue</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Alerta para OS Paradas */}
      {stalledOrders.length > 0 && statusFilter !== 'paradas' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-950 dark:text-amber-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wide">
                Atenção: {stalledOrders.length} Ordem(ns) de Serviço sem movimentação há {stalledOrderAlertDays || 3} {stalledOrderAlertDays === 1 ? 'dia ou mais' : 'dias ou mais'}!
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Estas OS estão ativas mas não tiveram avanço recente. Verifique a produção ou contate o cliente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('paradas')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-auto shadow-sm"
          >
            Ver OS Paradas ({stalledOrders.length})
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Lista de Pedidos</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gerencie e filtre todas as ordens de serviço em andamento</p>
          </div>

          <button
            onClick={() => onNavigate('new-order')}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            + Novo Pedido
          </button>
        </div>

        {/* Search & Status Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por OS, Nome do Cliente ou Telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="paradas">⚠️ OS Paradas (≥ {stalledOrderAlertDays || 3} {stalledOrderAlertDays === 1 ? 'dia' : 'dias'})</option>
              <option value="relavados">🔄 Relavados (R$ 0,00)</option>
              <option value="recebido">1. Pedido Feito</option>
              <option value="em_andamento">2. Em Andamento</option>
              <option value="pronto">3. Pronto</option>
              <option value="entregue">4. Entregue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Número OS</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Pesagem</th>
                <th className="p-4">Peças Estimadas</th>
                <th className="p-4">Passadoria</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(ord => {
                  const stalledInfo = getOrderStalledInfo(ord);
                  return (
                    <tr 
                      key={ord.id} 
                      onDoubleClick={() => onNavigate('order-detail', ord.id)}
                      className={`hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors font-mono cursor-pointer select-none ${
                        stalledInfo.isStalled ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                      title="Duplo clique para abrir e editar este pedido"
                    >
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{ord.osNumber}</span>
                          <div className="flex flex-wrap gap-1">
                            {ord.isRelavado && (
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold uppercase border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                                <RotateCcw className="w-2.5 h-2.5" />
                                Relavado
                              </span>
                            )}
                            {stalledInfo.isStalled && (
                              <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Parada {stalledInfo.days}d
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-sans">
                        <strong className="text-slate-900 dark:text-slate-100 block">{ord.clientName}</strong>
                        <span className="text-slate-400 text-[11px] font-mono">{ord.clientPhone}</span>
                      </td>
                      <td className="p-4 text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{ord.totalWeightKg} kg</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditWeight(ord);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition-colors"
                            title="Editar peso da pesagem"
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400">Ref: {ord.refPieceWeightGrams}g</span>
                      </td>
                      <td className="p-4 font-bold text-sky-700 dark:text-sky-400">{ord.estimatedPieceCount} pçs</td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-sans">
                        {ord.totalIronedPieces} / {ord.estimatedPieceCount} pçs
                      </td>
                      <td className="p-4 font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(ord.status)}
                          <select
                            value={ord.status}
                            onChange={e => updateOrderStatus(ord.id, e.target.value as OrderStatus, user?.name || 'Operador', `Status alterado manualmente para ${e.target.value}`)}
                            className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                            title="Alterar status do pedido diretamente"
                          >
                            <option value="recebido">Recebido</option>
                            <option value="em_andamento">Em Andamento</option>
                            <option value="pronto">Pronto</option>
                            <option value="entregue">Entregue</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onNavigate('order-detail', ord.id)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium text-xs transition-colors border border-transparent dark:border-slate-700"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => onNavigate('order-print', ord.id)}
                            className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors border border-transparent dark:border-slate-700"
                            title="Imprimir Nota de Entrada / Receita do Lavado"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigate('order-print', ord.id, 'saida')}
                            className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors border border-transparent dark:border-slate-700"
                            title="Imprimir Comprovante de Saída / Faturamento"
                          >
                            <Receipt className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          </button>

                          {/* Botões contextuais de avanço do fluxo de produção */}
                          {ord.status === 'recebido' && (
                            <button
                              onClick={() => updateOrderStatus(ord.id, 'em_andamento', user?.name || 'Operador', 'Iniciada a lavagem.')}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                              title="Iniciar Produção (Mover para Em Andamento)"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Iniciar
                            </button>
                          )}

                          {ord.status === 'em_andamento' && (
                            <button
                              onClick={() => updateOrderStatus(ord.id, 'pronto', user?.name || 'Operador')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                              title="Concluir Lavado e Notificar Cliente"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Pronto
                            </button>
                          )}

                          {ord.status === 'pronto' && (
                            <button
                              onClick={() => setClosingSaidaOrder(ord)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                              title="Conferir Faturamento e Fechar Saída"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Entregar
                            </button>
                          )}

                          {ord.status === 'entregue' && (
                            <span className="px-2 py-1 text-slate-400 dark:text-slate-500 text-[11px] font-mono">
                              ✓ Entregue
                            </span>
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

        {/* Paginação de Pedidos (20 mais recentes por página) */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          label="pedidos"
        />
      </div>

      {/* Modal: Edição Rápida de Peso */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Editar Peso da O.S.</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Correção rápida para {editingOrder.osNumber} ({editingOrder.clientName})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="p-6 space-y-4 font-sans">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
                <strong>Atenção:</strong> Ao salvar o novo peso, o sistema recalculará a dosagem de insumos químicos para lavagem e o quantitativo de peças.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Novo Peso Total do Lote (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editWeightKg || ''}
                    onChange={handleWeightInputChange}
                    className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 font-mono">KG</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Peças Estimadas (Unidades)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalcPieces}
                      onChange={(e) => {
                        setAutoCalcPieces(e.target.checked);
                        if (e.target.checked && editWeightKg > 0 && editingOrder.refPieceWeightGrams > 0) {
                          setEditPieceCount(Math.round((editWeightKg * 1000) / editingOrder.refPieceWeightGrams));
                        }
                      }}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Auto-calcular por ref. ({editingOrder.refPieceWeightGrams}g)</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPieceCount || ''}
                  onChange={(e) => {
                    setEditPieceCount(Number(e.target.value));
                    setAutoCalcPieces(false);
                  }}
                  disabled={autoCalcPieces}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Motivo da Correção de Peso (Opcional)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ex: Erro de digitação na balança"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingWeight || editWeightKg <= 0}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isSavingWeight ? 'Salvando...' : 'Salvar Novo Peso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFERÊNCIA DE SAÍDA & FECHAMENTO DA NOTA ───────────────── */}
      {closingSaidaOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 font-sans">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Conferência de Saída & Fechamento</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">O.S. {closingSaidaOrder.osNumber} • {closingSaidaOrder.clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClosingSaidaOrder(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Informações Básicas do Lote */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total de Peças</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">{closingSaidaOrder.estimatedPieceCount} pçs</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Peso Total do Lote</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">{(closingSaidaOrder.totalWeightKg || 0).toFixed(1)} kg</strong>
                </div>
              </div>

              {/* Detalhamento de Valores por Tipo de Serviço */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 font-mono">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Discriminação dos Serviços:
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Valor Unitário</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {closingSaidaOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                        {item.process || 'Serviço'}:
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {closingSaidaOrder.isRelavado
                          ? 'R$ 0,00'
                          : (item.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>
                  ))}
                </div>

                {/* Total da Nota (Unitário) */}
                <div className="border-t-2 border-slate-900 dark:border-slate-200 pt-2 flex justify-between items-center text-sm font-black">
                  <span className="uppercase text-slate-900 dark:text-slate-100">Total da Nota:</span>
                  <strong className="text-sky-700 dark:text-sky-400 text-base">
                    {closingSaidaOrder.isRelavado
                      ? 'R$ 0,00'
                      : (closingSaidaOrder.items.reduce((acc, it) => acc + (it.unitPrice || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>

                {/* Total Geral do Lote Faturado */}
                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Total Faturado ({closingSaidaOrder.estimatedPieceCount} pçs):</span>
                  <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">
                    {closingSaidaOrder.isRelavado ? 'R$ 0,00 (Isento)' : (closingSaidaOrder.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const id = closingSaidaOrder.id;
                    setClosingSaidaOrder(null);
                    onNavigate('order-print', id, 'saida');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Imprimir Comprovante
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setClosingSaidaOrder(null)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={isCompletingDelivery}
                    onClick={handleConfirmSaida}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <PackageCheck className="w-4 h-4" />
                    {isCompletingDelivery ? 'Concluindo...' : 'Confirmar Saída'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
