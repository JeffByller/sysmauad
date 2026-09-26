import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import {
  PackagePlus, Search, Calendar, X, CheckCircle2,
  FileText, Truck, Building2
} from 'lucide-react';
import { Pagination } from '../components/common/Pagination';

type SubTab = 'entradas' | 'relatorio';

export const InsumoEntryView: React.FC = () => {
  const { stockItems, insumoEntries, suppliers, addInsumoEntry, addSupplier } = useOrders();
  const { user } = useAuth();

  const [subTab, setSubTab] = useState<SubTab>('entradas');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');

  const [entStockItemId, setEntStockItemId] = useState('');
  const [entSupplierId, setEntSupplierId] = useState('');
  const [entQuantity, setEntQuantity] = useState<number>(20);
  const [entUnitPrice, setEntUnitPrice] = useState<number>(0);
  const [entInvoiceRef, setEntInvoiceRef] = useState('');

  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCnpj, setSupCnpj] = useState('');

  const selectedStock = stockItems.find(s => s.id === entStockItemId);
  const entTotalValue = entQuantity * entUnitPrice;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entStockItemId || !entSupplierId) return;
    const supplier = suppliers.find(s => s.id === entSupplierId)!;
    const stockItem = stockItems.find(s => s.id === entStockItemId)!;
    addInsumoEntry({
      stockItemId: entStockItemId,
      productName: stockItem.name,
      supplierId: entSupplierId,
      supplierName: supplier.name,
      quantity: entQuantity,
      unit: stockItem.unit,
      unitPrice: entUnitPrice,
      totalValue: entTotalValue,
      enteredAt: new Date().toISOString(),
      operatorName: user?.name || 'Operador',
      invoiceRef: entInvoiceRef || undefined,
    });
    setFeedbackMsg(`Entrada de ${entQuantity} ${stockItem.unit} de "${stockItem.name}" registrada! Estoque atualizado.`);
    setIsEntryModalOpen(false);
    setEntStockItemId(''); setEntSupplierId(''); setEntQuantity(20); setEntUnitPrice(0); setEntInvoiceRef('');
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    addSupplier({ name: supName.trim(), phone: supPhone || undefined, cnpj: supCnpj || undefined });
    setSupName(''); setSupPhone(''); setSupCnpj('');
    setIsSupplierModalOpen(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredEntries = insumoEntries.filter(e => {
    const term = searchTerm.toLowerCase();
    return e.productName.toLowerCase().includes(term) || e.supplierName.toLowerCase().includes(term);
  });

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
  }, [filteredEntries]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * 20;
    return sortedEntries.slice(start, start + 20);
  }, [sortedEntries, currentPage]);

  const reportEntries = insumoEntries.filter(e => {
    const d = e.enteredAt.split('T')[0];
    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
  });

  type SupplierGroup = { supplierId: string; supplierName: string; totalValue: number; items: typeof reportEntries };
  const supplierGroups = reportEntries.reduce<SupplierGroup[]>((acc, e) => {
    const existing = acc.find(g => g.supplierId === e.supplierId);
    if (existing) { existing.totalValue += e.totalValue; existing.items.push(e); }
    else acc.push({ supplierId: e.supplierId, supplierName: e.supplierName, totalValue: e.totalValue, items: [e] });
    return acc;
  }, []);

  const grandTotalReport = supplierGroups.reduce((sum, g) => sum + g.totalValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Almoxarifado &bull; Entradas de Insumos
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Controle de Entradas e Fornecedores</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Registre compras de insumos por fornecedor. O estoque &eacute; atualizado automaticamente.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setIsSupplierModalOpen(true)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
            <Building2 className="w-4 h-4" />Novo Fornecedor
          </button>
          <button onClick={() => setIsEntryModalOpen(true)} className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4" />Registrar Entrada
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>{feedbackMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-800">
        {(['entradas', 'relatorio'] as SubTab[]).map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px ${
              subTab === tab ? 'border-teal-600 text-teal-700 dark:text-teal-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}>
            {tab === 'entradas' ? `Hist\u00f3rico de Entradas (${insumoEntries.length})` : 'Relat\u00f3rio Fornecedores'}
          </button>
        ))}
      </div>

      {subTab === 'entradas' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input type="text" placeholder="Buscar por produto ou fornecedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Data</th><th className="p-4">Produto</th><th className="p-4">Fornecedor</th>
                  <th className="p-4 text-right">Qtd</th><th className="p-4 text-right">Pre&ccedil;o Unit.</th>
                  <th className="p-4 text-right">Total</th><th className="p-4">NF / Ref.</th><th className="p-4">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEntries.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">
                    <PackagePlus className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <span className="block">{insumoEntries.length === 0 ? 'Nenhuma entrada registrada. Clique em "Registrar Entrada".' : 'Nenhuma entrada encontrada.'}</span>
                  </td></tr>
                ) : paginatedEntries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-mono">
                    <td className="p-4 text-slate-500 dark:text-slate-400">{new Date(e.enteredAt).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100 font-sans">{e.productName}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300 font-sans"><div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" />{e.supplierName}</div></td>
                    <td className="p-4 text-right font-bold text-teal-700 dark:text-teal-400">+{e.quantity} {e.unit}</td>
                    <td className="p-4 text-right text-slate-600 dark:text-slate-400">{e.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-100">{e.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="p-4 text-slate-400 dark:text-slate-500">{e.invoiceRef || '\u2014'}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-sans">{e.operatorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredEntries.length}
            pageSize={20}
            onPageChange={setCurrentPage}
            label="entradas"
          />
        </div>
      )}

      {subTab === 'relatorio' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row items-start sm:items-end gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 pt-5 sm:pt-0">
              <Calendar className="w-4 h-4" /><span className="text-xs font-semibold uppercase">Per&iacute;odo:</span>
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">De</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">At&eacute;</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
            </div>
            <div className="p-4 bg-teal-50 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-900 sm:ml-auto">
              <span className="text-[10px] uppercase font-semibold text-teal-600 dark:text-teal-400 block">Total a Pagar no Per&iacute;odo</span>
              <span className="text-xl font-extrabold font-mono text-teal-700 dark:text-teal-300">{grandTotalReport.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
          {supplierGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm">Nenhuma entrada no per&iacute;odo selecionado.</p>
            </div>
          ) : supplierGroups.map(group => (
            <div key={group.supplierId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 rounded-lg"><Truck className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{group.supplierName}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">{group.items.length} entrada(s) no per&iacute;odo</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block">Total fornecedor</span>
                  <span className="font-extrabold font-mono text-teal-700 dark:text-teal-400 text-base">{group.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Produto</th><th className="px-4 py-2 text-right">Qtd</th><th className="px-4 py-2 text-right">Pre&ccedil;o Unit.</th><th className="px-4 py-2 text-right">Subtotal</th><th className="px-4 py-2">NF</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {group.items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{new Date(item.enteredAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-sans font-semibold">{item.productName}</td>
                      <td className="px-4 py-2.5 text-right text-teal-700 dark:text-teal-400 font-bold">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400">{item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">{item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="px-4 py-2.5 text-slate-400">{item.invoiceRef || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
            <div className="bg-teal-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl"><PackagePlus className="w-5 h-5" /></div>
                <div><h3 className="font-bold text-base">Registrar Entrada de Insumo</h3><p className="text-xs text-teal-200">Estoque ser&aacute; atualizado automaticamente</p></div>
              </div>
              <button onClick={() => setIsEntryModalOpen(false)} className="text-teal-300 hover:text-white p-1 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Produto (Insumo Qu&iacute;mico)</label>
                <select value={entStockItemId} onChange={e => setEntStockItemId(e.target.value)} required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100">
                  <option value="">Selecione o produto...</option>
                  {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.currentStock} {s.unit} atual)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Fornecedor</label>
                <select value={entSupplierId} onChange={e => setEntSupplierId(e.target.value)} required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100">
                  <option value="">Selecione o fornecedor...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Qtd {selectedStock ? `(${selectedStock.unit})` : ''}</label>
                  <input type="number" min="0.01" step="0.5" value={entQuantity} onChange={e => setEntQuantity(Number(e.target.value))} required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Pre&ccedil;o/Un (R$)</label>
                  <input type="number" min="0" step="0.01" value={entUnitPrice} onChange={e => setEntUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Total</label>
                  <div className="px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-sm font-mono font-bold text-teal-700 dark:text-teal-400">
                    {entTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Nota Fiscal / Refer&ecirc;ncia (opcional)</label>
                <input type="text" placeholder="NF-001, Pedido #123..." value={entInvoiceRef} onChange={e => setEntInvoiceRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsEntryModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2"><Building2 className="w-5 h-5 text-teal-600" />Cadastrar Fornecedor</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">&times;</button>
            </div>
            <form onSubmit={handleAddSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Nome do Fornecedor *</label>
                <input type="text" placeholder="Ex: Qu&iacute;mica Nordeste Ltda" value={supName} onChange={e => setSupName(e.target.value)} required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">Telefone</label>
                  <input type="text" placeholder="81 9xxxx-xxxx" value={supPhone} onChange={e => setSupPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">CNPJ</label>
                  <input type="text" placeholder="xx.xxx.xxx/0001-xx" value={supCnpj} onChange={e => setSupCnpj(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm">Salvar Fornecedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
