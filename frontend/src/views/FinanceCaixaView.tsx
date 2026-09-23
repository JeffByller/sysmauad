import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { DollarSign, CheckCircle2, Clock, Search, Wallet, FileSpreadsheet, X, Tag } from 'lucide-react';
import { Order } from '../types';

export const FinanceCaixaView: React.FC = () => {
  const { orders, payInvoiceOrder } = useOrders();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'aberto' | 'pago'>('aberto');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<Order | null>(null);

  // Form State for Payment Entry (Baixa)
  const [discountType, setDiscountType] = useState<'fixed' | 'pct'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0); // R$ fixo ou % conforme discountType
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Calcula o desconto real em R$ conforme o tipo selecionado
  const getDiscountAmount = (serviceValue: number): number => {
    if (discountType === 'pct') {
      return Math.min(serviceValue, (serviceValue * discountValue) / 100);
    }
    return Math.min(serviceValue, discountValue);
  };

  const filteredOrders = orders.filter(ord => {
    const payStat = ord.paymentStatus || 'aberto';
    const matchesTab = activeTab === 'aberto' ? payStat === 'aberto' : payStat === 'pago';
    const term = searchTerm.toLowerCase();
    const matchesSearch = ord.osNumber.toLowerCase().includes(term) ||
                          ord.clientName.toLowerCase().includes(term) ||
                          ord.clientPhone.includes(term);
    return matchesTab && matchesSearch;
  });

  // Calculate Metrics
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Módulo Financeiro • Submenu Caixa
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Controle de Caixa & Dar Baixa em Faturas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerencie o faturamento dos clientes, conceda descontos, registre a forma de pagamento e dê baixa em cada OS.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl">
          <Wallet className="w-8 h-8" />
        </div>
      </div>

      {/* Success Feedback */}
      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      {/* Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('aberto')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'aberto'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Faturas em Aberto ({openOrders.length})
            </button>

            <button
              onClick={() => setActiveTab('pago')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pago'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Faturas Pagas / Baixadas ({paidOrders.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por OS, Cliente ou Telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Invoices Table */}
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
      </div>

      {/* Modal: Form de Dar Baixa em Fatura */}
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
                  {/* Toggle R$ / % */}
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
