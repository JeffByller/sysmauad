export type OrderStatus = 'recebido' | 'em_andamento' | 'pronto' | 'entregue';
export type PaymentStatus = 'aberto' | 'pago';

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'financeiro' | 'operador' | 'passador';
  allowedMenus: string[];
  active: boolean;
}

export interface ClientAuditEntry {
  timestamp: string;
  operator: string;
  field: string;
  previousValue?: string;
  newValue?: string;
}

export interface Client {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  secondaryPhone?: string;
  notes?: string;
  cnpjCpf?: string;
  address?: string;
  totalOrders: number;
  portalStatus?: 'ativo' | 'bloqueado';
  passwordHash?: string;
  auditHistory?: ClientAuditEntry[];
}

export interface ClientMessageLog {
  id: string;
  clientId?: string;
  clientName?: string;
  phone: string;
  channel: string;
  eventType: string;
  messageText: string;
  status: string;
  errorDetails?: string;
  operatorName?: string;
  createdAt: string;
}

export interface PaymentHistoryEntry {
  id: string;
  action: string; // 'baixa', 'estorno', 'alteracao'
  amountPaid: number;
  discountAmount?: number;
  finalPaidAmount?: number;
  paymentMethod: string;
  receiverName: string;
  performedBy: string;
  paidAt: string;
  notes?: string;
  docRef?: string;
}

export interface ChemicalStockItem {
  id: string;
  name: string;
  unit: 'kg' | 'L' | 'g';
  currentStock: number;
  minStockAlert: number;
  defaultDosagePerKg: number;
  category: 'detergente' | 'amaciante' | 'alvejante' | 'corante' | 'desengomante' | 'outros';
  notes?: string;
}

export interface GarmentProcessCatalogItem {
  id: string;
  clothingType: string;
  processName: string;
  unitPrice: number;
  defaultRefWeightGrams: number;
  category?: string;
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

export interface OrderItem {
  id: string;
  clothingType: string;
  process: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  corteOs?: string;
}

export interface ChemicalDose {
  productName: string;
  faseOrder?: number;
  faseName?: string;
  dosagePct?: number;
  dosagePerKg: number;
  totalGrams: number;
  unit: string;
  availableStock?: number;
  unitStock?: string;
  isLowStock?: boolean;
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

export interface OrderHistoryEvent {
  timestamp: string;
  status: OrderStatus;
  operator: string;
  note?: string;
}

export interface Order {
  id: string;
  osNumber: string;
  corteOs?: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  createdAt: string;
  operatorName: string;
  refPieceWeightGrams: number;
  totalWeightKg: number;
  estimatedPieceCount: number;
  totalServiceValue: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  discountAmount?: number;
  finalPaidAmount?: number;
  receiverName?: string;
  paidAt?: string;
  paidByOperator?: string;
  paymentNotes?: string;
  docRef?: string;
  paymentHistory?: PaymentHistoryEntry[];
  items: OrderItem[];
  chemicalRecipe: ChemicalDose[];
  status: OrderStatus;
  totalIronedPieces: number;
  ironingLogs: PassadorLog[];
  history: OrderHistoryEvent[];
  notes?: string;
  isRelavado?: boolean;
  updatedAt?: string;
}

export interface InsumoEntry {
  id: string;
  stockItemId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  enteredAt: string;
  operatorName: string;
  invoiceRef?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  cnpj?: string;
  email?: string;
  contactPerson?: string;
  notes?: string;
}

export interface ReceitaProduto {
  productName: string;
  dosagePct: number;
  notes?: string;
}

export interface ReceitaFase {
  order: number;
  name: string;
  produtos: ReceitaProduto[];
}

export interface ReceitaLavado {
  id: string;
  name: string;
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
  stalledOrderAlertDays?: number;
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



