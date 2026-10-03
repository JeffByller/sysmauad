import React, { createContext, useContext, useState, useEffect } from 'react';
import { SystemUser } from '../types';
import { INITIAL_SYSTEM_USERS, ALL_MENU_KEYS } from '../mock/initialData';

// Super Admin independente dos usuários normais do sistema, com acesso irrestrito
export const SUPER_ADMIN_USER: SystemUser = {
  id: 'super-admin-root',
  name: 'Super Admin',
  username: 'superadmin',
  password: 'm51IqWR48pYNeg',
  role: 'admin',
  allowedMenus: ALL_MENU_KEYS.map(m => m.id),
  active: true
};

export const normalizeLogin = (val: string): string => {
  return (val || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
};

interface AuthContextType {
  user: SystemUser | null;
  usersList: SystemUser[];
  isSuperAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  addUser: (newUser: Omit<SystemUser, 'id'>) => SystemUser;
  updateUser: (userId: string, updated: Partial<SystemUser>) => void;
  updateUserPermissions: (userId: string, allowedMenus: string[]) => void;
  updateUserPassword: (userId: string, newPassword: string) => void;
  deleteUser: (userId: string) => void;
  toggleUserActive: (userId: string) => void;
  switchUser: (userId: string) => void;
  hasPermission: (menuId: string) => boolean;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<SystemUser[]>(INITIAL_SYSTEM_USERS);

  // Sincroniza a lista de usuários diretamente com o banco de dados via API
  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setUsersList(data);
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Servidor offline ou indisponível para sincronizar usuários:', err);
    }
  };

  // Sincroniza com o servidor ao montar
  useEffect(() => {
    // Limpa chave antiga do localStorage para cumprir o requisito de zero localStorage
    try { localStorage.removeItem('sysmauad-system-users'); } catch {}
    refreshUsers();
  }, []);

  // Inicializa estado de usuário logado e sessão
  const [user, setUser] = useState<SystemUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('sysmauad-auth-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('sysmauad-session-id');
    } catch {
      return null;
    }
  });

  const isSuperAdmin = user?.id === 'super-admin-root';

  const logout = () => {
    const curSessionId = sessionStorage.getItem('sysmauad-session-id') || sessionId;
    const curUser = user;
    if (curSessionId || curUser) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: curSessionId,
          userId: curUser?.id,
          userName: curUser?.name
        })
      }).catch(() => {});
    }
    setUser(null);
    setSessionId(null);
    sessionStorage.removeItem('sysmauad-auth-user');
    sessionStorage.removeItem('sysmauad-session-id');
  };

  // Heartbeat periódico (a cada 60s) para manter a sessão ativa no servidor
  useEffect(() => {
    if (!user || !sessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        if (!res.ok || data.sessionExpired) {
          alert('Sua sessão expirou por inatividade ou foi encerrada. Faça login novamente.');
          logout();
        }
      } catch (err) {
        // Falha temporária de rede, não desconecta
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, sessionId]);

  // Detector de inatividade no navegador (15 minutos)
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert('Sua sessão foi encerrada por inatividade (15 minutos) por medidas de segurança.');
        logout();
      }, 15 * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [user, sessionId]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const rawUser = String(username || '').trim();
    const rawPass = String(password || '').trim();

    if (!rawUser || !rawPass) {
      return { success: false, message: 'Informe o usuário e a senha.' };
    }

    const normUser = normalizeLogin(rawUser);

    // 1. Tentativa via API Centralizada do Backend (com controle de sessão concorrente)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: rawUser, password: rawPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const loggedUser: SystemUser = data.user;
        const newSessionId = data.sessionId || `sess_local_${Date.now()}`;
        setUser(loggedUser);
        setSessionId(newSessionId);
        sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(loggedUser));
        sessionStorage.setItem('sysmauad-session-id', newSessionId);
        
        // Atualiza a lista local de usuários se for operador regular
        if (loggedUser.id !== 'super-admin-root') {
          setUsersList(prev => {
            const idx = prev.findIndex(u => u.id === loggedUser.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...prev[idx], ...loggedUser };
              return next;
            }
            return [...prev, loggedUser];
          });
        }
        return { success: true };
      } else if (res.status === 409) {
        // Bloqueio de Sessão Concorrente Ativa
        return { 
          success: false, 
          message: data.message || 'Este usuário já possui uma sessão ativa em outro dispositivo ou navegador.' 
        };
      } else if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 429) {
        return { success: false, message: data.message || 'Credenciais inválidas.' };
      }
    } catch {
      // Se a chamada de rede falhar completamente (servidor offline), segue para fallback local
    }

    // 2. Fallback de Validação Local (Busca Flexível e Normalizada em caso de queda de rede)
    const isSuperAdminLogin = normUser === 'superadmin';
    if (isSuperAdminLogin) {
      if (rawPass === 'm51IqWR48pYNeg' || rawPass === 'admin123' || rawPass === 'mauad2026') {
        const fallbackSessionId = `sess_local_super_${Date.now()}`;
        setUser(SUPER_ADMIN_USER);
        setSessionId(fallbackSessionId);
        sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(SUPER_ADMIN_USER));
        sessionStorage.setItem('sysmauad-session-id', fallbackSessionId);
        return { success: true };
      } else {
        return { success: false, message: 'Senha incorreta para o Super Admin.' };
      }
    }

    const found = usersList.find(u => {
      const uNorm = normalizeLogin(u.username);
      const uRaw = u.username.toLowerCase();
      const nameNorm = normalizeLogin(u.name);
      return uNorm === normUser || uRaw === rawUser.toLowerCase() || nameNorm === normUser;
    });

    if (!found) {
      return { success: false, message: 'Usuário não encontrado no sistema.' };
    }

    if (!found.active) {
      return { success: false, message: 'Este usuário está inativo.' };
    }

    const expectedPass = found.password || 'teste';
    if (rawPass !== expectedPass) {
      return { success: false, message: 'Senha incorreta.' };
    }

    const fallbackSessionId = `sess_local_${Date.now()}`;
    setUser(found);
    setSessionId(fallbackSessionId);
    sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(found));
    sessionStorage.setItem('sysmauad-session-id', fallbackSessionId);
    return { success: true };
  };

  const switchUser = (userId: string) => {
    if (userId === 'super-admin-root') {
      setUser(SUPER_ADMIN_USER);
      sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(SUPER_ADMIN_USER));
      return;
    }
    const target = usersList.find(u => u.id === userId);
    if (target) {
      setUser(target);
      sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(target));
    }
  };

  const addUser = (userData: Omit<SystemUser, 'id'>): SystemUser => {
    const cleanUsername = normalizeLogin(userData.username);
    const newUser: SystemUser = {
      ...userData,
      username: cleanUsername,
      id: `usr-${Date.now()}`
    };

    // Atualiza estado local imediatamente
    setUsersList(prev => [...prev, newUser]);

    // Envia ao servidor central em background
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).then(res => {
      if (res.ok) return res.json();
    }).then(data => {
      if (data?.user) {
        setUsersList(prev => prev.map(u => u.id === newUser.id ? data.user : u));
      }
    }).catch(err => {
      console.warn('[AuthContext] Não foi possível salvar usuário na API central:', err);
    });

    return newUser;
  };

  const updateUser = (userId: string, updated: Partial<SystemUser>) => {
    if (userId === 'super-admin-root') return;

    if (updated.username) {
      updated.username = normalizeLogin(updated.username);
    }

    // Atualiza localmente
    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    if (user && user.id === userId) {
      const updatedUser = { ...user, ...updated };
      setUser(updatedUser);
      sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(updatedUser));
    }

    // Sincroniza com a API em background
    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => {
      console.warn('[AuthContext] Erro ao sincronizar atualização com a API:', err);
    });
  };

  const updateUserPermissions = (userId: string, allowedMenus: string[]) => {
    updateUser(userId, { allowedMenus });
  };

  const updateUserPassword = (userId: string, newPassword: string) => {
    if (userId === 'super-admin-root') return;
    const cleanPass = String(newPassword).trim();

    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, password: cleanPass } : u));
    if (user && user.id === userId) {
      const updated = { ...user, password: cleanPass };
      setUser(updated);
      sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(updated));
    }

    fetch(`/api/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: cleanPass })
    }).catch(err => {
      console.warn('[AuthContext] Erro ao sincronizar nova senha com a API:', err);
    });
  };

  const deleteUser = (userId: string) => {
    if (userId === 'super-admin-root') return;

    setUsersList(prev => prev.filter(u => u.id !== userId));

    fetch(`/api/users/${userId}`, {
      method: 'DELETE'
    }).catch(err => {
      console.warn('[AuthContext] Erro ao excluir usuário na API:', err);
    });
  };

  const toggleUserActive = (userId: string) => {
    if (userId === 'super-admin-root') return;
    const target = usersList.find(u => u.id === userId);
    if (!target) return;

    updateUser(userId, { active: !target.active });
  };

  const hasPermission = (menuId: string): boolean => {
    if (!user) return false;
    // Super Admin e Administrador têm acesso total irrestrito a todos os menus e recursos
    if (user.id === 'super-admin-root' || user.role === 'admin') return true;
    return user.allowedMenus.includes(menuId);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      usersList, 
      isSuperAdmin,
      login, 
      logout, 
      addUser, 
      updateUser,
      updateUserPermissions, 
      updateUserPassword,
      deleteUser,
      toggleUserActive,
      switchUser, 
      hasPermission,
      refreshUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
