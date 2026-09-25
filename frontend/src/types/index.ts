export type OrderStatus = 'recebido' | 'em_andamento' | 'pronto' | 'entregue';
export type PaymentStatus = 'aberto' | 'pago';

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'financeiro' | 'operador' | 'passador';
  allowedMenus: string[]; // Menu tab keys e.g. ['dashboard', 'orders', 'stock', 'clients', 'garment-catalog', 'finance', 'passador-report', 'users']
  active: boolean;
}

export interface ChemicalDose {
  productName: string;
  faseOrder?: number;  // Sequência / Ordem da fase (ex: 1, 2, 3...)
  faseName?: string;   // Nome do processo/fase (ex: "Desengomagem", "Estonagem")
  dosagePct?: number;  // Dosagem em porcentagem (%)
  dosagePerKg: number; // in grams per kg
  totalGrams: number;  // total calculated grams for this order
  unit: string;        // 'g' or 'ml'
  availableStock?: number;
  unitStock?: string;
  isLowStock?: boolean;
}

export interface ChemicalStockItem {
  id: string;
  name: string;
  unit: 'kg' | 'L' | 'g';
  currentStock: number;
  minStockAlert: number;
  defaultDosagePerKg: number; // base dosage in g/kg
  category: 'detergente' | 'amaciante' | 'alvejante' | 'corante' | 'desengomante' | 'outros';
  notes?: string;
}

export interface GarmentProcessCatalogItem {
  id: string;
  clothingType: string;
  processName: string;
  unitPrice: number;            // R$ por peça
  defaultRefWeightGrams: number;// Gramas por peça de referência
  category?: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  clothingType: string;   // e.g. "Calça Wide Leg", "Bermuda Jeans"
  process: string;        // e.g. "Amaciado", "Hiper Destroi", "Tingimento Preto"
  quantity: number;
  unitPrice?: number;     // Valor unitário da peça (R$)
  totalPrice?: number;    // Valor total do item (R$)
  corteOs?: string;       // Referência ou Corte da confecção (ex: "0418")
}

export interface OrderHistoryEvent {
  timestamp: string;
  status: OrderStatus;
  operator: string;
  note?: string;
}

export interface Order {
  id: string;
  osNumber: string;         // e.g. "OS-9287"
  corteOs?: string;         // Referência ou Corte da confecção (ex: "0418")
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  createdAt: string;
  updatedAt?: string;
  operatorName: string;
  
  // Weight & piece calculation
  refPieceWeightGrams: number; // e.g. 300g
  totalWeightKg: number;        // e.g. 61.5kg
  estimatedPieceCount: number;  // totalWeightKg * 1000 / refPieceWeightGrams
  
  items: OrderItem[];
  chemicalRecipe: ChemicalDose[];
  
  status: OrderStatus;
  
  // Service Value Calculation & Finance
  totalServiceValue?: number; // Valor total do serviço R$
  paymentStatus?: PaymentStatus; // 'aberto' | 'pago'
  discountAmount?: number;      // Desconto no pagamento (R$)
  finalPaidAmount?: number;     // Valor final pago (R$)
  paymentMethod?: string;       // e.g. 'pix', 'boleto', 'dinheiro', 'cartao_credito', 'cartao_debito'
  paidAt?: string;
  paidByOperator?: string;
  
  // Ironing workflow tracking (volatile/flexible)
  totalIronedPieces: number;
  ironingLogs: PassadorLog[];
  
  history: OrderHistoryEvent[];
  notes?: string;
}

export interface Passador {
  id: string;
  name: string;
  phone?: string;
  totalPiecesIroned: number;
  ratePerPiece?: number;
  createdAt: string;
  active: boolean;
}

export interface PassadorLog {
  id: string;
  orderId: string;
  osNumber: string;
  passadorId: string;
  passadorName: string;
  piecesIroned: number;
  timestamp: string;
}

export type ClientPortalStatus = 'pendente' | 'ativo' | 'bloqueado';

export interface Client {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  cnpjCpf?: string;
  address?: string;
  totalOrders: number;
  portalStatus?: ClientPortalStatus;
  passwordHash?: string;
  inviteToken?: string;
}

export interface WhatsAppNotification {
  id: string;
  orderId: string;
  osNumber: string;
  clientPhone: string;
  clientName: string;
  message: string;
  sentAt: string;
  status: 'simulated_sent';
  payloadPreview: Record<string, any>;
}

// ─── Fornecedores de Insumos ─────────────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  cnpj?: string;
  notes?: string;
}

// ─── Entradas de Insumos (Compras) ───────────────────────────────────────────
export interface InsumoEntry {
  id: string;
  stockItemId: string;       // referência ao ChemicalStockItem
  productName: string;       // nome do produto (desnormalizado para histórico)
  supplierId: string;
  supplierName: string;
  quantity: number;          // quantidade que entrou
  unit: 'kg' | 'L' | 'g';
  unitPrice: number;         // preço por unidade (R$)
  totalValue: number;        // quantity * unitPrice
  enteredAt: string;         // ISO date
  operatorName: string;
  invoiceRef?: string;       // nota fiscal / referência
}

// ─── Receitas de Lavado ───────────────────────────────────────────────────────
export interface ReceitaProduto {
  productName: string;
  dosagePct: number;         // porcentagem (%) de dosagem
  notes?: string;
}

export interface ReceitaFase {
  order: number;             // sequência: 1, 2, 3...
  name: string;              // ex: "Desengomagem", "Estonagem"
  produtos: ReceitaProduto[];
}

export interface ReceitaLavado {
  id: string;
  name: string;              // ex: "Hiper Destroyed", "Amaciado Simples"
  description?: string;
  fases: ReceitaFase[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  whatsappInstanceName: string;
  whatsappTargetPhone: string;
  autoReportsEnabled: boolean;
  reportFrequency: 'diario' | 'semanal' | 'mensal';
  reportSendTime: string;
  reportDayOfWeek: number;
  reportDayOfMonth: number;
  selectedReports: string[];
  reportHeaderText: string;
  reportFooterText: string;
  includeFinancialValues: boolean;
  includeLowStockAlerts: boolean;
  includeOperatorBreakdown: boolean;
  autoBackupEnabled: boolean;
  backupRetentionDays: number;
  backupTime: string;
  defaultPassadorRate?: number;
  updatedAt?: string;
}

export interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  downloadUrl: string;
}

export interface WhatsAppStatus {
  instanceName: string;
  state: 'open' | 'connecting' | 'close' | 'refused' | 'disconnected' | 'unknown';
  connected: boolean;
  qrcode?: string | null;
  phone?: string | null;
}

export type AuditLevel = 'info' | 'warn' | 'error' | 'security';
export type AuditCategory = 'auth' | 'client_portal' | 'security' | 'orders' | 'stock' | 'users' | 'system' | 'api' | string;

export interface AuditLog {
  id: string;
  timestamp: string;
  level: AuditLevel;
  category: AuditCategory;
  action: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface AuditStats {
  total: number;
  errors: number;
  security: number;
  warnings: number;
  info: number;
  errorsToday: number;
  securityToday: number;
}


