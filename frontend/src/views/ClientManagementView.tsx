import React, { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { Users, UserPlus, Search, Edit3, Send, Key, Lock, Unlock, CheckCircle2, Copy, X, Phone, Building } from 'lucide-react';
import { Client } from '../types';

export const ClientManagementView: React.FC = () => {
  const { clients, addClient, updateClient, resetClientPassword, toggleBlockClientPortal } = useOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [invitedClient, setInvitedClient] = useState<Client | null>(null);

  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [address, setAddress] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleOpenAddModal = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setCnpjCpf('');
    setAddress('');
    setIsAddModalOpen(true);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingClient(null);
        setInvitedClient(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCompanyName(client.companyName);
    setPhone(client.phone);
    setCnpjCpf(client.cnpjCpf || '');
    setAddress(client.address || '');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    addClient({
      name: name.trim(),
      companyName: companyName.trim() || name.trim(),
      phone: phone.trim(),
      cnpjCpf: cnpjCpf.trim(),
      address: address.trim()
    });

    setIsAddModalOpen(false);
    setFeedbackMsg(`Cliente "${name}" cadastrado com sucesso!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    updateClient(editingClient.id, {
      name: name.trim(),
      companyName: companyName.trim() || name.trim(),
      phone: phone.trim(),
      cnpjCpf: cnpjCpf.trim(),
      address: address.trim()
    });

    setEditingClient(null);
    setFeedbackMsg(`Cadastro do cliente "${name}" atualizado com sucesso!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleResetPassword = (client: Client) => {
    if (window.confirm(`Deseja resetar a senha de acesso à Central do Assinante para ${client.name}?`)) {
      resetClientPassword(client.id);
      setInvitedClient(client);
      setFeedbackMsg(`Senha resetada. Novo link de cadastro gerado para ${client.name}.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleToggleBlock = (client: Client) => {
    toggleBlockClientPortal(client.id);
    const isCurrentlyBlocked = client.portalStatus === 'bloqueado';
    setFeedbackMsg(
      isCurrentlyBlocked
        ? `Acesso à Central do Assinante DESBLOQUEADO para ${client.name}.`
        : `Acesso à Central do Assinante BLOQUEADO para ${client.name}.`
    );
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const getPortalStatusBadge = (client: Client) => {
    const status = client.portalStatus || 'pendente';
    switch (status) {
      case 'ativo':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Central Ativa (Senha Definida)
          </span>
        );
      case 'bloqueado':
        return (
          <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-md text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            Acesso Bloqueado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md text-xs font-semibold border border-amber-200 dark:border-amber-800">
            Aguardando Cadastro do Cliente
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Base de Clientes & Marcas
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Gestão de Clientes</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Edite cadastros, envie links de acesso à Central do Assinante, resete senhas ou bloqueie o acesso.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Novo Cliente
        </button>
      </div>

      {/* Success Feedback */}
      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, marca ou telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Total Cadastrado: {clients.length} cliente(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Nome do Cliente / Marca</th>
                <th className="p-4">Telefone / WhatsApp</th>
                <th className="p-4">Status da Central do Assinante</th>
                <th className="p-4 text-center">Senha</th>
                <th className="p-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClients.map(c => {
                const isBlocked = c.portalStatus === 'bloqueado';
                return (
                  <tr 
                    key={c.id} 
                    onDoubleClick={() => handleOpenEditModal(c)}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors font-sans cursor-pointer select-none"
                    title="Duplo clique para editar este cliente"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                      {c.name}
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">{c.companyName}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-800 dark:text-slate-200">{c.phone}</td>
                    <td className="p-4">{getPortalStatusBadge(c)}</td>
                    <td className="p-4 text-center font-mono">
                      {c.passwordHash ? (
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold" title="Senha mantida em sigilo (visível apenas ao cliente)">
                          ••••••••
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Não criada</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Registration Button */}
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                          title="Editar Cadastro do Cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>

                        {/* Send Access Link Button */}
                        <button
                          onClick={() => setInvitedClient(c)}
                          className="px-2.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          title="Enviar Link de Cadastro / Acesso ao Cliente"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Enviar Link
                        </button>

                        {/* Reset Password Button */}
                        {c.passwordHash && (
                          <button
                            onClick={() => handleResetPassword(c)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                            title="Resetar Senha do Cliente"
                          >
                            <Key className="w-3.5 h-3.5" />
                            Resetar Senha
                          </button>
                        )}

                        {/* Block / Unblock Access Button */}
                        <button
                          onClick={() => handleToggleBlock(c)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                            isBlocked
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                          title={isBlocked ? 'Desbloquear acesso do cliente' : 'Bloquear acesso à Central do Assinante'}
                        >
                          {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {isBlocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Client */}
      {(isAddModalOpen || editingClient) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                {editingClient ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingClient(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingClient ? handleEditSubmit : handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  placeholder="Ex: Laís Santos"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Nome da Empresa / Marca (Confecção)
                </label>
                <input
                  type="text"
                  placeholder="Ex: DISLOW / LC / B JEANS"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="text"
                    placeholder="81995329560"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpjCpf}
                    onChange={e => setCnpjCpf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Rua, Bairro - Cidade - PE"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingClient(null); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {editingClient ? 'Atualizar Cadastro' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite / Link do Portal para o Cliente */}
      {invitedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Link de Acesso para o Cliente
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Central do Assinante</p>
                </div>
              </div>
              <button onClick={() => setInvitedClient(null)} className="text-slate-400 hover:text-slate-700 text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1">
                <div><strong>Cliente:</strong> {invitedClient.name} ({invitedClient.companyName})</div>
                <div><strong>WhatsApp:</strong> {invitedClient.phone}</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Link de Cadastro & Criação de Senha (Exclusivo do Cliente):
                </label>
                <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs break-all border border-slate-800">
                  http://localhost/#/client-signup?client={invitedClient.id}&token={invitedClient.inviteToken || 'tok-demo'}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  A senha é criada e mantida em sigilo pelo próprio cliente.
                </span>
              </div>

              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 rounded-xl text-xs border border-sky-200 dark:border-sky-800 space-y-1">
                <strong className="block font-bold">Mensagem Enviada via WhatsApp:</strong>
                <p className="font-sans">
                  "Olá <strong>{invitedClient.name}</strong>, acesse o link abaixo para criar sua senha e acompanhar seus lotes de roupa e faturas na Central do Assinante da Lavanderia Mauad!"
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInvitedClient(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`http://localhost/#/client-signup?client=${invitedClient.id}`);
                  alert('Link copiado para a área de transferência!');
                }}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
