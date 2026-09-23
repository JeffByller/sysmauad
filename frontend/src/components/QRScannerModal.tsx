import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { QrCode, X, Search, CheckCircle } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (osNumber: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onSelectOrder }) => {
  const { orders } = useOrders();
  const [manualInput, setManualInput] = useState('');

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onSelectOrder(manualInput.trim());
      setManualInput('');
      onClose();
    }
  };

  const handleQuickSelect = (osNumber: string) => {
    onSelectOrder(osNumber);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-sm">Leitor de QR Code / Bipagem de Pedido</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Visual Camera Simulation Box */}
          <div className="bg-slate-950 rounded-xl p-6 text-center text-slate-300 relative border border-slate-800 flex flex-col items-center justify-center min-h-[180px]">
            <div className="w-24 h-24 border-2 border-dashed border-sky-400/70 rounded-lg flex items-center justify-center mb-3 relative animate-pulse">
              <QrCode className="w-12 h-12 text-sky-400" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]"></div>
            </div>
            <p className="text-xs text-slate-400">Aponte a câmera do celular para o QR Code da Nota de Entrada</p>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Simulador de Leitura Óptica</span>
          </div>

          {/* Direct Manual Entry */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
              Ou Digite/Bipe o Número da OS
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: OS-9287"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </div>
          </form>

          {/* Quick Click Order List for Simulation */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Selecione um Pedido Simulado para Bipar Rápidamente:
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
              {orders.map(ord => (
                <button
                  key={ord.id}
                  onClick={() => handleQuickSelect(ord.osNumber)}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <span className="font-mono font-semibold text-sm text-slate-900 group-hover:text-sky-700">
                      {ord.osNumber}
                    </span>
                    <span className="text-xs text-slate-500 block truncate">{ord.clientName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-700 block">{ord.estimatedPieceCount} pçs</span>
                    <span className="text-[10px] text-slate-500 capitalize">{ord.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
