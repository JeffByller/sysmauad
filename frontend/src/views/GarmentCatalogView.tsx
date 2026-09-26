import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { PlusCircle, Tag, Scale, CheckCircle2, Search, Edit3, Trash2, X, AlertCircle } from 'lucide-react';
import { GarmentProcessCatalogItem } from '../types';
import { Pagination } from '../components/common/Pagination';

export const GarmentCatalogView: React.FC = () => {
  const { 
    garmentCatalog, 
    addGarmentCatalogItem, 
    updateGarmentCatalogItem, 
    deleteGarmentCatalogItem 
  } = useOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GarmentProcessCatalogItem | null>(null);

  // Form State
  const [clothingType, setClothingType] = useState('');
  const [processName, setProcessName] = useState('');
  const [unitPriceInput, setUnitPriceInput] = useState('');
  const [refWeightInput, setRefWeightInput] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFormOpen(false);
        setEditingItem(null);
        setErrorMsg(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Converte string de moeda brasileira ("3,50" ou "3.50") para número float
  const parseCurrency = (val: string): number => {
    if (!val) return 0;
    const trimmed = val.trim();
    if (trimmed.includes(',')) {
      const clean = trimmed.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    } else {
      const num = parseFloat(trimmed);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    }
  };

  // Formata número para exibição em moeda brasileira sem o símbolo R$ (ex: "3,50")
  const formatToBRLInput = (num: number): string => {
    if (num <= 0) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Permite números, vírgula e ponto
    const cleaned = val.replace(/[^\d,.]/g, '');
    setUnitPriceInput(cleaned);
    if (errorMsg) setErrorMsg(null);
  };

  const handlePriceBlur = () => {
    const num = parseCurrency(unitPriceInput);
    if (num > 0) {
      setUnitPriceInput(formatToBRLInput(num));
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setClothingType('');
    setProcessName('');
    setUnitPriceInput('');
    setRefWeightInput('');
    setCategory('');
    setNotes('');
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: GarmentProcessCatalogItem) => {
    setEditingItem(item);
    setClothingType(item.clothingType);
    setProcessName(item.processName);
    setUnitPriceInput(formatToBRLInput(item.unitPrice));
    setRefWeightInput(item.defaultRefWeightGrams > 0 ? String(item.defaultRefWeightGrams) : '');
    setCategory(item.category || '');
    setNotes(item.notes || '');
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleDelete = (item: GarmentProcessCatalogItem) => {
    if (window.confirm(`Deseja realmente remover a peça "${item.clothingType}" (${item.processName}) do catálogo?`)) {
      deleteGarmentCatalogItem(item.id);
      setFeedback(`Peça "${item.clothingType}" removida do catálogo.`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clothingType.trim()) {
      setErrorMsg('Informe o tipo de peça / roupa.');
      return;
    }

    if (!processName.trim()) {
      setErrorMsg('Informe o processo de lavado.');
      return;
    }

    const priceNum = parseCurrency(unitPriceInput);
    if (priceNum <= 0) {
      setErrorMsg('Informe um valor unitário válido por peça (ex: 3,50).');
      return;
    }

    const weightNum = Number(refWeightInput);
    if (weightNum <= 0) {
      setErrorMsg('Informe o peso de referência em gramas (ex: 300).');
      return;
    }

    if (editingItem) {
      updateGarmentCatalogItem(editingItem.id, {
        clothingType: clothingType.trim(),
        processName: processName.trim(),
        unitPrice: priceNum,
        defaultRefWeightGrams: weightNum,
        category: category.trim() || 'Geral',
        notes: notes.trim()
      });
      setFeedback(`Item "${clothingType}" atualizado com sucesso!`);
    } else {
      addGarmentCatalogItem({
        clothingType: clothingType.trim(),
        processName: processName.trim(),
        unitPrice: priceNum,
        defaultRefWeightGrams: weightNum,
        category: category.trim() || 'Geral',
        notes: notes.trim()
      });
      setFeedback(`Peça "${clothingType}" cadastrada com sucesso no catálogo!`);
    }

    setIsFormOpen(false);
    setEditingItem(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredCatalog = garmentCatalog.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.clothingType.toLowerCase().includes(term) ||
      item.processName.toLowerCase().includes(term) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  });

  const paginatedCatalog = useMemo(() => {
    const start = (currentPage - 1) * 20;
    return filteredCatalog.slice(start, start + 20);
  }, [filteredCatalog, currentPage]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Tabela de Peças & Lavagem
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Catálogo de Peças & Processos</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre os tipos de roupa, processos de lavagem e seus valores unitários para cálculo automático nos pedidos.
          </p>
        </div>

        <button
          onClick={() => {
            if (isFormOpen) {
              setIsFormOpen(false);
              setEditingItem(null);
            } else {
              handleOpenAdd();
            }
          }}
          className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
        >
          {isFormOpen ? (
            <>
              <X className="w-4 h-4" />
              <span>Fechar Formulário</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Nova Peça</span>
            </>
          )}
        </button>
      </div>

      {/* Success Feedback */}
      {feedback && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Registration Form (Add / Edit) */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-5 animate-in fade-in duration-200 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {editingItem ? `Editar: ${editingItem.clothingType}` : 'Cadastrar Nova Peça no Catálogo'}
            </h2>
            <button 
              type="button" 
              onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tipo de Peça */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Tipo de Peça / Roupa *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Calça Wide Leg, Bermuda Jeans..."
                  value={clothingType}
                  onChange={e => { setClothingType(e.target.value); if (errorMsg) setErrorMsg(null); }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoFocus
                  required
                />
              </div>

              {/* Processo de Lavado */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Processo de Lavado *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Amaciado, Hiper Destroi, Tingimento..."
                  value={processName}
                  onChange={e => { setProcessName(e.target.value); if (errorMsg) setErrorMsg(null); }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Valor Unitário com Máscara Moeda Brasileira */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Valor Unitário por Peça *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={unitPriceInput}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ex: Digite <strong>3,50</strong> ou <strong>3.50</strong>
                </span>
              </div>

              {/* Peso de Referência */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Peso de Referência (1 Peça) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="300"
                    value={refWeightInput}
                    onChange={e => { setRefWeightInput(e.target.value); if (errorMsg) setErrorMsg(null); }}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-slate-400">
                    g
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Peso médio em gramas para a balança
                </span>
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Calças, Bermudas, Jaquetas..."
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Observações / Notas
                </label>
                <input
                  type="text"
                  placeholder="Detalhes adicionais de lavagem ou acabamento..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                {editingItem ? 'Salvar Alterações' : 'Salvar no Catálogo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Catalog Search & Table List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Peças Cadastradas no Catálogo</h2>
            <span className="text-[11px] text-slate-400">Total: {filteredCatalog.length} peça(s)</span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por peça, processo ou categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Tipo de Peça / Roupa</th>
                <th className="p-4">Processo de Lavado</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Peso Ref.</th>
                <th className="p-4 text-right">Valor Unitário</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum item cadastrado no catálogo.
                  </td>
                </tr>
              ) : (
                paginatedCatalog.map(item => (
                  <tr 
                    key={item.id} 
                    onDoubleClick={() => handleOpenEdit(item)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
                    title="Duplo clique para editar este item"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                      {item.clothingType}
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                      {item.processName}
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                        {item.category || 'Geral'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.defaultRefWeightGrams} g
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                          className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar Peça"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Excluir Peça"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCatalog.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          label="peças"
        />
      </div>
    </div>
  );
};
