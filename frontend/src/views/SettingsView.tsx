import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  MessageSquare, 
  Database, 
  Calendar, 
  Clock, 
  Smartphone, 
  Download, 
  Trash2, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Package, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Check, 
  X,
  Radio,
  Copy
} from 'lucide-react';
import { SystemSettings, BackupFile, WhatsAppStatus } from '../types';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'reports' | 'backups'>('whatsapp');
  
  // Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'default',
    whatsappInstanceName: 'sysmauad',
    whatsappTargetPhone: '',
    autoReportsEnabled: true,
    reportFrequency: 'diario',
    reportSendTime: '18:00',
    reportDayOfWeek: 1,
    reportDayOfMonth: 1,
    selectedReports: ['producao', 'passadoria', 'financeiro', 'estoque'],
    reportHeaderText: '👔 *SYSMAUAD - Relatório Gerencial Automatizado*',
    reportFooterText: 'Mauad Lavanderia • Sistema de Gestão Industrial',
    includeFinancialValues: true,
    includeLowStockAlerts: true,
    includeOperatorBreakdown: true,
    autoBackupEnabled: true,
    backupRetentionDays: 3,
    backupTime: '02:00',
    defaultPassadorRate: 0.15,
    stalledOrderAlertDays: 3
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // WhatsApp State
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus>({
    instanceName: 'sysmauad',
    state: 'close',
    connected: false
  });
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste enviada pelo Sysmauad Lavanderia.');
  const [sendingTestMsg, setSendingTestMsg] = useState(false);

  // Backups State
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [generatingBackup, setGeneratingBackup] = useState(false);

  // Report Test State
  const [testingReport, setTestingReport] = useState(false);
  const [reportPreview, setReportPreview] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Carrega configurações iniciais do backend
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.whatsappTargetPhone && !testPhone) {
          setTestPhone(data.whatsappTargetPhone);
        }
      }
    } catch (err) {
      console.error('[SettingsView] Erro ao carregar configurações:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Carrega status da conexão WhatsApp
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data: WhatsAppStatus = await res.json();
        setWhatsAppStatus(data);
        if (data.connected) {
          setQrCodeBase64(null);
        }
      }
    } catch (err) {
      console.error('[SettingsView] Erro ao verificar status do WhatsApp:', err);
    }
  };

  // Busca ou atualiza o QR Code do WhatsApp
  const fetchQRCode = async () => {
    setLoadingQR(true);
    try {
      const res = await fetch('/api/whatsapp/qrcode');
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setWhatsAppStatus(prev => ({ ...prev, connected: true, state: 'open' }));
          setQrCodeBase64(null);
          showToast('success', 'WhatsApp já está conectado com sucesso!');
        } else if (data.qrcode) {
          setQrCodeBase64(data.qrcode);
          setWhatsAppStatus(prev => ({ ...prev, connected: false, state: 'connecting' }));
        }
      }
    } catch (err) {
      showToast('error', 'Falha ao buscar QR Code da Evolution API.');
    } finally {
      setLoadingQR(false);
    }
  };

  // Desconecta o WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('Deseja realmente desconectar a sessão do WhatsApp? Será necessário ler o QR Code novamente para reconectar.')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        setWhatsAppStatus({ instanceName: 'sysmauad', state: 'close', connected: false });
        setQrCodeBase64(null);
        showToast('info', 'WhatsApp desconectado com sucesso.');
      } else {
        showToast('error', 'Erro ao desconectar WhatsApp.');
      }
    } catch (err) {
      showToast('error', 'Erro ao comunicar com o servidor.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Envia mensagem de teste avulsa
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      showToast('error', 'Informe o número e o texto da mensagem.');
      return;
    }

    setSendingTestMsg(true);
    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: testPhone, text: testMessage })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Mensagem enviada com sucesso pelo WhatsApp!');
      } else {
        showToast('error', data.error || 'Erro ao enviar mensagem via WhatsApp.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro de conexão.');
    } finally {
      setSendingTestMsg(false);
    }
  };

  // Salva configurações gerais (Automação / Backups)
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
        showToast('success', 'Parâmetros de configuração salvos com sucesso!');
      } else {
        showToast('error', 'Erro ao salvar configurações.');
      }
    } catch (err) {
      showToast('error', 'Erro de comunicação com o servidor.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Testar envio de relatório gerencial via WhatsApp
  const handleSendTestReport = async () => {
    if (!settings.whatsappTargetPhone.trim()) {
      showToast('error', 'Cadastre o número do WhatsApp de destino antes de testar.');
      return;
    }

    setTestingReport(true);
    try {
      const res = await fetch('/api/whatsapp/send-test-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: settings.whatsappTargetPhone })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Relatório enviado com sucesso!');
        if (data.preview) setReportPreview(data.preview);
      } else {
        showToast('error', data.error || 'Falha ao disparar relatório.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro de rede.');
    } finally {
      setTestingReport(false);
    }
  };

  // Carrega lista de backups
  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const list = await res.json();
        setBackups(list);
      }
    } catch (err) {
      console.error('[SettingsView] Erro ao carregar backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Gerar backup manual imediato
  const handleGenerateBackup = async () => {
    setGeneratingBackup(true);
    try {
      const res = await fetch('/api/backups/generate', { method: 'POST' });
      if (res.ok) {
        showToast('success', 'Novo backup gerado com sucesso!');
        await fetchBackups();
      } else {
        showToast('error', 'Erro ao gerar backup.');
      }
    } catch (err) {
      showToast('error', 'Erro ao comunicar com o servidor.');
    } finally {
      setGeneratingBackup(false);
    }
  };

  // Excluir backup
  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Deseja realmente apagar o arquivo de backup "${filename}"?`)) return;
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('info', 'Backup excluído com sucesso.');
        setBackups(prev => prev.filter(b => b.filename !== filename));
      } else {
        showToast('error', 'Erro ao excluir backup.');
      }
    } catch (err) {
      showToast('error', 'Erro de rede.');
    }
  };

  // Efeito para carregar dados iniciais
  useEffect(() => {
    fetchSettings();
    fetchWhatsAppStatus();
    fetchBackups();
  }, []);

  // Polling para status do WhatsApp se estiver desconectado e na aba whatsapp
  useEffect(() => {
    if (activeTab !== 'whatsapp') return;
    const interval = setInterval(() => {
      fetchWhatsAppStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, whatsAppStatus.connected]);

  // Alterna itens de relatório selecionados
  const toggleReportItem = (itemKey: string) => {
    setSettings(prev => {
      const current = prev.selectedReports || [];
      const updated = current.includes(itemKey)
        ? current.filter(k => k !== itemKey)
        : [...current, itemKey];
      return { ...prev, selectedReports: updated };
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Configurações do Sistema
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Parâmetros de automação, integração WhatsApp (Evolution API) e backups da base de dados
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={savingSettings}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{savingSettings ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
            : toast.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Radio className="w-4 h-4 text-sky-500 shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp & QR Code</span>
          {whatsAppStatus.connected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Conectado" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Desconectado" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Automação de Relatórios</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'backups'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Gestão de Backups</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 font-mono">
            {backups.length}
          </span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 1: WHATSAPP & EVOLUTION API */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Card Esquerdo: Status & Pareamento QR Code */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-500" />
                    Conexão do Aparelho (Evolution API)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Instância ativa: <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{settings.whatsappInstanceName}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                    whatsAppStatus.connected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${whatsAppStatus.connected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                    {whatsAppStatus.connected ? 'WhatsApp Conectado' : 'Aguardando Pareamento'}
                  </span>

                  <button
                    onClick={fetchWhatsAppStatus}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Atualizar Status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Conectado */}
              {whatsAppStatus.connected ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
                      Dispositivo Pareado e Pronto para Disparos!
                    </h3>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 max-w-md mx-auto mt-1">
                      O sistema está conectado ao WhatsApp via Evolution API. Os avisos de pedidos prontos aos clientes e os relatórios automáticos estão ativos.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                    >
                      {disconnecting ? 'Desconectando...' : 'Desconectar Dispositivo'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Bloco de Pareamento / QR Code */
                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 font-medium">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Como conectar seu WhatsApp:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Abra o WhatsApp no seu smartphone corporativo.</li>
                      <li>Toque no menu (três pontinhos ou Ajustes) &gt; <strong>Aparelhos conectados</strong>.</li>
                      <li>Toque no botão <strong>Conectar um aparelho</strong>.</li>
                      <li>Aponte a câmera para o QR Code abaixo para sincronizar.</li>
                    </ol>
                  </div>

                  {/* Visual QR Code Display */}
                  <div className="text-center py-4 space-y-4">
                    {qrCodeBase64 ? (
                      <div className="inline-block p-4 bg-white dark:bg-slate-950 rounded-2xl border-2 border-emerald-500 shadow-xl">
                        <img 
                          src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} 
                          alt="QR Code WhatsApp" 
                          className="w-64 h-64 mx-auto object-contain rounded-lg"
                        />
                        <p className="text-[11px] font-mono text-slate-500 mt-2">
                          Atualizando status automaticamente...
                        </p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 max-w-sm mx-auto space-y-3">
                        <Smartphone className="w-12 h-12 text-slate-400 mx-auto animate-bounce" />
                        <p className="text-xs text-slate-500">
                          Clique no botão abaixo para gerar o código QR de pareamento.
                        </p>
                      </div>
                    )}

                    <div>
                      <button
                        onClick={fetchQRCode}
                        disabled={loadingQR}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-colors inline-flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingQR ? 'animate-spin' : ''}`} />
                        <span>{loadingQR ? 'Carregando QR Code...' : qrCodeBase64 ? 'Atualizar QR Code' : 'Gerar QR Code Agora'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Direito: Teste Imediato de Disparo de Mensagem */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Send className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Teste de Disparo Instantâneo
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Envie uma mensagem avulsa para testar se a Evolution API está entregando as notificações normalmente.
              </p>

              <form onSubmit={handleSendTestMessage} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Número com DDD:
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    placeholder="Ex: 81999999999"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Texto da Mensagem:
                  </label>
                  <textarea
                    rows={4}
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-sans text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingTestMsg || !whatsAppStatus.connected}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingTestMsg ? 'Enviando...' : 'Enviar Mensagem de Teste'}</span>
                </button>

                {!whatsAppStatus.connected && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium">
                    ⚠️ Conecte o WhatsApp com o QR Code para habilitar o envio.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 2: AUTOMAÇÃO DE RELATÓRIOS VIA WHATSAPP */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
          {/* Coluna de Configuração dos Relatórios */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Card 1: Destinatário & Frequência */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    Parâmetros de Disparo dos Relatórios
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.autoReportsEnabled}
                      onChange={e => setSettings({ ...settings, autoReportsEnabled: e.target.checked })}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Automação Ativa
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Telefone Destino */}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Número do WhatsApp para Recebimento:
                    </label>
                    <input
                      type="text"
                      value={settings.whatsappTargetPhone}
                      onChange={e => setSettings({ ...settings, whatsappTargetPhone: e.target.value })}
                      placeholder="Ex: 81999999999 ou (81) 98888-7777"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      O sistema enviará o resumo executivo automatizado para este número.
                    </span>
                  </div>

                  {/* Frequência */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Periodicidade / Frequência:
                    </label>
                    <select
                      value={settings.reportFrequency}
                      onChange={e => setSettings({ ...settings, reportFrequency: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="diario">Diário (Todos os dias)</option>
                      <option value="semanal">Semanal (1 vez por semana)</option>
                      <option value="mensal">Mensal (1 vez por mês)</option>
                    </select>
                  </div>

                  {/* Horário */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Horário do Disparo (Horário de Brasília):
                    </label>
                    <input
                      type="time"
                      value={settings.reportSendTime}
                      onChange={e => setSettings({ ...settings, reportSendTime: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  {/* Dia da Semana (se Semanal) */}
                  {settings.reportFrequency === 'semanal' && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Dia da Semana:
                      </label>
                      <select
                        value={settings.reportDayOfWeek}
                        onChange={e => setSettings({ ...settings, reportDayOfWeek: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                      >
                        <option value={1}>Segunda-feira</option>
                        <option value={2}>Terça-feira</option>
                        <option value={3}>Quarta-feira</option>
                        <option value={4}>Quinta-feira</option>
                        <option value={5}>Sexta-feira</option>
                        <option value={6}>Sábado</option>
                        <option value={0}>Domingo</option>
                      </select>
                    </div>
                  )}

                  {/* Dia do Mês (se Mensal) */}
                  {settings.reportFrequency === 'mensal' && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Dia do Mês:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={settings.reportDayOfMonth}
                        onChange={e => setSettings({ ...settings, reportDayOfMonth: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Seleção de quais Relatórios Compor */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Layers className="w-4 h-4 text-sky-500" />
                  Módulos e Relatórios a Incluir na Mensagem:
                </h3>
                <p className="text-xs text-slate-500">
                  Marque os relatórios operacionais que a automação deve extrair e consolidar no envio do WhatsApp.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Produção */}
                  <label 
                    onClick={() => toggleReportItem('producao')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      settings.selectedReports?.includes('producao')
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-950 dark:text-sky-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.selectedReports?.includes('producao')}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <div>
                      <span className="font-bold text-xs block">Produção & Lavados</span>
                      <span className="text-[11px] opacity-75 block">Total de pedidos, status (Em Andamento, Prontos), Kg e peças totais.</span>
                    </div>
                  </label>

                  {/* Passadoria */}
                  <label 
                    onClick={() => toggleReportItem('passadoria')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      settings.selectedReports?.includes('passadoria')
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-950 dark:text-sky-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.selectedReports?.includes('passadoria')}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <div>
                      <span className="font-bold text-xs block">Passadoria & Acabamento</span>
                      <span className="text-[11px] opacity-75 block">Total de peças passadas e discriminação por cada operador passador.</span>
                    </div>
                  </label>

                  {/* Financeiro */}
                  <label 
                    onClick={() => toggleReportItem('financeiro')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      settings.selectedReports?.includes('financeiro')
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-950 dark:text-sky-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.selectedReports?.includes('financeiro')}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <div>
                      <span className="font-bold text-xs block">Financeiro & Caixa</span>
                      <span className="text-[11px] opacity-75 block">Faturamento do período, total recebido, total em aberto e ticket médio.</span>
                    </div>
                  </label>

                  {/* Estoque */}
                  <label 
                    onClick={() => toggleReportItem('estoque')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      settings.selectedReports?.includes('estoque')
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-950 dark:text-sky-200'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.selectedReports?.includes('estoque')}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <div>
                      <span className="font-bold text-xs block">Estoque de Insumos</span>
                      <span className="text-[11px] opacity-75 block">Alerta prioritário de produtos químicos abaixo da margem mínima de segurança.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 3: Customizações de Texto & Cabeçalho/Rodapé */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Sliders className="w-4 h-4 text-sky-500" />
                  Campos para Customização do Relatório:
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Cabeçalho da Mensagem (Suporta formatação do WhatsApp *negrito*, _itálico_):
                    </label>
                    <input
                      type="text"
                      value={settings.reportHeaderText}
                      onChange={e => setSettings({ ...settings, reportHeaderText: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-sans text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Rodapé da Mensagem:
                    </label>
                    <input
                      type="text"
                      value={settings.reportFooterText}
                      onChange={e => setSettings({ ...settings, reportFooterText: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-sans text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeFinancialValues}
                        onChange={e => setSettings({ ...settings, includeFinancialValues: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Exibir valores em R$</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeLowStockAlerts}
                        onChange={e => setSettings({ ...settings, includeLowStockAlerts: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Alertas de Estoque</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.includeOperatorBreakdown}
                        onChange={e => setSettings({ ...settings, includeOperatorBreakdown: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Detalhar por Passador</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Valor Padrão por Peça Passada (Passadoria):
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={settings.defaultPassadorRate ?? 0.15}
                        onChange={e => setSettings({ ...settings, defaultPassadorRate: parseFloat(e.target.value) || 0.15 })}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        placeholder="0.15"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Valor monetário unitário utilizado para apurar o total a pagar da produção de passadoria em relatórios.
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Alerta de O.S. Parada (Dias sem movimentação):
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={settings.stalledOrderAlertDays ?? 3}
                        onChange={e => setSettings({ ...settings, stalledOrderAlertDays: parseInt(e.target.value) || 3 })}
                        className="w-full pl-3 pr-12 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                        placeholder="3"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">DIAS</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Ordens de serviço não entregues que ficarem sem atualização por este número de dias receberão destaque e alerta visual de OS Parada no painel e na listagem.
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingSettings ? 'Salvando...' : 'Salvar Parâmetros de Automação'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Coluna Direita: Prévia do WhatsApp & Disparo de Teste */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Prévia do Relatório no WhatsApp
                  </h3>
                </div>
                <button
                  onClick={handleSendTestReport}
                  disabled={testingReport || !whatsAppStatus.connected}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  title="Disparar relatório agora para o número configurado"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testingReport ? 'Enviando...' : 'Testar Envio Agora'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Veja abaixo como a mensagem chegará formatada no WhatsApp corporativo:
              </p>

              {/* WhatsApp Balloon Mockup */}
              <div className="bg-[#0b141a] p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 space-y-2 max-h-[480px] overflow-y-auto shadow-inner leading-relaxed select-text">
                <div className="bg-[#1f2c34] p-3.5 rounded-xl rounded-tl-none border border-[#2a3942] space-y-2 whitespace-pre-wrap">
                  {reportPreview ? (
                    <div>{reportPreview}</div>
                  ) : (
                    <div>
                      {settings.reportHeaderText || '👔 *SYSMAUAD - Relatório Gerencial Automatizado*'}
                      {'\n'}📅 *Período:* {settings.reportFrequency === 'semanal' ? 'Semanal' : settings.reportFrequency === 'mensal' ? 'Mensal' : 'Diário'} • {new Date().toLocaleDateString('pt-BR')} às {settings.reportSendTime}
                      {settings.selectedReports?.includes('producao') && (
                        <>
                          {'\n\n'}📦 *PRODUÇÃO E LAVADOS*
                          {'\n'}• Total de Pedidos Registrados: *4*
                          {'\n'}• Em Andamento: *2* | Recebidos: *1*
                          {'\n'}• Prontos: *1* | Entregues: *0*
                          {'\n'}• Carga Total Processada: *180.5 Kg*
                          {'\n'}• Volume Total Estimado: *610 peças*
                        </>
                      )}
                      {settings.selectedReports?.includes('passadoria') && (
                        <>
                          {'\n\n'}✨ *PASSADORIA & ACABAMENTO*
                          {'\n'}• Total de Peças Passadas: *150 peças*
                          {settings.includeOperatorBreakdown && (
                            <>
                              {'\n'}• Detalhado por Passador:
                              {'\n'}   └ Passador Teste: *150* peças
                            </>
                          )}
                        </>
                      )}
                      {settings.selectedReports?.includes('financeiro') && settings.includeFinancialValues && (
                        <>
                          {'\n\n'}💰 *FINANCEIRO / CAIXA*
                          {'\n'}• Faturamento Total: *R$ 2.450,00*
                          {'\n'}• Recebido (Pago): *R$ 1.800,00*
                          {'\n'}• A Receber (Em Aberto): *R$ 650,00*
                          {'\n'}• Ticket Médio: *R$ 612,50*
                        </>
                      )}
                      {settings.selectedReports?.includes('estoque') && (
                        <>
                          {'\n\n'}🧪 *ESTOQUE DE INSUMOS QUÍMICOS*
                          {'\n'}• Itens Cadastrados: *12 produtos*
                          {settings.includeLowStockAlerts && (
                            <>
                              {'\n'}• ✅ Todos os insumos estão acima da margem mínima.
                            </>
                          )}
                        </>
                      )}
                      {'\n\n'}─────────────────────
                      {'\n'}{settings.reportFooterText || 'Mauad Lavanderia • Sistema de Gestão Industrial'}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 text-right pr-1">
                  Enviado via Sysmauad Bot • {settings.reportSendTime}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ABA 3: GESTÃO E DOWNLOAD DE BACKUPS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'backups' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Card de Configuração do Backup Automático */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-500" />
                  Política de Backup Diário & Retenção
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Geração automática programada com exclusão dos backups anteriores para economia de espaço.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateBackup}
                  disabled={generatingBackup}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  <Download className={`w-4 h-4 ${generatingBackup ? 'animate-bounce' : ''}`} />
                  <span>{generatingBackup ? 'Gerando Backup...' : 'Gerar Backup Agora'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
              <label className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoBackupEnabled}
                  onChange={e => setSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Backup Diário Ativo</span>
                  <span className="text-[11px] text-slate-500 block">Gera cópia completa todos os dias</span>
                </div>
              </label>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Horário do Backup Automático:
                </label>
                <input
                  type="time"
                  value={settings.backupTime}
                  onChange={e => setSettings({ ...settings, backupTime: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Política de Retenção (Dias):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.backupRetentionDays}
                    onChange={e => setSettings({ ...settings, backupRetentionDays: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-500 shrink-0">dias</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Mantém os últimos 3 dias e apaga automaticamente arquivos anteriores.
                </span>
              </div>
            </form>
          </div>

          {/* Tabela de Backups Disponíveis para Download */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Backups Disponíveis no Servidor ({backups.length})
                </h3>
              </div>
              <button
                onClick={fetchBackups}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Lista
              </button>
            </div>

            {loadingBackups ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Carregando arquivos de backup...
              </div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Database className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs text-slate-500">
                  Nenhum arquivo de backup gerado até o momento.
                </p>
                <button
                  onClick={handleGenerateBackup}
                  disabled={generatingBackup}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
                >
                  Gerar Primeiro Backup Agora
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Nome do Arquivo</th>
                      <th className="p-3.5">Data e Hora de Geração</th>
                      <th className="p-3.5">Tamanho</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {backups.map(b => (
                      <tr key={b.filename} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                          {b.filename}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">
                          {new Date(b.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                          {b.sizeFormatted}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          {/* Botão Baixar Backup */}
                          <a
                            href={b.downloadUrl}
                            download={b.filename}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                            title="Baixar arquivo de backup no seu computador"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar Backup</span>
                          </a>

                          {/* Botão Excluir */}
                          <button
                            onClick={() => handleDeleteBackup(b.filename)}
                            className="inline-flex items-center p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir este arquivo de backup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
