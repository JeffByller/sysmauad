import React, { useState } from 'react';
import { useClientAuth } from '../context/ClientAuthContext';
import { useOrders } from '../context/OrderContext';
import { Receipt, CheckCircle2, Package, LogOut, Shirt, Clock } from 'lucide-react';
import { OrderStatus } from '../types';

export const ClientPortalView: React.FC = () => {
  const { client, logoutClient } = useClientAuth();
  const { orders } = useOrders();
  const [activeCategoryTab, setActiveCategoryTab] = useState<'em_andamento' | 'finalizadas'>('em_andamento');

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Nenhum cliente selecionado.</p>
      </div>
    );
  }

  // Filter orders belonging to this client that are OPEN/UNPAID (paymentStatus !== 'pago')
  const clientOrders = orders.filter(o =>
    (o.clientPhone.includes(client.phone) || o.clientName.includes(client.name)) &&
    (o.paymentStatus || 'aberto') === 'aberto'
  );

  // Category 1: Em Andamento (recebido / em_andamento)
  const ordersEmAndamento = clientOrders.filter(o => o.status === 'recebido' || o.status === 'em_andamento');

  // Category 2: Finalizadas (pronto / entregue)
  const ordersFinalizadas = clientOrders.filter(o => o.status === 'pronto' || o.status === 'entregue');

  const displayedOrders = activeCategoryTab === 'em_andamento' ? ordersEmAndamento : ordersFinalizadas;

  const totalPiecesCount = clientOrders.reduce((sum, o) => sum + o.estimatedPieceCount, 0);

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
      {/* Header Banner */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            Central do Assinante • Acompanhamento de Pedidos
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{client.companyName || client.name}</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {client.address} • Tel: {client.phone} • CNPJ/CPF: {client.cnpjCpf || 'Não informado'}
          </p>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
          <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700 text-right font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total de Peças Solicitadas</span>
            <span className="text-xl font-bold text-sky-400">{totalPiecesCount} pçs</span>
          </div>
          <button
            onClick={logoutClient}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Sair do Portal"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category Tabs: Em Andamento vs Finalizadas */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveCategoryTab('em_andamento')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeCategoryTab === 'em_andamento'
              ? 'bg-sky-700 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ordens Em Andamento ({ordersEmAndamento.length})
        </button>

        <button
          onClick={() => setActiveCategoryTab('finalizadas')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeCategoryTab === 'finalizadas'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Ordens Finalizadas ({ordersFinalizadas.length})
        </button>
      </div>

      {/* Real-time Order Progress Tracking */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {activeCategoryTab === 'em_andamento' ? 'Ordens de Serviço Em Andamento' : 'Ordens de Serviço Finalizadas'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Status em tempo real das suas roupas no galpão de produção</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Modo Consultativo</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Número OS</th>
                <th className="p-3">Data Entrada</th>
                <th className="p-3">Processo / Lavado</th>
                <th className="p-3">Peças Estimadas</th>
                <th className="p-3">Passadoria</th>
                <th className="p-3">Status Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                    Nenhum pedido nesta categoria ({activeCategoryTab === 'em_andamento' ? 'Em Andamento' : 'Finalizadas'}).
                  </td>
                </tr>
              ) : (
                displayedOrders.map(ord => (
                  <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{ord.osNumber}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">{new Date(ord.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200 font-sans">
                      {ord.items.map(i => i.process).join(', ')}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{ord.estimatedPieceCount} pçs ({ord.totalWeightKg}kg)</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">
                      {ord.totalIronedPieces} de {ord.estimatedPieceCount} pçs
                    </td>
                    <td className="p-3 font-sans">{getStatusBadge(ord.status)}</td>
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
