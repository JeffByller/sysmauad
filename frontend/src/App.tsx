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


export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { client } = useClientAuth();
  const { markReadyOrder, closeMarkReadyModal } = useOrders();

  const getTabFromLocation = (): string => {
    const full = (window.location.hash || '') + ' ' + (window.location.search || '');
    if (full.includes('client-signup')) return 'client-signup';
    if (full.includes('client-login')) return 'client-login';
    if (full.includes('client-portal')) return 'client-portal';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<string>(getTabFromLocation);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('ord-teste');
  const [scannedOSNumber, setScannedOSNumber] = useState<string>('OS-0001');
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

  const handleNavigate = (tab: string, param?: string) => {
    if (param) {
      setSelectedOrderId(param);
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

  // Ao pressionar ESC: fecha modal ativo ou fecha a aba aberta voltando ao dashboard
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
        const subTabs = ['new-order', 'order-print', 'order-detail', 'passador-mobile'];
        if (subTabs.includes(currentTab)) {
          handleNavigate('dashboard');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScannerOpen, markReadyOrder, currentTab]);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
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

        {currentTab === 'new-order' && (
          <NewOrderView
            onOrderCreated={orderId => handleNavigate('order-print', orderId)}
            onNavigateToClients={() => handleNavigate('clients')}
            onNavigateToOrders={() => handleNavigate('orders')}
          />
        )}

        {currentTab === 'order-print' && (
          <OrderPrintView
            orderId={selectedOrderId}
            onBack={() => handleNavigate('orders')}
          />
        )}

        {currentTab === 'orders' && (
          <OrderListView
            onNavigate={(tab, param) => handleNavigate(tab, param)}
          />
        )}

        {currentTab === 'order-detail' && (
          <OrderDetailView
            orderId={selectedOrderId}
            onBack={() => handleNavigate('orders')}
            onNavigatePrint={orderId => handleNavigate('order-print', orderId)}
          />
        )}

        {currentTab === 'stock' && (
          <StockView />
        )}

        {currentTab === 'clients' && (
          <ClientManagementView />
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
          <span>Mauad • Sistema de Lavanderia</span>
          <span className="font-mono text-slate-400">
            {['client-portal', 'client-login', 'client-signup'].includes(currentTab)
              ? 'Central do Assinante • Acompanhamento em Tempo Real'
              : 'Controle Operacional & Insumos Químicos'}
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

