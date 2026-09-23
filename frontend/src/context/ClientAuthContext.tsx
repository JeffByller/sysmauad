import React, { createContext, useContext, useState } from 'react';
import { Client } from '../types';

const CLIENT_STORAGE_KEY = 'sysmauad-auth-client';

interface ClientAuthContextType {
  client: Client | null;
  loginClient: (phoneOrCnpj: string, password?: string) => Promise<boolean>;
  loginClientObject: (clientObj: Client) => void;
  logoutClient: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<Client | null>(() => {
    try {
      const saved = sessionStorage.getItem(CLIENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const loginClient = async (phoneOrCnpj: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/client-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrCnpj, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.client) {
          loginClientObject(data.client);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('[ClientAuthContext] Erro ao autenticar cliente:', err);
      return false;
    }
  };

  const loginClientObject = (clientObj: Client) => {
    try {
      sessionStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clientObj));
    } catch (e) {
      console.warn('[ClientAuthContext] Erro ao salvar sessão do cliente:', e);
    }
    setClient(clientObj);
  };

  const logoutClient = () => {
    try {
      sessionStorage.removeItem(CLIENT_STORAGE_KEY);
      localStorage.removeItem(CLIENT_STORAGE_KEY);
    } catch {}
    setClient(null);
    if (window.location.hash.includes('client-portal')) {
      window.location.hash = '#/client-login';
    }
  };

  return (
    <ClientAuthContext.Provider value={{ client, loginClient, loginClientObject, logoutClient }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};
