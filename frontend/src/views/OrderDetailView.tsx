import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Printer, 
  MessageSquare, 
  ArrowLeft, 
  Clock, 
  FlaskConical, 
  Shirt, 
  Play, 
  PackageCheck, 
  CheckCircle2,
  Scale,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Check,
  Receipt,
  Sparkles,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { OrderStatus, OrderItem } from '../types';

interface OrderDetailViewProps {
  orderId: string;
  onBack: () => void;
  onNavigatePrint: (orderId: string, printMode?: 'ambos' | 'nota' | 'receita' | 'saida') => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ orderId, onBack, onNavigatePrint }) => {
  const { getOrderById, getOrderByOS, updateOrderStatus, updateOrderWeight, updateOrderServices, createOrder, calculateChemicals } = useOrders();
  const { user } = useAuth();
  const order = getOrderById(orderId) || getOrderByOS(orderId);

  // Estados para Modal de Saída & Fechamento da Nota
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [isCompletingDelivery, setIsCompletingDelivery] = useState(false);

  // Estados para Edição de Serviços
  const [isEditServicesModalOpen, setIsEditServicesModalOpen] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [newExtraServiceName, setNewExtraServiceName] = useState('');
  const [newExtraServicePrice, setNewExtraServicePrice] = useState<number>(0);
  const [isSavingServices, setIsSavingServices] = useState(false);

  // Estados para Edição de Peso
  const [isEditWeightModalOpen, setIsEditWeightModalOpen] = useState(false);
  const [editWeightKg, setEditWeightKg] = useState<number>(0);
  const [editPieceCount, setEditPieceCount] = useState<number>(0);
  const [autoCalcPieces, setAutoCalcPieces] = useState<boolean>(true);
  const [editReason, setEditReason] = useState<string>('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  // Estados para Registro de Relavado
  const [isRelavadoModalOpen, setIsRelavadoModalOpen] = useState(false);
  const [relavadoPieces, setRelavadoPieces] = useState<number>(0);
  const [relavadoWeightKg, setRelavadoWeightKg] = useState<number>(0);
  const [relavadoReason, setRelavadoReason] = useState<string>('');
  const [isCreatingRelavado, setIsCreatingRelavado] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cálculo de OS Parada (> 3 dias sem movimentação)
  const lastActivity = (order?.history && order.history.length > 0)
    ? order.history[order.history.length - 1].timestamp
    : (order?.updatedAt || order?.createdAt || new Date().toISOString());
  const diffDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  const isStalled = order && order.status !== 'entregue' && diffDays >= 3;

  const handleOpenEditWeight = () => {
    if (!order) return;
    setEditWeightKg(order.totalWeightKg);
    setEditPieceCount(order.estimatedPieceCount);
    setAutoCalcPieces(true);
    setEditReason('');
    setIsEditWeightModalOpen(true);
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setEditWeightKg(val);
    if (autoCalcPieces && val > 0 && order && order.refPieceWeightGrams > 0) {
      setEditPieceCount(Math.round((val * 1000) / order.refPieceWeightGrams));
    }
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || editWeightKg <= 0) return;
    setIsSavingWeight(true);
    const res = await updateOrderWeight(order.id, editWeightKg, editPieceCount, editReason, user?.name);
    setIsSavingWeight(false);
    if (res.success) {
      setIsEditWeightModalOpen(false);
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const handleOpenEditServices = () => {
    if (!order) return;
    setEditItems(JSON.parse(JSON.stringify(order.items || [])));
    setNewExtraServiceName('');
    setNewExtraServicePrice(0);
    setIsEditServicesModalOpen(true);
  };

  const handleAddEditService = (name: string, price: number) => {
    if (!name.trim()) return;
    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      clothingType: order?.items[0]?.clothingType || 'Peça Têxtil',
      process: name.trim(),
      serviceType: 'diferenciado',
      quantity: order?.estimatedPieceCount || 0,
      unitPrice: price,
      totalPrice: Number(((order?.estimatedPieceCount || 0) * price).toFixed(2)),
      corteOs: order?.corteOs || ''
    };
    setEditItems(prev => [...prev, newItem]);
    setNewExtraServiceName('');
    setNewExtraServicePrice(0);
  };

  const handleRemoveEditService = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemPrice = (idx: number, price: number) => {
    setEditItems(prev => prev.map((it, i) => {
      if (i === idx) {
        const qty = order?.estimatedPieceCount || it.quantity || 0;
        return {
          ...it,
          unitPrice: price,
          totalPrice: Number((qty * price).toFixed(2))
        };
      }
      return it;
    }));
  };

  const handleSaveServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsSavingServices(true);
    const res = await updateOrderServices(order.id, editItems, user?.name);
    setIsSavingServices(false);
    if (res.success) {
      setIsEditServicesModalOpen(false);
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert(res.message);
    }
  };

  const handleConfirmSaida = async () => {
    if (!order) return;
    setIsCompletingDelivery(true);
    await updateOrderStatus(order.id, 'entregue', user?.name || 'Operador', 'Saída realizada e pedido entregue ao cliente.');
    setIsCompletingDelivery(false);
    setIsSaidaModalOpen(false);
    setToastMessage(`Saída da O.S. ${order.osNumber} confirmada com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenRelavado = () => {
    if (!order) return;
    setRelavadoPieces(order.estimatedPieceCount || 0);
    setRelavadoWeightKg(order.totalWeightKg || 0);
    setRelavadoReason(`Retorno referente à ${order.osNumber}`);
    setIsRelavadoModalOpen(true);
  };

  const handleCreateRelavado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsCreatingRelavado(true);

    const refWeightGrams = relavadoPieces > 0 ? (relavadoWeightKg * 1000) / relavadoPieces : order.refPieceWeightGrams;
    const processName = order.items[0]?.process || 'Lavado Padrão';
    const clothingType = order.items[0]?.clothingType || 'Peça';
    const chemicalRecipe = calculateChemicals(relavadoWeightKg, [processName]);

    const newRelavadoOrder = createOrder({
      clientId: order.clientId,
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      clientAddress: order.clientAddress,
      operatorName: user?.name || 'Operador',
      refPieceWeightGrams: refWeightGrams,
      totalWeightKg: relavadoWeightKg,
      estimatedPieceCount: relavadoPieces,
      chemicalRecipe,
      totalServiceValue: 0,
      isRelavado: true,
      corteOs: order.corteOs,
      items: [
        {
          id: `item-${Date.now()}`,
          clothingType,
          process: processName,
          quantity: relavadoPieces,
          unitPrice: 0,
          totalPrice: 0,
          corteOs: order.corteOs
        }
      ],
      paymentStatus: 'pago',
      notes: `[RELAVADO] Referente à ${order.osNumber}. ${relavadoReason ? `Motivo: ${relavadoReason}` : ''}`
    });

    setIsCreatingRelavado(false);
    setIsRelavadoModalOpen(false);
    setToastMessage(`Ordem de Relavado ${newRelavadoOrder.osNumber} gerada com sucesso com valor R$ 0,00!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
              {order.isRelavado && (
                <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md text-xs font-bold uppercase border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Relavado (Isento R$ 0,00)
                </span>
              )}
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Gerar Relavado */}
          <button
            type="button"
            onClick={handleOpenRelavado}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            title="Gerar nova entrada em Relavado (sem cobrança) para este lote"
          >
            <RotateCcw className="w-4 h-4" />
            Gerar Relavado
          </button>

          <button
            onClick={() => onNavigatePrint(order.id)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Nota / Receita
          </button>

          <button
            onClick={() => onNavigatePrint(order.id, 'saida')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            title="Imprimir Comprovante de Saída / Faturamento"
          >
            <Receipt className="w-4 h-4" />
            Comprovante de Saída
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Alerta de OS Parada (> 3 dias sem movimentação) */}
      {isStalled && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-950 dark:text-amber-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  Alerta: Ordem de Serviço Parada há {diffDays} dias!
                </h4>
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold font-mono rounded">
                  Sem movimentação
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Última movimentação registrada em {new Date(lastActivity).toLocaleDateString('pt-BR')} às {new Date(lastActivity).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({order.history?.[order.history.length - 1]?.note || `Status: ${order.status}`}).
              </p>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => setIsSaidaModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Registrar Entrega / Fechar Saída
              </button>
            )}

            {order.status === 'entregue' && (
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Pedido Entregue e Concluído
                </span>
                <button
                  type="button"
                  onClick={() => setIsSaidaModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  Ver Resumo de Saída
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Client, Weights & Services */}
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">ESTATÍSTICAS DA PESAGEM</h3>
              <button
                type="button"
                onClick={handleOpenEditWeight}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/30 border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                title="Corrigir peso lançado"
              >
                <Scale className="w-3.5 h-3.5" />
                Editar Peso
              </button>
            </div>
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

          {/* Card: Serviços & Faturamento (Exibição Discriminada Conforme Solicitado) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors font-sans">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                SERVIÇOS & FATURAMENTO
              </h3>
              <button
                type="button"
                onClick={handleOpenEditServices}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/30 border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                title="Editar serviços e valores da nota"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar Serviços
              </button>
            </div>

            {/* Quadro de Valores Individuais por Tipo de Serviço */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pb-1 border-b border-slate-200 dark:border-slate-700">
                Valores por Tipo de Serviço:
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold uppercase">
                    {item.process || 'Serviço'}:
                  </span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {order.isRelavado
                      ? 'R$ 0,00'
                      : (item.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              ))}

              <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-1.5 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-900 dark:text-slate-100 uppercase">Total da Nota:</span>
                <strong className="text-sky-700 dark:text-sky-400 text-sm">
                  {order.isRelavado
                    ? 'R$ 0,00'
                    : (order.items.reduce((acc, it) => acc + (it.unitPrice || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Total Faturado (Lote):</span>
                <strong className="text-slate-900 dark:text-slate-100 text-sm">
                  {order.isRelavado ? 'R$ 0,00 (Isento)' : (order.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 dark:text-slate-400">Situação:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${
                  order.paymentStatus === 'pago'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}>
                  {order.paymentStatus === 'pago' ? 'Pago / Quitado' : 'Em Aberto'}
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigatePrint(order.id, 'saida')}
                className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <Receipt className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Imprimir Comprovante de Saída
              </button>
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

      {/* Modal: Edição de Peso */}
      {isEditWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Editar Peso da O.S.</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Correção de pesagem para {order.osNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditWeightModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
                <strong>Atenção:</strong> Ao salvar o novo peso, o sistema recalcula automaticamente a quantidade necessária de insumos químicos para lavagem e recalcula a estimativa de peças. Essa alteração ficará registrada no histórico.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Novo Peso Total do Lote (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editWeightKg || ''}
                    onChange={handleWeightInputChange}
                    className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">KG</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Peças Estimadas (Unidades)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalcPieces}
                      onChange={(e) => {
                        setAutoCalcPieces(e.target.checked);
                        if (e.target.checked && editWeightKg > 0 && order.refPieceWeightGrams > 0) {
                          setEditPieceCount(Math.round((editWeightKg * 1000) / order.refPieceWeightGrams));
                        }
                      }}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Auto-calcular por ref. ({order.refPieceWeightGrams}g)</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPieceCount || ''}
                  onChange={(e) => {
                    setEditPieceCount(Number(e.target.value));
                    setAutoCalcPieces(false);
                  }}
                  disabled={autoCalcPieces}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Motivo da Correção de Peso (Opcional)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ex: Erro de digitação na balança"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditWeightModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingWeight || editWeightKg <= 0}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isSavingWeight ? 'Salvando...' : 'Salvar Novo Peso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerar Entrada em Relavado */}
      {isRelavadoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Registrar Entrada em Relavado</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Gera nova O.S. vinculada sem cobrança (R$ 0,00)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRelavadoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRelavado} className="p-6 space-y-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-900 dark:text-purple-200 text-xs">
                <strong>Isenção Financeira Garantida:</strong> Esta O.S. será criada com valor <strong>R$ 0,00</strong> e status de pagamento <strong>Pago/Isento</strong>, sem duplicar cobrança do cliente. A dosagem de insumos químicos para lavagem será calculada normalmente pelo peso informado.
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{order.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">O.S. Origem:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{order.osNumber}</span>
                </div>
                {order.corteOs && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Corte/Lote:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{order.corteOs}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Peças p/ Relavado *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={relavadoPieces || ''}
                    onChange={(e) => {
                      const pcs = Number(e.target.value);
                      setRelavadoPieces(pcs);
                      if (order.refPieceWeightGrams > 0) {
                        setRelavadoWeightKg(Number(((pcs * order.refPieceWeightGrams) / 1000).toFixed(2)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Peso Estimado (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={relavadoWeightKg || ''}
                    onChange={(e) => setRelavadoWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Motivo do Relavado
                </label>
                <input
                  type="text"
                  value={relavadoReason}
                  onChange={(e) => setRelavadoReason(e.target.value)}
                  placeholder="Ex: Peças com manchas residuais / revisão de acabamento"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRelavadoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRelavado || relavadoWeightKg <= 0 || relavadoPieces <= 0}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isCreatingRelavado ? 'Criando...' : 'Gerar O.S. Relavado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFERÊNCIA DE SAÍDA & FECHAMENTO DA NOTA ───────────────── */}
      {isSaidaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 font-sans">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Conferência de Saída & Fechamento</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">O.S. {order.osNumber} • {order.clientName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaidaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Informações Básicas do Lote */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total de Peças</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">{order.estimatedPieceCount} pçs</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Peso Total do Lote</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">{(order.totalWeightKg || 0).toFixed(1)} kg</strong>
                </div>
              </div>

              {/* Detalhamento de Valores por Tipo de Serviço */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 font-mono">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Discriminação dos Serviços:
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-sans">Valor Unitário</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                        {item.process || 'Serviço'}:
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {order.isRelavado
                          ? 'R$ 0,00'
                          : (item.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>
                  ))}
                </div>

                {/* Total da Nota (Unitário) */}
                <div className="border-t-2 border-slate-900 dark:border-slate-200 pt-2 flex justify-between items-center text-sm font-black">
                  <span className="uppercase text-slate-900 dark:text-slate-100">Total da Nota:</span>
                  <strong className="text-sky-700 dark:text-sky-400 text-base">
                    {order.isRelavado
                      ? 'R$ 0,00'
                      : (order.items.reduce((acc, it) => acc + (it.unitPrice || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>

                {/* Total Geral do Lote Faturado */}
                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Total a Pagar ({order.estimatedPieceCount} pçs):</span>
                  <strong className="text-base font-black text-emerald-700 dark:text-emerald-400">
                    {order.isRelavado ? 'R$ 0,00 (Isento)' : (order.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsSaidaModalOpen(false);
                    onNavigatePrint(order.id, 'saida');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Imprimir Comprovante
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsSaidaModalOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Fechar
                  </button>

                  {order.status !== 'entregue' && (
                    <button
                      type="button"
                      disabled={isCompletingDelivery}
                      onClick={handleConfirmSaida}
                      className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PackageCheck className="w-4 h-4" />
                      {isCompletingDelivery ? 'Concluindo...' : 'Confirmar Saída'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIÇÃO DE SERVIÇOS & VALORES DA NOTA ─────────────────────── */}
      {isEditServicesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 font-sans max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Editar Serviços da O.S.</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Ajuste de Lavado e Serviços Diferenciados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditServicesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveServices} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Tabela de Serviços Atuais */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Serviços Combinados Nesta Nota:
                </label>

                <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40">
                  {editItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-xs">
                      <div className="flex-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                          {it.process}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {it.serviceType === 'diferenciado' ? 'Serviço Diferenciado' : 'Lavado Padrão'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative w-28">
                          <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.unitPrice ?? ''}
                            onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                            className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            placeholder="0.00"
                          />
                        </div>

                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditService(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Remover serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Novo Serviço Diferenciado */}
              <div className="p-3.5 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/50 rounded-xl space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300">
                  + Adicionar Serviço Diferenciado
                </span>

                {/* Atalhos Rápidos */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Pistolado', price: 2.00 },
                    { name: 'Bigode Laser', price: 1.00 },
                    { name: 'Puído Laser', price: 1.50 },
                    { name: 'Destroyed', price: 2.50 },
                    { name: 'Resinagem', price: 3.00 }
                  ].map(s => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => handleAddEditService(s.name, s.price)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-slate-200 dark:border-slate-700 text-sky-800 dark:text-sky-300 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                    >
                      + {s.name} (R$ {s.price.toFixed(2).replace('.', ',')})
                    </button>
                  ))}
                </div>

                {/* Digitação Livre */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Outro serviço..."
                    value={newExtraServiceName}
                    onChange={e => setNewExtraServiceName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newExtraServicePrice || ''}
                      onChange={e => setNewExtraServicePrice(Number(e.target.value))}
                      className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddEditService(newExtraServiceName, newExtraServicePrice)}
                    disabled={!newExtraServiceName.trim()}
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Quadro de Simulação do Total da Nota */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-mono space-y-1">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span>Total da Nota (Unitário Combinado):</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {editItems.reduce((acc, it) => acc + (it.unitPrice || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                  <span>Total Geral Faturado ({order.estimatedPieceCount} pçs):</span>
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {(order.estimatedPieceCount * editItems.reduce((acc, it) => acc + (it.unitPrice || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>

              {/* Ações do Modal */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditServicesModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingServices}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  {isSavingServices ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
