import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Search, Printer, MessageSquare, Filter } from 'lucide-react';
import { OrderStatus } from '../types';

interface OrderListViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const OrderListView: React.FC<OrderListViewProps> = ({ onNavigate }) => {
  const { orders, updateOrderStatus } = useOrders();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filteredOrders = orders.filter(ord => {
    const matchesSearch = ord.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ord.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ord.clientPhone.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || ord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="todos">Todos os Status</option>
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
                filteredOrders.map(ord => (
                  <tr 
                    key={ord.id} 
                    onDoubleClick={() => onNavigate('order-detail', ord.id)}
                    className="hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors font-mono cursor-pointer select-none"
                    title="Duplo clique para abrir e editar este pedido"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">{ord.osNumber}</td>
                    <td className="p-4 font-sans">
                      <strong className="text-slate-900 dark:text-slate-100 block">{ord.clientName}</strong>
                      <span className="text-slate-400 text-[11px] font-mono">{ord.clientPhone}</span>
                    </td>
                    <td className="p-4 text-slate-800 dark:text-slate-200">
                      <div>{ord.totalWeightKg} kg</div>
                      <span className="text-[10px] text-slate-400">Ref: {ord.refPieceWeightGrams}g</span>
                    </td>
                    <td className="p-4 font-bold text-sky-700 dark:text-sky-400">{ord.estimatedPieceCount} pçs</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-sans">
                      {ord.totalIronedPieces} / {ord.estimatedPieceCount} pçs
                    </td>
                    <td className="p-4 font-sans">{getStatusBadge(ord.status)}</td>
                    <td className="p-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigate('order-detail', ord.id)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium text-xs transition-colors border border-transparent dark:border-slate-700"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => onNavigate('order-print', ord.id)}
                          className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors border border-transparent dark:border-slate-700"
                          title="Imprimir Nota (Meia Folha A4)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {ord.status !== 'pronto' && ord.status !== 'entregue' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'pronto', user?.name || 'Operador')}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold text-xs transition-colors flex items-center gap-1"
                            title="Marcar como Pronto e Simular Envio no WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Pronto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
