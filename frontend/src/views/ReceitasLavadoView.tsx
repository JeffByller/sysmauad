import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { FlaskConical, Plus, Trash2, ChevronDown, ChevronUp, X, CheckCircle2, Edit3, GripVertical } from 'lucide-react';
import { ReceitaLavado, ReceitaFase, ReceitaProduto } from '../types';
import { Pagination } from '../components/common/Pagination';

export const ReceitasLavadoView: React.FC = () => {
  const { receitasLavado, addReceitaLavado, updateReceitaLavado, deleteReceitaLavado } = useOrders();

  const [expandedId, setExpandedId] = useState<string | null>(receitasLavado[0]?.id || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaLavado | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const paginatedReceitas = useMemo(() => {
    const sorted = [...receitasLavado].sort((a, b) => {
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
    const start = (currentPage - 1) * 20;
    return sorted.slice(start, start + 20);
  }, [receitasLavado, currentPage]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFases, setFormFases] = useState<ReceitaFase[]>([
    { order: 1, name: '', produtos: [{ productName: '', dosagePct: 0 }] }
  ]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingReceita(null);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openCreateModal = () => {
    setEditingReceita(null);
    setFormName('');
    setFormDescription('');
    setFormFases([{ order: 1, name: '', produtos: [{ productName: '', dosagePct: 0 }] }]);
    setIsModalOpen(true);
  };

  const openEditModal = (receita: ReceitaLavado) => {
    setEditingReceita(receita);
    setFormName(receita.name);
    setFormDescription(receita.description || '');
    setFormFases(receita.fases.map(f => ({ ...f, produtos: f.produtos.map(p => ({ ...p })) })));
    setIsModalOpen(true);
  };

  const addFase = () => {
    setFormFases(prev => [...prev, { order: prev.length + 1, name: '', produtos: [{ productName: '', dosagePct: 0 }] }]);
  };

  const removeFase = (idx: number) => {
    setFormFases(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i + 1 })));
  };

  const addProduto = (faseIdx: number) => {
    setFormFases(prev => prev.map((f, i) => i === faseIdx ? { ...f, produtos: [...f.produtos, { productName: '', dosagePct: 0 }] } : f));
  };

  const removeProduto = (faseIdx: number, prodIdx: number) => {
    setFormFases(prev => prev.map((f, i) => i === faseIdx ? { ...f, produtos: f.produtos.filter((_, pi) => pi !== prodIdx) } : f));
  };

  const updateFaseName = (idx: number, name: string) => {
    setFormFases(prev => prev.map((f, i) => i === idx ? { ...f, name } : f));
  };

  const updateProduto = (faseIdx: number, prodIdx: number, field: keyof ReceitaProduto, value: string | number) => {
    setFormFases(prev => prev.map((f, i) => {
      if (i !== faseIdx) return f;
      return { ...f, produtos: f.produtos.map((p, pi) => pi === prodIdx ? { ...p, [field]: value } : p) };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const payload = { name: formName.trim(), description: formDescription || undefined, fases: formFases };
    if (editingReceita) {
      updateReceitaLavado(editingReceita.id, payload);
      setFeedbackMsg(`Receita "${formName}" atualizada!`);
    } else {
      addReceitaLavado(payload);
      setFeedbackMsg(`Receita "${formName}" criada com sucesso!`);
    }
    setIsModalOpen(false);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDelete = (id: string) => {
    const r = receitasLavado.find(r => r.id === id);
    deleteReceitaLavado(id);
    setConfirmDeleteId(null);
    setFeedbackMsg(`Receita "${r?.name}" excluída.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Almoxarifado • Receitas de Lavado
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Receitas dos Lavados</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monte as receitas com fases e dosagens em porcentagem (%) para cada tipo de lavado.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-violet-700 hover:bg-violet-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />Nova Receita
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>{feedbackMsg}</span>
        </div>
      )}

      {receitasLavado.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma receita cadastrada ainda.</p>
          <p className="text-slate-400 text-xs mt-1">Clique em "Nova Receita" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedReceitas.map((receita, recIdx) => (
            <div key={receita.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors select-none"
                onClick={() => setExpandedId(expandedId === receita.id ? null : receita.id)}
                onDoubleClick={e => { e.stopPropagation(); openEditModal(receita); }}
                title="Clique para expandir ou duplo clique para editar esta receita"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold text-sm">
                    {(currentPage - 1) * 20 + recIdx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{receita.name}</h3>
                    {receita.description && <p className="text-xs text-slate-500 dark:text-slate-400">{receita.description}</p>}
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{receita.fases.length} fase(s) • Atualizado {new Date(receita.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); openEditModal(receita); }}
                    className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 rounded-lg transition-colors"
                    title="Editar receita"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(receita.id); }}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                    title="Excluir receita"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === receita.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Fases expandidas */}
              {expandedId === receita.id && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {receita.fases.map(fase => (
                      <div key={fase.order} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-300 rounded-md flex items-center justify-center text-[11px] font-extrabold">{String(fase.order).padStart(2, '0')}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">{fase.name}</span>
                        </div>
                        <div className="space-y-1.5">
                          {fase.produtos.map((prod, pi) => (
                            <div key={pi} className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex-1">{prod.productName}</span>
                              <span className="text-xs font-mono font-bold text-violet-700 dark:text-violet-400 whitespace-nowrap">{prod.dosagePct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <Pagination
            currentPage={currentPage}
            totalItems={receitasLavado.length}
            pageSize={20}
            onPageChange={setCurrentPage}
            label="receitas"
          />
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDeleteId && (() => {
        const r = receitasLavado.find(r => r.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Excluir Receita?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Tem certeza que deseja excluir a receita <strong>"{ r?.name}"</strong>? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button onClick={() => handleDelete(confirmDeleteId)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold">Excluir</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Create/Edit Receita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl my-4 overflow-hidden">
            <div className="bg-violet-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 text-violet-300 rounded-xl"><FlaskConical className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-base">{editingReceita ? 'Editar Receita' : 'Nova Receita de Lavado'}</h3>
                  <p className="text-xs text-violet-200">Dosagens em porcentagem (%)</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-violet-300 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Nome do Lavado *</label>
                  <input type="text" placeholder="Ex: Hiper Destroyed, Amaciado Simples..." value={formName} onChange={e => setFormName(e.target.value)} required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Descrição (opcional)</label>
                  <input type="text" placeholder="Descrição resumida do processo..." value={formDescription} onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              {/* Fases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Fases do Processo</label>
                  <button type="button" onClick={addFase}
                    className="px-3 py-1.5 bg-violet-100 dark:bg-violet-950 hover:bg-violet-200 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Adicionar Fase
                  </button>
                </div>

                {formFases.map((fase, faseIdx) => (
                  <div key={faseIdx} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-300 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0">
                        {String(fase.order).padStart(2, '0')}
                      </span>
                      <input type="text" placeholder="Nome da fase (ex: Desengomagem, Estonagem...)" value={fase.name} onChange={e => updateFaseName(faseIdx, e.target.value)} required
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100" />
                      {formFases.length > 1 && (
                        <button type="button" onClick={() => removeFase(faseIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 pl-10">
                      {fase.produtos.map((prod, prodIdx) => (
                        <div key={prodIdx} className="flex items-center gap-2">
                          <input type="text" placeholder="Nome do produto" value={prod.productName} onChange={e => updateProduto(faseIdx, prodIdx, 'productName', e.target.value)} required
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100" />
                          <div className="relative flex items-center">
                            <input type="number" min="0" step="0.1" max="100" placeholder="0.0" value={prod.dosagePct} onChange={e => updateProduto(faseIdx, prodIdx, 'dosagePct', Number(e.target.value))}
                              className="w-20 px-2 py-1.5 pr-6 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-right focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100" />
                            <span className="absolute right-2 text-xs text-slate-400 font-bold">%</span>
                          </div>
                          {fase.produtos.length > 1 && (
                            <button type="button" onClick={() => removeProduto(faseIdx, prodIdx)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addProduto(faseIdx)}
                        className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 mt-1">
                        <Plus className="w-3 h-3" />Adicionar produto nesta fase
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />{editingReceita ? 'Salvar Alterações' : 'Criar Receita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
