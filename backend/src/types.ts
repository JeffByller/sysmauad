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

export interface Client {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  cnpjCpf?: string;
  address?: string;
  totalOrders: number;
  portalStatus?: 'ativo' | 'bloqueado';
  passwordHash?: string;
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
  items: OrderItem[];
  chemicalRecipe: ChemicalDose[];
  status: OrderStatus;
  totalIronedPieces: number;
  ironingLogs: PassadorLog[];
  history: OrderHistoryEvent[];
  notes?: string;
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

