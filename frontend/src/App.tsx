import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext';
import { OrderProvider, useOrders } from './context/OrderContext';
import { ThemeProvider } from './context/ThemeContext';

import { Navbar } from './components/layout/Navbar';
import { WhatsAppModal } from './components/WhatsAppModal';
import { QRScannerModal } from './components/QRScannerModal';

import { LoginView } from './views/LoginView';
import { ClientLoginView } from './views/ClientLoginView';
import { ClientPortalView } from './views/ClientPortalView';
import { DashboardView } from './views/DashboardView';
import { NewOrderView } from './views/NewOrderView';
import { OrderPrintView } from './views/OrderPrintView';
import { OrderListView } from './views/OrderListView';
import { OrderDetailView } from './views/OrderDetailView';
import { PassadorMobileView } from './views/PassadorMobileView';
import { PassadorReportView } from './views/PassadorReportView';
import { StockView } from './views/StockView';
import { ClientManagementView } from './views/ClientManagementView';
import { GarmentCatalogView } from './views/GarmentCatalogView';
import { FinanceCaixaView } from './views/FinanceCaixaView';
import { useAuth } from './context/AuthContext';
import { UserManagementView } from './views/UserManagementView';
import { ClientSignupView } from './views/ClientSignupView';
import { SettingsView } from './views/SettingsView';
import { AuditLogsView } from './views/AuditLogsView';
import { AuditProvider } from './context/AuditContext';
import { LicenseState } from './types';
import { AlertTriangle, Key, ShieldAlert, Lock } from 'lucide-react';

const SlimLockScreen: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6 font-sans transition-colors">
    <div className="max-w-sm w-full text-center space-y-7 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
        <Lock className="w-7 h-7 stroke-[1.75]" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200">
          Acesso Restrito
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
          Entre em contato com o administrador.
        </p>
      </div>

      <div className="pt-1">
        <button
          onClick={onLogout}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl transition-all duration-150 cursor-pointer shadow-sm"
        >
          Sair
        </button>
      </div>
    </div>
  </div>
);


