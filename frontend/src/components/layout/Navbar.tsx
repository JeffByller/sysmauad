import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  LayoutDashboard, 
  ListFilter, 
  Package, 
  Users, 
  Tag, 
  Wallet, 
  ShieldCheck, 
  QrCode, 
  UserCheck, 
  LogOut, 
  Receipt,
  Sun, 
  Moon,
  FileText,
  Menu,
  X,
  ChevronDown,
  Settings
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { user, hasPermission, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMobileNav = (tab: string) => {
    onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    onTabChange('login');
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  };

  const secondaryTabs = ['garment-catalog', 'users', 'passador-mobile', 'client-portal'];
  const isSecondaryActive = secondaryTabs.includes(currentTab);
  const getSecondaryActiveLabel = () => {
    if (currentTab === 'garment-catalog') return 'Peças';
    if (currentTab === 'users') return 'Usuários';
    if (currentTab === 'passador-mobile') return 'Passador';
    if (currentTab === 'client-portal') return 'Assinante';
    return null;
  };
  const hasAnySecondary = secondaryTabs.some(tab => hasPermission(tab));

  return (
    <header className="bg-slate-900 dark:bg-slate-950 border-b border-slate-800 dark:border-slate-800/80 text-slate-100 sticky top-0 z-40 no-print transition-colors">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand Logo & Title */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none mr-2 sm:mr-3" 
            onClick={() => onTabChange('dashboard')}
          >
            <img 
              src="/logo.jpg" 
              alt="Mauad Lavanderia" 
              className="w-9 h-9 rounded-lg object-cover shadow-md border border-slate-700/50 shrink-0" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="shrink-0">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white block leading-tight">MAUAD</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block tracking-widest uppercase font-mono leading-none">Lavanderia</span>
            </div>
          </div>

          {/* Main Navigation Bar */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-1 justify-center px-1">
            {/* 1. Painel */}
            {hasPermission('dashboard') && (
              <button
                onClick={() => onTabChange('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'dashboard'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Painel</span>
              </button>
            )}

            {/* 2. Pedidos */}
            {hasPermission('orders') && (
              <button
                onClick={() => onTabChange('orders')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'orders'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ListFilter className="w-4 h-4 shrink-0" />
                <span>Pedidos</span>
              </button>
            )}

            {/* 3. Estoque */}
            {hasPermission('stock') && (
              <button
                onClick={() => onTabChange('stock')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'stock'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>Estoque</span>
              </button>
            )}

            {/* 4. Clientes */}
            {hasPermission('clients') && (
              <button
                onClick={() => onTabChange('clients')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'clients'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Clientes</span>
              </button>
            )}

            {/* 5. Financeiro */}
            {hasPermission('finance') && (
              <button
                onClick={() => onTabChange('finance')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'finance'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-400 hover:bg-slate-800 hover:text-white'
                }`}
                title="Financeiro • Controle de Caixa"
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Financeiro</span>
              </button>
            )}

            {/* 6. Relatórios */}
            {hasPermission('passador-report') && (
              <button
                onClick={() => onTabChange('passador-report')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'passador-report'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Relatórios Operacionais"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Relatórios</span>
              </button>
            )}

            {/* Dropdown 'Mais' para telas intermediárias (1024px a 1279px) */}
            {hasAnySecondary && (
              <div className="relative xl:hidden shrink-0" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSecondaryActive
                      ? 'bg-sky-700 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{getSecondaryActiveLabel() ? `Mais: ${getSecondaryActiveLabel()}` : 'Mais'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in duration-150">
                    {hasPermission('garment-catalog') && (
                      <button
                        type="button"
                        onClick={() => { onTabChange('garment-catalog'); setIsMoreMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                          currentTab === 'garment-catalog' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Tag className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Tabela Peças</span>
                      </button>
                    )}
                    {hasPermission('users') && (
                      <button
                        type="button"
                        onClick={() => { onTabChange('users'); setIsMoreMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                          currentTab === 'users' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Gestão de Usuários</span>
                      </button>
                    )}
                    {hasPermission('passador-mobile') && (
                      <button
                        type="button"
                        onClick={() => { onTabChange('passador-mobile'); setIsMoreMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                          currentTab === 'passador-mobile' ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:bg-slate-800'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Modo Passador</span>
                      </button>
                    )}
                    {hasPermission('client-portal') && (
                      <button
                        type="button"
                        onClick={() => { onTabChange('client-portal'); setIsMoreMenuOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                          currentTab === 'client-portal' ? 'bg-sky-700 text-white' : 'text-sky-400 hover:bg-slate-800'
                        }`}
                      >
                        <Receipt className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>Central do Assinante</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Itens Secundários Diretos para telas a partir de 1280px (xl+) */}
            {hasPermission('garment-catalog') && (
              <button
                onClick={() => onTabChange('garment-catalog')}
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'garment-catalog'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Tabela de Peças & Lavagem"
              >
                <Tag className="w-4 h-4 shrink-0" />
                <span>Peças</span>
              </button>
            )}

            {hasPermission('users') && (
              <button
                onClick={() => onTabChange('users')}
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentTab === 'users'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Gestão de Usuários e Permissões"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Usuários</span>
              </button>
            )}

            {(hasPermission('passador-mobile') || hasPermission('client-portal')) && (
              <div className="hidden xl:block h-4 w-px bg-slate-800 mx-1 shrink-0"></div>
            )}

            {hasPermission('passador-mobile') && (
              <button
                onClick={() => onTabChange('passador-mobile')}
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors border whitespace-nowrap shrink-0 ${
                  currentTab === 'passador-mobile'
                    ? 'bg-emerald-700 text-white border-emerald-600'
                    : 'bg-slate-800/80 text-emerald-400 border-slate-700 hover:bg-slate-800'
                }`}
                title="Modo Passador Mobile"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>Passador</span>
              </button>
            )}

            {hasPermission('client-portal') && (
              <button
                onClick={() => onTabChange('client-portal')}
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors border whitespace-nowrap shrink-0 ${
                  currentTab === 'client-portal'
                    ? 'bg-sky-700 text-white border-sky-600'
                    : 'bg-slate-800/80 text-sky-400 border-slate-700 hover:bg-slate-800'
                }`}
                title="Central do Assinante"
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>Assinante</span>
              </button>
            )}
          </nav>

          {/* User Info & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center shrink-0"
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-sky-400" />
              )}
            </button>

            {/* Operator Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[100px] text-[11px] xl:text-xs">
                <strong className="text-white">{user?.name || 'Super Admin'}</strong>
              </span>
              {user?.id === 'super-admin-root' && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  ADMIN
                </span>
              )}
            </div>

            {/* Settings Button */}
            {(user?.role === 'admin' || user?.id === 'super-admin-root' || hasPermission('settings')) && (
              <button
                onClick={() => onTabChange('settings')}
                className={`p-2 rounded-lg transition-colors shrink-0 flex items-center justify-center ${
                  currentTab === 'settings'
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Configurações (WhatsApp, Automação & Backup)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              title="Sair / Trocar Operador"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors lg:hidden shrink-0"
              title="Abrir Menu de Navegação"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 py-3 space-y-1 bg-slate-900/95 animate-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {hasPermission('dashboard') && (
                <button
                  onClick={() => handleMobileNav('dashboard')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'dashboard' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Painel Inicial
                </button>
              )}

              {hasPermission('orders') && (
                <button
                  onClick={() => handleMobileNav('orders')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'orders' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ListFilter className="w-4 h-4" />
                  Pedidos
                </button>
              )}

              {hasPermission('stock') && (
                <button
                  onClick={() => handleMobileNav('stock')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'stock' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Estoque
                </button>
              )}

              {hasPermission('clients') && (
                <button
                  onClick={() => handleMobileNav('clients')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'clients' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Clientes
                </button>
              )}

              {hasPermission('garment-catalog') && (
                <button
                  onClick={() => handleMobileNav('garment-catalog')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'garment-catalog' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  Tabela Peças
                </button>
              )}

              {hasPermission('finance') && (
                <button
                  onClick={() => handleMobileNav('finance')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'finance' ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:bg-slate-800'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Financeiro
                </button>
              )}

              {hasPermission('passador-report') && (
                <button
                  onClick={() => handleMobileNav('passador-report')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'passador-report' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Relatórios
                </button>
              )}

              {hasPermission('users') && (
                <button
                  onClick={() => handleMobileNav('users')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'users' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Usuários
                </button>
              )}

              {hasPermission('passador-mobile') && (
                <button
                  onClick={() => handleMobileNav('passador-mobile')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'passador-mobile' ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:bg-slate-800'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Passador
                </button>
              )}

              {hasPermission('client-portal') && (
                <button
                  onClick={() => handleMobileNav('client-portal')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold ${
                    currentTab === 'client-portal' ? 'bg-sky-700 text-white' : 'text-sky-400 hover:bg-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  Assinante
                </button>
              )}

              {(user?.role === 'admin' || user?.id === 'super-admin-root' || hasPermission('settings')) && (
                <button
                  onClick={() => handleMobileNav('settings')}
                  className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold col-span-2 ${
                    currentTab === 'settings' ? 'bg-sky-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Configurações (WhatsApp, Relatórios & Backup)
                </button>
              )}

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl flex items-center gap-2 font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors col-span-2 border border-rose-900/30 mt-1"
              >
                <LogOut className="w-4 h-4" />
                Sair do Sistema / Desconectar
              </button>
            </div>
          </div>
        )}

        {/* Mobile Bottom Quick Navigation Bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-800 text-[10px] uppercase font-semibold">
          {hasPermission('dashboard') && (
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex flex-col items-center gap-0.5 ${currentTab === 'dashboard' ? 'text-sky-400' : 'text-slate-400'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel
            </button>
          )}

          {hasPermission('orders') && (
            <button
              onClick={() => onTabChange('orders')}
              className={`flex flex-col items-center gap-0.5 ${currentTab === 'orders' ? 'text-sky-400' : 'text-slate-400'}`}
            >
              <ListFilter className="w-4 h-4" />
              Pedidos
            </button>
          )}

          {hasPermission('finance') && (
            <button
              onClick={() => onTabChange('finance')}
              className={`flex flex-col items-center gap-0.5 ${currentTab === 'finance' ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              <Wallet className="w-4 h-4" />
              Caixa
            </button>
          )}

          {hasPermission('passador-report') && (
            <button
              onClick={() => onTabChange('passador-report')}
              className={`flex flex-col items-center gap-0.5 ${currentTab === 'passador-report' ? 'text-sky-400' : 'text-slate-400'}`}
            >
              <FileText className="w-4 h-4" />
              Relatórios
            </button>
          )}

          {hasPermission('passador-mobile') && (
            <button
              onClick={() => onTabChange('passador-mobile')}
              className={`flex flex-col items-center gap-0.5 ${currentTab === 'passador-mobile' ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              <QrCode className="w-4 h-4" />
              Passador
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
