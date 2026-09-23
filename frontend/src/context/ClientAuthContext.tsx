import React, { createContext, useContext, useState } from 'react';
import { Client } from '../types';

interface ClientAuthContextType {
  client: Client | null;
  loginClient: (phoneOrCnpj: string) => Promise<boolean>;
  loginClientObject: (clientObj: Client) => void;
  logoutClient: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<Client | null>(null);

  const loginClient = async (phoneOrCnpj: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/client-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrCnpj })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.client) {
          setClient(data.client);
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
    setClient(clientObj);
  };

  const logoutClient = () => {
    setClient(null);
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
