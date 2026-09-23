import { Pool } from 'pg';
import { 
  SystemUser, 
  Client, 
  ChemicalStockItem, 
  GarmentProcessCatalogItem, 
  Passador, 
  Order, 
  InsumoEntry, 
  Supplier, 
  ReceitaLavado 
} from './types';

const connectionString = process.env.DATABASE_URL || 'postgresql://sysmauad_user:sysmauad_pass@postgres:5432/sysmauad?schema=public';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Initial Mock / Seed Data
const INITIAL_SYSTEM_USERS: SystemUser[] = [
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

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-teste',
    name: 'Cliente Teste (Beta)',
    companyName: 'Empresa Teste',
    phone: '81999999999',
    cnpjCpf: '00.000.000/0001-00',
    address: 'Rua Teste, 100 - Centro',
    totalOrders: 1,
    portalStatus: 'ativo',
    passwordHash: 'hash-dGVzdGU='
  }
];

const INITIAL_PASSADORES: Passador[] = [
  {
    id: 'usr-passador-teste',
    name: 'Passador Teste (Beta)',
    phone: '81999999999',
    totalPiecesIroned: 50,
    createdAt: '2026-09-01',
    active: true
  }
];

const INITIAL_STOCK: ChemicalStockItem[] = [
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

const INITIAL_GARMENT_CATALOG: GarmentProcessCatalogItem[] = [
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

const INITIAL_ORDERS: Order[] = [
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

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-teste',
    name: 'Fornecedor Teste (Beta)',
    phone: '81999999999',
    cnpj: '00.000.000/0001-00',
    notes: 'Fornecedor padrão de insumos químicos'
  },
  {
    id: 'sup-1',
    name: 'Química do Agreste Ltda',
    cnpj: '12.345.678/0001-90',
    phone: '81988887777',
    email: 'vendas@quimicaagreste.com.br',
    contactPerson: 'Carlos Eduardo',
    notes: 'Fornecedor principal de desengomantes e enzimas'
  },
  {
    id: 'sup-2',
    name: 'Distribuidora Têxtil Brasil',
    cnpj: '98.765.432/0001-10',
    phone: '81977776666',
    email: 'contato@distribuidoratextil.com.br',
    contactPerson: 'Mariana Lima',
    notes: 'Fornecedor de amaciantes e alvejantes'
  }
];

const INITIAL_INSUMO_ENTRIES: InsumoEntry[] = [
  {
    id: 'ent-teste',
    supplierId: 'sup-teste',
    supplierName: 'Fornecedor Teste (Beta)',
    stockItemId: 'stk-pvwet',
    productName: 'PVWET LUBE CONC',
    quantity: 50,
    unit: 'kg',
    unitPrice: 5.0,
    totalValue: 250.0,
    invoiceRef: 'NF-TESTE-01',
    enteredAt: '2026-09-20T08:00:00.000Z',
    operatorName: 'Super Admin'
  }
];

const INITIAL_RECEITAS: ReceitaLavado[] = [
  {
    id: 'rec-h-destroyed-po',
    name: 'H DESTROYED NO PÓ',
    description: 'Receita oficial de Hiper Destroyed no Pó com 4 fases conforme ficha técnica industrial (Lavado com Processos.PDF)',
    fases: [
      {
        order: 1,
        name: 'DESENGOMAGEM',
        produtos: [
          { productName: 'PVWET LUBE CONC', dosagePct: 1.00, notes: 'Desengomante têxtil de alta lubrificação' }
        ]
      },
      {
        order: 2,
        name: 'ESTONAGEM PÓ',
        produtos: [
          { productName: 'PVZYME 4HC SUPER(ENZIMA)', dosagePct: 0.30, notes: 'Enzima concentrada para estonagem' },
          { productName: 'PVSTONE PO GR NEW(PÓ ESTONAGEM)', dosagePct: 10.00, notes: 'Pó abrasivo mineral para efeito destroyed' },
          { productName: 'PVDEP T12 SUPER NEW(ANTIMIGRANTE)', dosagePct: 0.50, notes: 'Agente antimigrante diluído' }
        ]
      },
      {
        order: 3,
        name: 'ALVEJAMENTO ANTIMIGRANTE',
        produtos: [
          { productName: 'PERMANGANATO DE POTÁSSIO', dosagePct: 0.50, notes: 'Alvejante oxidante' },
          { productName: 'PVDERUSTO', dosagePct: 0.25, notes: 'Aditivo desferrizante' },
          { productName: 'PVSCOUR TOT AX(ALVEJANTE AZUL)', dosagePct: 1.00, notes: 'Alvejante azul óptico' },
          { productName: 'PVWHITE SUPER CONC(ADITIVO BRANQUEADOR)', dosagePct: 0.30, notes: 'Aditivo concentrado' },
          { productName: 'PVDEP T12 SUPER NEW(ANTIMIGRANTE)', dosagePct: 0.50, notes: 'Antimigrante' }
        ]
      },
      {
        order: 4,
        name: 'AMACIAR',
        produtos: [
          { productName: 'PVSOFT SEC(AMACIANTE)BASE', dosagePct: 1.00, notes: 'Amaciante base de toque final' }
        ]
      }
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'rec-hiper-destroyed',
    name: 'HIPER DESTROYED',
    description: 'Receita completa com sequência de 4 processos conforme Seq.pdf',
    fases: [
      {
        order: 1,
        name: 'DESENGOMAGEM',
        produtos: [
          { productName: 'PVWET LUBE CONC', dosagePct: 1.0, notes: 'Desengomante têxtil' }
        ]
      },
      {
        order: 2,
        name: 'ESTONAGEM',
        produtos: [
          { productName: 'PVZYME 4HC SUPER(ENZIMA)', dosagePct: 0.3, notes: 'Enzima para estonagem' },
          { productName: 'PVDEP T12 SUPER NEW(ANTIMIGRANTE)DILUÍDO', dosagePct: 0.5, notes: 'Antimigrante' }
        ]
      },
      {
        order: 3,
        name: 'ALVEJAMENTO ANTIMIGRANTE',
        produtos: [
          { productName: 'PERMANGANATO DE POTÁSSIO', dosagePct: 0.75, notes: 'Agente oxidante' },
          { productName: 'METABISSULFITO BASF', dosagePct: 1.0, notes: 'Neutralizador' }
        ]
      },
      {
        order: 4,
        name: 'AMACIAR',
        produtos: [
          { productName: 'AMACIANTE CONCENTRADO', dosagePct: 1.0, notes: 'Acabamento macio' }
        ]
      }
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'rec-amaciado',
    name: 'AMACIADO',
    description: 'Lavado simples amaciado',
    fases: [
      {
        order: 1,
        name: 'DESENGOMAGEM',
        produtos: [
          { productName: 'PVWET LUBE CONC', dosagePct: 1.0 }
        ]
      },
      {
        order: 2,
        name: 'AMACIAR',
        produtos: [
          { productName: 'AMACIANTE CONCENTRADO', dosagePct: 1.2 }
        ]
      }
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'rec-alvejado',
    name: 'ALVEJADO',
    description: 'Lavado com clareamento e alvejamento',
    fases: [
      {
        order: 1,
        name: 'DESENGOMAGEM',
        produtos: [
          { productName: 'PVWET LUBE CONC', dosagePct: 1.0 }
        ]
      },
      {
        order: 2,
        name: 'ALVEJAMENTO',
        produtos: [
          { productName: 'PERMANGANATO DE POTÁSSIO', dosagePct: 0.75 }
        ]
      },
      {
        order: 3,
        name: 'AMACIAR',
        produtos: [
          { productName: 'AMACIANTE CONCENTRADO', dosagePct: 1.0 }
        ]
      }
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z'
  }
];

export async function initDb() {
  console.log('[Database] Inicializando schema e tabelas no PostgreSQL...');

  // 1. Schema sysmauad
  await query(`CREATE SCHEMA IF NOT EXISTS sysmauad;`);

  // 2. Tabela de Usuários
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.users (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) NOT NULL,
      allowed_menus JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 3. Tabela de Clientes
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.clients (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      phone VARCHAR(50) NOT NULL,
      cnpj_cpf VARCHAR(50),
      address TEXT,
      total_orders INT DEFAULT 0,
      portal_status VARCHAR(50) DEFAULT 'ativo',
      password_hash VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 4. Tabela de Insumos / Estoque Químico
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.stock_items (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(20) NOT NULL,
      current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
      min_stock_alert NUMERIC(12,2) NOT NULL DEFAULT 0,
      default_dosage_per_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
      category VARCHAR(50) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 5. Tabela de Catálogo de Peças & Lavagem
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.garment_catalog (
      id VARCHAR(100) PRIMARY KEY,
      clothing_type VARCHAR(255) NOT NULL,
      process_name VARCHAR(255) NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      default_ref_weight_grams NUMERIC(10,2) NOT NULL DEFAULT 0,
      category VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 6. Tabela de Passadores
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.passadores (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      total_pieces_ironed INT DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      created_at VARCHAR(50) DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 7. Tabela de Pedidos / Ordens de Serviço (OS)
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.orders (
      id VARCHAR(100) PRIMARY KEY,
      os_number VARCHAR(50) UNIQUE NOT NULL,
      client_id VARCHAR(100) NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      client_phone VARCHAR(50),
      client_address TEXT,
      created_at VARCHAR(100) NOT NULL,
      operator_name VARCHAR(255),
      ref_piece_weight_grams NUMERIC(10,2) DEFAULT 0,
      total_weight_kg NUMERIC(10,2) DEFAULT 0,
      estimated_piece_count INT DEFAULT 0,
      total_service_value NUMERIC(10,2) DEFAULT 0,
      payment_status VARCHAR(50) DEFAULT 'aberto',
      payment_method VARCHAR(50),
      discount_amount NUMERIC(10,2) DEFAULT 0,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      chemical_recipe JSONB NOT NULL DEFAULT '[]'::jsonb,
      status VARCHAR(50) NOT NULL DEFAULT 'recebido',
      total_ironed_pieces INT DEFAULT 0,
      ironing_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
      history JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 8. Tabela de Fornecedores
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.suppliers (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      cnpj VARCHAR(50),
      phone VARCHAR(50),
      email VARCHAR(255),
      contact_person VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 9. Tabela de Entradas de Insumos
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.insumo_entries (
      id VARCHAR(100) PRIMARY KEY,
      stock_item_id VARCHAR(100) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      supplier_id VARCHAR(100) NOT NULL,
      supplier_name VARCHAR(255) NOT NULL,
      quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
      unit VARCHAR(20) NOT NULL DEFAULT 'kg',
      unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
      entered_at VARCHAR(100) NOT NULL,
      operator_name VARCHAR(255) NOT NULL,
      invoice_ref VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 10. Tabela de Receitas de Lavado
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.receitas_lavado (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      fases JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at VARCHAR(100) NOT NULL,
      updated_at VARCHAR(100) NOT NULL
    );
  `);

  // 11. Tabela de Configurações do Sistema
  await query(`
    CREATE TABLE IF NOT EXISTS sysmauad.system_settings (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
      whatsapp_instance_name VARCHAR(100) DEFAULT 'sysmauad',
      whatsapp_target_phone VARCHAR(50) DEFAULT '',
      auto_reports_enabled BOOLEAN DEFAULT TRUE,
      report_frequency VARCHAR(20) DEFAULT 'diario',
      report_send_time VARCHAR(10) DEFAULT '18:00',
      report_day_of_week INT DEFAULT 1,
      report_day_of_month INT DEFAULT 1,
      selected_reports JSONB DEFAULT '["producao", "passadoria", "financeiro", "estoque"]'::jsonb,
      report_header_text TEXT DEFAULT '👔 *SYSMAUAD - Relatório Gerencial Automatizado*',
      report_footer_text TEXT DEFAULT 'Mauad Lavanderia • Sistema de Gestão Industrial',
      include_financial_values BOOLEAN DEFAULT TRUE,
      include_low_stock_alerts BOOLEAN DEFAULT TRUE,
      include_operator_breakdown BOOLEAN DEFAULT TRUE,
      auto_backup_enabled BOOLEAN DEFAULT TRUE,
      backup_retention_days INT DEFAULT 3,
      backup_time VARCHAR(10) DEFAULT '02:00',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // SEED INICIAL CASO TABELAS ESTEJAM VAZIAS
  await seedInitialData();
  console.log('[Database] Tabelas do PostgreSQL inicializadas com sucesso.');
}

async function seedInitialData() {
  // 1. Users
  const usersCount = await query('SELECT count(*) FROM sysmauad.users');
  if (parseInt(usersCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando usuários iniciais...');
    for (const u of INITIAL_SYSTEM_USERS) {
      await query(
        `INSERT INTO sysmauad.users (id, name, username, password, phone, role, allowed_menus, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.username, u.password, u.phone, u.role, JSON.stringify(u.allowedMenus), u.active]
      );
    }
  }

  // 2. Clients
  const clientsCount = await query('SELECT count(*) FROM sysmauad.clients');
  if (parseInt(clientsCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando clientes iniciais...');
    for (const c of INITIAL_CLIENTS) {
      await query(
        `INSERT INTO sysmauad.clients (id, name, company_name, phone, cnpj_cpf, address, total_orders, portal_status, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.companyName, c.phone, c.cnpjCpf, c.address, c.totalOrders, c.portalStatus, c.passwordHash]
      );
    }
  }

  // 3. Stock
  const stockCount = await query('SELECT count(*) FROM sysmauad.stock_items');
  if (parseInt(stockCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando insumos iniciais...');
    for (const s of INITIAL_STOCK) {
      await query(
        `INSERT INTO sysmauad.stock_items (id, name, unit, current_stock, min_stock_alert, default_dosage_per_kg, category, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.unit, s.currentStock, s.minStockAlert, s.defaultDosagePerKg, s.category, s.notes]
      );
    }
  }

  // 4. Garment Catalog
  const catalogCount = await query('SELECT count(*) FROM sysmauad.garment_catalog');
  if (parseInt(catalogCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando catálogo de peças inicial...');
    for (const g of INITIAL_GARMENT_CATALOG) {
      await query(
        `INSERT INTO sysmauad.garment_catalog (id, clothing_type, process_name, unit_price, default_ref_weight_grams, category, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [g.id, g.clothingType, g.processName, g.unitPrice, g.defaultRefWeightGrams, g.category, g.notes]
      );
    }
  }

  // 5. Passadores
  const passadoresCount = await query('SELECT count(*) FROM sysmauad.passadores');
  if (parseInt(passadoresCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando passadores iniciais...');
    for (const p of INITIAL_PASSADORES) {
      await query(
        `INSERT INTO sysmauad.passadores (id, name, phone, total_pieces_ironed, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.phone, p.totalPiecesIroned, p.active, p.createdAt]
      );
    }
  }

  // 6. Orders
  const ordersCount = await query('SELECT count(*) FROM sysmauad.orders');
  if (parseInt(ordersCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando pedidos iniciais...');
    for (const o of INITIAL_ORDERS) {
      await query(
        `INSERT INTO sysmauad.orders (
           id, os_number, client_id, client_name, client_phone, client_address,
           created_at, operator_name, ref_piece_weight_grams, total_weight_kg,
           estimated_piece_count, total_service_value, payment_status,
           items, chemical_recipe, status, total_ironed_pieces, ironing_logs, history, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (id) DO NOTHING`,
        [
          o.id, o.osNumber, o.clientId, o.clientName, o.clientPhone, o.clientAddress,
          o.createdAt, o.operatorName, o.refPieceWeightGrams, o.totalWeightKg,
          o.estimatedPieceCount, o.totalServiceValue, o.paymentStatus,
          JSON.stringify(o.items), JSON.stringify(o.chemicalRecipe), o.status,
          o.totalIronedPieces, JSON.stringify(o.ironingLogs), JSON.stringify(o.history), o.notes
        ]
      );
    }
  }

  // 7. Suppliers
  const suppliersCount = await query('SELECT count(*) FROM sysmauad.suppliers');
  if (parseInt(suppliersCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando fornecedores iniciais...');
    for (const s of INITIAL_SUPPLIERS) {
      await query(
        `INSERT INTO sysmauad.suppliers (id, name, cnpj, phone, email, contact_person, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.cnpj, s.phone, s.email, s.contactPerson, s.notes]
      );
    }
  }

  // 8. Insumo Entries
  const insumosCount = await query('SELECT count(*) FROM sysmauad.insumo_entries');
  if (parseInt(insumosCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando entradas de insumos iniciais...');
    for (const ent of INITIAL_INSUMO_ENTRIES) {
      await query(
        `INSERT INTO sysmauad.insumo_entries (
           id, stock_item_id, product_name, supplier_id, supplier_name,
           quantity, unit, unit_price, total_value, entered_at, operator_name, invoice_ref
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          ent.id, ent.stockItemId, ent.productName, ent.supplierId, ent.supplierName,
          ent.quantity, ent.unit, ent.unitPrice, ent.totalValue, ent.enteredAt, ent.operatorName, ent.invoiceRef || null
        ]
      );
    }
  }

  // 9. Receitas Lavado
  const receitasCount = await query('SELECT count(*) FROM sysmauad.receitas_lavado');
  if (parseInt(receitasCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando receitas de lavado iniciais...');
    for (const r of INITIAL_RECEITAS) {
      await query(
        `INSERT INTO sysmauad.receitas_lavado (id, name, description, fases, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.name, r.description, JSON.stringify(r.fases), r.createdAt, r.updatedAt]
      );
    }
  }

  // 10. Configurações Padrão
  const settingsCount = await query('SELECT count(*) FROM sysmauad.system_settings');
  if (parseInt(settingsCount.rows[0].count, 10) === 0) {
    console.log('[Database] Semeando configurações padrão...');
    await query(`
      INSERT INTO sysmauad.system_settings (
        id, whatsapp_instance_name, whatsapp_target_phone,
        auto_reports_enabled, report_frequency, report_send_time,
        report_day_of_week, report_day_of_month, selected_reports,
        report_header_text, report_footer_text,
        include_financial_values, include_low_stock_alerts, include_operator_breakdown,
        auto_backup_enabled, backup_retention_days, backup_time
      ) VALUES (
        'default', 'sysmauad', '',
        TRUE, 'diario', '18:00',
        1, 1, '["producao", "passadoria", "financeiro", "estoque"]'::jsonb,
        '👔 *SYSMAUAD - Relatório Gerencial Automatizado*', 'Mauad Lavanderia • Sistema de Gestão Industrial',
        TRUE, TRUE, TRUE,
        TRUE, 3, '02:00'
      ) ON CONFLICT (id) DO NOTHING
    `);
  }
}

