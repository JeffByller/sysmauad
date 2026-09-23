import React from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, MessageSquare, ArrowLeft, Clock, FlaskConical, Shirt, Play, PackageCheck, CheckCircle2 } from 'lucide-react';
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
            Imprimir Nota / Receita do Lavado
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

      {/* Workflow Stepper & Direct Status Advancement Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
              FLUXO DE PRODUÇÃO DO LOTE
            </h3>
            <p className="text-[11px] text-slate-500">
              Acompanhe as 4 etapas industriais ou altere o status do pedido manualmente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold font-mono">Alterar Status:</span>
            <select
              value={order.status}
              onChange={e => updateOrderStatus(order.id, e.target.value as OrderStatus, user?.name || 'Operador', `Status alterado manualmente para ${e.target.value}`)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="recebido">1. Pedido Feito (Entrada)</option>
              <option value="em_andamento">2. Em Andamento (Lavagem/Secagem)</option>
              <option value="pronto">3. Pronto (Aguardando Retirada)</option>
              <option value="entregue">4. Entregue (Finalizado)</option>
            </select>
          </div>
        </div>

        {/* 4-Step Visual Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className={`p-3 rounded-xl border text-center transition-colors ${
            order.status === 'recebido' 
              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-bold shadow-sm' 
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
          }`}>
            <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Etapa 1</span>
            <span className="text-xs">1. Pedido Feito</span>
          </div>

          <div className={`p-3 rounded-xl border text-center transition-colors ${
            order.status === 'em_andamento' 
              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-bold shadow-sm' 
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
          }`}>
            <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Etapa 2</span>
            <span className="text-xs">2. Em Andamento</span>
          </div>

          <div className={`p-3 rounded-xl border text-center transition-colors ${
            order.status === 'pronto' 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm' 
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
          }`}>
            <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Etapa 3</span>
            <span className="text-xs">3. Pronto p/ Retirada</span>
          </div>

          <div className={`p-3 rounded-xl border text-center transition-colors ${
            order.status === 'entregue' 
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold shadow-sm' 
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
          }`}>
            <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Etapa 4</span>
            <span className="text-xs">4. Entregue</span>
          </div>
        </div>

        {/* Botão Contextual de Próxima Ação */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {order.status === 'recebido' && 'O lote está registrado na entrada e pronto para ser processado.'}
            {order.status === 'em_andamento' && 'Lote em andamento na produção industrial de lavagem e secagem.'}
            {order.status === 'pronto' && 'Lote pronto aguardando retirada pelo cliente ou envio.'}
            {order.status === 'entregue' && 'Lote de roupas já entregue ao cliente e serviço finalizado.'}
          </div>

          <div>
            {order.status === 'recebido' && (
              <button
                onClick={() => updateOrderStatus(order.id, 'em_andamento', user?.name || 'Operador', 'Iniciada a lavagem do lote.')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Iniciar Produção (Mover para Em Andamento)
              </button>
            )}

            {order.status === 'em_andamento' && (
              <button
                onClick={() => updateOrderStatus(order.id, 'pronto', user?.name || 'Operador')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Concluir Lavado (Marcar como Pronto)
              </button>
            )}

            {order.status === 'pronto' && (
              <button
                onClick={() => updateOrderStatus(order.id, 'entregue', user?.name || 'Operador', 'Lote entregue ao cliente.')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Registrar Entrega (Marcar como Entregue)
              </button>
            )}

            {order.status === 'entregue' && (
              <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Pedido Entregue e Concluído
              </span>
            )}
          </div>
        </div>
      </div>
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
                                  {(chem.totalGrams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
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
