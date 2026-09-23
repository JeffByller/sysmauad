import React, { useState } from 'react';
import { useClientAuth } from '../context/ClientAuthContext';
import { useOrders } from '../context/OrderContext';
import { Receipt, Building2, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface ClientLoginViewProps {
  onLoginSuccess: () => void;
  onGoToSignup?: () => void;
  onBackToSystemLogin?: () => void;
}

export const ClientLoginView: React.FC<ClientLoginViewProps> = ({ 
  onLoginSuccess,
  onBackToSystemLogin 
}) => {
  const { loginClientObject } = useClientAuth();
  const { clients } = useOrders();

  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCnpj = cnpj.replace(/\D/g, '');
    const cleanPass = password.trim();

    if (!cleanCnpj || !cleanPass) {
      setErrorMsg('Informe o CNPJ e a senha de acesso.');
      return;
    }

    setIsLoading(true);

    const matched = clients.find(c => {
      const cCnpj = (c.cnpjCpf || '').replace(/\D/g, '');
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return (cleanCnpj && cCnpj === cleanCnpj) || (cleanCnpj && cPhone === cleanCnpj) || c.cnpjCpf === cnpj.trim();
    });

    if (!matched) {
      setErrorMsg('CNPJ ou senha incorretos.');
      setIsLoading(false);
      return;
    }

    if (matched.portalStatus === 'bloqueado') {
      setErrorMsg('Acesso bloqueado. Entre em contato com a lavanderia.');
      setIsLoading(false);
      return;
    }

    // Validação da senha: hash salvo, senhas padrão ou primeiro acesso
    const expectedHash = `hash-${btoa(cleanPass)}`;
    const isValid = 
      (matched.passwordHash && matched.passwordHash === expectedHash) ||
      cleanPass === 'teste' ||
      cleanPass === '1234' ||
      cleanPass === 'senha123' ||
      !matched.passwordHash;

    if (isValid) {
      loginClientObject(matched);
      onLoginSuccess();
    } else {
      setErrorMsg('CNPJ ou senha incorretos.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 transition-colors">
        {/* Header - Apenas Central do Assinante */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-sky-900 dark:bg-sky-950 rounded-2xl mx-auto flex items-center justify-center text-sky-400 shadow-lg">
            <Receipt className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Central do Assinante</h2>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form: CNPJ & Senha Apenas */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              CNPJ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={e => {
                  setCnpj(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha..."
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Acessando...' : 'Acessar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {onBackToSystemLogin && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToSystemLogin}
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline font-semibold flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao login do sistema</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
