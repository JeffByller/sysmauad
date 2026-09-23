import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Scale, Calculator, Printer, FlaskConical, User, UserPlus, AlertTriangle, Tag, CheckCircle2 } from 'lucide-react';

interface NewOrderViewProps {
  onOrderCreated: (orderId: string) => void;
  onNavigateToClients: () => void;
}

export const NewOrderView: React.FC<NewOrderViewProps> = ({ onOrderCreated, onNavigateToClients }) => {
  const { createOrder, calculateChemicals, clients, garmentCatalog, receitasLavado } = useOrders();
  const { user } = useAuth();

  // Todos os campos iniciam completamente vazios ao abrir o Novo Pedido
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');

  const [clothingType, setClothingType] = useState<string>('');
  const [processType, setProcessType] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [refPieceWeightGrams, setRefPieceWeightGrams] = useState<number>(0);
  const [totalWeightKg, setTotalWeightKg] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  // Handle Catalog Selection Change: Puxa os dados definidos na Tabela de Peças
  const handleCatalogChange = (catId: string) => {
    setSelectedCatalogId(catId);
    if (!catId) {
      setClothingType('');
      setProcessType('');
      setUnitPrice(0);
      setRefPieceWeightGrams(0);
      return;
    }

    const found = garmentCatalog.find(g => g.id === catId);
    if (found) {
      setClothingType(found.clothingType);
      setProcessType(found.processName);
      setUnitPrice(found.unitPrice);
      setRefPieceWeightGrams(found.defaultRefWeightGrams);
    }
  };

  const estimatedPieceCount = (refPieceWeightGrams > 0 && totalWeightKg > 0)
    ? Math.round((totalWeightKg * 1000) / refPieceWeightGrams)
    : 0;

  // Valor calculado para persistência no pedido (exibido apenas no financeiro/relatórios)
  const totalServiceValue = Math.round(estimatedPieceCount * unitPrice * 100) / 100;

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

    if (totalWeightKg <= 0 || refPieceWeightGrams <= 0) {
      alert('Por favor, informe o peso de referência e o peso total do pedido na balança.');
      return;
    }

    const newOrder = createOrder({
      clientId: selectedClient.id,
      clientName: `${selectedClient.name} (${selectedClient.companyName})`,
      clientPhone: selectedClient.phone,
      clientAddress: selectedClient.address,
      operatorName: user?.name || 'Operador',
      refPieceWeightGrams,
      totalWeightKg,
      estimatedPieceCount,
      totalServiceValue,
      items: [
        {
          id: `item-${Date.now()}`,
          clothingType,
          process: processType, // Fixo/estático da tabela de peças
          quantity: estimatedPieceCount,
          unitPrice,
          totalPrice: totalServiceValue
        }
      ],
      chemicalRecipe,
      notes
    });

    onOrderCreated(newOrder.id);
  };

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
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
                Peso de Referência (1 Peça) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={refPieceWeightGrams === 0 ? '' : refPieceWeightGrams}
                  onChange={e => setRefPieceWeightGrams(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400">g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Weighing & Estimated Piece Count */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calculator className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            3. Pesagem do Lote & Quantidade de Peças
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Input: Total Batch Weight */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Peso Total do Pedido na Balança (Kg) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={totalWeightKg === 0 ? '' : totalWeightKg}
                  onChange={e => setTotalWeightKg(Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full pl-3 pr-12 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                <span className="absolute right-3.5 top-3.5 text-sm font-mono text-slate-400 font-bold">kg</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Informe a pesagem direta da balança</span>
            </div>

            {/* Calculated Output: Estimated Pieces */}
            <div className="bg-sky-900 dark:bg-sky-950 p-5 rounded-xl border border-sky-800 dark:border-sky-800 text-white flex flex-col justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-sky-300 block">
                Quantidade Estimada de Peças
              </span>
              <div className="my-2">
                <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                  {estimatedPieceCount}
                </span>
                <span className="text-sm text-sky-200 font-mono ml-2 font-semibold">peças</span>
              </div>
              <span className="text-[11px] text-sky-300 font-mono">
                {totalWeightKg > 0 && refPieceWeightGrams > 0
                  ? `(${(totalWeightKg * 1000).toFixed(0)}g ÷ ${refPieceWeightGrams}g)`
                  : '(Aguardando peso e peça)'}
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
                                  <span>{totalWeightKg.toFixed(1)}kg × {chem.dosagePct}% ({estimatedPieceCount} pçs × {refPieceWeightGrams}g)</span>
                                ) : (
                                  <span>{totalWeightKg.toFixed(1)}kg × {chem.dosagePerKg}g/kg</span>
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
