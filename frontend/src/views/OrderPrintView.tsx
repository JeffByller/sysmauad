import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, FileText, FlaskConical, Layers } from 'lucide-react';

interface OrderPrintViewProps {
  orderId: string;
  onBack: () => void;
}

export const OrderPrintView: React.FC<OrderPrintViewProps> = ({ orderId, onBack }) => {
  const { getOrderById, getOrderByOS, calculateChemicals } = useOrders();
  const order = getOrderById(orderId) || getOrderByOS(orderId);

  // Modo de visualização/impressão: 'ambos' | 'nota' | 'receita'
  const [printMode, setPrintMode] = useState<'ambos' | 'nota' | 'receita'>('ambos');

  if (!order) {
    return (
      <div className="text-center py-12 font-sans">
        <p className="text-slate-500">Pedido não encontrado.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">
          Voltar aos Pedidos
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const orderDate = new Date(order.createdAt);
  
  // Formatação de data e hora no padrão dos relatórios industriais
  // Ex: "22/09/26" e "Terça, 22/09/26 16:07:46"
  const day = String(orderDate.getDate()).padStart(2, '0');
  const month = String(orderDate.getMonth() + 1).padStart(2, '0');
  const yearShort = String(orderDate.getFullYear()).slice(-2);
  const dateShort = `${day}/${month}/${yearShort}`;

  const weekdayCapitalized = orderDate.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekdayFormatted = weekdayCapitalized.charAt(0).toUpperCase() + weekdayCapitalized.slice(1);
  const timeFormatted = orderDate.toLocaleTimeString('pt-BR');

  // Número puro da OS (ex: 9485)
  const pureOsNumber = order.osNumber.replace(/^[A-Za-z]+-/, '');

  // Fases e produtos da receita técnica calculados por porcentagem sobre o peso total
  const recipeFases = useMemo(() => {
    const hasStructuredPhases = order.chemicalRecipe && order.chemicalRecipe.some(c => c.faseName);
    const rawList = hasStructuredPhases 
      ? order.chemicalRecipe 
      : calculateChemicals(order.totalWeightKg, [order.items[0]?.process || '']);

    const map = new Map<string, { order: number; name: string; items: typeof rawList }>();

    rawList.forEach(item => {
      const orderNum = item.faseOrder || 1;
      const faseName = (item.faseName || 'PROCESSO GERAL').toUpperCase();
      const key = `${orderNum}-${faseName}`;
      if (!map.has(key)) {
        map.set(key, { order: orderNum, name: faseName, items: [] });
      }
      map.get(key)!.items.push(item);
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [order, calculateChemicals]);

  // Primeiro item do pedido (lavado principal)
  const primaryItem = order.items[0];
  const primaryLavado = primaryItem?.process?.toUpperCase() || 'LAVADO PADRÃO';
  const primaryRoupa = primaryItem?.clothingType?.toUpperCase() || 'ROUPA TÊXTIL';
  const primaryCorteOs = order.corteOs || primaryItem?.corteOs || '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* BARRA DE AÇÕES SUPERIOR (Oculta na Impressão)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 font-sans transition-colors">
        <button
          onClick={onBack}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos Pedidos
        </button>

        {/* Seletor de Modelo do Relatório */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setPrintMode('ambos')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              printMode === 'ambos'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ambos (Nota + Receita)
          </button>

          <button
            onClick={() => setPrintMode('nota')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              printMode === 'nota'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Nota de Entrada
          </button>

          <button
            onClick={() => setPrintMode('receita')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              printMode === 'receita'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Receita do Lavado
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Imprimir Documento
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. NOTA DE ENTRADA — ESTILO IDÊNTICO AO DESSE PEDIDO.PDF       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(printMode === 'ambos' || printMode === 'nota') && (
        <div className={`bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-md space-y-2 font-mono text-[11px] leading-tight print:border-0 print:shadow-none print:p-0 print:m-0 ${printMode === 'ambos' ? 'page-break mb-12' : ''}`}>
          {/* Cabeçalho */}
          <div className="flex justify-between items-start font-bold text-xs uppercase">
            <span>LAVANDERIA MAUAD</span>
            <span>NOTA DE ENTRADA</span>
            <span>Pagina: 001</span>
          </div>

          {/* Número em Grande Destaque Central */}
          <div className="text-center font-black text-xl tracking-wider py-1 font-mono">
            {pureOsNumber}
          </div>

          {/* Linha de Entrada, Funcionário e Data/Hora */}
          <div className="flex justify-between text-[11px] pt-0.5">
            <span>
              ENTRADA: {dateShort} FUNCNR: {order.operatorName?.toUpperCase() || 'GILMÁRIO'}
            </span>
            <span>
              {weekdayFormatted}, {dateShort} {timeFormatted}
            </span>
          </div>

          {/* Separador tracejado com título Dados do Cliente */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            ------------------------------- DADOS DO CLIENTE -------------------------------
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-1 pl-1 text-[11px]">
            <div>
              <span className="font-bold">CLIENTE:</span> {order.clientName.toUpperCase()}
            </div>
            {order.clientAddress && (
              <div>
                <span className="font-bold">ENDERECO:</span> {order.clientAddress.toUpperCase()}
              </div>
            )}
            <div className="pl-10">
              / {order.clientPhone || '99852-4888'}
            </div>
            <div>
              <span className="font-bold">OBS:</span> {order.notes || ''}
            </div>
          </div>

          {/* Linha divisória simples */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            --------------------------------------------------------------------------------
          </div>

          {/* Cabeçalho de Itens */}
          <div className="grid grid-cols-12 font-bold text-[11px] uppercase">
            <div className="col-span-5">LAVADO</div>
            <div className="col-span-3">CORTE/O.S.</div>
            <div className="col-span-4">ROUPA</div>
          </div>
          <div className="grid grid-cols-12 font-bold text-[11px] uppercase pb-1">
            <div className="col-span-5 pl-2 text-slate-700">SERVICO</div>
            <div className="col-span-3">QTD</div>
            <div className="col-span-4"></div>
          </div>

          {/* Linha divisória */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            --------------------------------------------------------------------------------
          </div>

          {/* Linhas de Itens do Pedido */}
          <div className="space-y-2 text-[11px]">
            {order.items.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="grid grid-cols-12 items-baseline">
                  <div className="col-span-5 font-bold uppercase">{item.process}</div>
                  <div className="col-span-3 font-semibold uppercase">{item.corteOs || order.corteOs || '-'}</div>
                  <div className="col-span-4 font-semibold uppercase">
                    {item.clothingType} {item.corteOs ? `(${item.corteOs})` : ''}
                  </div>
                </div>
                <div className="grid grid-cols-12">
                  <div className="col-span-5"></div>
                  <div className="col-span-3 font-bold font-mono text-xs">
                    {item.quantity || order.estimatedPieceCount}
                  </div>
                  <div className="col-span-4"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Linha divisória */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-1">
            --------------------------------------------------------------------------------
          </div>

          {/* Totais: QtdTotPecas e PesTotal */}
          <div className="space-y-1 pt-1 font-bold text-xs">
            <div className="flex gap-4">
              <span>QtdTotPecas:</span>
              <span className="font-mono">{order.estimatedPieceCount}</span>
            </div>
            <div className="flex gap-4">
              <span>PesTotal:</span>
              <span className="font-mono">
                {order.totalWeightKg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Kg
              </span>
            </div>
          </div>

          {/* Rodapé com Assinaturas idênticas ao Desse Pedido.PDF */}
          <div className="pt-10 flex justify-around text-center text-[10px] uppercase font-mono">
            <div>
              <div className="text-slate-400 select-none">------------------------------</div>
              <div className="font-bold pt-1">ENTREGUE POR</div>
            </div>
            <div>
              <div className="text-slate-400 select-none">------------------------------</div>
              <div className="font-bold pt-1">RECEBIDO POR</div>
            </div>
          </div>

          {/* QR Code para rastreamento industrial (discreto no canto inferior direito) */}
          <div className="pt-4 flex items-center justify-end gap-2 text-[9px] text-slate-500">
            <span>QR Bipagem O.S:</span>
            <div className="p-0.5 border border-slate-700 bg-white inline-block">
              <QRCodeSVG value={order.osNumber} size={36} />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RECEITA / FICHA DO LAVADO — ESTILO LAVADO COM PROCESSOS.PDF */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(printMode === 'ambos' || printMode === 'receita') && (
        <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-md space-y-2 font-mono text-[11px] leading-tight print:border-0 print:shadow-none print:p-0 print:m-0">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start font-bold text-xs uppercase">
            <span>LAVANDERIA MAUAD</span>
            <span>RECEITA</span>
            <span>Pagina: 001</span>
          </div>

          {/* Linha do Funcionário e Data/Hora de Impressão */}
          <div className="flex justify-between text-[11px] pt-0.5">
            <span>FUNCNR: {order.operatorName?.toUpperCase() || 'GILMÁRIO'}</span>
            <span>{weekdayFormatted}, {dateShort} {timeFormatted}</span>
          </div>

          {/* Linha divisória simples */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          </div>

          {/* Bloco de Dados do Pedido */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <div>
                <span className="font-bold">PEDIDO......:</span> {pureOsNumber}
              </div>
              <div>
                <span className="font-bold">ENTRADA:</span> {weekdayFormatted} {dateShort} {timeFormatted.slice(0, 5)}
              </div>
            </div>
            <div>
              <span className="font-bold">CLIENTE.....:</span> {order.clientName.toUpperCase()}
            </div>
            <div>
              <span className="font-bold">ROUPA.......:</span> {primaryRoupa} {primaryCorteOs ? `(REF.${primaryCorteOs})` : ''}
            </div>
            <div>
              <span className="font-bold">LAVADO......:</span> {primaryLavado}
            </div>
            <div>
              <span className="font-bold">OBS.........:</span> {order.notes || ''}
            </div>
          </div>

          {/* Linha divisória simples */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          </div>

          {/* Linha de Totais (Peças e Peso Total em Kg) */}
          <div className="flex justify-between font-bold text-xs py-0.5">
            <div>
              <span>TOTAL.......:</span> <span className="font-mono text-sm ml-2">{order.estimatedPieceCount}</span>
            </div>
            <div className="font-mono text-sm">
              {order.totalWeightKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} Kg
            </div>
          </div>

          {/* Linha divisória simples */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          </div>

          {/* Cabeçalho das Colunas Técnicas de Produção */}
          <div className="grid grid-cols-12 font-bold text-[10px] uppercase pb-1 text-slate-800">
            <div className="col-span-3">Produto</div>
            <div className="col-span-2 text-right pr-4">Quantidade(Kg)</div>
            <div className="col-span-1 text-center">Conver.(Lt)</div>
            <div className="col-span-1 text-center">Temperat.</div>
            <div className="col-span-1 text-center">Tempo</div>
            <div className="col-span-1 text-center">PH</div>
            <div className="col-span-1 text-center">Maquina</div>
            <div className="col-span-1 text-center">Operador</div>
            <div className="col-span-1 text-center">Data/Hora</div>
          </div>

          {/* Linha divisória */}
          <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px]">
            ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          </div>

          {/* Fases / Processos e seus respectivos produtos químicos */}
          <div className="space-y-3 pt-1">
            {recipeFases.map((fase, fIdx) => (
              <div key={fIdx} className="space-y-1.5">
                {/* Nome da Fase em destaque com asteriscos */}
                <div className="font-black text-xs uppercase tracking-wide text-slate-900 pt-1">
                  *** {fase.name} ***
                </div>

                {/* Lista de Produtos da Fase */}
                {fase.items.map((prod, pIdx) => {
                  const qtyKg = (prod.totalGrams / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                  });

                  return (
                    <div key={pIdx} className="grid grid-cols-12 items-center text-[10px]">
                      {/* Nome do Produto */}
                      <div className="col-span-3 font-semibold uppercase truncate pr-1" title={prod.productName}>
                        {prod.productName}
                      </div>

                      {/* Quantidade calculada em Kg com 3 decimais */}
                      <div className="col-span-2 text-right pr-4 font-mono font-bold text-[11px]">
                        {qtyKg}
                      </div>

                      {/* Campos para preenchimento manual na fábrica pelo operador da máquina */}
                      <div className="col-span-1 text-center text-slate-400 select-none">_______</div>
                      <div className="col-span-1 text-center text-slate-400 select-none">___</div>
                      <div className="col-span-1 text-center text-slate-400 select-none">___</div>
                      <div className="col-span-1 text-center text-slate-400 select-none">___</div>
                      <div className="col-span-1 text-center text-slate-400 select-none">_______</div>
                      <div className="col-span-1 text-center text-slate-400 select-none">_______</div>
                      <div className="col-span-1 text-center text-slate-400 select-none">___/___</div>
                    </div>
                  );
                })}

                {/* Linha dupla divisória de encerramento da fase (exatamente como no PDF!) */}
                <div className="text-slate-400 select-none overflow-hidden whitespace-nowrap text-[11px] pt-1">
                  ================================================================================================================================================================
                </div>
              </div>
            ))}
          </div>

          {/* Rodapé explicativo do cálculo da receita */}
          <div className="pt-4 flex justify-between items-center text-[9px] text-slate-500 border-t border-slate-200">
            <span>
              * Quantidades calculadas por porcentagem (%) sobre o peso do lote ({order.totalWeightKg} Kg). Dosagens ajustáveis por tipo de lavado.
            </span>
            <span className="font-mono uppercase font-bold">
              SYSMAUAD INDUSTRIAL
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
