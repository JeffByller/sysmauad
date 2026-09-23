import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  QrCode, 
  Clock, 
  Scale, 
  Shirt, 
  AlertTriangle, 
  MessageSquare, 
  Printer, 
  CalendarDays,
  Package
} from 'lucide-react';
import { OrderStatus } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: string, param?: string) => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenScanner }) => {
  const { orders, stockItems, updateOrderStatus } = useOrders();
  const { user } = useAuth();

  // Time Period Filter: 'dia' | 'semana' | 'mes'
  const [timePeriod, setTimePeriod] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');

  // Filter orders by time period
  const now = new Date();
  const periodFilteredOrders = orders.filter(ord => {
    const ordDate = new Date(ord.createdAt);
    if (timePeriod === 'dia') {
      return ordDate.toDateString() === now.toDateString();
    }
    if (timePeriod === 'semana') {
      const diffDays = Math.floor((now.getTime() - ordDate.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 7;
    }
    if (timePeriod === 'mes') {
      return ordDate.getMonth() === now.getMonth() && ordDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Filter orders by status
  const finalOrders = selectedStatusFilter === 'todos'
    ? periodFilteredOrders
    : periodFilteredOrders.filter(o => o.status === selectedStatusFilter);

  // Stats calculation
  const totalOrdersCount = periodFilteredOrders.length;
  const totalKgCount = periodFilteredOrders.reduce((sum, o) => sum + o.totalWeightKg, 0);
  const totalIronedCount = periodFilteredOrders.reduce((sum, o) => sum + o.totalIronedPieces, 0);

  // Low stock items count ("visão do que tá acabando")
  const lowStockCount = stockItems.filter(s => s.currentStock <= s.minStockAlert).length;

  const statusCounts = {
    recebido: periodFilteredOrders.filter(o => o.status === 'recebido').length,
    em_andamento: periodFilteredOrders.filter(o => o.status === 'em_andamento').length,
    pronto: periodFilteredOrders.filter(o => o.status === 'pronto').length,
    entregue: periodFilteredOrders.filter(o => o.status === 'entregue').length,
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'recebido':
        return <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700">1. Pedido Feito</span>;
      case 'em_andamento':
        return <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded-md text-xs font-semibold border border-sky-200 dark:border-sky-800">2. Em Andamento</span>;
      case 'pronto':
        return <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800">3. Pronto p/ Retirada</span>;
      case 'entregue':
        return <span className="px-2.5 py-1 bg-slate-800 dark:bg-slate-700 text-slate-100 rounded-md text-xs font-semibold">4. Entregue</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Painel Operacional da Produção
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Olá, {user?.name || 'Gilmário'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o volume de tecido, dosagens químicas e contagem de peças por lote.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('new-order')}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Pedido
          </button>

          <button
            onClick={onOpenScanner}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Bipar Passagem
          </button>

          <button
            onClick={() => onNavigate('stock')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2 border border-slate-700"
          >
            <Package className="w-4 h-4" />
            Estoque Insumos
          </button>
        </div>
      </div>

      {/* Time Period Filter Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <CalendarDays className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Filtrar Produção por Período:</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTimePeriod('dia')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timePeriod === 'dia' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Hoje (Dia)
          </button>
          <button
            onClick={() => setTimePeriod('semana')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timePeriod === 'semana' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setTimePeriod('mes')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timePeriod === 'mes' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Este Mês
          </button>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pedidos ({timePeriod})</span>
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">{totalOrdersCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Lotes no período selecionado</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Peso Total</span>
            <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">{totalKgCount.toFixed(1)} <span className="text-lg">kg</span></span>
          <span className="text-[11px] text-slate-400 block mt-1">Volume de roupa lavada</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Peças Passadas</span>
            <Shirt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">{totalIronedCount}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Contagem dos colaboradores</span>
        </div>

        {/* Low Stock Alert Metric */}
        <div
          onClick={() => onNavigate('stock')}
          className={`p-5 rounded-xl border shadow-sm cursor-pointer transition-colors ${
            lowStockCount > 0 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 hover:bg-amber-100/80 dark:hover:bg-amber-900/60' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-400">Estoque em Alerta</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          </div>
          <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{lowStockCount}</span>
          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium block mt-1">
            {lowStockCount > 0 ? 'Insumos acabando! Ver estoque' : 'Estoque regular'}
          </span>
        </div>
      </div>

      {/* Status Bar / Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between overflow-x-auto gap-2 text-xs transition-colors">
        <button
          onClick={() => setSelectedStatusFilter('todos')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            selectedStatusFilter === 'todos' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Todos ({periodFilteredOrders.length})
        </button>

        <button
          onClick={() => setSelectedStatusFilter('recebido')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            selectedStatusFilter === 'recebido' ? 'bg-slate-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          1. Pedido Feito ({statusCounts.recebido})
        </button>

        <button
          onClick={() => setSelectedStatusFilter('em_andamento')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            selectedStatusFilter === 'em_andamento' ? 'bg-sky-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          2. Em Andamento ({statusCounts.em_andamento})
        </button>

        <button
          onClick={() => setSelectedStatusFilter('pronto')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            selectedStatusFilter === 'pronto' ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          3. Pronto ({statusCounts.pronto})
        </button>

        <button
          onClick={() => setSelectedStatusFilter('entregue')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            selectedStatusFilter === 'entregue' ? 'bg-slate-800 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          4. Entregue ({statusCounts.entregue})
        </button>
      </div>

      {/* Orders Operational Cards / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Fila de Pedidos em Produção</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Exibindo {finalOrders.length} pedido(s)</span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {finalOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              Nenhum pedido encontrado no período ({timePeriod}) e status selecionados.
            </div>
          ) : (
            finalOrders.map(ord => (
              <div 
                key={ord.id} 
                onDoubleClick={() => onNavigate('order-detail', ord.id)}
                className="p-6 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors space-y-4 cursor-pointer select-none"
                title="Duplo clique para abrir e editar este pedido"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left Column: OS & Client */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">{ord.osNumber}</span>
                      {getStatusBadge(ord.status)}
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(ord.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-1">{ord.clientName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{ord.clientPhone}</p>
                  </div>

                  {/* Middle Column: Weights & Pieces */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">Peça Ref.</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{ord.refPieceWeightGrams}g</strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">Peso Total</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{ord.totalWeightKg} kg</strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-mono">Peças Est.</span>
                      <strong className="text-sky-700 dark:text-sky-400 font-mono text-sm">{ord.estimatedPieceCount} pçs</strong>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('order-detail', ord.id)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-transparent dark:border-slate-700"
                    >
                      Ver Detalhes
                    </button>

                    <button
                      onClick={() => onNavigate('order-print', ord.id)}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-transparent dark:border-slate-700"
                      title="Imprimir Nota de Entrada (Meia Folha A4)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {ord.status !== 'pronto' && ord.status !== 'entregue' && (
                      <button
                        onClick={() => updateOrderStatus(ord.id, 'pronto', user?.name || 'Operador', 'Concluído no balcão')}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        title="Marcar como Pronto e Simular Envio no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Marcar Pronto
                      </button>
                    )}
                  </div>
                </div>

                {/* Items & Passadoria Status Row */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Processo:</strong> {ord.items.map(i => `${i.clothingType} (${i.process})`).join(', ')}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Passadoria (Volátil):</strong> {ord.totalIronedPieces} de {ord.estimatedPieceCount} pçs lançadas
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
