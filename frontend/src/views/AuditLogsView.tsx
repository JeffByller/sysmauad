import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuditLog, AuditStats } from '../types';
import {
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Search,
  Trash2,
  Download,
  Filter,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  User,
  Globe,
  Activity,
  Layers
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Filtros
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Modal de Detalhes
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedDetail, setCopiedDetail] = useState<boolean>(false);

  // Modal de Limpeza
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState<string | null>(null);

  // Busca logs e estatísticas da API
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const queryParams = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset)
      });

      if (selectedLevel !== 'all') queryParams.append('level', selectedLevel);
      if (selectedCategory !== 'all') queryParams.append('category', selectedCategory);
      if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());

      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/audit/logs?${queryParams.toString()}`),
        fetch('/api/audit/stats')
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('[AuditView] Falha ao carregar logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedLevel, selectedCategory, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh a cada 15 segundos se ativado
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Executa purga de logs antigos
  const handlePurgeLogs = async () => {
    setIsPurging(true);
    setPurgeSuccessMsg(null);
    try {
      const res = await fetch(`/api/audit/logs?retentionDays=${retentionDays}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeSuccessMsg(data.message || 'Logs limpos com sucesso.');
        setTimeout(() => {
          setIsPurgeModalOpen(false);
          setPurgeSuccessMsg(null);
          fetchLogs();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Erro ao purgar logs:', err);
    } finally {
      setIsPurging(false);
    }
  };

  // Exportar logs como JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sysmauad-auditoria-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copiar detalhes do log para a área de transferência
  const handleCopyLogDetails = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopiedDetail(true);
    setTimeout(() => setCopiedDetail(false), 2000);
  };

  // Helper de badges visuais por nível
  const renderLevelBadge = (level: string) => {
    switch (level) {
      case 'security':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            Segurança
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertCircle className="w-3 h-3 text-red-500" />
            Erro
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Alerta
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Info className="w-3 h-3 text-sky-400" />
            Info
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Proteção: apenas Super Admin pode visualizar
  const isAuthorized = user?.id === 'super-admin-root' || user?.role === 'admin';
  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-900/30 border border-red-700/50 rounded-2xl flex items-center justify-center mx-auto text-red-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito ao Super Administrador</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          O módulo de logs de auditoria e segurança contém dados confidenciais do sistema e é restrito exclusivamente ao perfil Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-sky-950 border border-sky-700/50 rounded-xl flex items-center justify-center text-sky-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Auditoria & Logs do Sistema
              </h1>
              <p className="text-xs text-slate-400">
                Rastreabilidade de processos, ações por usuário e proteção contra intrusões & força bruta
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              autoRefresh 
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-sm' 
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Atualizar automaticamente a cada 15 segundos"
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{autoRefresh ? 'Ao Vivo (15s)' : 'Ao Vivo: Off'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Recarregar logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Exportar logs em JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Purge Logs */}
          <button
            onClick={() => setIsPurgeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold transition-colors"
            title="Limpar logs antigos para economia de espaço"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpeza</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total de Registros</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats?.total ?? totalCount}</span>
            <span className="text-[10px] text-slate-400">eventos</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            Armazenamento leve & indexado
          </span>
        </div>

        {/* Security Alerts / Brute Force */}
        <div className={`rounded-2xl p-4 flex flex-col justify-between border ${
          (stats?.security ?? 0) > 0 
            ? 'bg-rose-950/30 border-rose-800/80 shadow-rose-950/30 shadow-lg' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Ameaças & Força Bruta</span>
            <ShieldAlert className={`w-4 h-4 ${(stats?.security ?? 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${(stats?.security ?? 0) > 0 ? 'text-rose-400' : 'text-white'}`}>
              {stats?.security ?? 0}
            </span>
            <span className="text-[10px] text-slate-400">bloqueios</span>
          </div>
          <span className="text-[10px] text-rose-300 mt-2 font-medium">
            {stats?.securityToday ?? 0} tentativas hoje
          </span>
        </div>

        {/* Process Errors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Erros de Processos</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-400 font-mono">{stats?.errors ?? 0}</span>
            <span className="text-[10px] text-slate-400">falhas</span>
          </div>
          <span className="text-[10px] text-red-300 mt-2 font-medium">
            {stats?.errorsToday ?? 0} erros hoje
          </span>
        </div>

        {/* Operational Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Ações de Usuários</span>
            <User className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats?.info ?? 0}</span>
            <span className="text-[10px] text-slate-400">ações rastreadas</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 font-medium">
            {stats?.warnings ?? 0} alertas registrados
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Level Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => { setSelectedLevel('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedLevel === 'all' 
                  ? 'bg-sky-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setSelectedLevel('security'); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedLevel === 'security' 
                  ? 'bg-rose-700 text-white shadow-sm' 
                  : 'bg-slate-800 text-rose-400 hover:bg-rose-950/40'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Segurança ({stats?.security ?? 0})</span>
            </button>
            <button
              onClick={() => { setSelectedLevel('error'); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedLevel === 'error' 
                  ? 'bg-red-700 text-white shadow-sm' 
                  : 'bg-slate-800 text-red-400 hover:bg-red-950/40'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Erros ({stats?.errors ?? 0})</span>
            </button>
            <button
              onClick={() => { setSelectedLevel('warn'); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedLevel === 'warn' 
                  ? 'bg-amber-700 text-white shadow-sm' 
                  : 'bg-slate-800 text-amber-400 hover:bg-amber-950/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alertas</span>
            </button>
            <button
              onClick={() => { setSelectedLevel('info'); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedLevel === 'info' 
                  ? 'bg-sky-700 text-white shadow-sm' 
                  : 'bg-slate-800 text-sky-400 hover:bg-sky-950/40'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info</span>
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-auto"
            >
              <option value="all">Todas as Categorias</option>
              <option value="auth">Autenticação do Sistema</option>
              <option value="client_portal">Central do Assinante</option>
              <option value="security">Segurança & Força Bruta</option>
              <option value="orders">Ordens de Serviço (OS)</option>
              <option value="stock">Estoque Químico</option>
              <option value="finance">Financeiro / Caixa</option>
              <option value="users">Gestão de Usuários</option>
              <option value="system">Sistema & Automação</option>
              <option value="api">API / Backend</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Filtrar por ação, operador, IP ou conteúdo dos detalhes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-3">Nível</th>
                <th className="py-3 px-3">Usuário / Origem</th>
                <th className="py-3 px-3">Categoria & Ação</th>
                <th className="py-3 px-4">Resumo dos Detalhes</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-sm text-slate-300">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou verifique se há ações recentes.</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const dateFormatted = new Date(log.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-slate-800/50 transition-colors ${
                        log.level === 'security' ? 'bg-rose-950/10' : log.level === 'error' ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderLevelBadge(log.level)}
                      </td>

                      {/* User & IP */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-200 truncate max-w-[140px]">
                          {log.userName || 'Sistema / Anônimo'}
                        </div>
                        {log.ipAddress && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                            <Globe className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                            <span>{log.ipAddress.replace(/^::ffff:/, '')}</span>
                          </div>
                        )}
                      </td>

                      {/* Category & Action */}
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono mr-1.5">
                          {log.category}
                        </span>
                        <span className="font-medium text-slate-200">
                          {log.action}
                        </span>
                      </td>

                      {/* Details Summary */}
                      <td className="py-3 px-4">
                        <p className="text-slate-300 truncate max-w-[300px] text-[11px]">
                          {log.details?.reason || log.details?.message || log.details?.process || JSON.stringify(log.details)}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="Inspecionar detalhes completos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-slate-800 px-4 py-3 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Mostrando <strong>{logs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> a{' '}
            <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> de <strong>{totalCount}</strong> logs
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 font-semibold"
            >
              Anterior
            </button>
            <span className="px-3 font-mono text-slate-300 font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 font-semibold"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: DETALHES COMPLETOS DO LOG */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {renderLevelBadge(selectedLog.level)}
                <h3 className="text-base font-bold text-white font-mono">
                  {selectedLog.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">ID do Log</span>
                <span className="font-mono text-slate-200">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Horário</span>
                <span className="font-mono text-slate-200">
                  {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Usuário / Operador</span>
                <span className="text-white font-semibold">{selectedLog.userName || 'Sistema / Anônimo'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Endereço IP</span>
                <span className="font-mono text-slate-200">{selectedLog.ipAddress || 'Não registrado'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">User-Agent / Navegador</span>
                <span className="text-[11px] text-slate-400 font-mono break-all">{selectedLog.userAgent || 'Não informado'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Conteúdo Estruturado (JSON)
                </span>
                <button
                  onClick={handleCopyLogDetails}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold"
                >
                  {copiedDetail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDetail ? 'Copiado!' : 'Copiar Tudo'}</span>
                </button>
              </div>
              <div className="flex-1 bg-black/60 border border-slate-800 rounded-xl p-3.5 overflow-auto text-xs font-mono text-slate-200 max-h-64">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIMPEZA DE LOGS ANTIGOS */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Limpeza de Logs Antigos</h3>
                <p className="text-xs text-slate-400">Política de retenção de armazenamento</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Para otimizar o armazenamento do servidor e manter consultas rápidas, você pode purgar registros anteriores a um determinado período.
            </p>

            {purgeSuccessMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs font-semibold text-emerald-300">
                {purgeSuccessMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Excluir registros mais antigos que:
              </label>
              <select
                value={retentionDays}
                onChange={e => setRetentionDays(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value={7}>Mais antigos que 7 dias</option>
                <option value={15}>Mais antigos que 15 dias</option>
                <option value={30}>Mais antigos que 30 dias (Recomendado)</option>
                <option value={60}>Mais antigos que 60 dias</option>
                <option value={90}>Mais antigos que 90 dias</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                disabled={isPurging}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePurgeLogs}
                disabled={isPurging}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Limpeza</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
