import React from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, MessageSquare, ArrowLeft, Clock, FlaskConical, Shirt } from 'lucide-react';
import { OrderStatus } from '../types';

interface OrderDetailViewProps {
  orderId: string;
  onBack: () => void;
  onNavigatePrint: (orderId: string) => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ orderId, onBack, onNavigatePrint }) => {
  const { getOrderById, getOrderByOS, updateOrderStatus } = useOrders();
  const { user } = useAuth();
  const order = getOrderById(orderId) || getOrderByOS(orderId);

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Pedido não encontrado.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">
          Voltar
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'recebido':
        return <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700">1. Pedido Feito</span>;
      case 'em_andamento':
        return <span className="px-3 py-1 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded-md text-xs font-semibold border border-sky-200 dark:border-sky-800">2. Em Andamento</span>;
      case 'pronto':
        return <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800">3. Pronto p/ Retirada</span>;
      case 'entregue':
        return <span className="px-3 py-1 bg-slate-800 dark:bg-slate-700 text-slate-100 rounded-md text-xs font-semibold">4. Entregue</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-transparent dark:border-slate-700"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xl text-slate-900 dark:text-slate-100">{order.osNumber}</span>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigatePrint(order.id)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Nota (Meia A4)
          </button>

          {order.status !== 'pronto' && order.status !== 'entregue' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'pronto', user?.name || 'Operador')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Marcar como Pronto e disparar WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              Marcar como Pronto (Aviso WhatsApp)
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Client & Weights */}
        <div className="space-y-6">
          {/* Client Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">DADOS DO CLIENTE</h3>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{order.clientName}</h4>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">Tel: {order.clientPhone}</p>
              {order.clientAddress && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{order.clientAddress}</p>
              )}
            </div>
          </div>

          {/* Weights & Calculation Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">ESTATÍSTICAS DA PESAGEM</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Peso 1 Peça (Ref):</span>
                <strong className="text-slate-900 dark:text-slate-100">{order.refPieceWeightGrams} g</strong>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Peso Total Lote:</span>
                <strong className="text-slate-900 dark:text-slate-100">{order.totalWeightKg} kg</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Peças Estimadas:</span>
                <strong className="text-sky-700 dark:text-sky-400 text-sm font-bold">{order.estimatedPieceCount} pçs</strong>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3 transition-colors">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">CÓDIGO QR DO PEDIDO</h3>
            <div className="p-3 bg-slate-50 dark:bg-white border border-slate-200 rounded-xl inline-block">
              <QRCodeSVG value={order.osNumber} size={140} />
            </div>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 block">{order.osNumber}</span>
          </div>
        </div>

        {/* Middle & Right Column: Recipe, Passador Logs & History */}
        <div className="md:col-span-2 space-y-6">
          {/* Chemical Recipe */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Sequência de Processos & Dosagem Química Calculada (Receita)
            </h3>
            {order.chemicalRecipe.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Nenhuma receita química associada.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const map = new Map<string, { order: number; name: string; items: typeof order.chemicalRecipe }>();
                  order.chemicalRecipe.forEach(c => {
                    const orderNum = c.faseOrder || 1;
                    const name = c.faseName || 'Processo Geral';
                    const key = `${orderNum}-${name}`;
                    if (!map.has(key)) {
                      map.set(key, { order: orderNum, name, items: [] });
                    }
                    map.get(key)!.items.push(c);
                  });
                  const fases = Array.from(map.values()).sort((a, b) => a.order - b.order);

                  return fases.map(fase => (
                    <div key={`${fase.order}-${fase.name}`} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Fase {String(fase.order).padStart(2, '0')} — {fase.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {fase.items.length} produto(s)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-2.5">Insumo Químico</th>
                              <th className="p-2.5 text-center">Dosagem</th>
                              <th className="p-2.5 text-right">Qtd. Máquina</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {fase.items.map((chem, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{chem.productName}</td>
                                <td className="p-2.5 text-center font-mono text-sky-700 dark:text-sky-400">
                                  {chem.dosagePct !== undefined ? `${chem.dosagePct}%` : `${chem.dosagePerKg} g/kg`}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                                  {chem.totalGrams >= 1000 ? `${(chem.totalGrams / 1000).toFixed(2)} kg` : `${chem.totalGrams} g`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Passador Logs */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Histórico de Passadoria dos Colaboradores
              </h3>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                Total Passado: {order.totalIronedPieces} / {order.estimatedPieceCount} pçs
              </span>
            </div>

            {order.ironingLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhum lançamento de passadoria registrado ainda para este pedido (Lançamento opcional).
              </div>
            ) : (
              <div className="space-y-2">
                {order.ironingLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100 block">{log.passadorName}</strong>
                      <span className="text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg text-sm">
                      +{log.piecesIroned} pçs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline History */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Histórico de Status da Ordem de Serviço
            </h3>
            <div className="space-y-3">
              {order.history.map((ev, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize block">{ev.status}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(ev.timestamp).toLocaleString('pt-BR')} • Op: {ev.operator}
                    </span>
                    {ev.note && <p className="text-slate-600 dark:text-slate-400 mt-1">{ev.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
