import React, { useState, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, Building, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import { Client } from '../types';

interface ClientSignupViewProps {
  onSignupSuccess: () => void;
  onGoToLogin: () => void;
}

export const ClientSignupView: React.FC<ClientSignupViewProps> = ({ onSignupSuccess, onGoToLogin }) => {
  const { clients, setClientPasswordByToken } = useOrders();
  const { loginClientObject } = useClientAuth();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isDirectLink, setIsDirectLink] = useState(false);

  // Read URL query params on mount if available (?client=cli-1 ou #/client-signup?client=cli-1)
  useEffect(() => {
    const full = (window.location.hash || '') + ' ' + (window.location.search || '');
    const match = full.match(/[?&]client=([^& #]+)/);
    const clientId = match ? decodeURIComponent(match[1]) : null;

    if (clientId) {
      const found = clients.find(c => c.id === clientId);
      if (found) {
        setSelectedClientId(found.id);
        setIsDirectLink(true);
        return;
      }
    }

    if (clients.length > 0 && !selectedClientId) {
      const pending = clients.find(c => c.portalStatus === 'pendente' || !c.passwordHash);
      setSelectedClientId(pending ? pending.id : clients[0].id);
    }
  }, [clients]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedClient) {
      setErrorMsg('Por favor, selecione um cliente válido.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite novamente.');
      return;
    }

    // Register password securely in context
    const ok = setClientPasswordByToken(selectedClient.id, password);
    if (ok) {
      const updatedClient: Client = {
        ...selectedClient,
        passwordHash: `hash-${btoa(password)}`,
        portalStatus: 'ativo'
      };
      
      loginClientObject(updatedClient);
      setSuccessMsg(`Senha cadastrada com sucesso para ${selectedClient.name}! Redirecionando...`);
      
      setTimeout(() => {
        onSignupSuccess();
      }, 1500);
    } else {
      setErrorMsg('Ocorreu um erro ao salvar a senha. Tente novamente.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 transition-colors">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-sky-900/10 text-sky-600 dark:text-sky-400 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Cadastro de Senha do Cliente
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Central do Assinante • Crie sua senha de acesso exclusiva
          </p>
        </div>

        {/* Security Alert Banner */}
        <div className="p-3.5 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 rounded-xl text-xs text-sky-900 dark:text-sky-200 leading-relaxed flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong>Sigilo Total da Senha:</strong> Sua senha é restrita e visível apenas para você. Os operadores e administradores da lavanderia não possuem acesso à sua senha.
          </div>
        </div>

        {/* Identificação do Cliente */}
        {isDirectLink && selectedClient ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold block">
              Central do Assinante • Acesso Exclusivo
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{selectedClient.name}</span>
              {selectedClient.companyName && selectedClient.companyName !== selectedClient.name && (
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({selectedClient.companyName})</span>
              )}
            </div>
            {selectedClient.phone && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>WhatsApp: {selectedClient.phone}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Selecione seu Nome / Empresa
            </label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.companyName} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Digite a Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 4 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Confirme a Nova Senha
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <span>Gerar Senha e Acessar Central</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={onGoToLogin}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
          >
            Já possui senha? Fazer Login na Central
          </button>
        </div>
      </div>
    </div>
  );
};
