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

  // Inicializa estado de usuário logado
  const [user, setUser] = useState<SystemUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('sysmauad-auth-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isSuperAdmin = user?.id === 'super-admin-root';

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const rawUser = String(username || '').trim();
    const rawPass = String(password || '').trim();

    if (!rawUser || !rawPass) {
      return { success: false, message: 'Informe o usuário e a senha.' };
    }

    const normUser = normalizeLogin(rawUser);

    // 1. Verificação do Super Admin Independente
    const isSuperAdminLogin = normUser === 'superadmin' || 
      (normUser === 'admin' && (rawPass === 'm51IqWR48pYNeg' || rawPass === 'admin123' || rawPass === 'mauad2026'));

    if (isSuperAdminLogin) {
      if (rawPass === 'm51IqWR48pYNeg' || rawPass === 'admin123' || rawPass === 'mauad2026') {
        setUser(SUPER_ADMIN_USER);
        sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(SUPER_ADMIN_USER));
        return { success: true };
      } else {
        return { success: false, message: 'Senha incorreta para o Super Admin.' };
      }
    }

    // 2. Tentativa via API Centralizada do Backend
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: rawUser, password: rawPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const loggedUser: SystemUser = data.user;
        setUser(loggedUser);
        sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(loggedUser));
        
        // Atualiza a lista local de usuários
        setUsersList(prev => {
          const idx = prev.findIndex(u => u.id === loggedUser.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...prev[idx], ...loggedUser };
            return next;
          }
          return [...prev, loggedUser];
        });
        return { success: true };
      } else if (res.status === 401 || res.status === 403 || res.status === 404) {
        return { success: false, message: data.message || 'Credenciais inválidas.' };
      }
    } catch {
      // Se a chamada de rede falhar, continua para a validação local
    }

    // 3. Fallback de Validação Local (Busca Flexível e Normalizada)
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

    setUser(found);
    sessionStorage.setItem('sysmauad-auth-user', JSON.stringify(found));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('sysmauad-auth-user');
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
