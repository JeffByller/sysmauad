import React from 'react';
import { useOrders } from '../context/OrderContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft } from 'lucide-react';

interface OrderPrintViewProps {
  orderId: string;
  onBack: () => void;
}

export const OrderPrintView: React.FC<OrderPrintViewProps> = ({ orderId, onBack }) => {
  const { getOrderById, getOrderByOS } = useOrders();
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

  const handlePrint = () => {
    window.print();
  };

  const orderDate = new Date(order.createdAt);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 font-mono">
      {/* Top Action Bar (Oculta na impressão) */}
      <div className="flex items-center justify-between no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm font-sans transition-colors">
        <button
          onClick={onBack}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Pedidos
        </button>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 font-mono"
        >
          <Printer className="w-4 h-4" />
          Imprimir Nota de Entrada (Entrada.PDF)
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FOLHA DE ENTRADA — FORMATO IDÊNTICO AO ENTRADA.PDF            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-md space-y-3 print:border-0 print:shadow-none print:p-0 print:m-0 text-xs">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start font-bold">
          <span>LAVANDERIA MAUAD</span>
          <span className="text-center">NOTA DE ENTRADA</span>
          <span>Pagina: 001</span>
        </div>

        {/* Número da OS em Destaque Central */}
        <div className="text-center font-black text-xl tracking-wider py-1">
          {order.osNumber}
        </div>

        {/* Data de Entrada e Operador */}
        <div className="flex justify-between text-[11px] pt-1">
          <span>
            ENTRADA: {orderDate.toLocaleDateString('pt-BR')} FUNCNR: {order.operatorName?.toUpperCase() || 'GILMÁRIO'}
          </span>
          <span>
            {orderDate.toLocaleDateString('pt-BR', { weekday: 'long' })}, {orderDate.toLocaleDateString('pt-BR')} {orderDate.toLocaleTimeString('pt-BR')}
          </span>
        </div>

        {/* Separador tracejado idêntico ao Entrada.PDF */}
        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          --------------------------------------------------- DADOS DO CLIENTE ---------------------------------------------------
        </div>

        {/* Dados do Cliente */}
        <div className="text-xs space-y-1 pl-2">
          <div><strong>CLIENTE:</strong> {order.clientName}</div>
          {order.clientAddress && <div><strong>ENDERECO:</strong> {order.clientAddress}</div>}
          <div><strong>TELEFONE:</strong> {order.clientPhone || 'Não informado'}</div>
          <div><strong>OBS:</strong> {order.notes || 'Nenhuma'}</div>
        </div>

        {/* Separador tracejado */}
        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          ------------------------------------------------------------------------------------------------------------------------
        </div>

        {/* Cabeçalho da Tabela de Peças */}
        <div className="grid grid-cols-12 font-bold text-xs">
          <div className="col-span-5">LAVADO / SERVIÇO</div>
          <div className="col-span-4">ROUPA / PEÇA</div>
          <div className="col-span-3 text-right">QTD</div>
        </div>

        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          ------------------------------------------------------------------------------------------------------------------------
        </div>

        {/* Itens do Pedido */}
        <div className="space-y-1.5 text-xs">
          {order.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 py-1 items-center">
              <div className="col-span-5 font-bold uppercase">{item.process}</div>
              <div className="col-span-4 uppercase">{item.clothingType}</div>
              <div className="col-span-3 text-right font-bold font-mono text-sm">
                {item.quantity || order.estimatedPieceCount}
              </div>
            </div>
          ))}
        </div>

        <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
          ------------------------------------------------------------------------------------------------------------------------
        </div>

        {/* Total de Peças */}
        <div className="flex justify-between font-bold text-sm pt-1">
          <span>QtdTotPecas:</span>
          <span className="font-mono text-base">{order.estimatedPieceCount}</span>
        </div>

        {/* Informações Complementares de Pesagem e QR Code (Discreto para Leitura do Passador) */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-600">
          <div className="space-y-0.5">
            <div><strong>Peso Balança:</strong> {order.totalWeightKg} kg • <strong>Ref. Peça:</strong> {order.refPieceWeightGrams} g</div>
            <div><strong>Valor Total do Serviço:</strong> {order.totalServiceValue ? order.totalServiceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 border border-slate-800 bg-white inline-block">
              <QRCodeSVG value={order.osNumber} size={48} />
            </div>
            <span className="font-mono text-[9px] font-bold uppercase">QR Bipagem</span>
          </div>
        </div>

        {/* Assinaturas no rodapé idênticas ao Entrada.PDF */}
        <div className="pt-8 flex justify-between text-center text-[10px] uppercase font-mono">
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <span>ENTREGUE POR</span>
          </div>
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <span>RECEBIDO POR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
