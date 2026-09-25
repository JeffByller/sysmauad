import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Order, 
  OrderStatus, 
  Passador, 
  PassadorLog, 
  WhatsAppNotification, 
  ChemicalDose, 
  ChemicalStockItem, 
  Client, 
  GarmentProcessCatalogItem, 
  InsumoEntry, 
  Supplier, 
  ReceitaLavado,
  ClientMessageLog,
  PaymentHistoryEntry
} from '../types';
import { useAuth } from './AuthContext';

interface OrderContextType {
  orders: Order[];
  passadores: Passador[];
  stockItems: ChemicalStockItem[];
  clients: Client[];
  garmentCatalog: GarmentProcessCatalogItem[];
  whatsAppModalData: WhatsAppNotification | null;
  markReadyOrder: Order | null;
  insumoEntries: InsumoEntry[];
  suppliers: Supplier[];
  receitasLavado: ReceitaLavado[];
  closeWhatsAppModal: () => void;
  openMarkReadyModal: (order: Order) => void;
  closeMarkReadyModal: () => void;
  confirmOrderReady: (orderId: string, customMessage: string, operatorName?: string) => void;
  
  createOrder: (newOrderData: Omit<Order, 'id' | 'osNumber' | 'createdAt' | 'status' | 'totalIronedPieces' | 'ironingLogs' | 'history'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, operatorName: string, note?: string) => void;
  registerIroning: (orderId: string, passadorId: string, passadorName: string, piecesIroned: number) => { success: boolean; message: string };
  registerNewPassador: (name: string, phone?: string) => Passador;
  updatePassador: (id: string, data: Partial<Passador>) => Promise<{ success: boolean; message: string }>;
  addStockItem: (item: Omit<ChemicalStockItem, 'id'>) => ChemicalStockItem;
  updateStockQuantity: (id: string, newQuantity: number) => void;
  updateStockItem: (id: string, updated: Partial<ChemicalStockItem>) => void;
  addClient: (clientData: Omit<Client, 'id' | 'totalOrders'>) => Client;
  updateClient: (id: string, updatedData: Partial<Client> & { operatorName?: string }) => void;
  resetClientPassword: (clientId: string) => void;
  toggleBlockClientPortal: (clientId: string) => void;
  setClientPasswordByToken: (clientId: string, rawPassword: string) => boolean;
  addGarmentCatalogItem: (item: Omit<GarmentProcessCatalogItem, 'id'>) => GarmentProcessCatalogItem;
  updateGarmentCatalogItem: (id: string, updated: Partial<GarmentProcessCatalogItem>) => void;
  deleteGarmentCatalogItem: (id: string) => void;
  payInvoiceOrder: (orderId: string, discountAmount: number, paymentMethod: string, operatorName?: string, receiverName?: string, notes?: string, docRef?: string) => void;
  payMultipleInvoiceOrders: (orderIds: string[], totalDiscountAmount?: number, paymentMethod?: string, operatorName?: string, unifiedDocRef?: string, receiverName?: string, notes?: string) => void;
  fetchClientMessages: (clientId: string, phone?: string) => Promise<ClientMessageLog[]>;
  auditViewBoleto: (params: { boletoRef: string; orderIds: string[]; osNumbers: string[]; clientName?: string; userName?: string; }) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrderByOS: (osNumber: string) => Order | undefined;
  calculateChemicals: (totalWeightKg: number, processes: string[]) => ChemicalDose[];
  // Insumos & Fornecedores
  addInsumoEntry: (entry: Omit<InsumoEntry, 'id'>) => InsumoEntry;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  // Receitas de Lavado
  addReceitaLavado: (receita: Omit<ReceitaLavado, 'id' | 'createdAt' | 'updatedAt'>) => ReceitaLavado;
  updateReceitaLavado: (id: string, updated: Partial<Omit<ReceitaLavado, 'id' | 'createdAt'>>) => void;
  deleteReceitaLavado: (id: string) => void;
  refreshData: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usersList, addUser } = useAuth();

  // Estados principais conectados diretamente ao PostgreSQL via API
  const [orders, setOrders] = useState<Order[]>([]);
  const [passadores, setPassadores] = useState<Passador[]>([]);
  const [stockItems, setStockItems] = useState<ChemicalStockItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [garmentCatalog, setGarmentCatalog] = useState<GarmentProcessCatalogItem[]>([]);
  const [insumoEntries, setInsumoEntries] = useState<InsumoEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [receitasLavado, setReceitasLavado] = useState<ReceitaLavado[]>([]);

  const [whatsAppModalData, setWhatsAppModalData] = useState<WhatsAppNotification | null>(null);
  const [markReadyOrder, setMarkReadyOrder] = useState<Order | null>(null);

  // Função central para carregar dados do banco PostgreSQL
  const refreshData = async () => {
    try {
      const [
        ordersRes,
        passadoresRes,
        stockRes,
        clientsRes,
        garmentRes,
        suppliersRes,
        insumosRes,
        receitasRes
      ] = await Promise.all([
        fetch('/api/orders').catch(() => null),
        fetch('/api/passadores').catch(() => null),
        fetch('/api/stock').catch(() => null),
        fetch('/api/clients').catch(() => null),
        fetch('/api/garment-catalog').catch(() => null),
        fetch('/api/suppliers').catch(() => null),
        fetch('/api/insumo-entries').catch(() => null),
        fetch('/api/receitas-lavado').catch(() => null)
      ]);

      if (ordersRes?.ok) {
        const data = await ordersRes.json();
        if (Array.isArray(data)) setOrders(data);
      }
      if (passadoresRes?.ok) {
        const data = await passadoresRes.json();
        if (Array.isArray(data)) setPassadores(data);
      }
      if (stockRes?.ok) {
        const data = await stockRes.json();
        if (Array.isArray(data)) setStockItems(data);
      }
      if (clientsRes?.ok) {
        const data = await clientsRes.json();
        if (Array.isArray(data)) setClients(data);
      }
      if (garmentRes?.ok) {
        const data = await garmentRes.json();
        if (Array.isArray(data)) setGarmentCatalog(data);
      }
      if (suppliersRes?.ok) {
        const data = await suppliersRes.json();
        if (Array.isArray(data)) setSuppliers(data);
      }
      if (insumosRes?.ok) {
        const data = await insumosRes.json();
        if (Array.isArray(data)) setInsumoEntries(data);
      }
      if (receitasRes?.ok) {
        const data = await receitasRes.json();
        if (Array.isArray(data)) setReceitasLavado(data);
      }
    } catch (err) {
      console.error('[OrderContext] Erro ao carregar dados do PostgreSQL:', err);
    }
  };

  // Carrega todos os dados do banco no carregamento inicial e limpa qualquer vestígio de localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('sysmauad-orders');
      localStorage.removeItem('sysmauad-passadores');
      localStorage.removeItem('sysmauad-stock');
      localStorage.removeItem('sysmauad-clients');
      localStorage.removeItem('sysmauad-garment-catalog');
      localStorage.removeItem('sysmauad-suppliers');
      localStorage.removeItem('sysmauad-insumo-entries');
      localStorage.removeItem('sysmauad-receitas');
    } catch {}

    refreshData();
  }, []);

  // Sincroniza passadores com a lista de usuários do sistema que possuem a role 'passador'
  useEffect(() => {
    if (usersList.length === 0) return;
    setPassadores(prev => {
      const passadorUsers = usersList.filter(u => u.role === 'passador');
      const updatedList: Passador[] = [];

      passadorUsers.forEach(u => {
        const existing = prev.find(p => p.id === u.id || p.name.toLowerCase() === u.name.toLowerCase());
        if (existing) {
          updatedList.push({
            ...existing,
            id: u.id,
            name: u.name,
            phone: u.phone || existing.phone,
            ratePerPiece: existing.ratePerPiece !== undefined ? existing.ratePerPiece : 0.15,
            active: u.active
          });
        } else {
          updatedList.push({
            id: u.id,
            name: u.name,
            phone: u.phone,
            totalPiecesIroned: 0,
            ratePerPiece: 0.15,
            createdAt: new Date().toISOString().split('T')[0],
            active: u.active
          });
        }
      });

      // Mantém passadores existentes para integridade histórica de logs
      prev.forEach(p => {
        if (!updatedList.some(item => item.id === p.id)) {
          updatedList.push(p);
        }
      });

      return updatedList;
    });
  }, [usersList]);

  const closeWhatsAppModal = () => {
    setWhatsAppModalData(null);
  };

  const openMarkReadyModal = (order: Order) => {
    setMarkReadyOrder(order);
  };

  const closeMarkReadyModal = () => {
    setMarkReadyOrder(null);
  };

  const confirmOrderReady = (orderId: string, customMessage: string, operatorName: string = 'Operador') => {
    const updatedHistoryItem = {
      timestamp: new Date().toISOString(),
      status: 'pronto' as OrderStatus,
      operator: operatorName,
      note: `Pedido marcado como PRONTO. Notificação: "${customMessage}"`
    };

    setOrders(prev => prev.map(ord => {
      if (ord.id !== orderId) return ord;
      return {
        ...ord,
        status: 'pronto' as OrderStatus,
        history: [...ord.history, updatedHistoryItem]
      };
    }));

    setMarkReadyOrder(null);

    // Persiste no banco de dados via API
    fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'pronto',
        operatorName,
        note: `Pedido marcado como PRONTO. Notificação: "${customMessage}"`
      })
    }).catch(err => console.error('[OrderContext] Erro ao atualizar status para pronto:', err));
  };

  // Cadastro de insumo químico
  const addStockItem = (item: Omit<ChemicalStockItem, 'id'>): ChemicalStockItem => {
    const tempId = `stk-${Date.now()}`;
    const newItem: ChemicalStockItem = { ...item, id: tempId };
    setStockItems(prev => [...prev, newItem]);

    fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setStockItems(prev => prev.map(s => s.id === tempId ? saved : s));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao cadastrar insumo no banco:', err));

    return newItem;
  };

  const updateStockQuantity = (id: string, newQuantity: number) => {
    setStockItems(prev => prev.map(item => item.id === id ? { ...item, currentStock: newQuantity } : item));

    fetch(`/api/stock/${id}/quantity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity })
    }).catch(err => console.error('[OrderContext] Erro ao atualizar quantidade do insumo no banco:', err));
  };

  const updateStockItem = (id: string, updated: Partial<ChemicalStockItem>) => {
    setStockItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));

    fetch(`/api/stock/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.error('[OrderContext] Erro ao atualizar insumo no banco:', err));
  };

  // Cadastro e gestão de Clientes
  const addClient = (clientData: Omit<Client, 'id' | 'totalOrders'>): Client => {
    const tempId = `cli-${Date.now()}`;
    const newClient: Client = {
      ...clientData,
      id: tempId,
      totalOrders: 0,
      portalStatus: 'pendente',
      inviteToken: `tok-${Date.now()}`,
      auditHistory: []
    };
    setClients(prev => [...prev, newClient]);

    fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: clientData.name,
        companyName: clientData.companyName,
        phone: clientData.phone,
        email: clientData.email,
        secondaryPhone: clientData.secondaryPhone,
        notes: clientData.notes,
        cnpjCpf: clientData.cnpjCpf,
        address: clientData.address
      })
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setClients(prev => prev.map(c => c.id === tempId ? saved : c));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao cadastrar cliente no banco:', err));

    return newClient;
  };

  const updateClient = (id: string, updatedData: Partial<Client> & { operatorName?: string }) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c));

    fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    })
      .then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setClients(prev => prev.map(c => c.id === id ? saved : c));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao atualizar cliente no banco:', err));
  };

  const resetClientPassword = (clientId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        passwordHash: undefined,
        portalStatus: 'pendente',
        inviteToken: `tok-${Date.now()}`
      };
    }));

    fetch(`/api/clients/${clientId}/reset-password`, { method: 'PUT' })
      .catch(err => console.error('[OrderContext] Erro ao resetar senha do cliente no banco:', err));
  };

  const toggleBlockClientPortal = (clientId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const isBlocked = c.portalStatus === 'bloqueado';
      return {
        ...c,
        portalStatus: isBlocked ? (c.passwordHash ? 'ativo' : 'pendente') : 'bloqueado'
      };
    }));

    fetch(`/api/clients/${clientId}/toggle-block`, { method: 'PUT' })
      .catch(err => console.error('[OrderContext] Erro ao alterar bloqueio do portal no banco:', err));
  };

  const setClientPasswordByToken = (clientId: string, rawPassword: string): boolean => {
    let success = false;
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      success = true;
      return {
        ...c,
        passwordHash: `hash-${btoa(rawPassword)}`,
        portalStatus: 'ativo',
        inviteToken: undefined
      };
    }));

    fetch(`/api/clients/${clientId}/set-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawPassword })
    }).catch(err => console.error('[OrderContext] Erro ao salvar senha do cliente no banco:', err));

    return success;
  };

  // Cálculo dinâmico de dosagem química vinculado a receitas e estoque real (Conforme Seq.pdf)
  const calculateChemicals = (totalWeightKg: number, processes: string[]): ChemicalDose[] => {
    if (totalWeightKg <= 0) return [];

    const processName = (processes && processes.length > 0) ? processes[0] : '';
    const cleanProc = processName.trim().toLowerCase();

    // 1. Tenta encontrar receita cadastrada para o processo de lavado selecionado
    const matchingReceita = receitasLavado.find(r => {
      const cleanR = r.name.trim().toLowerCase();
      return cleanProc && (cleanR === cleanProc || cleanR.includes(cleanProc) || cleanProc.includes(cleanR));
    });

    let formulaItems: {
      productName: string;
      faseOrder?: number;
      faseName?: string;
      dosagePct?: number;
      dosagePerKg: number;
    }[] = [];

    if (matchingReceita && matchingReceita.fases && matchingReceita.fases.length > 0) {
      matchingReceita.fases.forEach(fase => {
        fase.produtos.forEach(prod => {
          if (prod.productName) {
            // Em lavanderia têxtil (Seq.pdf), a dosagem é calculada em porcentagem (%) sobre o peso do lote
            // 1% = 10 g/kg (pois 1kg = 1000g, e 1% de 1000g = 10g)
            const dosagePct = prod.dosagePct || 0;
            const dosagePerKg = dosagePct > 0 ? dosagePct * 10 : 10;
            formulaItems.push({
              productName: prod.productName,
              faseOrder: fase.order,
              faseName: fase.name,
              dosagePct,
              dosagePerKg
            });
          }
        });
      });
    }

    // 2. Se não houver receita específica, utiliza os itens cadastrados no estoque como fallback
    if (formulaItems.length === 0) {
      if (stockItems.length > 0) {
        formulaItems = stockItems.map(item => ({
          productName: item.name,
          faseOrder: 1,
          faseName: 'Processo Geral',
          dosagePct: (item.defaultDosagePerKg || 10) / 10,
          dosagePerKg: item.defaultDosagePerKg || 10
        }));
      } else {
        formulaItems = [
          { productName: 'Insumo Químico Padrão', faseOrder: 1, faseName: 'Processo Geral', dosagePct: 1, dosagePerKg: 10 }
        ];
      }
    }

    return formulaItems.map(f => {
      const stockObj = stockItems.find(s => 
        s.name.toLowerCase() === f.productName.toLowerCase() ||
        s.name.toLowerCase().includes(f.productName.toLowerCase()) ||
        f.productName.toLowerCase().includes(s.name.toLowerCase())
      );

      const dosagePerKg = f.dosagePerKg || stockObj?.defaultDosagePerKg || 10;
      // Multiplica a porcentagem pelo peso total do lote: totalWeightKg * (dosagePct / 100) * 1000 g
      const totalGrams = Math.round(totalWeightKg * dosagePerKg * 10) / 10;
      const availableStock = stockObj ? stockObj.currentStock : undefined;
      const unitStock = stockObj ? stockObj.unit : 'kg';
      
      const requiredInStockUnit = (unitStock === 'kg' || unitStock === 'L') ? totalGrams / 1000 : totalGrams;
      const isLowStock = stockObj ? (stockObj.currentStock - requiredInStockUnit) <= stockObj.minStockAlert : false;

      return {
        productName: stockObj?.name || f.productName,
        faseOrder: f.faseOrder,
        faseName: f.faseName,
        dosagePct: f.dosagePct,
        dosagePerKg,
        totalGrams,
        unit: 'g',
        availableStock,
        unitStock,
        isLowStock
      };
    });
  };

  // Criação de nova OS
  const createOrder = (orderData: Omit<Order, 'id' | 'osNumber' | 'createdAt' | 'status' | 'totalIronedPieces' | 'ironingLogs' | 'history'>): Order => {
    const nextOSNum = 9287 + orders.length + 1;
    const osNumber = `OS-${nextOSNum}`;
    const id = `ord-${nextOSNum}`;

    const newOrder: Order = {
      ...orderData,
      id,
      osNumber,
      createdAt: new Date().toISOString(),
      status: 'recebido',
      totalIronedPieces: 0,
      ironingLogs: [],
      history: [
        {
          timestamp: new Date().toISOString(),
          status: 'recebido',
          operator: orderData.operatorName,
          note: 'Entrada efetuada com pesagem de referência e cálculo de dosagem por processo.'
        }
      ]
    };

    setOrders(prev => [newOrder, ...prev]);

    // Baixa automática local no estoque de insumos químicos
    if (orderData.chemicalRecipe && orderData.chemicalRecipe.length > 0) {
      setStockItems(prevStock => prevStock.map(stock => {
        const matchingDoses = orderData.chemicalRecipe.filter(c =>
          c.productName.toLowerCase() === stock.name.toLowerCase() ||
          c.productName.toLowerCase().includes(stock.name.toLowerCase()) ||
          stock.name.toLowerCase().includes(c.productName.toLowerCase())
        );

        if (matchingDoses.length === 0) return stock;

        const totalUsedGrams = matchingDoses.reduce((acc, curr) => acc + curr.totalGrams, 0);
        const deduct = (stock.unit === 'kg' || stock.unit === 'L')
          ? totalUsedGrams / 1000
          : totalUsedGrams;

        const newStock = Math.max(0, Math.round((stock.currentStock - deduct) * 100) / 100);
        return { ...stock, currentStock: newStock };
      }));
    }

    // Incrementa total de pedidos do cliente localmente
    setClients(prev => prev.map(c => c.id === orderData.clientId ? { ...c, totalOrders: c.totalOrders + 1 } : c));

    // Persiste no PostgreSQL via API
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setOrders(prev => prev.map(o => o.id === id ? saved : o));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao salvar OS no PostgreSQL:', err));

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, operatorName: string, note?: string) => {
    if (status === 'pronto') {
      const target = orders.find(o => o.id === orderId);
      if (target) {
        setMarkReadyOrder(target);
        return;
      }
    }

    const newHistoryEvent = {
      timestamp: new Date().toISOString(),
      status,
      operator: operatorName,
      note
    };

    setOrders(prev => prev.map(ord => {
      if (ord.id !== orderId) return ord;
      return {
        ...ord,
        status,
        history: [...ord.history, newHistoryEvent]
      };
    }));

    fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, operatorName, note })
    }).catch(err => console.error('[OrderContext] Erro ao atualizar status no PostgreSQL:', err));
  };

  const registerIroning = (orderId: string, passadorId: string, passadorName: string, piecesIroned: number) => {
    const targetOrder = orders.find(o => o.id === orderId || o.osNumber === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Pedido não encontrado.' };
    }

    const newLog: PassadorLog = {
      id: `log-${Date.now()}`,
      orderId: targetOrder.id,
      osNumber: targetOrder.osNumber,
      passadorId,
      passadorName,
      piecesIroned,
      timestamp: new Date().toISOString()
    };

    setOrders(prev => prev.map(ord => {
      if (ord.id !== targetOrder.id) return ord;

      const newTotal = ord.totalIronedPieces + piecesIroned;

      return {
        ...ord,
        totalIronedPieces: newTotal,
        ironingLogs: [...ord.ironingLogs, newLog],
        history: [
          ...ord.history,
          {
            timestamp: new Date().toISOString(),
            status: ord.status,
            operator: passadorName,
            note: `Lançamento de passadoria: +${piecesIroned} peças (Total passado: ${newTotal}/${ord.estimatedPieceCount})`
          }
        ]
      };
    }));

    setPassadores(prev => prev.map(p => {
      if (p.id !== passadorId) return p;
      return {
        ...p,
        totalPiecesIroned: p.totalPiecesIroned + piecesIroned
      };
    }));

    fetch(`/api/orders/${targetOrder.id}/ironing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passadorId, passadorName, count: piecesIroned })
    }).catch(err => console.error('[OrderContext] Erro ao registrar passadoria no PostgreSQL:', err));

    return { success: true, message: `Lançamento de ${piecesIroned} peças registrado para ${passadorName}!` };
  };

  const registerNewPassador = (name: string, phone?: string): Passador => {
    const cleanUsername = name.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const newUser = addUser({
      name,
      username: cleanUsername,
      password: 'teste',
      phone,
      role: 'passador',
      allowedMenus: ['passador-mobile'],
      active: true
    });

    const newPassador: Passador = {
      id: newUser.id,
      name,
      phone,
      totalPiecesIroned: 0,
      ratePerPiece: 0.15,
      createdAt: new Date().toISOString().split('T')[0],
      active: true
    };
    setPassadores(prev => [...prev, newPassador]);

    fetch('/api/passadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPassador)
    }).catch(err => console.error('[OrderContext] Erro ao salvar passador no PostgreSQL:', err));

    return newPassador;
  };

  const updatePassador = async (id: string, data: Partial<Passador>): Promise<{ success: boolean; message: string }> => {
    setPassadores(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    try {
      const res = await fetch(`/api/passadores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setPassadores(prev => prev.map(p => p.id === id ? updated : p));
        return { success: true, message: 'Passador atualizado com sucesso!' };
      }
    } catch (err) {
      console.error('[OrderContext] Erro ao atualizar passador no PostgreSQL:', err);
    }
    return { success: false, message: 'Erro ao salvar alterações do passador.' };
  };

  // Catálogo de peças & processos
  const addGarmentCatalogItem = (item: Omit<GarmentProcessCatalogItem, 'id'>): GarmentProcessCatalogItem => {
    const tempId = `gcat-${Date.now()}`;
    const newItem: GarmentProcessCatalogItem = {
      ...item,
      id: tempId
    };
    setGarmentCatalog(prev => [...prev, newItem]);

    fetch('/api/garment-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setGarmentCatalog(prev => prev.map(g => g.id === tempId ? saved : g));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao adicionar catálogo no PostgreSQL:', err));

    return newItem;
  };

  const updateGarmentCatalogItem = (id: string, updated: Partial<GarmentProcessCatalogItem>) => {
    setGarmentCatalog(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));

    fetch(`/api/garment-catalog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.error('[OrderContext] Erro ao atualizar catálogo no PostgreSQL:', err));
  };

  const deleteGarmentCatalogItem = (id: string) => {
    setGarmentCatalog(prev => prev.filter(item => item.id !== id));

    fetch(`/api/garment-catalog/${id}`, { method: 'DELETE' })
      .catch(err => console.error('[OrderContext] Erro ao excluir catálogo no PostgreSQL:', err));
  };

  // Pagamento de fatura de OS com Auditoria e Registro Permanente (Tarefa 1)
  const payInvoiceOrder = (
    orderId: string, 
    discountAmount: number, 
    paymentMethod: string, 
    operatorName: string = 'Ana (Financeiro)',
    receiverName?: string,
    notes?: string,
    docRef?: string
  ) => {
    const paidAt = new Date().toISOString();
    const receiver = receiverName || operatorName;

    setOrders(prev => prev.map(ord => {
      if (ord.id !== orderId) return ord;
      const orderGross = ord.totalServiceValue || 0;
      const finalPaidAmount = Math.max(0, orderGross - discountAmount);

      const updatedHistory = [
        ...ord.history,
        {
          timestamp: paidAt,
          status: ord.status,
          operator: operatorName,
          note: `Fatura Paga / Baixa efetuada: Valor Pago R$ ${finalPaidAmount.toFixed(2)} (${paymentMethod.toUpperCase()}) • Recebido por: ${receiver}${docRef ? ` • Doc: ${docRef}` : ''}${notes ? ` • Obs: ${notes}` : ''}`
        }
      ];

      const newPaymentEntry: PaymentHistoryEntry = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: 'baixa',
        amountPaid: orderGross,
        discountAmount,
        finalPaidAmount,
        paymentMethod,
        receiverName: receiver,
        performedBy: operatorName,
        paidAt,
        notes: notes ? String(notes).trim() : undefined,
        docRef: docRef ? String(docRef).trim() : undefined
      };

      const paymentHistory = [newPaymentEntry, ...(ord.paymentHistory || [])];

      return {
        ...ord,
        paymentStatus: 'pago' as const,
        discountAmount,
        finalPaidAmount,
        paymentMethod,
        receiverName: receiver,
        paidAt,
        paidByOperator: operatorName,
        paymentNotes: notes ? String(notes).trim() : undefined,
        docRef: docRef ? String(docRef).trim() : undefined,
        paymentHistory,
        history: updatedHistory
      };
    }));

    fetch(`/api/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        discountAmount, 
        paymentMethod, 
        operatorName, 
        receiverName: receiver, 
        notes, 
        docRef 
      })
    })
      .then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setOrders(prev => prev.map(o => o.id === orderId ? saved : o));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao registrar baixa da fatura no PostgreSQL:', err));
  };

  const payMultipleInvoiceOrders = (
    orderIds: string[],
    totalDiscountAmount: number = 0,
    paymentMethod: string = 'boleto',
    operatorName: string = 'Ana (Financeiro)',
    unifiedDocRef?: string,
    receiverName?: string,
    notes?: string
  ) => {
    if (!orderIds || orderIds.length === 0) return;
    const paidAt = new Date().toISOString();
    const receiver = receiverName || operatorName;
    const targetOrders = orders.filter(o => orderIds.includes(o.id));
    const totalGross = targetOrders.reduce((sum, o) => sum + (o.totalServiceValue || 0), 0);

    setOrders(prev => prev.map(ord => {
      if (!orderIds.includes(ord.id)) return ord;

      // Rateio do desconto proporcional ao valor bruto de cada OS
      const orderGross = ord.totalServiceValue || 0;
      const orderDiscount = totalGross > 0 ? (orderGross / totalGross) * totalDiscountAmount : 0;
      const finalPaidAmount = Math.max(0, orderGross - orderDiscount);

      const docNote = unifiedDocRef ? ` • Doc: ${unifiedDocRef}` : '';
      const obsNote = notes ? ` • Obs: ${notes}` : '';
      const updatedHistory = [
        ...ord.history,
        {
          timestamp: paidAt,
          status: ord.status,
          operator: operatorName,
          note: `Baixa em Fatura Unificada (${orderIds.length} OSs): R$ ${finalPaidAmount.toFixed(2)} (${paymentMethod.toUpperCase()}) • Recebido por: ${receiver}${docNote}${obsNote}`
        }
      ];

      const newPaymentEntry: PaymentHistoryEntry = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: 'baixa',
        amountPaid: orderGross,
        discountAmount: orderDiscount,
        finalPaidAmount,
        paymentMethod,
        receiverName: receiver,
        performedBy: operatorName,
        paidAt,
        notes: notes ? String(notes).trim() : undefined,
        docRef: unifiedDocRef ? String(unifiedDocRef).trim() : undefined
      };

      const paymentHistory = [newPaymentEntry, ...(ord.paymentHistory || [])];

      return {
        ...ord,
        paymentStatus: 'pago' as const,
        discountAmount: orderDiscount,
        finalPaidAmount,
        paymentMethod,
        receiverName: receiver,
        paidAt,
        paidByOperator: operatorName,
        paymentNotes: notes ? String(notes).trim() : undefined,
        docRef: unifiedDocRef ? String(unifiedDocRef).trim() : undefined,
        paymentHistory,
        history: updatedHistory
      };
    }));

    // Sincroniza cada OS no backend
    orderIds.forEach(orderId => {
      const ord = orders.find(o => o.id === orderId);
      const orderGross = ord?.totalServiceValue || 0;
      const orderDiscount = totalGross > 0 ? (orderGross / totalGross) * totalDiscountAmount : 0;
      const finalPaidAmount = Math.max(0, orderGross - orderDiscount);

      fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          discountAmount: orderDiscount, 
          finalPaidAmount,
          paymentMethod, 
          operatorName,
          receiverName: receiver,
          notes,
          docRef: unifiedDocRef
        })
      })
        .then(res => res.ok ? res.json() : null)
        .then(saved => {
          if (saved) {
            setOrders(prev => prev.map(o => o.id === orderId ? saved : o));
          }
        })
        .catch(err => console.error(`[OrderContext] Erro ao registrar baixa unificada da OS ${orderId}:`, err));
    });
  };

  const fetchClientMessages = async (clientId: string, phone?: string): Promise<ClientMessageLog[]> => {
    try {
      const res = await fetch(`/api/clients/${clientId}/messages`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.error('[OrderContext] Erro ao carregar mensagens do cliente:', err);
      return [];
    }
  };

  const auditViewBoleto = async (params: { boletoRef: string; orderIds: string[]; osNumbers: string[]; clientName?: string; userName?: string; }) => {
    try {
      await fetch('/api/finance/boletos/audit-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    } catch (err) {
      console.warn('[OrderContext] Falha ao registrar auditoria de visualização de boleto:', err);
    }
  };

  const getOrderById = (orderId: string) => orders.find(o => o.id === orderId);
  const getOrderByOS = (osNumber: string) => orders.find(o => o.osNumber.toLowerCase() === osNumber.toLowerCase() || o.id === osNumber);

  // ─── Entradas de Insumos ────────────────────────────────────────────────────
  const addInsumoEntry = (entry: Omit<InsumoEntry, 'id'>): InsumoEntry => {
    const tempId = `ent-${Date.now()}`;
    const newEntry: InsumoEntry = { ...entry, id: tempId };
    setInsumoEntries(prev => [newEntry, ...prev]);

    // Atualiza o estoque localmente
    setStockItems(prev => prev.map(item =>
      item.id === entry.stockItemId
        ? { ...item, currentStock: item.currentStock + entry.quantity }
        : item
    ));

    fetch('/api/insumo-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setInsumoEntries(prev => prev.map(e => e.id === tempId ? saved : e));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao registrar entrada de insumo no PostgreSQL:', err));

    return newEntry;
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
    const tempId = `sup-${Date.now()}`;
    const newSupplier: Supplier = { ...supplier, id: tempId };
    setSuppliers(prev => [...prev, newSupplier]);

    fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSupplier)
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setSuppliers(prev => prev.map(s => s.id === tempId ? saved : s));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao cadastrar fornecedor no PostgreSQL:', err));

    return newSupplier;
  };

  // ─── Receitas de Lavado ─────────────────────────────────────────────────────
  const addReceitaLavado = (receita: Omit<ReceitaLavado, 'id' | 'createdAt' | 'updatedAt'>): ReceitaLavado => {
    const now = new Date().toISOString();
    const tempId = `rec-${Date.now()}`;
    const newReceita: ReceitaLavado = { ...receita, id: tempId, createdAt: now, updatedAt: now };
    setReceitasLavado(prev => [...prev, newReceita]);

    fetch('/api/receitas-lavado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReceita)
    }).then(res => res.ok ? res.json() : null)
      .then(saved => {
        if (saved) {
          setReceitasLavado(prev => prev.map(r => r.id === tempId ? saved : r));
        }
      })
      .catch(err => console.error('[OrderContext] Erro ao cadastrar receita no PostgreSQL:', err));

    return newReceita;
  };

  const updateReceitaLavado = (id: string, updated: Partial<Omit<ReceitaLavado, 'id' | 'createdAt'>>) => {
    setReceitasLavado(prev => prev.map(r =>
      r.id === id ? { ...r, ...updated, updatedAt: new Date().toISOString() } : r
    ));

    fetch(`/api/receitas-lavado/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(err => console.error('[OrderContext] Erro ao atualizar receita no PostgreSQL:', err));
  };

  const deleteReceitaLavado = (id: string) => {
    setReceitasLavado(prev => prev.filter(r => r.id !== id));

    fetch(`/api/receitas-lavado/${id}`, { method: 'DELETE' })
      .catch(err => console.error('[OrderContext] Erro ao excluir receita no PostgreSQL:', err));
  };

  return (
    <OrderContext.Provider value={{
      orders,
      passadores,
      stockItems,
      clients,
      garmentCatalog,
      whatsAppModalData,
      markReadyOrder,
      insumoEntries,
      suppliers,
      receitasLavado,
      closeWhatsAppModal,
      openMarkReadyModal,
      closeMarkReadyModal,
      confirmOrderReady,
      createOrder,
      updateOrderStatus,
      registerIroning,
      registerNewPassador,
      updatePassador,
      addStockItem,
      updateStockQuantity,
      updateStockItem,
      addClient,
      updateClient,
      resetClientPassword,
      toggleBlockClientPortal,
      setClientPasswordByToken,
      addGarmentCatalogItem,
      updateGarmentCatalogItem,
      deleteGarmentCatalogItem,
      payInvoiceOrder,
      payMultipleInvoiceOrders,
      fetchClientMessages,
      auditViewBoleto,
      getOrderById,
      getOrderByOS,
      calculateChemicals,
      addInsumoEntry,
      addSupplier,
      addReceitaLavado,
      updateReceitaLavado,
      deleteReceitaLavado,
      refreshData,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
