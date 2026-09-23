import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { Package, Plus, AlertTriangle, CheckCircle2, RefreshCw, Search, FlaskConical, PackagePlus, BookOpen } from 'lucide-react';
import { InsumoEntryView } from './InsumoEntryView';
import { ReceitasLavadoView } from './ReceitasLavadoView';

type StockTab = 'estoque' | 'entradas' | 'receitas';

export const StockView: React.FC = () => {
  const { stockItems, addStockItem, updateStockQuantity, updateStockItem } = useOrders();
  const [stockTab, setStockTab] = useState<StockTab>('estoque');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<'kg' | 'L' | 'g'>('kg');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(0);
  const [defaultDosagePerKg, setDefaultDosagePerKg] = useState<number>(0);
  const [category, setCategory] = useState<'detergente' | 'amaciante' | 'alvejante' | 'corante' | 'desengomante' | 'outros'>('outros');
  const [notes, setNotes] = useState('');

  const lowStockItems = stockItems.filter(item => item.currentStock <= item.minStockAlert);
  const filteredItems = stockItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setUnit(item.unit);
    setCurrentStock(item.currentStock);
    setMinStockAlert(item.minStockAlert);
    setDefaultDosagePerKg(item.defaultDosagePerKg || 10);
    setCategory(item.category);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setUnit('kg');
    setCurrentStock(0);
    setMinStockAlert(0);
    setDefaultDosagePerKg(0);
    setCategory('outros');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      updateStockItem(editingItem.id, {
        name: name.trim(),
        unit,
        currentStock: Number(currentStock),
        minStockAlert: Number(minStockAlert),
        defaultDosagePerKg: Number(defaultDosagePerKg),
        category,
        notes
      });
    } else {
      addStockItem({
        name: name.trim(),
        unit,
        currentStock: Number(currentStock),
        minStockAlert: Number(minStockAlert),
        defaultDosagePerKg: Number(defaultDosagePerKg),
        category,
        notes
      });
    }

    setName('');
    setEditingItem(null);
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Almoxarifado & Insumos de Lavagem
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {stockTab === 'estoque' && 'Estoque de Produtos Químicos'}
            {stockTab === 'entradas' && 'Entradas de Insumos'}
            {stockTab === 'receitas' && 'Receitas dos Lavados'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre os insumos, registre entradas por fornecedor e monte as receitas de lavado.
          </p>
        </div>
        {stockTab === 'estoque' && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Insumo
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
        {([
          { key: 'estoque', label: 'Estoque', icon: Package },
          { key: 'entradas', label: 'Entradas', icon: PackagePlus },
          { key: 'receitas', label: 'Receitas', icon: BookOpen },
        ] as { key: StockTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setStockTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              stockTab === key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>
      {/* Conteúdo por aba */}
      {stockTab === 'entradas' && <InsumoEntryView />}
      {stockTab === 'receitas' && <ReceitasLavadoView />}

      {stockTab === 'estoque' && (
      <>
      {/* Low Stock Alert Section */}
      <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-6 space-y-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Aviso de Insumos Críticos / Estoque Baixo</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Produtos que estão no limite ou abaixo do alerta mínimo de segurança</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/80 px-3 py-1 rounded-full">
            {lowStockItems.length} item(s) acabando
          </span>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 border border-amber-100 dark:border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Todos os insumos químicos estão com níveis suficientes no estoque.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-300 dark:border-amber-800 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.name}</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Dosagem base: {item.defaultDosagePerKg} g/kg</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-base font-bold text-rose-700 dark:text-rose-400 block">{item.currentStock} {item.unit}</span>
                  <span className="text-[10px] text-slate-400 block">Min: {item.minStockAlert} {item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Stock Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar insumo por nome ou categoria..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Total no Almoxarifado: {stockItems.length} insumo(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Nome do Insumo Químico</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Dosagem Padrão (g/kg)</th>
                <th className="p-4">Estoque Mínimo Alerta</th>
                <th className="p-4">Estoque Atual</th>
                <th className="p-4 text-right">Ações de Reposição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => {
                const isLow = item.currentStock <= item.minStockAlert;
                return (
                  <tr 
                    key={item.id} 
                    onDoubleClick={() => handleOpenEditModal(item)}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
                    title="Duplo clique para editar este insumo"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100 font-sans">
                      {item.name}
                      {item.notes && <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal block">{item.notes}</span>}
                    </td>
                    <td className="p-4 uppercase text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">{item.category}</td>
                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{item.defaultDosagePerKg} g/kg</td>
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">{item.minStockAlert} {item.unit}</td>
                    <td className="p-4 font-mono font-bold">
                      {isLow ? (
                        <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-md font-bold text-xs border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          {item.currentStock} {item.unit} (Acabando)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-md font-bold text-xs border border-transparent dark:border-emerald-800">
                          {item.currentStock} {item.unit}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => updateStockQuantity(item.id, item.currentStock + 20)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 border border-transparent dark:border-slate-700"
                        title="+20 unidades no estoque"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        +20 {item.unit}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register / Edit Stock Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                {editingItem ? 'Editar Insumo Químico' : 'Cadastrar Insumo no Estoque'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Produto Químico
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sabão Neutro Líquido, Peróxido..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="L">Litros (L)</option>
                    <option value="g">Gramas (g)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="desengomante">Desengomante</option>
                    <option value="detergente">Detergente/Sabão</option>
                    <option value="amaciante">Amaciante</option>
                    <option value="alvejante">Alvejante/Destroi</option>
                    <option value="corante">Corante</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Estoque Inicial
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentStock}
                    onChange={e => setCurrentStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Alerta Mínimo
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Dosagem (g/kg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={defaultDosagePerKg}
                    onChange={e => setDefaultDosagePerKg(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Instruções de diluição..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </> )}
    </div>
  );
};
