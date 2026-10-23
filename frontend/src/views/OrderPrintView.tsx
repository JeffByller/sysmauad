import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, FileText, FlaskConical, Layers, Receipt, QrCode, Sparkles, Send, X } from 'lucide-react';

interface OrderPrintViewProps {
  orderId: string;
  onBack: () => void;
  initialMode?: 'ambos' | 'nota' | 'receita' | 'saida' | 'passadoria' | 'diferenciado';
}

export const OrderPrintView: React.FC<OrderPrintViewProps> = ({ orderId, onBack, initialMode }) => {
  const { getOrderById, getOrderByOS, calculateChemicals, orders, passadores, diferenciados } = useOrders();
  
  // Localiza o pedido com segurança por ID ou por OS
  const order = useMemo(() => {
    if (!orderId) return undefined;
    return getOrderById(orderId) || getOrderByOS(orderId) || orders.find(o => o.id === orderId || o.osNumber === orderId);
  }, [orderId, getOrderById, getOrderByOS, orders]);

  // Modo de visualização/impressão: 'ambos' | 'nota' | 'receita' | 'saida' | 'passadoria' | 'diferenciado'
  const [printMode, setPrintMode] = useState<'ambos' | 'nota' | 'receita' | 'saida' | 'passadoria' | 'diferenciado'>(initialMode || 'ambos');

  // Passadores ativos no sistema para preenchimento manual
  const activePassadoresList = useMemo(() => {
    return (passadores || []).filter(p => p.active !== false);
  }, [passadores]);

  // Colaboradores de Diferenciado ativos no sistema para preenchimento manual
  const activeDiferenciadosList = useMemo(() => {
    return (diferenciados || []).filter(d => d.active !== false);
  }, [diferenciados]);

  // Fases e produtos da receita técnica calculados por porcentagem sobre o peso total
  // O hook useMemo DEVE SEMPRE rodar no topo, antes de qualquer retorno condicional!
  const recipeFases = useMemo(() => {
    if (!order) return [];

    const hasStructuredPhases = Array.isArray(order.chemicalRecipe) && order.chemicalRecipe.some(c => Boolean(c.faseName));
    const rawList = hasStructuredPhases 
      ? order.chemicalRecipe 
      : calculateChemicals(order.totalWeightKg || 0, [order.items?.[0]?.process || '']);

    const map = new Map<string, { order: number; name: string; items: typeof rawList }>();

    (rawList || []).forEach(item => {
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

  // Se o pedido não existir na memória
  if (!order) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center font-sans space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ordem de Serviço Não Encontrada</h2>
        <p className="text-xs text-slate-500">
          Não localizamos o pedido com identificador <strong>{orderId || 'desconhecido'}</strong>. O pedido pode ter sido atualizado ou você pode voltar à listagem.
        </p>
        <div className="pt-2">
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Voltar para Lista de Pedidos
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Envio direto do documento/comprovante da OS via WhatsApp
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendWhatsApp = async () => {
    if (!order) return;
    const targetPhone = order.clientPhone?.trim();
    if (!targetPhone) {
      setWhatsAppFeedback({
        type: 'error',
        message: `A O.S. #${order.osNumber} não possui telefone/WhatsApp do cliente cadastrado.`
      });
      setTimeout(() => setWhatsAppFeedback(null), 6000);
      return;
    }

    setSendingWhatsApp(true);
    try {
      const itemsList = (order.items && order.items.length > 0)
        ? order.items.map(it => `• ${it.clothingType || 'Peça'} - ${it.process || 'Lavado'}: ${it.quantity || 0} pçs`).join('\n')
        : `• ${primaryRoupa} - ${primaryLavado}: ${totalPiecesSafe} pçs (${totalWeightSafe.toFixed(2)} kg)`;

      const paymentDesc = order.paymentStatus === 'pago'
        ? `Quitado (${order.paymentMethod || 'Pago'})`
        : 'Pendente (Em Aberto)';

      const text = [
        `🧺 *MAUAD LAVANDERIA INDUSTRIAL*`,
        `📄 *ORDEM DE SERVIÇO #${pureOsNumber}*`,
        ``,
        `👤 *Cliente:* ${clientNameSafe}`,
        `🗓️ *Entrada:* ${dateShort} às ${timeFormatted}`,
        `📦 *Status:* ${order.status?.toUpperCase() || 'EM ANDAMENTO'}`,
        primaryCorteOs ? `✂️ *Corte / O.S. Origem:* ${primaryCorteOs}` : '',
        ``,
        `📋 *Itens / Serviços:*`,
        itemsList,
        ``,
        `⚖️ *Total:* ${totalPiecesSafe} peças | ${totalWeightSafe.toFixed(2)} kg`,
        totalServiceValueSafe ? `💰 *Valor Total:* ${totalServiceValueSafe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '',
        `💳 *Situação Financeira:* ${paymentDesc}`,
        order.notes ? `\n📝 *Observações:* ${order.notes}` : '',
        ``,
        `Emitido em ${new Date().toLocaleString('pt-BR')}`
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: targetPhone,
          text,
          clientId: order.clientId,
          clientName: order.clientName,
          eventType: 'Comprovante de OS'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsAppFeedback({
          type: 'success',
          message: `Documento da O.S. #${pureOsNumber} enviado com sucesso para ${order.clientName} (${targetPhone})!`
        });
      } else {
        setWhatsAppFeedback({
          type: 'error',
          message: data.error || 'Falha ao enviar documento via WhatsApp.'
        });
      }
    } catch (err: any) {
      setWhatsAppFeedback({
        type: 'error',
        message: err.message || 'Erro ao conectar ao serviço de WhatsApp.'
      });
    } finally {
      setSendingWhatsApp(false);
      setTimeout(() => setWhatsAppFeedback(null), 6000);
    }
  };

  // Formatação segura de datas
  const rawDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const orderDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
  
  const day = String(orderDate.getDate()).padStart(2, '0');
  const month = String(orderDate.getMonth() + 1).padStart(2, '0');
  const yearShort = String(orderDate.getFullYear()).slice(-2);
  const dateShort = `${day}/${month}/${yearShort}`;

  const weekdayRaw = orderDate.toLocaleDateString('pt-BR', { weekday: 'long' }) || 'Terça';
  const weekdayFormatted = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const timeFormatted = orderDate.toLocaleTimeString('pt-BR') || '12:00:00';

  // Número puro da OS (ex: 9485)
  const pureOsNumber = (order.osNumber || '').replace(/^[A-Za-z]+-/, '') || '0001';

  // Primeiro item do pedido (lavado principal)
  const primaryItem = order.items?.[0];
  const primaryLavado = primaryItem?.process?.toUpperCase() || 'LAVADO PADRÃO';
  const primaryRoupa = primaryItem?.clothingType?.toUpperCase() || 'ROUPA TÊXTIL';
  const primaryCorteOs = order.corteOs || primaryItem?.corteOs || '';

  const clientNameSafe = (order.clientName || 'CLIENTE NÃO INFORMADO').toUpperCase();
  const totalWeightSafe = Number(order.totalWeightKg || 0);
  const totalPiecesSafe = Number(order.estimatedPieceCount || 0);
  const totalServiceValueSafe = order.isRelavado || order.isADefinir
    ? 0
    : Number(
        order.totalServiceValue ??
        (order.items || []).reduce(
          (acc, it) => acc + (it.totalPrice ?? (Number(it.unitPrice || 0) * (Number(it.quantity) || totalPiecesSafe))),
          0
        )
      );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 print:max-w-none print:w-full print:p-0 print:m-0 space-y-6 font-sans">
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

          <button
            onClick={() => setPrintMode('saida')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              printMode === 'saida'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Comprovante de Saída
          </button>

          <button
            onClick={() => setPrintMode('passadoria')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              printMode === 'passadoria'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Passadoria
          </button>

          <button
            onClick={() => setPrintMode('diferenciado')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              printMode === 'diferenciado'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Diferenciado
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendWhatsApp}
            disabled={sendingWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer font-mono"
            title={order.clientPhone ? `Enviar documento da OS para ${order.clientName} (${order.clientPhone})` : 'Cliente sem WhatsApp cadastrado'}
          >
            <Send className="w-4 h-4" />
            <span>{sendingWhatsApp ? 'Enviando...' : 'Enviar WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir Documento
          </button>
        </div>
      </div>

      {whatsAppFeedback && (
        <div className={`no-print p-3 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
          whatsAppFeedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
        }`}>
          <span>{whatsAppFeedback.message}</span>
          <button onClick={() => setWhatsAppFeedback(null)} className="opacity-60 hover:opacity-100 p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. NOTA DE ENTRADA — FORMATO INDUSTRIAL DE LARGURA TOTAL      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(printMode === 'ambos' || printMode === 'nota') && (
        <div className={`bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md space-y-3 font-mono text-[11px] leading-tight print-sheet print:border-0 print:shadow-none print:rounded-none w-full ${printMode === 'ambos' ? 'page-break mb-8' : ''}`}>
          
          {/* Cabeçalho de Ponta a Ponta */}
          <div className="flex justify-between items-baseline font-bold text-xs uppercase pb-1.5 border-b-2 border-slate-900">
            <span className="text-sm font-black tracking-wider">MAUAD LAVANDERIA</span>
            <span className="text-sm font-bold tracking-wide">NOTA DE ENTRADA</span>
            <span className="text-[10px]">PÁGINA: 001</span>
          </div>

          {/* Destaque Central da O.S. e Metadados Laterais */}
          <div className="flex justify-between items-center py-1">
            <div className="text-[10px] text-left space-y-0.5">
              <div><span className="font-bold">ENTRADA:</span> {dateShort}</div>
              <div><span className="font-bold">OPERADOR:</span> {order.operatorName?.toUpperCase() || 'GILMÁRIO'}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black tracking-widest font-mono text-slate-900">
                {pureOsNumber}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                ORDEM DE SERVIÇO
              </div>
            </div>

            <div className="text-[10px] text-right space-y-0.5">
              <div>{weekdayFormatted}</div>
              <div>{dateShort} {timeFormatted}</div>
            </div>
          </div>

          {order.isRelavado && (
            <div className="bg-purple-100 text-purple-900 border border-purple-400 font-bold text-center py-1.5 text-xs uppercase tracking-wider">
              *** ENTRADA EM RELAVADO ***
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DADOS DO CLIENTE & PEDIDO</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Dados do Cliente Distribuídos em 2 Colunas (Aproveitamento Total das Laterais) */}
          <div className="grid grid-cols-12 gap-4 text-[11px] py-0.5">
            <div className="col-span-7 space-y-1">
              <div className="flex">
                <span className="font-bold w-24 shrink-0">CLIENTE:</span>
                <span className="font-bold uppercase text-slate-900">{clientNameSafe}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">ENDEREÇO:</span>
                <span className="uppercase">{order.clientAddress || 'NÃO INFORMADO'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">TELEFONE:</span>
                <span>{order.clientPhone || 'NÃO INFORMADO'}</span>
              </div>
            </div>

            <div className="col-span-5 space-y-1 pl-3 border-l border-slate-200">
              <div className="flex justify-between">
                <span className="font-bold">CORTE / REF:</span>
                <span className="font-mono font-bold uppercase">{order.corteOs || primaryCorteOs || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">STATUS ATUAL:</span>
                <span className="uppercase font-semibold">{order.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">TIPO ENTRADA:</span>
                <span className="uppercase font-semibold">{order.isRelavado ? 'RELAVADO' : 'PRODUÇÃO NORMAL'}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px]">
              <span className="font-bold">OBSERVAÇÕES:</span> {order.notes}
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DISCRIMINAÇÃO DOS ITENS & PROCESSOS</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Tabela de Itens Aproveitando 100% da Largura da Folha */}
          <div className="w-full">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold text-slate-800">
                  <th className="py-1 px-1 text-left w-[36%]">LAVADO / PROCESSO</th>
                  <th className="py-1 px-1 text-left w-[24%]">ROUPA / PEÇA</th>
                  <th className="py-1 px-1 text-center w-[16%]">CORTE / O.S.</th>
                  <th className="py-1 px-1 text-center w-[12%]">TIPO</th>
                  <th className="py-1 px-1 text-right w-[12%]">QUANTIDADE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(order.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-1 font-bold uppercase text-slate-900">
                      {item.process}
                    </td>
                    <td className="py-1.5 px-1 uppercase text-slate-800">
                      {item.clothingType}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono uppercase text-slate-700">
                      {item.corteOs || order.corteOs || '-'}
                    </td>
                    <td className="py-1.5 px-1 text-center uppercase text-[10px] text-slate-600">
                      {item.serviceType === 'diferenciado' ? 'DIFERENCIADO' : 'LAVADO'}
                    </td>
                    <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-900 text-xs">
                      {item.quantity || totalPiecesSafe} pçs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Divisor de 100% de Largura */}
          <div className="w-full border-b-2 border-slate-900 my-1"></div>

          {/* Totais: Ocupando as Duas Laterais com Equilíbrio Perfeito */}
          <div className="flex justify-between items-center py-2 px-3 bg-slate-50 border border-slate-300 rounded font-bold text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">QTD TOTAL PEÇAS:</span>
                <span className="font-mono text-base text-slate-900">{totalPiecesSafe}</span>
                <span className="text-[10px] text-slate-500 ml-1">peças</span>
              </div>
              <div className="text-[11px] text-slate-500 font-normal">
                Ref. Unitária: <span className="font-mono font-bold text-slate-800">{order.refPieceWeightGrams || (totalPiecesSafe > 0 ? Math.round((totalWeightSafe * 1000) / totalPiecesSafe) : 0)}g / pç</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-600 text-[11px] uppercase mr-2">PESO TOTAL BALANÇA:</span>
              <span className="font-mono text-base text-slate-900">
                {totalWeightSafe.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </span>
              <span className="text-xs text-slate-900 ml-1">Kg</span>
            </div>
          </div>

          {/* Rodapé: Assinatura Centralizada e QR Code */}
          <div className="pt-8 relative flex items-end justify-center font-mono text-[10px] uppercase">
            <div className="w-80 text-center">
              <div className="border-b border-black w-full mb-1"></div>
              <div className="font-bold">ASSINATURA</div>
            </div>

            <div className="absolute right-0 bottom-0 flex flex-col items-end justify-center text-[9px] text-slate-600">
              <div className="p-0.5 border border-black bg-white inline-block mb-0.5">
                <QRCodeSVG value={order.osNumber || pureOsNumber} size={42} />
              </div>
              <span className="font-mono font-bold tracking-tight">O.S. {pureOsNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RECEITA / FICHA DO LAVADO — FORMATO INDUSTRIAL DE LARGURA  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {(printMode === 'ambos' || printMode === 'receita') && (
        <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md space-y-3 font-mono text-[11px] leading-tight print-sheet print:border-0 print:shadow-none print:rounded-none w-full">
          
          {/* Cabeçalho de Ponta a Ponta */}
          <div className="flex justify-between items-baseline font-bold text-xs uppercase pb-1.5 border-b-2 border-slate-900">
            <span className="text-sm font-black tracking-wider">MAUAD LAVANDERIA</span>
            <span className="text-sm font-bold tracking-wide">FICHA TÉCNICA DE LAVAGEM • RECEITA QUÍMICA</span>
            <span className="text-[10px]">PÁGINA: 001</span>
          </div>

          {/* Destaque Central da O.S. e Metadados Laterais */}
          <div className="flex justify-between items-center py-1">
            <div className="text-[10px] text-left space-y-0.5">
              <div><span className="font-bold">ENTRADA:</span> {dateShort}</div>
              <div><span className="font-bold">OPERADOR:</span> {order.operatorName?.toUpperCase() || 'GILMÁRIO'}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black tracking-widest font-mono text-slate-900">
                {pureOsNumber}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                ORDEM DE SERVIÇO
              </div>
            </div>

            <div className="text-[10px] text-right space-y-0.5">
              <div>{weekdayFormatted}</div>
              <div>{dateShort} {timeFormatted}</div>
            </div>
          </div>

          {order.isRelavado && (
            <div className="bg-purple-100 text-purple-900 border border-purple-400 font-bold text-center py-1.5 text-xs uppercase tracking-wider">
              *** LOTE EM PROCESSO DE RELAVADO ***
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DADOS DA ORDEM DE PRODUÇÃO</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Bloco de Dados em 3 Colunas Perfeitamente Distribuídas de Ponta a Ponta */}
          <div className="grid grid-cols-12 gap-3 text-[11px] py-1 bg-slate-50 border border-slate-200 rounded p-2.5">
            {/* Coluna 1: Identificação do Pedido e Cliente */}
            <div className="col-span-4 space-y-1">
              <div>
                <span className="font-bold text-slate-600 block text-[9px] uppercase">CLIENTE</span>
                <span className="font-bold uppercase text-slate-900 truncate block" title={clientNameSafe}>
                  {clientNameSafe}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[9px] uppercase">ENDEREÇO</span>
                <span className="uppercase text-slate-800 text-[10px] block truncate">
                  {order.clientAddress || 'NÃO INFORMADO'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[9px] uppercase">ROUPA / TIPO DE PEÇA</span>
                <span className="font-semibold uppercase text-slate-800">
                  {primaryRoupa}
                </span>
              </div>
            </div>

            {/* Coluna 2: Lavado e Referência */}
            <div className="col-span-4 space-y-1 border-l border-slate-200 pl-3">
              <div>
                <span className="font-bold text-slate-600 block text-[9px] uppercase">RECEITA / LAVADO PRINCIPAL</span>
                <span className="font-black text-sm font-mono text-slate-900 block truncate" title={primaryLavado}>
                  {primaryLavado}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[9px] uppercase">CORTE / REF. CONFECÇÃO</span>
                <span className="font-mono font-bold uppercase text-slate-800">
                  {primaryCorteOs || order.corteOs || 'NÃO INFORMADO'}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[9px] uppercase">ENTRADA REGISTRADA</span>
                <span className="font-mono text-slate-700">
                  {dateShort} às {timeFormatted.slice(0, 5)}
                </span>
              </div>
            </div>

            {/* Coluna 3: Métricas de Peso e Peças */}
            <div className="col-span-4 space-y-1 border-l border-slate-200 pl-3">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-600 text-[10px] uppercase">TOTAL DE PEÇAS:</span>
                <span className="font-mono font-black text-sm text-slate-900">{totalPiecesSafe} pçs</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-600 text-[10px] uppercase">PESO TOTAL LOTE:</span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {totalWeightSafe.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Kg
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-600 text-[10px] uppercase">PESO REF./PEÇA:</span>
                <span className="font-mono font-bold text-slate-800">
                  {order.refPieceWeightGrams || (totalPiecesSafe > 0 ? Math.round((totalWeightSafe * 1000) / totalPiecesSafe) : 0)} g
                </span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px]">
              <span className="font-bold">OBSERVAÇÕES DO LOTE:</span> {order.notes}
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">SEQUÊNCIA DE FASES & DOSAGEM QUÍMICA INDUSTRIAL</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Tabela Técnica de Fases e Insumos Químicos Aproveitando 100% da Largura da Folha */}
          <div className="w-full">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-slate-900 uppercase font-black text-slate-800 text-[9px] bg-slate-100">
                  <th className="py-1 px-1.5 text-left w-[26%]">PRODUTO / INSUMO QUÍMICO</th>
                  <th className="py-1 px-1 text-center w-[9%]">DOSAGEM</th>
                  <th className="py-1 px-1 text-right w-[12%]">QUANTIDADE</th>
                  <th className="py-1 px-1 text-center w-[8%]">BANHO</th>
                  <th className="py-1 px-1 text-center w-[7%]">TEMP.</th>
                  <th className="py-1 px-1 text-center w-[7%]">TEMPO</th>
                  <th className="py-1 px-1 text-center w-[6%]">pH</th>
                  <th className="py-1 px-1 text-center w-[8%]">MÁQUINA</th>
                  <th className="py-1 px-1 text-center w-[9%]">OPERADOR</th>
                  <th className="py-1 px-1 text-center w-[8%]">HORÁRIO</th>
                </tr>
              </thead>
              <tbody>
                {recipeFases.map((fase, fIdx) => (
                  <React.Fragment key={fIdx}>
                    {/* Linha de Cabeçalho da Fase */}
                    <tr className="bg-slate-200/90 text-slate-900 border-t-2 border-b border-slate-700">
                      <td colSpan={10} className="py-1 px-2 font-black text-[11px] uppercase tracking-wide">
                        FASE {String(fase.order).padStart(2, '0')} — {fase.name}
                      </td>
                    </tr>

                    {/* Linhas de Produtos da Fase */}
                    {fase.items.map((prod, pIdx) => {
                      const totalGramsNum = Number(prod.totalGrams) || 0;
                      const qtyKg = (totalGramsNum / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3
                      });

                      // Calcula a dosagem percentual de forma segura
                      const dosagePctVal = prod.dosagePct ?? (
                        totalWeightSafe > 0 ? (totalGramsNum / (totalWeightSafe * 1000)) * 100 : 0
                      );
                      const dosagePctFormatted = dosagePctVal > 0 
                        ? `${dosagePctVal.toFixed(2).replace(/\.?0+$/, '')}%`
                        : `${prod.dosagePerKg || 0}g/kg`;

                      return (
                        <tr key={pIdx} className="border-b border-slate-200 hover:bg-slate-50/50">
                          {/* Nome do Produto */}
                          <td className="py-1 px-1.5 font-bold uppercase text-slate-900 truncate" title={prod.productName}>
                            {prod.productName}
                          </td>

                          {/* Dosagem Percentual */}
                          <td className="py-1 px-1 text-center font-mono font-bold text-slate-700">
                            {dosagePctFormatted}
                          </td>

                          {/* Quantidade Calculada */}
                          <td className="py-1 px-1 text-right font-mono font-black text-slate-900 text-[11px]">
                            {qtyKg} <span className="text-[9px] font-normal text-slate-600">Kg</span>
                          </td>

                          {/* Campos Manuais para Chão de Fábrica */}
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">______ Lt</td>
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">___ °C</td>
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">___ min</td>
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">___</td>
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">______</td>
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">______</td>
                          <td className="py-1 px-1 text-center text-slate-400 select-none font-mono">__:__</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Divisor de 100% de Largura */}
          <div className="w-full border-b-2 border-slate-900 my-1"></div>

          {/* Rodapé Explicativo e Assinaturas da Receita Técnica */}
          <div className="pt-2 flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-200 pb-2">
            <span>
              * Quantidades de insumos calculadas proporcionalmente sobre o peso total ({totalWeightSafe.toFixed(3)} Kg). Tolerância de balança: ±0,5%.
            </span>
            <span className="font-mono uppercase font-bold text-slate-800">
              SYSMAUAD CONTROLE QUÍMICO
            </span>
          </div>

          {/* Rodapé: Assinatura Centralizada e QR Code */}
          <div className="pt-6 relative flex items-end justify-center font-mono text-[10px] uppercase">
            <div className="w-80 text-center">
              <div className="border-b border-black w-full mb-1"></div>
              <div className="font-bold">ASSINATURA</div>
            </div>

            <div className="absolute right-0 bottom-0 flex flex-col items-end justify-center text-[9px] text-slate-600">
              <div className="p-0.5 border border-black bg-white inline-block mb-0.5">
                <QRCodeSVG value={order.osNumber || pureOsNumber} size={42} />
              </div>
              <span className="font-mono font-bold tracking-tight">O.S. {pureOsNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. COMPROVANTE DE SAÍDA / RETIRADA / ENTREGA                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {printMode === 'saida' && (
        <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md space-y-3 font-mono text-[11px] leading-tight print-sheet print:border-0 print:shadow-none print:rounded-none w-full">
          {/* Cabeçalho de Ponta a Ponta */}
          <div className="flex justify-between items-baseline font-bold text-xs uppercase pb-1.5 border-b-2 border-slate-900">
            <span className="text-sm font-black tracking-wider">MAUAD LAVANDERIA</span>
            <span className="text-sm font-bold tracking-wide">COMPROVANTE DE SAÍDA</span>
            <span className="text-[10px]">PÁGINA: 001</span>
          </div>

          {/* Destaque Central da O.S. e Metadados Laterais */}
          <div className="flex justify-between items-center py-1">
            <div className="text-[10px] text-left space-y-0.5">
              <div><span className="font-bold">SAÍDA:</span> {dateShort}</div>
              <div><span className="font-bold">OPERADOR:</span> {order.operatorName?.toUpperCase() || 'OPERADOR'}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black tracking-widest font-mono text-slate-900">
                {pureOsNumber}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                ORDEM DE SERVIÇO
              </div>
            </div>

            <div className="text-[10px] text-right space-y-0.5">
              <div>{weekdayFormatted}</div>
              <div>{dateShort} {timeFormatted}</div>
            </div>
          </div>

          {order.isRelavado && (
            <div className="bg-purple-100 text-purple-900 border border-purple-400 font-bold text-center py-1.5 text-xs uppercase tracking-wider">
              *** SAÍDA EM RELAVADO ***
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DADOS DO CLIENTE & EXPEDIÇÃO</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Dados do Cliente Distribuídos em 2 Colunas */}
          <div className="grid grid-cols-12 gap-4 text-[11px] py-0.5">
            <div className="col-span-7 space-y-1">
              <div className="flex">
                <span className="font-bold w-24 shrink-0">CLIENTE:</span>
                <span className="font-bold uppercase text-slate-900">{clientNameSafe}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">ENDEREÇO:</span>
                <span className="uppercase">{order.clientAddress || 'NÃO INFORMADO'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">TELEFONE:</span>
                <span>{order.clientPhone || 'NÃO INFORMADO'}</span>
              </div>
            </div>

            <div className="col-span-5 space-y-1 pl-3 border-l border-slate-200">
              <div className="flex justify-between">
                <span className="font-bold">CORTE / REF:</span>
                <span className="font-mono font-bold uppercase">{order.corteOs || primaryCorteOs || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">STATUS ATUAL:</span>
                <span className="uppercase font-semibold">{order.status.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">TIPO SAÍDA:</span>
                <span className="uppercase font-semibold">{order.isRelavado ? 'RELAVADO' : 'PRODUÇÃO NORMAL'}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px]">
              <span className="font-bold">OBSERVAÇÕES:</span> {order.notes}
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DISCRIMINAÇÃO DOS ITENS & PROCESSOS ENTREGUES</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Tabela de Itens Aproveitando 100% da Largura da Folha */}
          <div className="w-full">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold text-slate-800">
                  <th className="py-1 px-1 text-left w-[26%]">LAVADO / PROCESSO</th>
                  <th className="py-1 px-1 text-left w-[20%]">ROUPA / PEÇA</th>
                  <th className="py-1 px-1 text-center w-[12%]">CORTE / O.S.</th>
                  <th className="py-1 px-1 text-center w-[10%]">TIPO</th>
                  <th className="py-1 px-1 text-right w-[10%]">QTD</th>
                  <th className="py-1 px-1 text-right w-[10%]">VL. UNIT.</th>
                  <th className="py-1 px-1 text-right w-[12%]">VL. TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(order.items || []).map((item, idx) => {
                  const itemQty = Number(item.quantity) || totalPiecesSafe;
                  const itemUnit = (order.isRelavado || order.isADefinir) ? 0 : Number(item.unitPrice || 0);
                  const itemTotal = (order.isRelavado || order.isADefinir)
                    ? 0
                    : Number(item.totalPrice ?? (itemUnit * itemQty));

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-1 font-bold uppercase text-slate-900">
                        {item.process}
                      </td>
                      <td className="py-1.5 px-1 uppercase text-slate-800">
                        {item.clothingType}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono uppercase text-slate-700">
                        {item.corteOs || order.corteOs || '-'}
                      </td>
                      <td className="py-1.5 px-1 text-center uppercase text-[10px] text-slate-600">
                        {item.serviceType === 'diferenciado' ? 'DIFERENCIADO' : 'LAVADO'}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-900 text-xs">
                        {itemQty} pçs
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono text-slate-800">
                        {itemUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-1.5 px-1 text-right font-mono font-bold text-slate-900">
                        {itemTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Divisor de 100% de Largura */}
          <div className="w-full border-b-2 border-slate-900 my-1"></div>

          {/* Totais Operacionais de Carga e Valor Total do Serviço */}
          <div className="flex flex-wrap justify-between items-center gap-4 py-2.5 px-3 bg-slate-50 border border-slate-300 rounded font-bold text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">QTD TOTAL PEÇAS:</span>
                <span className="font-mono text-base text-slate-900">{totalPiecesSafe}</span>
                <span className="text-[10px] text-slate-500 ml-1">peças</span>
              </div>
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">PESO TOTAL BALANÇA:</span>
                <span className="font-mono text-base text-slate-900">
                  {totalWeightSafe.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-slate-900 ml-1">Kg</span>
              </div>
            </div>

            <div className="text-right border-l border-slate-300 pl-4">
              <span className="text-slate-700 text-[11px] uppercase mr-2">VALOR TOTAL DO SERVIÇO:</span>
              <span className="font-mono text-base font-black text-slate-900">
                {totalServiceValueSafe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              {order.isRelavado && (
                <span className="text-[10px] text-slate-600 ml-1.5 uppercase">(RELAVADO)</span>
              )}
            </div>
          </div>

          {/* Declaração de Retirada / Recebimento */}
          <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-center font-semibold text-slate-800 uppercase tracking-tight">
            DECLARO QUE O PEDIDO ACIMA FOI CONFERIDO E RETIRADO/ENTREGUE EM PERFEITAS CONDIÇÕES.
          </div>

          {/* Rodapé: Assinatura Centralizada e QR Code */}
          <div className="pt-8 relative flex items-end justify-center font-mono text-[10px] uppercase">
            <div className="w-80 text-center">
              <div className="border-b border-black w-full mb-1"></div>
              <div className="font-bold">ASSINATURA</div>
            </div>

            <div className="absolute right-0 bottom-0 flex flex-col items-end justify-center text-[9px] text-slate-600">
              <div className="p-0.5 border border-black bg-white inline-block mb-0.5">
                <QRCodeSVG value={order.osNumber || pureOsNumber} size={42} />
              </div>
              <span className="font-mono font-bold tracking-tight">O.S. {pureOsNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. RELATÓRIO DE PASSADORIA — CONTROLE MANUAL DE CHÃO DE FÁBRICA*/}
      {/* ───────────────────────────────────────────────────────────── */}
      {printMode === 'passadoria' && (
        <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md space-y-3 font-mono text-[11px] leading-tight print-sheet print:border-0 print:shadow-none print:rounded-none w-full">
          
          {/* Cabeçalho de Ponta a Ponta */}
          <div className="flex justify-between items-baseline font-bold text-xs uppercase pb-1.5 border-b-2 border-slate-900">
            <span className="text-sm font-black tracking-wider">MAUAD LAVANDERIA</span>
            <span className="text-sm font-bold tracking-wide">CONTROLE DE PASSADORIA</span>
            <span className="text-[10px]">PÁGINA: 001</span>
          </div>

          {/* Destaque Central da O.S. e Metadados Laterais */}
          <div className="flex justify-between items-center py-1">
            <div className="text-[10px] text-left space-y-0.5">
              <div><span className="font-bold">ENTRADA:</span> {dateShort}</div>
              <div><span className="font-bold">OPERADOR:</span> {order.operatorName?.toUpperCase() || 'GILMÁRIO'}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black tracking-widest font-mono text-slate-900">
                {pureOsNumber}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                ORDEM DE SERVIÇO
              </div>
            </div>

            <div className="text-[10px] text-right space-y-0.5">
              <div>{weekdayFormatted}</div>
              <div>{dateShort} {timeFormatted}</div>
            </div>
          </div>

          {order.isRelavado && (
            <div className="bg-purple-100 text-purple-900 border border-purple-400 font-bold text-center py-1.5 text-xs uppercase tracking-wider">
              *** LOTE EM PROCESSO DE RELAVADO ***
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DADOS DO CLIENTE & PEDIDO</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Dados do Cliente Distribuídos em 2 Colunas */}
          <div className="grid grid-cols-12 gap-4 text-[11px] py-0.5">
            <div className="col-span-7 space-y-1">
              <div className="flex">
                <span className="font-bold w-24 shrink-0">CLIENTE:</span>
                <span className="font-bold uppercase text-slate-900">{clientNameSafe}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">ENDEREÇO:</span>
                <span className="uppercase">{order.clientAddress || 'NÃO INFORMADO'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">TELEFONE:</span>
                <span>{order.clientPhone || 'NÃO INFORMADO'}</span>
              </div>
            </div>

            <div className="col-span-5 space-y-1 pl-3 border-l border-slate-200">
              <div className="flex justify-between">
                <span className="font-bold">CORTE / REF:</span>
                <span className="font-mono font-bold uppercase">{order.corteOs || primaryCorteOs || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">TIPO DE PEÇA:</span>
                <span className="uppercase font-semibold">{primaryRoupa}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">PROCESSO:</span>
                <span className="uppercase font-semibold">{primaryLavado}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px]">
              <span className="font-bold">OBSERVAÇÕES:</span> {order.notes}
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">REGISTRO MANUAL DE PASSAGEM DE PEÇAS</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Tabela de Passadores Ativos */}
          <div className="w-full">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold text-slate-800">
                  <th className="py-1 px-1 text-left w-3/5">NOME DO PASSADOR(A)</th>
                  <th className="py-1 px-1 text-center w-2/5">QUANTIDADE PASSADA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activePassadoresList.length > 0 ? (
                  activePassadoresList.map((p) => (
                    <tr key={p.id} className="h-10 hover:bg-slate-50/50">
                      <td className="py-2 px-1 font-bold uppercase text-slate-900 align-middle">
                        {p.name}
                      </td>
                      <td className="py-2 px-1 align-middle text-center">
                        <div className="w-32 h-7 border border-slate-300 mx-auto rounded flex items-center justify-end px-2 bg-slate-50 text-slate-400 text-[10px] font-mono">
                          [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] pçs
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-slate-500 italic">
                      Nenhum passador ativo cadastrado no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Divisor de 100% de Largura */}
          <div className="w-full border-b-2 border-slate-900 my-1"></div>

          {/* Totais: Ocupando as Duas Laterais com Equilíbrio Perfeito */}
          <div className="flex justify-between items-center py-2 px-3 bg-slate-50 border border-slate-300 rounded font-bold text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">QTD ESTIMADA DO LOTE:</span>
                <span className="font-mono text-base text-slate-900">{totalPiecesSafe}</span>
                <span className="text-[10px] text-slate-500 ml-1">peças</span>
              </div>
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">PESO TOTAL:</span>
                <span className="font-mono text-slate-900">
                  {totalWeightSafe.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-slate-900 ml-1">Kg</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-600 text-[11px] uppercase mr-2">TOTAL DECLARADO:</span>
              <span className="font-mono text-base text-slate-900">
                [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
              </span>
              <span className="text-xs text-slate-900 ml-1">PEÇAS</span>
            </div>
          </div>

          {/* Rodapé: Assinatura Centralizada e QR Code */}
          <div className="pt-8 relative flex items-end justify-center font-mono text-[10px] uppercase">
            <div className="w-80 text-center">
              <div className="border-b border-black w-full mb-1"></div>
              <div className="font-bold">ASSINATURA</div>
            </div>

            <div className="absolute right-0 bottom-0 flex flex-col items-end justify-center text-[9px] text-slate-600">
              <div className="p-0.5 border border-black bg-white inline-block mb-0.5">
                <QRCodeSVG value={order.osNumber || pureOsNumber} size={42} />
              </div>
              <span className="font-mono font-bold tracking-tight">O.S. {pureOsNumber}</span>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. RELATÓRIO DE DIFERENCIADO — CONTROLE MANUAL DE CHÃO DE FÁBRICA*/}
      {/* ───────────────────────────────────────────────────────────── */}
      {printMode === 'diferenciado' && (
        <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md space-y-3 font-mono text-[11px] leading-tight print-sheet print:border-0 print:shadow-none print:rounded-none w-full">
          
          {/* Cabeçalho de Ponta a Ponta */}
          <div className="flex justify-between items-baseline font-bold text-xs uppercase pb-1.5 border-b-2 border-slate-900">
            <span className="text-sm font-black tracking-wider">MAUAD LAVANDERIA</span>
            <span className="text-sm font-bold tracking-wide">CONTROLE DE PRODUÇÃO DIFERENCIADA</span>
            <span className="text-[10px]">PÁGINA: 001</span>
          </div>

          {/* Destaque Central da O.S. e Metadados Laterais */}
          <div className="flex justify-between items-center py-1">
            <div className="text-[10px] text-left space-y-0.5">
              <div><span className="font-bold">ENTRADA:</span> {dateShort}</div>
              <div><span className="font-bold">OPERADOR:</span> {order.operatorName?.toUpperCase() || 'OPERADOR'}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black tracking-widest font-mono text-slate-900">
                {pureOsNumber}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                ORDEM DE SERVIÇO
              </div>
            </div>

            <div className="text-[10px] text-right space-y-0.5">
              <div>{weekdayFormatted}</div>
              <div>{dateShort} {timeFormatted}</div>
            </div>
          </div>

          {order.isRelavado && (
            <div className="bg-purple-100 text-purple-900 border border-purple-400 font-bold text-center py-1.5 text-xs uppercase tracking-wider">
              *** LOTE EM PROCESSO DE RELAVADO ***
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">DADOS DO CLIENTE & PEDIDO</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Dados do Cliente Distribuídos em 2 Colunas */}
          <div className="grid grid-cols-12 gap-4 text-[11px] py-0.5">
            <div className="col-span-7 space-y-1">
              <div className="flex">
                <span className="font-bold w-24 shrink-0">CLIENTE:</span>
                <span className="font-bold uppercase text-slate-900">{clientNameSafe}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">ENDEREÇO:</span>
                <span className="uppercase">{order.clientAddress || 'NÃO INFORMADO'}</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 shrink-0">TELEFONE:</span>
                <span>{order.clientPhone || 'NÃO INFORMADO'}</span>
              </div>
            </div>

            <div className="col-span-5 space-y-1 pl-3 border-l border-slate-200">
              <div className="flex justify-between">
                <span className="font-bold">CORTE / REF:</span>
                <span className="font-mono font-bold uppercase">{order.corteOs || primaryCorteOs || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">TIPO DE PEÇA:</span>
                <span className="uppercase font-semibold truncate block max-w-[180px]" title={order.items && order.items.length > 0 ? order.items.map(it => it.clothingType).filter(Boolean).join(', ') : 'PEÇAS GERAIS'}>
                  {order.items && order.items.length > 0 ? order.items.map(it => it.clothingType).filter(Boolean).join(', ') : 'PEÇAS GERAIS'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">PROCESSO:</span>
                <span className="uppercase font-semibold truncate block max-w-[180px]" title={order.items && order.items.filter(it => it.serviceType === 'diferenciado').length > 0 ? order.items.filter(it => it.serviceType === 'diferenciado').map(it => it.process).join(', ') : 'DIFERENCIADO'}>
                  {order.items && order.items.filter(it => it.serviceType === 'diferenciado').length > 0 ? order.items.filter(it => it.serviceType === 'diferenciado').map(it => it.process).join(', ') : 'DIFERENCIADO'}
                </span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px]">
              <span className="font-bold">OBSERVAÇÕES:</span> {order.notes}
            </div>
          )}

          {/* Divisor com Título Central de 100% de Largura */}
          <div className="flex items-center gap-2 w-full my-1">
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
            <span className="font-bold text-[10px] uppercase text-slate-700 px-1 whitespace-nowrap">REGISTRO MANUAL DE PRODUÇÃO DIFERENCIADA</span>
            <div className="flex-1 border-b border-dashed border-slate-400"></div>
          </div>

          {/* Tabela de Colaboradores Ativos de Diferenciado */}
          <div className="w-full">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold text-slate-800">
                  <th className="py-1 px-1 text-left w-3/5">NOME DO COLABORADOR(A)</th>
                  <th className="py-1 px-1 text-center w-2/5">QUANTIDADE PRODUZIDA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeDiferenciadosList.length > 0 ? (
                  activeDiferenciadosList.map((p) => (
                    <tr key={p.id} className="h-10 hover:bg-slate-50/50">
                      <td className="py-2 px-1 font-bold uppercase text-slate-900 align-middle">
                        {p.name}
                      </td>
                      <td className="py-2 px-1 align-middle text-center">
                        <div className="w-32 h-7 border border-slate-300 mx-auto rounded flex items-center justify-end px-2 bg-slate-50 text-slate-400 text-[10px] font-mono">
                          [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ] pçs
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-slate-500 italic">
                      Nenhum colaborador ativo cadastrado para produção diferenciada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Divisor de 100% de Largura */}
          <div className="w-full border-b-2 border-slate-900 my-1"></div>

          {/* Totais: Ocupando as Duas Laterais com Equilíbrio Perfeito */}
          <div className="flex justify-between items-center py-2 px-3 bg-slate-50 border border-slate-300 rounded font-bold text-xs">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">QTD ESTIMADA DO LOTE:</span>
                <span className="font-mono text-base text-slate-900">{totalPiecesSafe}</span>
                <span className="text-[10px] text-slate-500 ml-1">peças</span>
              </div>
              <div>
                <span className="text-slate-600 text-[11px] uppercase mr-2">PESO TOTAL:</span>
                <span className="font-mono text-slate-900">
                  {totalWeightSafe.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-slate-900 ml-1">Kg</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-600 text-[11px] uppercase mr-2">TOTAL DECLARADO:</span>
              <span className="font-mono text-base text-slate-900">
                [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
              </span>
              <span className="text-xs text-slate-900 ml-1">PEÇAS</span>
            </div>
          </div>

          {/* Rodapé: Assinatura Centralizada e QR Code */}
          <div className="pt-8 relative flex items-end justify-center font-mono text-[10px] uppercase">
            <div className="w-80 text-center">
              <div className="border-b border-black w-full mb-1"></div>
              <div className="font-bold">ASSINATURA</div>
            </div>

            <div className="absolute right-0 bottom-0 flex flex-col items-end justify-center text-[9px] text-slate-600">
              <div className="p-0.5 border border-black bg-white inline-block mb-0.5">
                <QRCodeSVG value={order.osNumber || pureOsNumber} size={42} />
              </div>
              <span className="font-mono font-bold tracking-tight">O.S. {pureOsNumber}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
