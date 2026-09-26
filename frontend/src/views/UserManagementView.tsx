import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ALL_MENU_KEYS } from '../mock/initialData';
import { Users, ShieldCheck, CheckCircle2, UserPlus, Eye, EyeOff, Lock, Key, Check, X, Edit3, Phone, UserX, UserCheck } from 'lucide-react';
import { SystemUser } from '../types';
import { Pagination } from '../components/common/Pagination';

export const UserManagementView: React.FC = () => {
  const { 
    usersList, 
    addUser, 
    updateUser,
    updateUserPermissions, 
    updateUserPassword,
    toggleUserActive,
    user: currentUser 
  } = useAuth();

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<SystemUser | null>(null);
  const [tempAllowedMenus, setTempAllowedMenus] = useState<string[]>([]);
  const [changingPasswordUser, setChangingPasswordUser] = useState<SystemUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * 20;
    return usersList.slice(start, start + 20);
  }, [usersList, currentPage]);

  // Editing User Details State
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'financeiro' | 'operador' | 'passador'>('operador');

  // New User Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'financeiro' | 'operador' | 'passador'>('operador');
  const [newAllowedMenus, setNewAllowedMenus] = useState<string[]>([
    'dashboard', 'orders', 'stock', 'clients', 'garment-catalog'
  ]);
  const [feedback, setFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddingUser(false);
        setEditingPermissionsUser(null);
        setChangingPasswordUser(null);
        setEditingUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenEditUser = (targetUser: SystemUser) => {
    setEditingUser(targetUser);
    setEditName(targetUser.name);
    setEditUsername(targetUser.username);
    setEditPhone(targetUser.phone || '');
    setEditRole(targetUser.role);
    setEditPassword('');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim() || !editUsername.trim()) {
      alert('Por favor, preencha o nome e o usuário (login).');
      return;
    }

    const cleanUsername = editUsername
      .trim()
      .toLowerCase()
      .replace(/^@+/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.');

    await updateUser(editingUser.id, {
      name: editName.trim(),
      username: cleanUsername,
      phone: editPhone.trim() || undefined,
      role: editRole,
      password: editPassword.trim() || undefined
    });

    setFeedback(`Dados do usuário "${editName}" atualizados com sucesso!`);
    setEditingUser(null);
    setEditPassword('');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleToggleUserActive = async (targetUser: SystemUser) => {
    if (targetUser.id === 'super-admin-root') return;

    if (targetUser.active) {
      if (window.confirm(`Deseja inativar o usuário "${targetUser.name}" (@${targetUser.username})?\n\nO acesso ao sistema será suspenso, mas todo o histórico de produção e relatórios será preservado com segurança.`)) {
        await toggleUserActive(targetUser.id);
        setFeedback(`Usuário "${targetUser.name}" inativado com sucesso!`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } else {
      await toggleUserActive(targetUser.id);
      setFeedback(`Usuário "${targetUser.name}" reativado com sucesso!`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleRoleChange = (newRole: 'admin' | 'financeiro' | 'operador' | 'passador') => {
    setRole(newRole);
    if (newRole === 'passador') {
      setNewAllowedMenus(['passador-mobile']);
    } else if (newRole === 'admin') {
      setNewAllowedMenus(ALL_MENU_KEYS.map(m => m.id));
    } else if (newRole === 'financeiro') {
      setNewAllowedMenus(['dashboard', 'orders', 'finance']);
    } else {
      setNewAllowedMenus(['dashboard', 'orders', 'stock', 'clients', 'garment-catalog']);
    }
  };

  const handleOpenEditPermissions = (targetUser: SystemUser) => {
    setEditingPermissionsUser(targetUser);
    setTempAllowedMenus([...targetUser.allowedMenus]);
  };

  const handleToggleMenuInTemp = (menuId: string) => {
    setTempAllowedMenus(prev =>
      prev.includes(menuId) ? prev.filter(m => m !== menuId) : [...prev, menuId]
    );
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;

    await updateUserPermissions(editingPermissionsUser.id, tempAllowedMenus);
    setFeedback(`Permissões do usuário "${editingPermissionsUser.name}" atualizadas com sucesso!`);
    setEditingPermissionsUser(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !username.trim() || !password.trim()) {
      alert('Por favor, preencha o nome, o usuário (login) e a senha de acesso.');
      return;
    }

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/^@+/, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.');

    const created = await addUser({
      name: name.trim(),
      username: cleanUsername,
      password: password.trim(),
      phone: phone.trim() || undefined,
      role,
      allowedMenus: newAllowedMenus,
      active: true
    });

    setFeedback(`Usuário "${created.name}" cadastrado com sucesso! Login: @${cleanUsername}`);
    setName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setIsAddingUser(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser || !newPasswordInput.trim()) return;

    await updateUserPassword(changingPasswordUser.id, newPasswordInput.trim());
    setFeedback(`Senha do usuário "${changingPasswordUser.name}" alterada com sucesso!`);
    setChangingPasswordUser(null);
    setNewPasswordInput('');
    setTimeout(() => setFeedback(null), 4000);
  };

  const toggleNewMenuPerm = (menuId: string) => {
    setNewAllowedMenus(prev =>
      prev.includes(menuId) ? prev.filter(m => m !== menuId) : [...prev, menuId]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Segurança & Controle de Acesso
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Gestão de Usuários & Permissões
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre os usuários com login e senha de acesso, e defina as permissões de cada operador.
          </p>
        </div>

        <button
          onClick={() => setIsAddingUser(!isAddingUser)}
          className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {isAddingUser ? 'Fechar Formulário' : 'Novo Usuário do Sistema'}
        </button>
      </div>

      {/* Super Admin Info Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Super Admin (Acesso Mestre)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">PROTEGIDO</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Usuário mestre independente dos usuários do sistema. Possui acesso total e irrestrito a todos os módulos, menus e configurações.
            </p>
          </div>
        </div>
      </div>

      {/* Success Feedback */}
      {feedback && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Form: Add New User */}
      {isAddingUser && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 animate-in fade-in duration-200 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
            Cadastrar Novo Usuário com Senha
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ana Maria Silva"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Login / Usuário (Username) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: ana.financeiro ou carlos"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                {username.trim() && (
                  <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-mono">
                    Login de acesso: @{username.trim().toLowerCase().replace(/^@+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.')}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Ex: 81999999999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Senha de Acesso *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    placeholder="Defina a senha..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Perfil de Função (Role)
                </label>
                <select
                  value={role}
                  onChange={e => handleRoleChange(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="operador">Operador de Balcão</option>
                  <option value="financeiro">Gestor Financeiro</option>
                  <option value="passador">Passador</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>
            </div>

            {/* Menu Permission Checkboxes */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                Menus Permitidos para Exibição no Sistema:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                {ALL_MENU_KEYS.map(menu => (
                  <label key={menu.id} className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAllowedMenus.includes(menu.id)}
                      onChange={() => toggleNewMenuPerm(menu.id)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
                    />
                    <span>{menu.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Usuários Cadastrados ({usersList.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">
                <th className="p-4">Nome</th>
                <th className="p-4">Usuário (Login)</th>
                <th className="p-4">Perfil</th>
                <th className="p-4">Menus Permitidos</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.map(u => {
                const isCurrent = currentUser?.id === u.id;

                return (
                  <tr 
                    key={u.id} 
                    onDoubleClick={() => handleOpenEditUser(u)}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none"
                    title="Duplo clique para editar este usuário"
                  >
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                      {u.name}
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                      <div>@{u.username}</div>
                      {u.phone && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full font-semibold uppercase text-[10px] tracking-wider border ${
                        u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                        u.role === 'financeiro' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' :
                        u.role === 'passador' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                        'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      }`}>
                        {u.role === 'passador' ? 'Passador' : u.role === 'admin' ? 'Admin' : u.role === 'financeiro' ? 'Financeiro' : 'Operador'}
                      </span>
                    </td>
                    <td className="p-4 font-sans">
                      {u.role === 'admin' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Todos os Menus (Admin)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.allowedMenus.map(mKey => {
                            const foundMenu = ALL_MENU_KEYS.find(m => m.id === mKey);
                            return (
                              <span key={mKey} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] border border-slate-200 dark:border-slate-700">
                                {foundMenu?.label || mKey}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleUserActive(u);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors border ${
                          u.active
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-100'
                        }`}
                        title="Clique para inativar ou reativar usuário"
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-sky-200 dark:border-sky-800 shadow-sm"
                          title="Editar Dados do Usuário"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => {
                            setChangingPasswordUser(u);
                            setNewPasswordInput('');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm"
                          title="Alterar Senha do Usuário"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>Senha</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditPermissions(u)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          title="Configurar Menus Permitidos"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Menus</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleUserActive(u);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border shadow-sm ${
                            u.active
                              ? 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                          title={u.active ? 'Inativar Usuário (preserva histórico de produção)' : 'Reativar Usuário'}
                        >
                          {u.active ? (
                            <>
                              <UserX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Inativar</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Ativar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={usersList.length}
          pageSize={20}
          onPageChange={setCurrentPage}
          label="usuários"
        />
      </div>

      {/* Modal: Change Password */}
      {changingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Alterar Senha do Usuário</h3>
                  <p className="text-xs text-slate-400 font-mono">@{changingPasswordUser.username} ({changingPasswordUser.name})</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveNewPassword} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Nova Senha de Acesso:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    placeholder="Digite a nova senha..."
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setChangingPasswordUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Permissions for User */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden transition-colors">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Configurar Visibilidade de Menus</h3>
                  <p className="text-xs text-slate-400 font-mono">Usuário: {editingPermissionsUser.name} (@{editingPermissionsUser.username})</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePermissions} className="p-6 space-y-5">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Marque os menus que este usuário tem permissão para visualizar:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  {ALL_MENU_KEYS.map(m => {
                    const isChecked = tempAllowedMenus.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMenuInTemp(m.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-slate-900 dark:text-slate-100'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-semibold">{m.label}</span>
                        {isChecked ? (
                          <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Permissões
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User Details */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Editar Dados do Usuário</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {editingUser.id}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Login / Usuário *
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="Ex: 81999999999"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Perfil de Função (Role)
                </label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="operador">Operador de Balcão</option>
                  <option value="financeiro">Gestor Financeiro</option>
                  <option value="passador">Passador</option>
                  <option value="admin">Administrador Geral</option>
                </select>
                {editRole === 'passador' && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    Este usuário terá acesso ao modo Passador Mobile (Single Play).
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Nova Senha de Acesso (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual..."
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
