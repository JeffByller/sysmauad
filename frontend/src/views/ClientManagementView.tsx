import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Send, 
  Key, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Copy, 
  X, 
  Phone, 
  Building, 
  AlertCircle, 
  ExternalLink, 
  Check, 
  MessageSquare,
  Package,
  DollarSign,
  History,
  ShieldCheck,
  Mail,
  PhoneCall,
  AlignLeft,
  RefreshCw,
  FileText,
  Calendar,
  Filter,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Client, Order, ClientMessageLog, ClientAuditEntry } from '../types';
import { formatPhone, validatePhone, cleanPhoneDigits, formatCnpjCpf } from '../utils/phoneValidator';
import { Pagination } from '../components/common/Pagination';

type ClientModalTab = 'dados' | 'pedidos' | 'financeiro' | 'mensagens' | 'historico';

export const ClientManagementView: React.FC = () => {
  const { 
    clients, 
    orders,
    addClient, 
    updateClient, 
    resetClientPassword, 
    toggleBlockClientPortal,
    fetchClientMessages
  } = useOrders();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [invitedClient, setInvitedClient] = useState<Client | null>(null);

  // Tab ativa no modal do cliente
  const [activeModalTab, setActiveModalTab] = useState<ClientModalTab>('dados');

  // Invite Modal State
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filtros internos da Aba de Pedidos do Cliente
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'todos' | 'recebido' | 'em_andamento' | 'pronto' | 'entregue'>('todos');
  const [orderDateStart, setOrderDateStart] = useState('');
  const [orderDateEnd, setOrderDateEnd] = useState('');

  // Mensagens da Aba de Mensagens (Auditoria)
  const [clientMessages, setClientMessages] = useState<ClientMessageLog[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);

  // Estados de paginação (20 registros por página)
  const [currentPageClients, setCurrentPageClients] = useState(1);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const [currentMsgPage, setCurrentMsgPage] = useState(1);

  // Resetar páginas ao alterar filtros de busca
  useEffect(() => {
    setCurrentPageClients(1);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentOrderPage(1);
  }, [orderSearchTerm, orderStatusFilter, orderDateStart, orderDateEnd, editingClient?.id]);

  useEffect(() => {
    setCurrentMsgPage(1);
  }, [editingClient?.id, activeModalTab]);

  const searchDigits = searchTerm.replace(/\D/g, '');
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const phoneClean = cleanPhoneDigits(c.phone || '');
    const cnpjClean = (c.cnpjCpf || '').replace(/\D/g, '');
    return (
      c.name.toLowerCase().includes(term) ||
      (c.companyName && c.companyName.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (searchDigits && phoneClean.includes(searchDigits)) ||
      (searchDigits && cnpjClean.includes(searchDigits))
    );
  });

  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  }, [filteredClients]);

  const paginatedClients = useMemo(() => {
    const start = (currentPageClients - 1) * 20;
    return sortedClients.slice(start, start + 20);
  }, [sortedClients, currentPageClients]);

  const handleOpenAddModal = () => {
    setName('');
    setCompanyName('');
    setPhone('');
    setPhoneError(null);
    setPhoneTouched(false);
    setSecondaryPhone('');
    setEmail('');
    setCnpjCpf('');
    setAddress('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  useEffect(() => {
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

  // Ao abrir o modal de detalhes/edição do cliente
  const handleOpenEditModal = (client: Client, defaultTab: ClientModalTab = 'dados') => {
    setEditingClient(client);
    setActiveModalTab(defaultTab);
    setName(client.name || '');
    setCompanyName(client.companyName || '');
    setPhone(formatPhone(client.phone || ''));
    setPhoneError(null);
    setPhoneTouched(false);
    setSecondaryPhone(client.secondaryPhone ? formatPhone(client.secondaryPhone) : '');
    setEmail(client.email || '');
    setCnpjCpf(formatCnpjCpf(client.cnpjCpf || ''));
    setAddress(client.address || '');
    setNotes(client.notes || '');

    // Reset filtros de pedidos
    setOrderSearchTerm('');
    setOrderStatusFilter('todos');
    setOrderDateStart('');
    setOrderDateEnd('');
  };

  // Carregar mensagens quando a aba de mensagens for selecionada ou quando o cliente for alterado
  useEffect(() => {
    if (editingClient && activeModalTab === 'mensagens') {
      loadMessagesForClient(editingClient);
    }
  }, [editingClient?.id, activeModalTab]);

  const loadMessagesForClient = async (client: Client) => {
    setLoadingMessages(true);
    try {
      const msgs = await fetchClientMessages(client.id, client.phone);
      setClientMessages(msgs);
    } catch (err) {
      console.error('Erro ao buscar mensagens do cliente:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Sincronizar o editingClient com a lista do contexto quando for atualizado
  useEffect(() => {
    if (editingClient) {
      const updated = clients.find(c => c.id === editingClient.id);
      if (updated) {
        setEditingClient(updated);
      }
    }
  }, [clients]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);

    if (phoneTouched || cleanPhoneDigits(formatted).length >= 10) {
      const validation = validatePhone(formatted);
      setPhoneError(validation.isValid ? null : (validation.error || 'Número de WhatsApp inválido.'));
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (!phone.trim()) {
      setPhoneError('O número de WhatsApp / Celular é obrigatório.');
      return;
    }
    const validation = validatePhone(phone);
    setPhoneError(validation.isValid ? null : (validation.error || 'Número de WhatsApp inválido.'));
  };

  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpjCpf(formatCnpjCpf(e.target.value));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      setPhoneTouched(true);
      setPhoneError(phoneValidation.error || 'Número de WhatsApp / Celular inválido.');
      return;
    }

    addClient({
      name: name.trim(),
      companyName: companyName.trim() || name.trim(),
      phone: formatPhone(phone),
      secondaryPhone: secondaryPhone.trim() ? formatPhone(secondaryPhone) : undefined,
      email: email.trim() || undefined,
      cnpjCpf: cnpjCpf.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined
    });

    setIsAddModalOpen(false);
    setFeedbackMsg(`Cliente "${name}" cadastrado com sucesso!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleEditSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!editingClient || !name.trim()) {
      if (!name.trim()) {
        setActiveModalTab('dados');
        alert('Por favor, informe o Nome Completo / Razão Social do cliente.');
      }
      return;
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      setPhoneTouched(true);
      setPhoneError(phoneValidation.error || 'Número de WhatsApp / Celular inválido.');
      setActiveModalTab('dados');
      return;
    }

    const operator = user?.name || 'Administrador';

    updateClient(editingClient.id, {
      name: name.trim(),
      companyName: companyName.trim() || name.trim(),
      phone: formatPhone(phone),
      secondaryPhone: secondaryPhone.trim() ? formatPhone(secondaryPhone) : '',
      email: email.trim(),
      cnpjCpf: cnpjCpf.trim(),
      address: address.trim(),
      notes: notes.trim(),
      operatorName: operator
    });

    setFeedbackMsg(`Cadastro do cliente "${name}" atualizado com sucesso e registrado na auditoria!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const getClientSignupUrl = (client: Client) => {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/$/, '');
    return `${origin}${path}/#/client-signup?client=${encodeURIComponent(client.id)}`;
  };

  const handleOpenInvite = (client: Client) => {
    setInvitedClient(client);
    setInviteStatus(null);
    setCopiedLink(false);
    setCopiedMessage(false);

    const url = getClientSignupUrl(client);
    const msg = `Olá *${client.name}* (${client.companyName || 'Cliente'}), aqui é da Lavanderia Mauad! 👋\n\nAcesse o link abaixo para criar sua senha exclusiva na nossa *Central do Assinante* e acompanhar seus pedidos, lotes e faturas em tempo real:\n\n🔗 ${url}`;
    setInviteMessage(msg);
  };

  const handleSendWhatsAppInvite = async () => {
    if (!invitedClient) return;
    setSendingInvite(true);
    setInviteStatus(null);

    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: invitedClient.phone,
          text: inviteMessage,
          eventType: 'convite_portal',
          clientId: invitedClient.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteStatus({
          type: 'success',
          msg: `Mensagem enviada com sucesso para o WhatsApp de ${invitedClient.name}!`
        });
      } else {
        setInviteStatus({
          type: 'error',
          msg: data.error || 'Falha ao disparar pelo WhatsApp. Você pode clicar em "Abrir no WhatsApp" para enviar manualmente.'
        });
      }
    } catch (err: any) {
      setInviteStatus({
        type: 'error',
        msg: 'Não foi possível conectar à API de WhatsApp. Utilize o botão "Abrir no WhatsApp" para enviar direto.'
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopySignupLink = () => {
    if (!invitedClient) return;
    const url = getClientSignupUrl(invitedClient);
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard?.writeText(inviteMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  const handleResetPassword = (client: Client) => {
    if (window.confirm(`Deseja resetar a senha de acesso à Central do Assinante para ${client.name}?`)) {
      resetClientPassword(client.id);
      handleOpenInvite(client);
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

  // Pedidos relacionados especificamente ao cliente em edição (Tarefa 4)
  const clientOrders = useMemo(() => {
    if (!editingClient) return [];
    return orders.filter(o => 
      o.clientId === editingClient.id || 
      (o.clientName && o.clientName.trim().toLowerCase() === editingClient.name.trim().toLowerCase())
    );
  }, [editingClient, orders]);

  // Pedidos filtrados na aba Pedidos do cliente
  const filteredClientOrders = useMemo(() => {
    return clientOrders.filter(order => {
      // Filtro de texto (OS ou detalhes)
      if (orderSearchTerm) {
        const term = orderSearchTerm.toLowerCase();
        const matchesOS = order.osNumber.toLowerCase().includes(term);
        const matchesItems = order.items?.some(it => 
          it.clothingType?.toLowerCase().includes(term) || 
          it.process?.toLowerCase().includes(term) ||
          (it.corteOs && it.corteOs.toLowerCase().includes(term))
        );
        if (!matchesOS && !matchesItems) return false;
      }

      // Filtro de Status
      if (orderStatusFilter !== 'todos') {
        if (orderStatusFilter === 'recebido' && order.status !== 'recebido') return false;
        if (orderStatusFilter === 'em_andamento') {
          const emAndamento = ['lavagem', 'secagem', 'passadoria'].includes(order.status);
          if (!emAndamento) return false;
        }
        if (orderStatusFilter === 'pronto' && order.status !== 'pronto') return false;
        if (orderStatusFilter === 'entregue' && order.status !== 'entregue') return false;
      }

      // Filtro de Data Início
      if (orderDateStart) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (orderDate < orderDateStart) return false;
      }

      // Filtro de Data Fim
      if (orderDateEnd) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (orderDate > orderDateEnd) return false;
      }

      return true;
    });
  }, [clientOrders, orderSearchTerm, orderStatusFilter, orderDateStart, orderDateEnd]);

  const sortedClientOrders = useMemo(() => {
    return [...filteredClientOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredClientOrders]);

  const paginatedClientOrders = useMemo(() => {
    const start = (currentOrderPage - 1) * 20;
    return sortedClientOrders.slice(start, start + 20);
  }, [sortedClientOrders, currentOrderPage]);

  const sortedClientMessages = useMemo(() => {
    return [...clientMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clientMessages]);

  const paginatedClientMessages = useMemo(() => {
    const start = (currentMsgPage - 1) * 20;
    return sortedClientMessages.slice(start, start + 20);
  }, [sortedClientMessages, currentMsgPage]);

  // Totais financeiros do cliente (Aba Financeiro)
  const clientFinanceSummary = useMemo(() => {
    const totalOrdersCount = clientOrders.length;
    let totalGross = 0;
    let totalPaid = 0;
    let totalPending = 0;

    clientOrders.forEach(o => {
      const val = o.totalServiceValue || 0;
      const discount = o.discountAmount || 0;
      const net = Math.max(0, val - discount);
      totalGross += val;
      if (o.paymentStatus === 'pago') {
        totalPaid += (o.finalPaidAmount || net);
      } else {
        totalPending += net;
      }
    });

    return { totalOrdersCount, totalGross, totalPaid, totalPending };
  }, [clientOrders]);

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
            Edite cadastros, consulte pedidos, histórico financeiro, auditoria de mensagens e histórico de alterações.
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
              placeholder="Buscar por nome, marca, telefone, e-mail ou CNPJ..."
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
                <th className="p-4">Contatos (WhatsApp / E-mail)</th>
                <th className="p-4">Status da Central do Assinante</th>
                <th className="p-4 text-center">Senha</th>
                <th className="p-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedClients.map(c => {
                const isBlocked = c.portalStatus === 'bloqueado';
                return (
                  <tr 
                    key={c.id} 
                    onDoubleClick={() => handleOpenEditModal(c, 'dados')}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors font-sans cursor-pointer select-none"
                    title="Duplo clique para abrir a ficha completa deste cliente"
                  >
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                      {c.name}
                      <span className="text-xs text-slate-500 dark:text-slate-400 block font-normal">{c.companyName}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{formatPhone(c.phone) || c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-sans mt-0.5">
                          <Mail className="w-3 h-3 text-sky-500" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
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
                        {/* Botão Ver / Editar Ficha do Cliente com Abas */}
                        <button
                          onClick={() => handleOpenEditModal(c, 'dados')}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                          title="Abrir Cadastro, Pedidos, Financeiro e Histórico"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Abrir Ficha</span>
                        </button>

                        {/* Send Access Link Button */}
                        <button
                          onClick={() => handleOpenInvite(c)}
                          className="px-2.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          title="Enviar Link de Cadastro / Acesso ao Cliente"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Link</span>
                        </button>

                        {/* Reset Password Button */}
                        {c.passwordHash && (
                          <button
                            onClick={() => handleResetPassword(c)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                            title="Resetar Senha do Cliente"
                          >
                            <Key className="w-3.5 h-3.5" />
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
          currentPage={currentPageClients}
          totalItems={filteredClients.length}
          pageSize={20}
          onPageChange={setCurrentPageClients}
          label="clientes"
        />
      </div>

      {/* ─── MODAL PRINCIPAL DO CLIENTE COM 5 ABAS (Tarefas 3, 4, 5 e 6) ──────── */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full h-[88vh] min-h-[560px] max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
            
            {/* Header do Cliente */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">
                      {editingClient.name}
                    </h3>
                    <span className="text-xs font-normal text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-800">
                      {editingClient.companyName || 'Cliente'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-mono mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {formatPhone(editingClient.phone)}
                    </span>
                    {editingClient.email && (
                      <span className="flex items-center gap-1 font-sans">
                        <Mail className="w-3 h-3 text-sky-400" />
                        {editingClient.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  title="Salvar alterações do cliente"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenInvite(editingClient)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold transition-colors"
                  title="Enviar Link de Acesso"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Acesso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-base"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* BARRA DE NAVEGAÇÃO POR ABAS (5 Abas Obrigatórias) */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-6 gap-1 overflow-x-auto shrink-0 select-none">
              <button
                type="button"
                onClick={() => setActiveModalTab('dados')}
                className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'dados'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Dados do Cliente</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('pedidos')}
                className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'pedidos'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Pedidos ({clientOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('financeiro')}
                className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'financeiro'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Financeiro</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('mensagens')}
                className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'mensagens'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Mensagens (Auditoria)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab('historico')}
                className={`py-3 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'historico'
                    ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Histórico de Alterações ({(editingClient.auditHistory || []).length})</span>
              </button>
            </div>

            {/* CORPO DO MODAL (Conteúdo conforme a aba ativa) */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 font-sans">

              {/* ─── ABA 1: DADOS DO CLIENTE (com E-mail, Segundo Contato e Observação) ─── */}
              {activeModalTab === 'dados' && (
                <form onSubmit={handleEditSubmit} className="space-y-4 max-w-3xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Nome Completo / Razão Social <span className="text-rose-500">*</span>
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
                        Nome da Empresa / Marca Fantasia
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: DISLOW / LC / B JEANS"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Telefone Principal / WhatsApp */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        WhatsApp Principal <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="(81) 99532-9560"
                        value={phone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 transition-colors ${
                          phoneError
                            ? 'border-rose-500 dark:border-rose-600 focus:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                            : validatePhone(phone).isValid && cleanPhoneDigits(phone).length >= 10
                            ? 'border-emerald-500 dark:border-emerald-600 focus:ring-emerald-500'
                            : 'border-slate-300 dark:border-slate-700 focus:ring-sky-500'
                        }`}
                        required
                      />
                      {phoneError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    {/* Segundo Contato (Novo Campo - Tarefa 3) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                        <span>Segundo Contato (Opcional)</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={15}
                        placeholder="(81) 98888-2222 ou fixo"
                        value={secondaryPhone}
                        onChange={e => setSecondaryPhone(formatPhone(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* E-mail (Novo Campo - Tarefa 3) */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>E-mail do Cliente / Financeiro</span>
                      </label>
                      <input
                        type="email"
                        placeholder="contato@empresa.com.br"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {/* CNPJ ou CPF */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        CNPJ ou CPF
                      </label>
                      <input
                        type="text"
                        maxLength={18}
                        placeholder="00.000.000/0001-00"
                        value={cnpjCpf}
                        onChange={handleCnpjCpfChange}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Endereço Completo */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Endereço Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro - Cidade - PE"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Observação (Novo Campo - Tarefa 3) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                      <span>Observações Internas</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Observações importantes, regras de entrega, detalhes de faturamento ou contatos operacionais..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Todas as alterações feitas ficam permanentemente salvas na aba de Auditoria.
                    </span>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Salvar
                    </button>
                  </div>
                </form>
              )}

              {/* ─── ABA 2: PEDIDOS DO CLIENTE (Tarefa 4) ─── */}
              {activeModalTab === 'pedidos' && (
                <div className="space-y-4">
                  {/* Barra de Filtros dos Pedidos (Mesmo padrão da tela geral de pedidos) */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
                    {/* Busca */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filtrar por Nº da OS ou peça..."
                        value={orderSearchTerm}
                        onChange={e => setOrderSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                      />
                    </div>

                    {/* Filtro de Status */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px] font-semibold shrink-0">Status:</span>
                      <select
                        value={orderStatusFilter}
                        onChange={e => setOrderStatusFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <option value="todos">Todos os Status</option>
                        <option value="recebido">Recebido</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="pronto">Pronto</option>
                        <option value="entregue">Entregue</option>
                      </select>
                    </div>

                    {/* Filtro de Datas */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="date"
                        value={orderDateStart}
                        onChange={e => setOrderDateStart(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px]"
                        title="Data Inicial"
                      />
                      <span className="text-slate-400">até</span>
                      <input
                        type="date"
                        value={orderDateEnd}
                        onChange={e => setOrderDateEnd(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px]"
                        title="Data Final"
                      />
                      {(orderDateStart || orderDateEnd || orderSearchTerm || orderStatusFilter !== 'todos') && (
                        <button
                          onClick={() => {
                            setOrderSearchTerm('');
                            setOrderStatusFilter('todos');
                            setOrderDateStart('');
                            setOrderDateEnd('');
                          }}
                          className="px-2 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabela de Pedidos do Cliente */}
                  {filteredClientOrders.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhum pedido encontrado para este cliente.</p>
                      <p className="text-[11px] mt-0.5">Tente ajustar os filtros de busca, status ou data acima.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">OS</th>
                            <th className="p-3">Data / Hora</th>
                            <th className="p-3 text-center">Peças</th>
                            <th className="p-3 text-center">Peso</th>
                            <th className="p-3">Status da Produção</th>
                            <th className="p-3">Status Financeiro</th>
                            <th className="p-3 text-right">Valor Líquido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {paginatedClientOrders.map(o => {
                            const val = o.totalServiceValue || 0;
                            const discount = o.discountAmount || 0;
                            const net = Math.max(0, val - discount);

                            return (
                              <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{o.osNumber}</td>
                                <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">
                                  {new Date(o.createdAt).toLocaleDateString('pt-BR')} às {new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-3 text-center">{o.estimatedPieceCount || 0}</td>
                                <td className="p-3 text-center">{(o.totalWeightKg || 0).toFixed(1)} kg</td>
                                <td className="p-3 font-sans">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    o.status === 'pronto' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                    o.status === 'entregue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                    o.status === 'recebido' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                    'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  }`}>
                                    {o.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="p-3 font-sans">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.paymentStatus === 'pago' 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}>
                                    {o.paymentStatus === 'pago' ? 'PAGO' : 'ABERTO'}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                                  {net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <Pagination
                        currentPage={currentOrderPage}
                        totalItems={filteredClientOrders.length}
                        pageSize={20}
                        onPageChange={setCurrentOrderPage}
                        label="pedidos"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── ABA 3: FINANCEIRO DO CLIENTE ─── */}
              {activeModalTab === 'financeiro' && (
                <div className="space-y-5">
                  {/* Cards de Resumo Financeiro */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Total Faturado ({clientFinanceSummary.totalOrdersCount} OSs)
                      </span>
                      <strong className="text-lg text-slate-900 dark:text-slate-100">
                        {clientFinanceSummary.totalGross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block tracking-wider">
                        Total Quitado / Pago
                      </span>
                      <strong className="text-lg text-emerald-700 dark:text-emerald-400">
                        {clientFinanceSummary.totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60">
                      <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block tracking-wider">
                        Saldo Em Aberto (A Receber)
                      </span>
                      <strong className="text-lg text-amber-700 dark:text-amber-400">
                        {clientFinanceSummary.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>
                  </div>

                  {/* Lista de Ordens de Serviço do Cliente */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-600" />
                      Extrato Financeiro de Ordens de Serviço
                    </h4>

                    {clientOrders.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum faturamento registrado para este cliente.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-3">OS</th>
                              <th className="p-3">Data Emissão</th>
                              <th className="p-3 text-right">Valor Bruto</th>
                              <th className="p-3 text-right">Desconto</th>
                              <th className="p-3 text-right">Valor Quitado</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3">Quem Recebeu / Baixa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {clientOrders.map(o => (
                              <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{o.osNumber}</td>
                                <td className="p-3 text-[11px] text-slate-500">
                                  {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-3 text-right">
                                  {(o.totalServiceValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="p-3 text-right text-rose-600 dark:text-rose-400">
                                  {(o.discountAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                                  {(o.finalPaidAmount || (o.paymentStatus === 'pago' ? (o.totalServiceValue || 0) - (o.discountAmount || 0) : 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="p-3 text-center font-sans">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    o.paymentStatus === 'pago'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}>
                                    {o.paymentStatus === 'pago' ? 'PAGO' : 'ABERTO'}
                                  </span>
                                </td>
                                <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                                  {o.paymentStatus === 'pago' ? (
                                    <span>
                                      <strong>{o.receiverName || o.paidByOperator || 'Caixa'}</strong>
                                      {o.paidAt && ` em ${new Date(o.paidAt).toLocaleDateString('pt-BR')}`}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Pendente</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── ABA 4: HISTÓRICO DE MENSAGENS ENVIADAS PELA AUTOMAÇÃO (Tarefa 5) ─── */}
              {activeModalTab === 'mensagens' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        Registro Permanente de Mensagens Disparadas (Auditoria)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Esta tela é somente para auditoria. Registra todos os envios automáticos e manuais enviados a este cliente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => editingClient && loadMessagesForClient(editingClient)}
                      disabled={loadingMessages}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Atualizar mensagens"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </button>
                  </div>

                  {loadingMessages ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
                      Carregando auditoria de mensagens...
                    </div>
                  ) : clientMessages.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Nenhuma mensagem automática foi disparada para este cliente até o momento.
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Quando ordens de serviço ficarem prontas ou convites forem enviados, o registro histórico permanente aparecerá aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 font-sans">
                      {paginatedClientMessages.map(msg => {
                        const isExpanded = expandedMsgId === msg.id;

                        return (
                          <div 
                            key={msg.id}
                            className={`p-3.5 rounded-xl border transition-all text-xs ${
                              msg.status === 'enviado'
                                ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                : msg.status === 'falha'
                                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {/* Cabeçalho do Card da Mensagem */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {msg.channel ? msg.channel.toUpperCase() : 'WHATSAPP'}
                                </span>
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                  Evento: <strong className="text-slate-900 dark:text-slate-100">{msg.eventType || 'Disparo Automático'}</strong>
                                </span>
                              </div>

                              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(msg.createdAt).toLocaleDateString('pt-BR')} às {new Date(msg.createdAt).toLocaleTimeString('pt-BR')}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  msg.status === 'enviado'
                                    ? 'bg-emerald-600 text-white'
                                    : msg.status === 'falha'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-600 text-white'
                                }`}>
                                  {msg.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Conteúdo da Mensagem */}
                            <div className="pt-2 font-mono text-xs text-slate-800 dark:text-slate-200">
                              <div className={`whitespace-pre-wrap leading-relaxed ${!isExpanded && msg.messageText.length > 250 ? 'line-clamp-3' : ''}`}>
                                {msg.messageText}
                              </div>
                              {msg.messageText.length > 250 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline mt-1 font-sans flex items-center gap-0.5"
                                >
                                  {isExpanded ? (
                                    <><span>Recolher</span><ChevronUp className="w-3 h-3" /></>
                                  ) : (
                                    <><span>Ver mensagem completa</span><ChevronDown className="w-3 h-3" /></>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Informações de Erro se houver */}
                            {msg.errorDetails && (
                              <div className="mt-2 p-2 bg-rose-100 dark:bg-rose-950/80 rounded-lg text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-1.5 font-sans">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                                <span><strong>Falha no envio:</strong> {msg.errorDetails}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <Pagination
                        currentPage={currentMsgPage}
                        totalItems={clientMessages.length}
                        pageSize={20}
                        onPageChange={setCurrentMsgPage}
                        label="mensagens"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ─── ABA 5: HISTÓRICO DE ALTERAÇÕES DO CADASTRO (Tarefa 6) ─── */}
              {activeModalTab === 'historico' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-sky-600" />
                      Trilha de Auditoria do Cadastro do Cliente
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Qualquer edição em dados cadastrais (telefone, e-mail, observação, etc.) é preservada permanentemente com dados de quem alterou e data/hora.
                    </p>
                  </div>

                  {(!editingClient.auditHistory || editingClient.auditHistory.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        Nenhuma alteração registrada após a criação deste cadastro.
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Os dados do cliente permanecem exatamente como cadastrados originalmente.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 font-mono text-xs">
                      {[...editingClient.auditHistory].reverse().map((entry, idx) => (
                        <div 
                          key={idx}
                          className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                            <span className="font-bold text-sky-700 dark:text-sky-300 text-xs uppercase tracking-wider font-sans flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              Campo: {entry.field}
                            </span>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>
                                Alterado por: <strong className="text-slate-800 dark:text-slate-200">{entry.operator || 'Administrador'}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Comparativo Antes e Depois */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900/60">
                              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block mb-0.5">
                                Antes:
                              </span>
                              <span className="text-slate-800 dark:text-slate-200 break-words">
                                {entry.previousValue || <em className="text-slate-400">(vazio / não informado)</em>}
                              </span>
                            </div>

                            <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                                Depois:
                              </span>
                              <span className="text-slate-900 dark:text-slate-100 font-bold break-words">
                                {entry.newValue || <em className="text-slate-400">(em branco)</em>}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer do Modal do Cliente */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Cadastro ID: <code className="font-mono text-[11px]">{editingClient.id}</code>
              </span>
              <span className="text-[11px] text-slate-400">
                {editingClient.name} • {editingClient.companyName || 'Cliente'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CADASTRAR NOVO CLIENTE (com E-mail, Segundo Contato e Observação) ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                Cadastrar Novo Cliente
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 overflow-y-auto space-y-4 font-sans text-xs flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Nome Completo / Razão Social <span className="text-rose-500">*</span>
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
                  Nome da Empresa / Marca Fantasia
                </label>
                <input
                  type="text"
                  placeholder="Ex: DISLOW / LC / B JEANS"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    WhatsApp Principal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(81) 99532-9560"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 transition-colors ${
                      phoneError
                        ? 'border-rose-500 dark:border-rose-600 focus:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                        : validatePhone(phone).isValid && cleanPhoneDigits(phone).length >= 10
                        ? 'border-emerald-500 dark:border-emerald-600 focus:ring-emerald-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-sky-500'
                    }`}
                    required
                  />

                  {phoneError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{phoneError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Segundo Contato (Opcional)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="(81) 98888-2222"
                    value={secondaryPhone}
                    onChange={e => setSecondaryPhone(formatPhone(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    E-mail do Cliente
                  </label>
                  <input
                    type="email"
                    placeholder="contato@cliente.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="00.000.000/0001-00"
                    value={cnpjCpf}
                    onChange={handleCnpjCpfChange}
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

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Observações operacionais ou regras de faturamento..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONVITE / LINK DO PORTAL DO CLIENTE ─── */}
      {invitedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 text-slate-900 dark:text-slate-100">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Enviar Acesso à Central do Assinante
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Envie o link exclusivo de criação de senha para o cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInvitedClient(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Card Resumo do Cliente */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block text-sm">
                    {invitedClient.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {invitedClient.companyName || 'Cliente'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">WhatsApp</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatPhone(invitedClient.phone) || invitedClient.phone}
                  </span>
                </div>
              </div>

              {/* Link de Cadastro Direto */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Link Exclusivo do Cliente
                  </label>
                  <button
                    type="button"
                    onClick={handleCopySignupLink}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Link Copiado!' : 'Copiar apenas link'}
                  </button>
                </div>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 break-all border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="truncate">{getClientSignupUrl(invitedClient)}</span>
                </div>
              </div>

              {/* Mensagem do WhatsApp */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Mensagem a Enviar (WhatsApp)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyFullMessage}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold flex items-center gap-1"
                  >
                    {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedMessage ? 'Mensagem Copiada!' : 'Copiar mensagem'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed text-slate-900 dark:text-slate-100 font-sans"
                />
              </div>

              {/* Status do Envio (Feedback) */}
              {inviteStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    inviteStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {inviteStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">{inviteStatus.msg}</div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInvitedClient(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors order-last sm:order-first"
              >
                Fechar
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <a
                  href={`https://api.whatsapp.com/send?phone=55${cleanPhoneDigits(invitedClient.phone)}&text=${encodeURIComponent(inviteMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  title="Abre diretamente a conversa no WhatsApp Web ou aplicativo do celular"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no WhatsApp
                </a>

                <button
                  type="button"
                  onClick={handleSendWhatsAppInvite}
                  disabled={sendingInvite}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  title="Disparar mensagem direta via conexão oficial da lavanderia"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingInvite ? 'Enviando WhatsApp...' : 'Disparar pelo WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
