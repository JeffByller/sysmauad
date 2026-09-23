import { Client, Order, Passador, ChemicalStockItem, GarmentProcessCatalogItem, SystemUser } from '../types';

export const ALL_MENU_KEYS = [
  { id: 'dashboard', label: 'Painel Inicial' },
  { id: 'orders', label: 'Pedidos em Produção' },
  { id: 'stock', label: 'Estoque Insumos' },
  { id: 'clients', label: 'Cadastro de Clientes' },
  { id: 'garment-catalog', label: 'Tabela Peças & Lavagem' },
  { id: 'finance', label: 'Financeiro / Caixa' },
  { id: 'passador-report', label: 'Relatórios' },
  { id: 'users', label: 'Gestão de Usuários' },
  { id: 'passador-mobile', label: 'Modo Passador Mobile' },
  { id: 'client-portal', label: 'Central do Assinante' },
  { id: 'settings', label: 'Configurações do Sistema' }
];

export const INITIAL_SYSTEM_USERS: SystemUser[] = [
  {
    id: 'usr-teste',
    name: 'Usuário Teste (Beta)',
    username: 'teste',
    password: 'teste',
    role: 'operador',
    allowedMenus: ['dashboard', 'orders', 'stock', 'clients', 'garment-catalog', 'finance', 'passador-report'],
    active: true
  },
  {
    id: 'usr-passador-teste',
    name: 'Passador Teste (Beta)',
    username: 'passador',
    password: 'teste',
    phone: '81999999999',
    role: 'passador',
    allowedMenus: ['passador-mobile'],
    active: true
  }
];

export const INITIAL_GARMENT_CATALOG: GarmentProcessCatalogItem[] = [
  { id: 'gcat-ballon', clothingType: 'BALLON AD', processName: 'HIPER DESTROYED', unitPrice: 6.70, defaultRefWeightGrams: 300, category: 'Adulto' },
  { id: 'gcat-berm-mf', clothingType: 'BERM MAS/FEM', processName: 'HIPER DESTROYED', unitPrice: 4.70, defaultRefWeightGrams: 250, category: 'Adulto' },
  { id: 'gcat-berm-ij', clothingType: 'BERMUDA INF/JUV', processName: 'HIPER DESTROYED', unitPrice: 3.50, defaultRefWeightGrams: 180, category: 'Infantil/Juvenil' },
  { id: 'gcat-blusa-ad', clothingType: 'BLUSA AD', processName: 'HIPER DESTROYED', unitPrice: 4.70, defaultRefWeightGrams: 200, category: 'Adulto' },
  { id: 'gcat-blusa-ij', clothingType: 'BLUSA INF/JUV', processName: 'HIPER DESTROYED', unitPrice: 3.50, defaultRefWeightGrams: 150, category: 'Infantil/Juvenil' },
  { id: 'gcat-calca-ad', clothingType: 'CALÇA AD', processName: 'HIPER DESTROYED', unitPrice: 5.70, defaultRefWeightGrams: 400, category: 'Adulto' },
  { id: 'gcat-calca-ij', clothingType: 'CALÇA INF/JUV', processName: 'HIPER DESTROYED', unitPrice: 4.00, defaultRefWeightGrams: 250, category: 'Infantil/Juvenil' },
  { id: 'gcat-cargo-ad', clothingType: 'CARGO AD', processName: 'HIPER DESTROYED', unitPrice: 6.70, defaultRefWeightGrams: 450, category: 'Adulto' },
  { id: 'gcat-cargo-ij', clothingType: 'CARGO INF/JUV', processName: 'HIPER DESTROYED', unitPrice: 4.50, defaultRefWeightGrams: 280, category: 'Infantil/Juvenil' },
  { id: 'gcat-colete-ad', clothingType: 'COLETE AD', processName: 'HIPER DESTROYED', unitPrice: 4.70, defaultRefWeightGrams: 250, category: 'Adulto' },
  { id: 'gcat-colete-ij', clothingType: 'COLETE INF/JUV', processName: 'HIPER DESTROYED', unitPrice: 3.50, defaultRefWeightGrams: 180, category: 'Infantil/Juvenil' },
  { id: 'gcat-cropped-ad', clothingType: 'CROPPED AD', processName: 'HIPER DESTROYED', unitPrice: 4.70, defaultRefWeightGrams: 150, category: 'Adulto' }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-teste',
    name: 'Cliente Teste (Beta)',
    companyName: 'Empresa Teste',
    phone: '81999999999',
    cnpjCpf: '00.000.000/0001-00',
    address: 'Rua Teste, 100 - Centro',
    totalOrders: 1,
    portalStatus: 'ativo',
    passwordHash: 'hash-dGVzdGU=' // btoa('teste')
  }
];

export const INITIAL_PASSADORES: Passador[] = [
  {
    id: 'usr-passador-teste',
    name: 'Passador Teste (Beta)',
    phone: '81999999999',
    totalPiecesIroned: 50,
    createdAt: '2026-09-01',
    active: true
  }
];

