import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, AlertCircle, Shield } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onGoToClientPortal?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onGoToClientPortal }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor, preencha o usuário e a senha.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(result.message || 'Credenciais inválidas. Verifique seu usuário e senha.');
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao processar o login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 transition-colors">
        {/* Brand Title */}
        <div className="text-center space-y-3">
          <img 
            src="/logo.jpg" 
            alt="Mauad Lavanderia" 
            className="w-16 h-16 rounded-2xl mx-auto object-cover shadow-lg border border-slate-200 dark:border-slate-700" 
          />
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">MAUAD</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Gestão de Lavanderia</p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form: Username and Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
              Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="username"
                placeholder="Informe seu usuário (ex: ana ou @ana)..."
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
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
                type="password"
                autoComplete="current-password"
                placeholder="Informe sua senha..."
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Autenticando...' : 'Acessar o Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Portal do Cliente link if provided */}
        {onGoToClientPortal && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onGoToClientPortal}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
            >
              É um cliente? Acessar a Central do Assinante &rarr;
            </button>
          </div>
        )}

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          Autenticação Segura • Mauad Lavanderia
        </div>
      </div>
    </div>
  );
};
