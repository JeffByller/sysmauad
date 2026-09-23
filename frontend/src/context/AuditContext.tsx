import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { 
  AlertCircle, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Clock
} from 'lucide-react';

export type NotificationLevel = 'error' | 'security' | 'warn' | 'info';

export interface AuditNotification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  details?: any;
  timestamp: string;
  createdAt: number;
}

interface AuditContextType {
  notifications: AuditNotification[];
  notifyError: (processName: string, error: any, category?: string) => void;
  notifySecurity: (title: string, message: string, details?: any) => void;
  notifyWarning: (title: string, message: string, details?: any) => void;
  notifySuccess: (title: string, message: string) => void;
  logUserAction: (action: string, category: string, details?: any) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

// Tempo de inatividade permitido (30 minutos)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<AuditNotification[]>([]);
  const userRef = useRef(user);
  userRef.current = user;

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Envio centralizado de logs para o backend
  const sendLogToBackend = useCallback((logData: {
    level: NotificationLevel;
    category: string;
    action: string;
    details?: any;
  }) => {
    const currentUser = userRef.current;
    fetch('/api/audit/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: logData.level,
        category: logData.category,
        action: logData.action,
        details: logData.details,
        userId: currentUser?.id,
        userName: currentUser?.name
      })
    }).catch(err => {
      console.warn('[AuditService] Não foi possível persistir log no servidor:', err);
    });
  }, []);

  // 1. Notificação de Erro em Processo (Bottom-Right Toast + Gravação em Banco)
  const notifyError = useCallback((processName: string, error: any, category = 'system') => {
    const errorMsg = error?.message || (typeof error === 'string' ? error : 'Ocorreu uma falha inesperada na operação.');
    const newNotif: AuditNotification = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      level: 'error',
      title: `Erro no Processo: ${processName}`,
      message: errorMsg,
      details: error?.stack || error,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      createdAt: Date.now()
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    // Grava no log de auditoria do banco de dados
    sendLogToBackend({
      level: 'error',
      category,
      action: `process_error_${processName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      details: {
        process: processName,
        message: errorMsg,
        stack: error?.stack ? String(error.stack).slice(0, 800) : undefined
      }
    });
  }, [sendLogToBackend]);

  // 2. Notificação de Alerta de Segurança (Força Bruta / Tentativas de Invasão / 429)
  const notifySecurity = useCallback((title: string, message: string, details?: any) => {
    const newNotif: AuditNotification = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      level: 'security',
      title: `Alerta de Segurança: ${title}`,
      message,
      details,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      createdAt: Date.now()
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    sendLogToBackend({
      level: 'security',
      category: 'security',
      action: `security_alert_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      details: {
        title,
        message,
        ...details
      }
    });
  }, [sendLogToBackend]);

  // 3. Notificação de Aviso
  const notifyWarning = useCallback((title: string, message: string, details?: any) => {
    const newNotif: AuditNotification = {
      id: `warn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      level: 'warn',
      title,
      message,
      details,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      createdAt: Date.now()
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);

    sendLogToBackend({
      level: 'warn',
      category: 'system',
      action: `warning_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      details: { title, message, ...details }
    });
  }, [sendLogToBackend]);

  // 4. Notificação de Sucesso Rápido
  const notifySuccess = useCallback((title: string, message: string) => {
    const newNotif: AuditNotification = {
      id: `suc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      level: 'info',
      title,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      createdAt: Date.now()
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
  }, []);

  // 5. Rastreamento de Ações do Usuário (Para o Super Admin auditar quem faz o que)
  const logUserAction = useCallback((action: string, category: string, details?: any) => {
    sendLogToBackend({
      level: 'info',
      category,
      action,
      details
    });
  }, [sendLogToBackend]);

  // Auto-dismiss para notificações após 10 segundos (exceto alertas de segurança críticos)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => 
        prev.filter(n => n.level === 'security' ? (now - n.createdAt < 20000) : (now - n.createdAt < 10000))
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Interceptor global de requisições fetch para capturar 429 (Rate limit / Brute force) e 500 (Erros de servidor)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Se for erro de rate limit ou força bruta
        if (response.status === 429) {
          const clone = response.clone();
          clone.json().then(data => {
            notifySecurity(
              'Acesso Bloqueado Temporariamente',
              data.message || 'Múltiplas requisições ou tentativas incorretas foram detectadas.',
              { status: 429, retryAfter: data.retryAfterSeconds }
            );
          }).catch(() => {
            notifySecurity(
              'Acesso Temporariamente Suspenso',
              'Limite de requisições excedido. Ação bloqueada por segurança.',
              { status: 429 }
            );
          });
        } else if (response.status >= 500) {
          // Erro interno de processo no servidor
          const clone = response.clone();
          clone.json().then(data => {
            notifyError(
              'Comunicação com Servidor',
              data.message || 'O servidor retornou uma falha ao processar a requisição.',
              'api'
            );
          }).catch(() => {
            notifyError(
              'Comunicação com Servidor',
              'O servidor retornou erro interno (HTTP 500).',
              'api'
            );
          });
        }

        return response;
      } catch (err: any) {
        // Falha de rede ou conexão recusada
        notifyError('Conexão de Rede', err, 'network');
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [notifyError, notifySecurity]);

  // Captura de erros globais não tratados no frontend (Window onerror & unhandledrejection)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Global Error]', event.error || event.message);
      notifyError(
        'Execução da Interface',
        event.error || event.message,
        'frontend'
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', event.reason);
      notifyError(
        'Processo Assíncrono',
        event.reason,
        'frontend'
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [notifyError]);

  // Timeout de Sessão por Inatividade (30 minutos)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      if (userRef.current) {
        timeoutId = setTimeout(() => {
          // Sessão expirou
          notifySecurity(
            'Sessão Expirada por Inatividade',
            'Por motivos de segurança e conformidade, sua sessão foi encerrada devido à inatividade prolongada.'
          );
          logout();
        }, INACTIVITY_TIMEOUT_MS);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [logout, notifySecurity]);

  return (
    <AuditContext.Provider value={{
      notifications,
      notifyError,
      notifySecurity,
      notifyWarning,
      notifySuccess,
      logUserAction,
      removeNotification,
      clearAllNotifications
    }}>
      {children}
      <ToastContainer notifications={notifications} onRemove={removeNotification} />
    </AuditContext.Provider>
  );
};

// ============================================================================
// COMPONENTE VISUAL: NOTIFICAÇÃO NO CANTO INFERIOR DIREITO
// ============================================================================
const ToastContainer: React.FC<{
  notifications: AuditNotification[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div 
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-2 sm:p-0 no-print"
    >
      {notifications.map(notif => (
        <ToastCard key={notif.id} notification={notif} onRemove={() => onRemove(notif.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{
  notification: AuditNotification;
  onRemove: () => void;
}> = ({ notification, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const getStyle = () => {
    switch (notification.level) {
      case 'security':
        return {
          bg: 'bg-rose-950/95 dark:bg-rose-950/95 border-rose-600 text-rose-100',
          icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />,
          badge: 'SEGURANÇA / BLOQUEIO',
          badgeColor: 'bg-rose-800 text-rose-200 border-rose-600'
        };
      case 'error':
        return {
          bg: 'bg-red-950/95 dark:bg-red-950/95 border-red-600 text-red-100',
          icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
          badge: 'ERRO NO PROCESSO',
          badgeColor: 'bg-red-800 text-red-200 border-red-600'
        };
      case 'warn':
        return {
          bg: 'bg-amber-950/95 dark:bg-amber-950/95 border-amber-600 text-amber-100',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          badge: 'AVISO DO SISTEMA',
          badgeColor: 'bg-amber-800 text-amber-200 border-amber-600'
        };
      default:
        return {
          bg: 'bg-sky-950/95 dark:bg-sky-950/95 border-sky-600 text-sky-100',
          icon: <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />,
          badge: 'INFO',
          badgeColor: 'bg-sky-800 text-sky-200 border-sky-600'
        };
    }
  };

  const style = getStyle();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      details: notification.details
    }, null, 2);

    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`pointer-events-auto rounded-xl border shadow-2xl backdrop-blur-md p-3.5 transition-all duration-200 animate-in slide-in-from-bottom-5 fade-in ${style.bg}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {style.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${style.badgeColor}`}>
                {style.badge}
              </span>
              <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {notification.timestamp}
              </span>
            </div>
            <h4 className="text-xs font-bold leading-snug tracking-tight text-white line-clamp-2">
              {notification.title}
            </h4>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words font-medium">
              {notification.message}
            </p>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          title="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Ações: Copiar detalhes e expandir */}
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors font-medium px-2 py-1 rounded hover:bg-white/10"
          title="Copiar informações para auditoria"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copiar Detalhes</span>
            </>
          )}
        </button>

        {notification.details && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-slate-300 hover:text-white font-medium px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <span>{expanded ? 'Ocultar' : 'Ver Detalhes'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Área expandida com stack trace / detalhes técnicos */}
      {expanded && notification.details && (
        <div className="mt-2 p-2 bg-black/40 rounded-lg text-[10px] font-mono text-slate-200 overflow-x-auto max-h-36 border border-white/10">
          <pre className="whitespace-pre-wrap break-all">
            {typeof notification.details === 'object' 
              ? JSON.stringify(notification.details, null, 2) 
              : String(notification.details)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit deve ser utilizado dentro de um AuditProvider');
  }
  return context;
};
