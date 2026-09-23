import React, { useState, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Send, X, MessageSquare } from 'lucide-react';

export const WhatsAppModal: React.FC = () => {
  const { markReadyOrder, closeMarkReadyModal, confirmOrderReady } = useOrders();
  const { user } = useAuth();
  
  const [messageText, setMessageText] = useState<string>('');

  useEffect(() => {
    if (markReadyOrder) {
      setMessageText(`Olá ${markReadyOrder.clientName}, seu pedido ${markReadyOrder.osNumber} está pronto para retirada!`);
    }
  }, [markReadyOrder]);

  if (!markReadyOrder) return null;

  const handleConfirmSend = (e: React.FormEvent) => {
    e.preventDefault();
    confirmOrderReady(markReadyOrder.id, messageText, user?.name || 'Operador');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Confirmar Pedido Pronto</h3>
              <p className="text-xs text-slate-400 font-mono">Notificação via WhatsApp para o cliente</p>
            </div>
          </div>
          <button
            onClick={closeMarkReadyModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleConfirmSend} className="p-6 space-y-5">
          {/* Order Info Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase text-[10px] block font-bold">Nº DA OS / PEDIDO</span>
              <strong className="text-slate-900 dark:text-slate-100 text-sm">{markReadyOrder.osNumber}</strong>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 dark:text-slate-400">Cliente:</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold truncate max-w-[220px] font-sans">
                {markReadyOrder.clientName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Telefone:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">{markReadyOrder.clientPhone}</span>
            </div>
          </div>

          {/* Editable Message Field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              Mensagem para o WhatsApp (Editável):
            </label>
            <textarea
              rows={4}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-sans text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-medium"
              placeholder="Digite a mensagem para o cliente..."
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Você pode alterar ou personalizar o texto da mensagem antes de enviar.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={closeMarkReadyModal}
              className="px-3.5 py-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => confirmOrderReady(markReadyOrder.id, '', user?.name || 'Operador')}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              title="Mudar status para Pronto sem disparar mensagem de WhatsApp"
            >
              Apenas Marcar Pronto
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar WhatsApp e Marcar Pronto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
