import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { QrCode, CheckCircle2, AlertTriangle, ArrowRight, Clock, Calendar } from 'lucide-react';
import { getDatePresets, getLocalDateString } from '../utils/dateUtils';

interface PassadorMobileViewProps {
  onOpenScanner: () => void;
  scannedOSNumber: string;
}

export const PassadorMobileView: React.FC<PassadorMobileViewProps> = ({ onOpenScanner, scannedOSNumber }) => {
  const { orders, passadores, registerIroning, getOrderByOS } = useOrders();
  const { user } = useAuth();

  // Single Play Mode: Ativado quando o usuário logado possui a role 'passador'
  const isSinglePlay = user?.role === 'passador';

  // Admin tem acesso total, inclusive relançar na mesma OS
  const isAdmin = user?.role === 'admin' || user?.id === 'super-admin-root';

  // Se for admin ou operador com acesso do sistema, permite selecionar o passador
  const [selectedPassadorId, setSelectedPassadorId] = useState<string>(() => {
    if (isSinglePlay && user) {
      return user.id;
    }
    return passadores[0]?.id || '';
  });

  // Atualiza passador selecionado se o usuário for passador
  React.useEffect(() => {
    if (isSinglePlay && user) {
      setSelectedPassadorId(user.id);
    }
  }, [isSinglePlay, user]);

  // Order & Piece Entry State
  const [osNumberOnly, setOsNumberOnly] = useState<string>(() => {
    if (scannedOSNumber) {
      return scannedOSNumber.replace(/^OS-/i, '');
    }
    return '';
  });
  const [piecesIronedInput, setPiecesIronedInput] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consulta de produção simplificada: padrão 'hoje'
  const [showCustomDateFilter, setShowCustomDateFilter] = useState<boolean>(false);
  const { todayStr } = getDatePresets();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Sync scanned OS if changed from modal
  React.useEffect(() => {
    if (scannedOSNumber) {
      setOsNumberOnly(scannedOSNumber.replace(/^OS-/i, ''));
    }
  }, [scannedOSNumber]);

  // Formata o número da OS para consulta
  const fullOSNumber = osNumberOnly.trim()
    ? (osNumberOnly.trim().toUpperCase().startsWith('OS-')
        ? osNumberOnly.trim().toUpperCase()
        : `OS-${osNumberOnly.trim()}`)
    : '';

  const activeOrder = fullOSNumber ? getOrderByOS(fullOSNumber) : null;

  // Determina quem é o passador ativo para este lançamento
  const activePassador = isSinglePlay && user
    ? { id: user.id, name: user.name }
    : passadores.find(p => p.id === selectedPassadorId) || (passadores.length > 0 ? passadores[0] : null);

  // Coleta histórico de lançamentos do passador logado (Single Play) ou do selecionado
  const targetPassadorId = isSinglePlay && user ? user.id : activePassador?.id;

  const myLogs = orders
    .flatMap(o => o.ironingLogs.map(l => ({ ...l, clientName: o.clientName })))
    .filter(l => l.passadorId === targetPassadorId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const piecesToday = myLogs
    .filter(l => getLocalDateString(l.timestamp) === todayStr)
    .reduce((sum, l) => sum + l.piecesIroned, 0);

  // Logs filtrados: por padrão a data de hoje, ou a data selecionada no filtro simples
  const filteredConsultLogs = myLogs.filter(l => {
    const logDate = getLocalDateString(l.timestamp);
    return logDate === (showCustomDateFilter ? selectedDate : todayStr);
  });

  const totalPiecesFiltered = filteredConsultLogs.reduce((sum, l) => sum + l.piecesIroned, 0);

  const handleIroningSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const piecesCount = parseInt(piecesIronedInput, 10);

    if (!activePassador) {
      setFeedbackMessage({ 
        type: 'error', 
        text: 'Nenhum passador identificado. Verifique se o colaborador está cadastrado em Usuários.' 
      });
      return;
    }

    if (!activeOrder) {
      setFeedbackMessage({ type: 'error', text: 'Pedido / OS não encontrado. Verifique o número digitado ou bipe o QR Code.' });
      return;
    }

    if (!piecesIronedInput || isNaN(piecesCount) || piecesCount <= 0) {
      setFeedbackMessage({ type: 'error', text: 'A quantidade de peças passadas deve ser maior que zero.' });
      return;
    }

    // ── Regra de Negócio: passador só pode lançar 1 vez por OS ─────────────
    // Admins e super admin são isentos desta restrição
    if (!isAdmin) {
      const alreadyLaunched = activeOrder.ironingLogs.some(
        log => log.passadorId === activePassador.id
      );
      if (alreadyLaunched) {
        setFeedbackMessage({
          type: 'error',
          text: `Você já realizou um lançamento para a OS ${activeOrder.osNumber}. Para corrigir ou adicionar mais, solicite ao Administrador.`
        });
        return;
      }
    }

    const res = registerIroning(activeOrder.id, activePassador.id, activePassador.name, piecesCount);
    if (res.success) {
      setFeedbackMessage({ type: 'success', text: res.message });
      setPiecesIronedInput('');
    } else {
      setFeedbackMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Cabeçalho Limpo: Apenas o Nome do Usuário e Total de Peças Hoje */}
      {isSinglePlay && user ? (
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl flex items-center justify-between border border-slate-800">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Passador</span>
            <h1 className="text-xl font-bold text-white tracking-tight">{user.name}</h1>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Passadas Hoje</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {piecesToday} <span className="text-xs text-emerald-300 font-normal">pçs</span>
            </span>
          </div>
        </div>
      ) : (
        /* Modo Administrador / Gestão: seletor de passador */
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl space-y-3 border border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Lançamento de Passadoria</h2>
            <span className="text-[10px] text-amber-400 font-mono font-semibold">Acesso Gestão</span>
          </div>
          <select
            value={selectedPassadorId}
            onChange={e => setSelectedPassadorId(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {passadores.filter(p => p.active !== false).map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.totalPiecesIroned} pçs total)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Painel de Consulta Rápida Simplificado: Fixo Hoje por padrão + Filtro simples de data */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Produção {showCustomDateFilter && selectedDate !== todayStr ? `• ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'de Hoje'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (showCustomDateFilter) {
                setShowCustomDateFilter(false);
                setSelectedDate(todayStr);
              } else {
                setShowCustomDateFilter(true);
              }
            }}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            {showCustomDateFilter ? 'Voltar para Hoje' : 'Consultar outra data'}
          </button>
        </div>

        {/* Filtro simples de data quando acionado */}
        {showCustomDateFilter && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Data:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Totalizador do dia */}
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
          <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
            {showCustomDateFilter && selectedDate !== todayStr
              ? `Total em ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
              : 'Total de Peças Hoje'}
          </span>
          <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
            {totalPiecesFiltered} <span className="text-xs font-normal">pçs</span>
          </span>
        </div>

        {/* Lista de Registros */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-1.5">
            <span>
              Lançamentos {showCustomDateFilter && selectedDate !== todayStr ? 'do dia' : 'de hoje'}:
            </span>
            <span>{filteredConsultLogs.length} registro(s)</span>
          </div>

          {filteredConsultLogs.length === 0 ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 border border-slate-100 dark:border-slate-800">
              Nenhuma peça registrada nesta data.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredConsultLogs.map(l => (
                <div
                  key={l.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">{l.osNumber}</strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-sans truncate max-w-[190px]">
                      {l.clientName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm block">
                      +{l.piecesIroned} pçs
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(l.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold border flex items-center gap-2.5 ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Formulário de Lançamento de Produção */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-2">
          Lançar Peças Passadas
        </h2>

        <form onSubmit={handleIroningSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Número da OS / Bipagem QR Code
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500">
                <span className="inline-flex items-center px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-sm select-none border-r border-slate-300 dark:border-slate-600">
                  OS-
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0001"
                  value={osNumberOnly}
                  onChange={e => {
                    const val = e.target.value.replace(/^OS-/i, '');
                    setOsNumberOnly(val);
                  }}
                  className="w-full px-3 py-2.5 bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                title="Abrir Leitor de QR Code"
              >
                <QrCode className="w-4 h-4" />
                Bipar
              </button>
            </div>
          </div>

          {/* Resumo da OS ativa */}
          {activeOrder ? (() => {
            const alreadyLaunched = !isAdmin && activeOrder.ironingLogs.some(
              log => log.passadorId === activePassador?.id
            );
            return (
              <div className={`p-3.5 rounded-xl border space-y-2 text-xs transition-colors ${
                alreadyLaunched
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-600/60'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm font-bold">
                      {activeOrder.osNumber}
                    </strong>
                    {alreadyLaunched && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        Você já lançou nesta OS
                      </span>
                    )}
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px] font-medium text-right">
                    {activeOrder.clientName}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 font-mono">
                  <span>Total Estimado do Pedido:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{activeOrder.estimatedPieceCount} pçs</strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-mono">
                  <span>Total Já Passado:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{activeOrder.totalIronedPieces} pçs</strong>
                </div>

                {/* Barra de progresso */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-600 h-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((activeOrder.totalIronedPieces / (activeOrder.estimatedPieceCount || 1)) * 100))}%` }}
                  ></div>
                </div>

                {/* Alerta de divergência se exceder */}
                {activeOrder.totalIronedPieces > activeOrder.estimatedPieceCount && (
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>
                      Atenção: Total passado ({activeOrder.totalIronedPieces}) excede o estimado ({activeOrder.estimatedPieceCount}). Conferir peças fisicamente!
                    </span>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 rounded-xl text-xs border border-slate-200 dark:border-slate-800 text-center">
              Digite uma OS válida acima ou bipe o QR Code.
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Quantidade de Peças Passadas Agora
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="1000"
              placeholder="0"
              value={piecesIronedInput}
              onChange={e => {
                // Remove leading zeros: ao digitar, mantém apenas o valor numérico limpo
                const raw = e.target.value.replace(/^0+(?=\d)/, '');
                setPiecesIronedInput(raw);
              }}
              onFocus={e => {
                // Seleciona o conteúdo ao focar para facilitar a substituição
                if (piecesIronedInput === '0') setPiecesIronedInput('');
                e.target.select();
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {/* Botões rápidos */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[5, 10, 25, 50].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPiecesIronedInput(String(val))}
                  className="py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold rounded-lg transition-colors"
                >
                  +{val} pçs
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <span>Confirmar Lançamento de Produção</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
