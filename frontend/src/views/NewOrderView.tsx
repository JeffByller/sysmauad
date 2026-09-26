import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Scale, Calculator, Printer, FlaskConical, User, UserPlus, AlertTriangle, Tag, CheckCircle2, ArrowRight, RotateCcw, Plus, Trash2, Sparkles, DollarSign, X } from 'lucide-react';
import { Order, OrderItem } from '../types';

interface NewOrderViewProps {
  onOrderCreated: (orderId: string) => void;
  onNavigateToClients: () => void;
  onNavigateToOrders?: () => void;
}

export interface ExtraServiceItem {
  id: string;
  name: string;
  unitPrice: number;
}

export const NewOrderView: React.FC<NewOrderViewProps> = ({ onOrderCreated, onNavigateToClients, onNavigateToOrders }) => {
  const { createOrder, calculateChemicals, clients, garmentCatalog, receitasLavado } = useOrders();
  const { user } = useAuth();

  const [createdOrderSuccess, setCreatedOrderSuccess] = useState<Order | null>(null);

  // Modo Relavado (sem cobrança)
  const [isRelavado, setIsRelavado] = useState<boolean>(false);
  const [relavadoReason, setRelavadoReason] = useState<string>('');

  // Todos os campos iniciam completamente vazios ao abrir o Novo Pedido
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');

  const [clothingType, setClothingType] = useState<string>('');
  const [corteOs, setCorteOs] = useState<string>('');
  const [processType, setProcessType] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  
  // Serviços Diferenciados adicionais combinados na mesma O.S.
  const [extraServices, setExtraServices] = useState<ExtraServiceItem[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');

  // Nova lógica: usuário informa quantidade + peso por peça → sistema calcula peso total
  const [pieceCount, setPieceCount] = useState<number>(0);
  const [weightPerPieceKg, setWeightPerPieceKg] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Handle Catalog Selection Change: Puxa os dados definidos na Tabela de Peças
  const handleCatalogChange = (catId: string) => {
    setSelectedCatalogId(catId);
    if (!catId) {
      setClothingType('');
      setProcessType('');
      setUnitPrice(0);
      setWeightPerPieceKg(0);
      return;
    }

    const found = garmentCatalog.find(g => g.id === catId);
    if (found) {
      setClothingType(found.clothingType);
      setProcessType(found.processName);
      setUnitPrice(found.unitPrice);
      // Pré-preenche peso/peça a partir do catálogo (convertendo g → kg) como sugestão; operador pode ajustar
      setWeightPerPieceKg(found.defaultRefWeightGrams > 0 ? Math.round(found.defaultRefWeightGrams) / 1000 : 0);
    }
  };

  const handleAddExtraService = (name: string, price: number) => {
    if (!name.trim()) return;
    setExtraServices(prev => [
      ...prev,
      { id: `diff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, name: name.trim(), unitPrice: Number(price) || 0 }
    ]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const handleRemoveExtraService = (id: string) => {
    setExtraServices(prev => prev.filter(s => s.id !== id));
  };

  // Peso total calculado automaticamente: quantidade de peças × peso por peça
  const totalWeightKg = (pieceCount > 0 && weightPerPieceKg > 0)
    ? Math.round(pieceCount * weightPerPieceKg * 1000) / 1000
    : 0;

  // Soma dos serviços diferenciados por peça
  const extraServicesTotalPerPiece = extraServices.reduce((sum, s) => sum + (s.unitPrice || 0), 0);
  
  // Valor unitário combinado por peça: Lavado Padrão + Serviços Diferenciados
  const combinedUnitPrice = isRelavado ? 0 : Math.round((unitPrice + extraServicesTotalPerPiece) * 100) / 100;

  // Valor total do lote / nota (se relavado, forçado a R$ 0,00 - Isento)
  const totalServiceValue = isRelavado ? 0 : Math.round(pieceCount * combinedUnitPrice * 100) / 100;

  const chemicalRecipe = (totalWeightKg > 0 && processType)
    ? calculateChemicals(totalWeightKg, [processType])
    : [];

  // Agrupa os insumos por Sequência de Fases / Processos do Lavado (conforme Seq.pdf)
  interface FaseGroup {
    order: number;
    name: string;
    items: typeof chemicalRecipe;
  }

  const recipeFases: FaseGroup[] = React.useMemo(() => {
    if (!chemicalRecipe || chemicalRecipe.length === 0) return [];

    const map = new Map<string, FaseGroup>();
    chemicalRecipe.forEach(chem => {
      const order = chem.faseOrder || 1;
      const name = chem.faseName || 'Processo Geral';
      const key = `${order}-${name}`;
      if (!map.has(key)) {
        map.set(key, { order, name, items: [] });
      }
      map.get(key)!.items.push(chem);
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [chemicalRecipe]);

  // Resumo consolidado de consumo e baixa no estoque para o lote completo
  const consolidatedChemicals = React.useMemo(() => {
    if (!chemicalRecipe || chemicalRecipe.length === 0) return [];
    const map = new Map<string, {
      productName: string;
      totalGrams: number;
      availableStock?: number;
      unitStock: string;
      isLowStock?: boolean;
    }>();

    chemicalRecipe.forEach(chem => {
      const key = chem.productName.toLowerCase();
      const existing = map.get(key);
      const stockUnit = chem.unitStock || 'kg';
      if (existing) {
        existing.totalGrams += chem.totalGrams;
        const usedInStockUnit = (stockUnit === 'kg' || stockUnit === 'L') ? existing.totalGrams / 1000 : existing.totalGrams;
        if (existing.availableStock !== undefined) {
          existing.isLowStock = (existing.availableStock - usedInStockUnit) <= 5;
        }
      } else {
        map.set(key, {
          productName: chem.productName,
          totalGrams: chem.totalGrams,
          availableStock: chem.availableStock,
          unitStock: stockUnit,
          isLowStock: chem.isLowStock
        });
      }
    });

    return Array.from(map.values());
  }, [chemicalRecipe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      alert('Por favor, selecione um cliente.');
      return;
    }

    if (!selectedCatalogId || !clothingType || !processType) {
      alert('Por favor, selecione uma peça cadastrada na tabela de peças.');
      return;
    }

    if (totalWeightKg <= 0 || pieceCount <= 0 || weightPerPieceKg <= 0) {
      alert('Por favor, informe a quantidade de peças e o peso por peça para calcular o peso total do lote.');
      return;
    }

    const finalNotes = isRelavado
      ? `[RELAVADO] ${relavadoReason ? `Motivo: ${relavadoReason}. ` : ''}${notes.trim()}`.trim()
      : (notes.trim() || undefined);

    const mainItem: OrderItem = {
      id: `item-${Date.now()}-main`,
      clothingType,
      process: processType,
      serviceType: 'lavado',
      quantity: pieceCount,
      unitPrice: isRelavado ? 0 : unitPrice,
      totalPrice: isRelavado ? 0 : Math.round(pieceCount * unitPrice * 100) / 100,
      corteOs: corteOs.trim() || undefined
    };

    const diffItems: OrderItem[] = extraServices.map((s, idx) => ({
      id: `item-${Date.now()}-diff-${idx}`,
      clothingType,
      process: s.name,
      serviceType: 'diferenciado',
      quantity: pieceCount,
      unitPrice: isRelavado ? 0 : s.unitPrice,
      totalPrice: isRelavado ? 0 : Math.round(pieceCount * s.unitPrice * 100) / 100,
      corteOs: corteOs.trim() || undefined
    }));

    const allItems: OrderItem[] = [mainItem, ...diffItems];

    const newOrder = createOrder({
      clientId: selectedClient.id,
      clientName: `${selectedClient.name} (${selectedClient.companyName})`,
      clientPhone: selectedClient.phone,
      clientAddress: selectedClient.address,
      operatorName: user?.name || 'Operador',
      refPieceWeightGrams: weightPerPieceKg * 1000, // peso/peça em gramas para compatibilidade
      totalWeightKg,
      estimatedPieceCount: pieceCount, // quantidade real informada pelo usuário
      totalServiceValue,
      isRelavado,
      corteOs: corteOs.trim() || undefined,
      items: allItems,
      chemicalRecipe,
      paymentStatus: isRelavado ? 'pago' : 'aberto',
      notes: finalNotes
    });

    setCreatedOrderSuccess(newOrder);
  };

  const handleResetForm = () => {
    setSelectedClientId('');
    setSelectedCatalogId('');
    setClothingType('');
    setCorteOs('');
    setProcessType('');
    setUnitPrice(0);
    setExtraServices([]);
    setNewServiceName('');
    setNewServicePrice('');
    setPieceCount(0);
    setWeightPerPieceKg(0);
    setNotes('');
    setIsRelavado(false);
    setRelavadoReason('');
    setCreatedOrderSuccess(null);
  };

  if (createdOrderSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-lg text-center space-y-5 transition-colors">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              SUCESSO • PEDIDO REGISTRADO
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {createdOrderSuccess.osNumber}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              O pedido foi salvo com sucesso no banco de dados. O peso total foi calculado com base na quantidade e peso por peça informados.
            </p>
          </div>

          {/* Resumo do Pedido */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-mono space-y-2.5 text-left">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500">Cliente:</span>
              <strong className="text-slate-900 dark:text-slate-100 font-sans">{createdOrderSuccess.clientName}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500">Roupa / Corte:</span>
              <strong className="text-slate-900 dark:text-slate-100 uppercase">
                {createdOrderSuccess.items?.[0]?.clothingType} {createdOrderSuccess.corteOs ? `(CORTE: ${createdOrderSuccess.corteOs})` : ''}
              </strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500">Lavado / Receita:</span>
              <strong className="text-sky-700 dark:text-sky-400 uppercase">{createdOrderSuccess.items?.[0]?.process}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500">Peças / Peso Total:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                {createdOrderSuccess.estimatedPieceCount} pçs • {createdOrderSuccess.totalWeightKg} kg
              </strong>
            </div>

            {/* Detalhamento dos Valores por Serviço */}
            {createdOrderSuccess.items && createdOrderSuccess.items.length > 0 && (
              <div className="border-b border-slate-200 dark:border-slate-700 pb-2 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Valores Discriminados por Serviço:
                </span>
                {createdOrderSuccess.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400">
                      • {it.process} {it.serviceType === 'diferenciado' ? '(Diferenciado)' : '(Lavado)'}:
                    </span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      R$ {(it.unitPrice || 0).toFixed(2)} / pç
                    </strong>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-1 text-sky-800 dark:text-sky-300">
                  <span>Total da Nota:</span>
                  <span className="font-mono">
                    R$ {(createdOrderSuccess.totalServiceValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-0.5">
              <span className="text-slate-500">Tipo de Lote:</span>
              <strong className={createdOrderSuccess.isRelavado ? "text-purple-600 dark:text-purple-400 font-bold uppercase" : "text-slate-900 dark:text-slate-100 font-bold"}>
                {createdOrderSuccess.isRelavado ? "RELAVADO (ISENTO - R$ 0,00)" : "ENTRADA COMERCIAL"}
              </strong>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 font-sans">
            <button
              onClick={() => onOrderCreated(createdOrderSuccess.id)}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 font-mono"
            >
              <Printer className="w-4 h-4" />
              Imprimir Nota & Receita
            </button>

            {onNavigateToOrders && (
              <button
                onClick={onNavigateToOrders}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Ir para Lista de Pedidos
              </button>
            )}

            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-5 py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              + Novo Pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Entrada de Lote de Roupas
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Novo Pedido / Pesagem</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selecione o cliente e a peça cadastrada. O processo de lavado é automático e as dosagens dão baixa direta no estoque.
          </p>
        </div>
        <div className="p-3 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 rounded-xl">
          <Scale className="w-8 h-8" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seletor de Tipo de Entrada: Normal vs Relavado */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Finalidade da Entrada / Lote
            </span>
            {isRelavado ? (
              <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Relavado • Sem Cobrança (R$ 0,00)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-full text-xs font-bold uppercase">
                Entrada Comercial Normal
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsRelavado(false)}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                !isRelavado
                  ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/40 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${!isRelavado ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-xs font-bold block">1. Entrada Padrão (Normal)</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lote novo com cobrança e faturamento pelo valor unitário da tabela de peças.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsRelavado(true)}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                isRelavado
                  ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-purple-500'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${isRelavado ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-xs font-bold text-purple-700 dark:text-purple-300 block">2. Relavado (Reprocesso de Peças)</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Retorno de peças. <strong>Valor R$ 0,00 (sem cobrança)</strong> e baixa de insumos normal.
                </span>
              </div>
            </button>
          </div>

          {isRelavado && (
            <div className="pt-2 animate-in fade-in duration-200 border-t border-purple-100 dark:border-purple-900/40">
              <label className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider block mb-1">
                Motivo do Relavado / Referência da OS Anterior (Opcional):
              </label>
              <input
                type="text"
                value={relavadoReason}
                onChange={e => setRelavadoReason(e.target.value)}
                placeholder="Ex: Retorno da OS-0042 por mancha residual / tonalidade..."
                className="w-full px-3.5 py-2 bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
        </div>

        {/* Section 1: Client Selection */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              1. Seleção do Cliente
            </h2>

            <button
              type="button"
              onClick={onNavigateToClients}
              className="text-xs text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Cadastrar Novo Cliente
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Cliente *
            </label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            >
              <option value="">-- Selecione o Cliente --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName && c.companyName !== c.name ? `— ${c.companyName}` : ''} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Garment & Static Process Selection from Catalog */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              2. Tipo de Peça & Processo de Lavado
            </h2>
            <span className="text-xs text-slate-400 font-mono">Tabela de Peças</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Selecione a Peça *
              </label>
              <select
                value={selectedCatalogId}
                onChange={e => handleCatalogChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">-- Selecione a Peça Cadastrada na Tabela --</option>
                {garmentCatalog.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.clothingType} — Processo: {item.processName} (Ref: {item.defaultRefWeightGrams}g)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Nome da Peça / Roupa
              </label>
              <input
                type="text"
                value={clothingType}
                readOnly
                placeholder="Selecione uma peça na lista..."
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Corte / O.S. (Ref. Confecção)
              </label>
              <input
                type="text"
                value={corteOs}
                onChange={e => setCorteOs(e.target.value)}
                placeholder="Ex: 0418 ou REF.0418"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Processo de Lavado (Receita) *
              </label>
              <select
                value={processType}
                onChange={e => setProcessType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-sky-800 dark:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">-- Selecione o Lavado / Receita --</option>
                {receitasLavado.map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.fases?.length || 0} processos/fases)
                  </option>
                ))}
                {processType && !receitasLavado.some(r => r.name.toLowerCase() === processType.toLowerCase()) && (
                  <option value={processType}>{processType}</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Valor do Lavado (R$ / pç) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice || ''}
                  onChange={e => setUnitPrice(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Sub-painel: Serviços Diferenciados (Opcionais combinados na mesma O.S. / Nota) */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Serviços Diferenciados (Opcional — Combinados na mesma O.S.)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Adicione acabamentos como <strong>Destroyed, Pistolado, Bigode Laser</strong>, etc., que somarão ao valor do lavado na nota.
                </p>
              </div>

              {/* Botões Rápidos de Adição */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { name: 'Pistolado', price: 2.0 },
                  { name: 'Bigode Laser', price: 1.0 },
                  { name: 'Puído Laser', price: 1.5 },
                  { name: 'Destroyed', price: 2.5 },
                  { name: 'Resinagem', price: 3.0 }
                ].map(item => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleAddExtraService(item.name, item.price)}
                    className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {item.name} (+R$ {item.price.toFixed(2)})
                  </button>
                ))}
              </div>
            </div>

            {/* Input para digitação livre de novo serviço diferenciado */}
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="Outro serviço (ex: Bigode 3D, Puído Manual...)"
                className="flex-1 w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="relative w-full sm:w-36">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newServicePrice === '' ? '' : newServicePrice}
                  onChange={e => setNewServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newServiceName.trim()) {
                    handleAddExtraService(newServiceName, Number(newServicePrice) || 0);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            {/* Lista dos Serviços Diferenciados adicionados */}
            {extraServices.length > 0 && (
              <div className="space-y-1.5">
                {extraServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{s.name}</strong>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">(Serviço Diferenciado)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        R$ {s.unitPrice.toFixed(2)} / pç
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraService(s.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                        title="Remover serviço"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quadro de Demonstração / Detalhamento da Nota */}
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl text-xs space-y-1.5 font-mono">
              <span className="font-bold text-[10px] uppercase tracking-wider text-sky-800 dark:text-sky-300 block font-sans">
                Detalhamento dos Valores ao Cliente (Composição da Nota):
              </span>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>{processType || 'Lavado Principal'}:</span>
                <strong>R$ {unitPrice.toFixed(2)}</strong>
              </div>
              {extraServices.map(s => (
                <div key={s.id} className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>{s.name}:</span>
                  <strong>R$ {s.unitPrice.toFixed(2)}</strong>
                </div>
              ))}
              <div className="pt-1.5 border-t border-sky-200 dark:border-sky-800 flex justify-between font-bold text-sky-950 dark:text-sky-200 text-sm">
                <span>Total da Nota (por peça):</span>
                <span>R$ {combinedUnitPrice.toFixed(2)}</span>
              </div>
              {pieceCount > 0 && (
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Total Faturado ({pieceCount} peças):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {totalServiceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Quantidade de Peças & Pesagem */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calculator className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            3. Quantidade de Peças & Pesagem do Lote
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Input: Quantidade de Peças */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Quantidade de Peças *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={pieceCount === 0 ? '' : pieceCount}
                  onChange={e => setPieceCount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                <span className="absolute right-3 top-3.5 text-sm font-mono text-slate-400">pçs</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Contagem real das peças recebidas</span>
            </div>

            {/* Input: Peso por Peça */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Peso por Peça *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={weightPerPieceKg === 0 ? '' : weightPerPieceKg}
                  onChange={e => setWeightPerPieceKg(Number(e.target.value))}
                  placeholder="0.000"
                  className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                <span className="absolute right-3 top-3.5 text-sm font-mono text-slate-400 font-bold">kg</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Peso de uma unidade na balança</span>
            </div>

            {/* Calculated Output: Peso Total */}
            <div className="bg-sky-900 dark:bg-sky-950 p-5 rounded-xl border border-sky-800 dark:border-sky-800 text-white flex flex-col justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-sky-300 block">
                Peso Total do Lote
              </span>
              <div className="my-2">
                <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                  {totalWeightKg > 0 ? totalWeightKg.toFixed(3) : '—'}
                </span>
                <span className="text-sm text-sky-200 font-mono ml-2 font-semibold">kg</span>
              </div>
              <span className="text-[11px] text-sky-300 font-mono">
                {pieceCount > 0 && weightPerPieceKg > 0
                  ? `${pieceCount} pçs × ${weightPerPieceKg} kg`
                  : '(Informe quantidade e peso/peça)'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Sequência de Processos & Dosagem Química (Conforme Seq.pdf) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                4. Sequência de Processos & Dosagem Química do Lavado
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Processos do lavado <strong>{processType || '—'}</strong> calculados com base no peso e quantidade de peças (Fórmulas em % da Receita conforme Seq.pdf).
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Baixa automática no estoque ao salvar
            </span>
          </div>

          {chemicalRecipe.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Selecione uma peça com processo de lavado e informe o peso na balança para calcular a sequência de dosagens químicas.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cards sequenciais de cada Fase / Processo (Sequência do Lavado conforme Seq.pdf) */}
              {recipeFases.map((fase) => (
                <div 
                  key={`${fase.order}-${fase.name}`}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                >
                  <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-sky-700 dark:bg-sky-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                        {String(fase.order).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Fase {String(fase.order).padStart(2, '0')} — {fase.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {fase.items.length} produto(s) nesta etapa
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">Insumo Químico (Estoque)</th>
                          <th className="p-3 text-center">Dosagem (%)</th>
                          <th className="p-3">Fórmula Aplicada</th>
                          <th className="p-3">Estoque Disponível</th>
                          <th className="p-3 text-right">Dosagem da Máquina</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {fase.items.map((chem, idx) => {
                          const stockUnit = chem.unitStock || 'kg';
                          const usedInStockUnit = (stockUnit === 'kg' || stockUnit === 'L') ? chem.totalGrams / 1000 : chem.totalGrams;

                          return (
                            <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800/70 transition-colors">
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                {chem.productName}
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-sky-700 dark:text-sky-400">
                                {chem.dosagePct !== undefined ? `${chem.dosagePct}%` : `${chem.dosagePerKg} g/kg`}
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {chem.dosagePct !== undefined ? (
                                  <span>{totalWeightKg.toFixed(3)}kg × {chem.dosagePct}% ({pieceCount} pçs × {weightPerPieceKg}kg)</span>
                                ) : (
                                  <span>{totalWeightKg.toFixed(3)}kg × {chem.dosagePerKg}g/kg</span>
                                )}
                              </td>
                              <td className="p-3 font-mono">
                                {chem.availableStock !== undefined ? (
                                  chem.isLowStock ? (
                                    <span className="text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1 text-[11px]">
                                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                      {chem.availableStock} {stockUnit} (Baixo)
                                    </span>
                                  ) : (
                                    <span className="text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                                      {chem.availableStock} {stockUnit}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Regular</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-sky-700 dark:text-sky-400 text-sm">
                                {chem.totalGrams >= 1000 ? `${(chem.totalGrams / 1000).toFixed(2)} kg` : `${chem.totalGrams} g`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Resumo Consolidado de Baixa de Estoque */}
              <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    Resumo Consolidado para Baixa no Estoque (Total do Lote)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {consolidatedChemicals.length} produto(s) no total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {consolidatedChemicals.map((c, i) => {
                    const usedInStockUnit = (c.unitStock === 'kg' || c.unitStock === 'L') ? c.totalGrams / 1000 : c.totalGrams;
                    const remainingStock = c.availableStock !== undefined 
                      ? Math.max(0, Math.round((c.availableStock - usedInStockUnit) * 100) / 100)
                      : undefined;

                    return (
                      <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate" title={c.productName}>
                          {c.productName}
                        </div>
                        <div className="flex justify-between items-baseline font-mono text-xs">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">Consumo:</span>
                          <strong className="text-sky-700 dark:text-sky-400 font-bold">
                            {c.totalGrams >= 1000 ? `${(c.totalGrams / 1000).toFixed(2)} kg` : `${c.totalGrams} g`}
                          </strong>
                        </div>
                        {remainingStock !== undefined && (
                          <div className="flex justify-between items-baseline font-mono text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-400">Saldo pós-baixa:</span>
                            <span className={`font-semibold ${remainingStock <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {remainingStock} {c.unitStock}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Submit */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Observações do Pedido
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instruções especiais de lavagem, costura, manchas..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Nota impressa em formato **meia folha A4 (A5)**
            </span>

            <button
              type="submit"
              className="px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Salvar & Gerar Nota do Pedido
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