export const AppContent: React.FC = () => {
  const { user, isSuperAdmin, logout } = useAuth();
  const { client } = useClientAuth();
  const { markReadyOrder, closeMarkReadyModal } = useOrders();
  const [licenseState, setLicenseState] = useState<LicenseState | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let isMounted = true;

    // Conexão Push em Tempo Real via Server-Sent Events (SSE)
    const connectSSE = () => {
      try {
        es = new EventSource('/api/license/events');
        es.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data) as LicenseState;
            setLicenseState(data);
          } catch (_) {}
        };
        es.onerror = () => {
          // Navegador reconecta automaticamente se a conexão oscilar
        };
      } catch (_) {}
    };

    connectSSE();

    // Fallback de segurança via polling a cada 30 segundos
    const checkLicense = async () => {
      try {
        const res = await fetch('/api/license/status');
        if (res.ok && isMounted) {
          const data = (await res.json()) as LicenseState;
          setLicenseState(data);
        }
      } catch {
        // network error / offline
      }
    };
    checkLicense();
    const interval = setInterval(checkLicense, 30000);

    return () => {
      isMounted = false;
      if (es) {
        es.close();
      }
      clearInterval(interval);
    };
  }, []);

  const getTabFromLocation = (): string => {
    const full = (window.location.hash || '') + ' ' + (window.location.search || '');
    if (full.includes('client-signup')) return 'client-signup';
    if (full.includes('client-login')) return 'client-login';
    if (full.includes('client-portal')) return 'client-portal';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<string>(getTabFromLocation);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ord-teste');
  const [scannedOSNumber, setScannedOSNumber] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Sincroniza abas com a URL / Hash do navegador
  useEffect(() => {
    const handleHashChange = () => {
      const detected = getTabFromLocation();
      if (detected === 'client-portal' && !client) {
        setCurrentTab('client-login');
        window.location.hash = '#/client-login';
        return;
      }
      if (detected !== 'dashboard' || !user) {
        setCurrentTab(detected);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [user, client]);

  // Se estiver na aba client-portal sem cliente autenticado, redireciona imediatamente para client-login
  useEffect(() => {
    if (currentTab === 'client-portal' && !client) {
      setCurrentTab('client-login');
      if (window.location.hash.includes('client-portal')) {
        window.location.hash = '#/client-login';
      }
    }
  }, [currentTab, client]);

  // Redireciona passador automaticamente para o seu terminal de trabalho
  useEffect(() => {
    if (user?.role === 'passador' && currentTab === 'dashboard') {
      setCurrentTab('passador-mobile');
    }
  }, [user, currentTab]);

  const [printInitialMode, setPrintInitialMode] = useState<'ambos' | 'nota' | 'receita' | 'saida'>('ambos');

  const handleNavigate = (tab: string, param?: string, printMode?: 'ambos' | 'nota' | 'receita' | 'saida') => {
    if (param) {
      setSelectedOrderId(param);
    }
    if (printMode) {
      setPrintInitialMode(printMode);
    } else if (tab === 'order-print' && !printMode) {
      setPrintInitialMode('ambos');
    }
    // Protege acesso direto a client-portal
    if (tab === 'client-portal' && !client) {
      tab = 'client-login';
    }
    setCurrentTab(tab);
    if (['client-login', 'client-signup', 'client-portal'].includes(tab)) {
      window.location.hash = `#/${tab}`;
    } else {
      // Limpa hashes residuais de telas de cliente ao navegar no sistema
      if (window.location.hash) {
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          window.location.hash = '';
        }
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQRSelectOrder = (osNumber: string) => {
    setScannedOSNumber(osNumber);
    setSelectedOrderId(osNumber);
    setCurrentTab('passador-mobile');
  };

  // Ao pressionar ESC: fecha modais globais ativos (scanner, marcar pronto) sem desviar a rota
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isScannerOpen) {
          setIsScannerOpen(false);
          return;
        }
        if (markReadyOrder) {
          closeMarkReadyModal();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScannerOpen, markReadyOrder]);

  // Bloqueio de acesso: se não estiver autenticado no sistema nem for tela pública de cliente, exibe login
  if (!user && currentTab !== 'client-login' && currentTab !== 'client-signup' && currentTab !== 'client-portal') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <LoginView 
          onLoginSuccess={() => handleNavigate('dashboard')} 
          onGoToClientPortal={() => handleNavigate('client-login')}
        />
      </div>
    );
  }

  // Se a licença do sistema estiver bloqueada/suspensa no servidor de licenças, exibe a tela de bloqueio slim
  if (licenseState && !licenseState.isValid && user && !isSuperAdmin) {
    return <SlimLockScreen onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Banner de Alerta de Licença para Super Admin */}
      {isSuperAdmin && licenseState && !licenseState.isValid && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Atenção: A licença do sistema está <strong>{licenseState.status}</strong>. O acesso de operadores está bloqueado até que a chave seja configurada.
            </span>
          </div>
          <button
            onClick={() => handleNavigate('settings')}
            className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors shrink-0 ml-4 cursor-pointer"
          >
            Configurar Licença
          </button>
        </div>
      )}

      {/* Top Navbar Header (oculto nas páginas de login e portal do assinante) */}
      {currentTab !== 'login' && 
       currentTab !== 'client-login' && 
       currentTab !== 'client-signup' && 
       currentTab !== 'client-portal' && (
        <Navbar currentTab={currentTab} onTabChange={tab => handleNavigate(tab)} />
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {currentTab === 'login' && (
          <LoginView 
            onLoginSuccess={() => handleNavigate('dashboard')} 
            onGoToClientPortal={() => handleNavigate('client-login')}
          />
        )}

        {currentTab === 'client-login' && (
          <ClientLoginView
            onLoginSuccess={() => handleNavigate('client-portal')}
            onBackToSystemLogin={() => handleNavigate('login')}
          />
        )}

        {currentTab === 'client-signup' && (
          <ClientSignupView
            onSignupSuccess={() => handleNavigate('client-portal')}
            onGoToLogin={() => handleNavigate('client-login')}
          />
        )}

        {currentTab === 'client-portal' && (
          client ? (
            <ClientPortalView onLogout={() => handleNavigate('client-login')} />
          ) : (
            <ClientLoginView
              onLoginSuccess={() => handleNavigate('client-portal')}
              onBackToSystemLogin={() => handleNavigate('login')}
            />
          )
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab, param) => handleNavigate(tab, param)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {(currentTab === 'new-order' || currentTab === 'define-order') && (
          <NewOrderView
            editOrderId={currentTab === 'define-order' ? selectedOrderId : undefined}
            onOrderCreated={orderId => handleNavigate('order-print', orderId)}
            onNavigateToClients={() => handleNavigate('clients')}
            onNavigateToOrders={() => handleNavigate('orders')}
          />
        )}

        {currentTab === 'order-print' && (
          <OrderPrintView
            orderId={selectedOrderId}
            initialMode={printInitialMode}
            onBack={() => handleNavigate('orders')}
          />
        )}

        {currentTab === 'orders' && (
          <OrderListView
            onNavigate={(tab, param, printMode) => handleNavigate(tab, param, printMode)}
          />
        )}

        {currentTab === 'order-detail' && (
          <OrderDetailView
            orderId={selectedOrderId}
            onBack={() => handleNavigate('orders')}
            onNavigatePrint={(orderId, printMode) => handleNavigate('order-print', orderId, printMode)}
            onNavigateDefine={(orderId) => handleNavigate('define-order', orderId)}
          />
        )}

        {currentTab === 'stock' && (
          <StockView />
        )}

        {currentTab === 'clients' && (
          <ClientManagementView
            onNavigate={(tab, param, printMode) => handleNavigate(tab, param, printMode)}
          />
        )}

        {currentTab === 'garment-catalog' && (
          <GarmentCatalogView />
        )}

        {currentTab === 'finance' && (
          <FinanceCaixaView />
        )}

        {currentTab === 'users' && (
          <UserManagementView />
        )}

        {currentTab === 'passador-mobile' && (
          <PassadorMobileView
            onOpenScanner={() => setIsScannerOpen(true)}
            scannedOSNumber={scannedOSNumber}
          />
        )}

        {currentTab === 'passador-report' && (
          <PassadorReportView />
        )}

        {currentTab === 'settings' && (
          <SettingsView />
        )}

        {currentTab === 'audit' && (
          <AuditLogsView />
        )}
      </main>

      {/* Global Evolution API WhatsApp Modal Simulation */}
      <WhatsAppModal />

      {/* Global Passador QR Scanner Simulator Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectOrder={handleQRSelectOrder}
      />

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-400 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sistema • Mauad</span>
          <span className="font-mono text-slate-400">
            {['client-portal', 'client-login', 'client-signup'].includes(currentTab)
              ? 'Central do Assinante • Acompanhamento em Tempo Real'
              : 'Controle Operacional'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuditProvider>
          <ClientAuthProvider>
            <OrderProvider>
              <AppContent />
            </OrderProvider>
          </ClientAuthProvider>
        </AuditProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