export const INITIAL_STOCK: ChemicalStockItem[] = [
  {
    id: 'stk-pvwet',
    name: 'PVWET LUBE CONC',
    unit: 'kg',
    currentStock: 100.0,
    minStockAlert: 20.0,
    defaultDosagePerKg: 10,
    category: 'desengomante',
    notes: 'Desengomante têxtil de alta performance (1% de dosagem).'
  },
  {
    id: 'stk-pvzyme',
    name: 'PVZYME 4HC SUPER(ENZIMA)',
    unit: 'kg',
    currentStock: 50.0,
    minStockAlert: 10.0,
    defaultDosagePerKg: 3,
    category: 'outros',
    notes: 'Enzima para estonagem industrial (0,3% de dosagem).'
  },
  {
    id: 'stk-pvdep',
    name: 'PVDEP T12 SUPER NEW(ANTIMIGRANTE)DILUÍDO',
    unit: 'kg',
    currentStock: 50.0,
    minStockAlert: 10.0,
    defaultDosagePerKg: 5,
    category: 'outros',
    notes: 'Agente antimigrante para lavanderia (0,5% de dosagem).'
  },
  {
    id: 'stk-pvstone',
    name: 'PVSTONE PO GR NEW(PÓ ESTONAGEM)',
    unit: 'kg',
    currentStock: 150.0,
    minStockAlert: 30.0,
    defaultDosagePerKg: 100,
    category: 'outros',
    notes: 'Pó de estonagem para efeito destroyed (10% de dosagem).'
  },
  {
    id: 'stk-permanganato',
    name: 'PERMANGANATO DE POTÁSSIO',
    unit: 'kg',
    currentStock: 40.0,
    minStockAlert: 10.0,
    defaultDosagePerKg: 7.5,
    category: 'alvejante',
    notes: 'Agente oxidante para alvejamento e clareamento (0,75% de dosagem).'
  },
  {
    id: 'stk-metabissulfito',
    name: 'METABISSULFITO BASF',
    unit: 'kg',
    currentStock: 60.0,
    minStockAlert: 15.0,
    defaultDosagePerKg: 10,
    category: 'outros',
    notes: 'Agente neutralizador para processos de permanganato (1% de dosagem).'
  },
  {
    id: 'stk-amaciante',
    name: 'AMACIANTE CONCENTRADO',
    unit: 'L',
    currentStock: 120.0,
    minStockAlert: 25.0,
    defaultDosagePerKg: 10,
    category: 'amaciante',
    notes: 'Amaciante industrial concentrado para acabamento de toque (1% de dosagem).'
  },
  {
    id: 'stk-peroxido',
    name: 'PERÓXIDO DE HIDROGÊNIO 2',
    unit: 'kg',
    currentStock: 80.0,
    minStockAlert: 15.0,
    defaultDosagePerKg: 5,
    category: 'alvejante',
    notes: 'Agente alvejante (0,5% de dosagem).'
  },
  {
    id: 'stk-pvderusto',
    name: 'PVDERUSTO',
    unit: 'kg',
    currentStock: 40.0,
    minStockAlert: 10.0,
    defaultDosagePerKg: 2.5,
    category: 'outros',
    notes: 'Aditivo desferrizante/antimanchas (0,25% de dosagem).'
  },
  {
    id: 'stk-pvscour',
    name: 'PVSCOUR TOT AX(ALVEJANTE AZUL)',
    unit: 'kg',
    currentStock: 90.0,
    minStockAlert: 20.0,
    defaultDosagePerKg: 10,
    category: 'alvejante',
    notes: 'Alvejante azul óptico (1% de dosagem).'
  },
  {
    id: 'stk-pvwhite',
    name: 'PVWHITE SUPER CONC(ADITIVO BRANQUEADOR)',
    unit: 'kg',
    currentStock: 50.0,
    minStockAlert: 10.0,
    defaultDosagePerKg: 3,
    category: 'outros',
    notes: 'Aditivo branqueador concentrado (0,3% de dosagem).'
  },
  {
    id: 'stk-pvsoft',
    name: 'PVSOFT SEC(AMACIANTE)BASE',
    unit: 'kg',
    currentStock: 120.0,
    minStockAlert: 25.0,
    defaultDosagePerKg: 10,
    category: 'amaciante',
    notes: 'Base amaciante para acabamento têxtil (1% de dosagem).'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-teste',
    osNumber: 'OS-0001',
    clientId: 'cli-teste',
    clientName: 'Cliente Teste (Beta)',
    clientPhone: '81999999999',
    clientAddress: 'Rua Teste, 100 - Centro',
    createdAt: '2026-09-20T10:00:00',
    operatorName: 'Super Admin',
    refPieceWeightGrams: 300,
    totalWeightKg: 30.0,
    estimatedPieceCount: 100,
    totalServiceValue: 350.00,
    paymentStatus: 'aberto',
    items: [
      {
        id: 'item-teste',
        clothingType: 'Peça Teste (Beta)',
        process: 'Lavagem Teste',
        quantity: 100,
        unitPrice: 3.50,
        totalPrice: 350.00
      }
    ],
    chemicalRecipe: [
      { productName: 'Insumo Químico Teste (Beta)', dosagePerKg: 10, totalGrams: 300, unit: 'g', availableStock: 50.0, unitStock: 'kg', isLowStock: false }
    ],
    status: 'em_andamento',
    totalIronedPieces: 50,
    ironingLogs: [
      {
        id: 'log-teste',
        orderId: 'ord-teste',
        osNumber: 'OS-0001',
        passadorId: 'pas-teste',
        passadorName: 'Passador Teste (Beta)',
        piecesIroned: 50,
        timestamp: '2026-09-20T14:00:00'
      }
    ],
    history: [
      { timestamp: '2026-09-20T10:00:00', status: 'recebido', operator: 'Super Admin', note: 'Entrada registrada (Ordem Teste Beta).' },
      { timestamp: '2026-09-20T11:00:00', status: 'em_andamento', operator: 'Super Admin', note: 'Processamento de teste iniciado.' }
    ],
    notes: 'Ordem de serviço beta para testes operacionais.'
  }
];
