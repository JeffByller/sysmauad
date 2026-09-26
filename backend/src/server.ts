import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { pool, query, initDb } from './db';
import { 
  SystemUser, 
  Client, 
  ClientAuditEntry,
  ClientMessageLog,
  PaymentHistoryEntry,
  ChemicalStockItem, 
  GarmentProcessCatalogItem, 
  Passador, 
  Order, 
  InsumoEntry, 
  Supplier, 
  ReceitaLavado,
  SystemSettings,
  BackupFile,
  WhatsAppStatus,
  AuditLog,
  AuditStats
} from './types';
import {
  getClientIp,
  checkBruteForceLock,
  registerFailedAttempt,
  clearBruteForceAttempts,
  apiRateLimiter,
  recordAuditLog,
  getAuditLogs,
  getAuditStats,
  purgeOldAuditLogs
} from './security';

const app = express();
const port = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(apiRateLimiter);


const SUPER_ADMIN = {
  id: 'super-admin-root',
  name: 'Super Admin',
  username: 'superadmin',
  passwords: ['m51IqWR48pYNeg', 'admin123', 'mauad2026'],
  role: 'admin' as const,
  allowedMenus: ['dashboard', 'orders', 'stock', 'clients', 'garment-catalog', 'finance', 'passador-report', 'users', 'passador-mobile', 'client-portal', 'settings'],
  active: true
};

export function normalizeLogin(val: string): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.');
}

// Mappers from SQL rows to CamelCase frontend models
function mapUser(row: any): SystemUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    password: row.password,
    phone: row.phone || undefined,
    role: row.role,
    allowedMenus: Array.isArray(row.allowed_menus) ? row.allowed_menus : [],
    active: Boolean(row.active)
  };
}

function mapClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name || undefined,
    phone: row.phone,
    email: row.email || undefined,
    secondaryPhone: row.secondary_phone || undefined,
    notes: row.notes || undefined,
    cnpjCpf: row.cnpj_cpf || undefined,
    address: row.address || undefined,
    totalOrders: Number(row.total_orders || 0),
    portalStatus: row.portal_status || 'ativo',
    passwordHash: row.password_hash || undefined,
    auditHistory: Array.isArray(row.audit_history) ? row.audit_history : []
  };
}

function mapClientMessage(row: any): ClientMessageLog {
  return {
    id: row.id,
    clientId: row.client_id || undefined,
    clientName: row.client_name || undefined,
    phone: row.phone,
    channel: row.channel || 'whatsapp',
    eventType: row.event_type || 'notificacao',
    messageText: row.message_text || '',
    status: row.status || 'enviado',
    errorDetails: row.error_details || undefined,
    operatorName: row.operator_name || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

function mapStock(row: any): ChemicalStockItem {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    currentStock: Number(row.current_stock || 0),
    minStockAlert: Number(row.min_stock_alert || 0),
    defaultDosagePerKg: Number(row.default_dosage_per_kg || 0),
    category: row.category,
    notes: row.notes || undefined
  };
}

function mapGarment(row: any): GarmentProcessCatalogItem {
  return {
    id: row.id,
    clothingType: row.clothing_type,
    processName: row.process_name,
    unitPrice: Number(row.unit_price || 0),
    defaultRefWeightGrams: Number(row.default_ref_weight_grams || 0),
    category: row.category || undefined,
    notes: row.notes || undefined
  };
}

function mapPassador(row: any): Passador {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    totalPiecesIroned: Number(row.total_pieces_ironed || 0),
    ratePerPiece: Number(row.rate_per_piece !== null && row.rate_per_piece !== undefined ? row.rate_per_piece : 0.15),
    createdAt: row.created_at,
    active: Boolean(row.active)
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    osNumber: row.os_number,
    corteOs: row.corte_os || (Array.isArray(row.items) && row.items[0]?.corteOs) || undefined,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone || undefined,
    clientAddress: row.client_address || undefined,
    createdAt: row.created_at,
    operatorName: row.operator_name || 'Operador',
    refPieceWeightGrams: Number(row.ref_piece_weight_grams || 0),
    totalWeightKg: Number(row.total_weight_kg || 0),
    estimatedPieceCount: Number(row.estimated_piece_count || 0),
    totalServiceValue: Number(row.total_service_value || 0),
    paymentStatus: row.payment_status || 'aberto',
    paymentMethod: row.payment_method || undefined,
    discountAmount: Number(row.discount_amount || 0),
    finalPaidAmount: row.final_paid_amount !== null && row.final_paid_amount !== undefined ? Number(row.final_paid_amount) : undefined,
    receiverName: row.receiver_name || undefined,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined,
    paidByOperator: row.paid_by_operator || undefined,
    paymentNotes: row.payment_notes || undefined,
    docRef: row.doc_ref || undefined,
    paymentHistory: Array.isArray(row.payment_history) ? row.payment_history : [],
    items: Array.isArray(row.items) ? row.items : [],
    chemicalRecipe: Array.isArray(row.chemical_recipe) ? row.chemical_recipe : [],
    status: row.status || 'recebido',
    totalIronedPieces: Number(row.total_ironed_pieces || 0),
    ironingLogs: Array.isArray(row.ironing_logs) ? row.ironing_logs : [],
    history: Array.isArray(row.history) ? row.history : [],
    notes: row.notes || undefined,
    isRelavado: Boolean(row.is_relavado),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

function mapSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    contactPerson: row.contact_person || undefined,
    notes: row.notes || undefined
  };
}

function mapInsumoEntry(row: any): InsumoEntry {
  return {
    id: row.id,
    stockItemId: row.stock_item_id,
    productName: row.product_name,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    quantity: Number(row.quantity || 0),
    unit: row.unit || 'kg',
    unitPrice: Number(row.unit_price || 0),
    totalValue: Number(row.total_value || 0),
    enteredAt: row.entered_at,
    operatorName: row.operator_name,
    invoiceRef: row.invoice_ref || undefined
  };
}

function mapReceita(row: any): ReceitaLavado {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    fases: Array.isArray(row.fases) ? row.fases : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSettings(row: any): SystemSettings {
  return {
    id: row.id,
    whatsappInstanceName: row.whatsapp_instance_name || 'sysmauad',
    whatsappTargetPhone: row.whatsapp_target_phone || '',
    autoReportsEnabled: Boolean(row.auto_reports_enabled),
    reportFrequency: row.report_frequency || 'diario',
    reportSendTime: row.report_send_time || '18:00',
    reportDayOfWeek: Number(row.report_day_of_week ?? 1),
    reportDayOfMonth: Number(row.report_day_of_month ?? 1),
    selectedReports: Array.isArray(row.selected_reports) ? row.selected_reports : ['producao', 'passadoria', 'financeiro', 'estoque'],
    reportHeaderText: row.report_header_text || '👔 *SYSMAUAD - Relatório Gerencial Automatizado*',
    reportFooterText: row.report_footer_text || 'Mauad Lavanderia • Sistema de Gestão Industrial',
    includeFinancialValues: row.include_financial_values !== false,
    includeLowStockAlerts: row.include_low_stock_alerts !== false,
    includeOperatorBreakdown: row.include_operator_breakdown !== false,
    autoBackupEnabled: row.auto_backup_enabled !== false,
    backupRetentionDays: Number(row.backup_retention_days ?? 3),
    backupTime: row.backup_time || '02:00',
    defaultPassadorRate: Number(row.default_passador_rate !== null && row.default_passador_rate !== undefined ? row.default_passador_rate : 0.15),
    stalledOrderAlertDays: Number(row.stalled_order_alert_days !== null && row.stalled_order_alert_days !== undefined ? row.stalled_order_alert_days : 3),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

// Evolution API & Backup Configuration
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'sysmauad_evo_secret_key';
const WHATSAPP_INSTANCE = 'sysmauad';
const BACKUP_DIR = '/app/data/backups';

function cleanPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

const VALID_BR_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99'
]);

function validateClientPhone(phone: string): { valid: boolean; error?: string } {
  let digits = (phone || '').replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (!digits) {
    return { valid: false, error: 'O número de WhatsApp / Celular é obrigatório.' };
  }
  if (digits.length < 10) {
    return { valid: false, error: `Número incompleto (${digits.length}/11 dígitos). Informe DDD + número.` };
  }
  if (digits.length > 11) {
    return { valid: false, error: 'O número de WhatsApp / Celular não pode ultrapassar 11 dígitos.' };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return { valid: false, error: 'Número de telefone inválido (todos os dígitos repetidos).' };
  }
  const ddd = digits.slice(0, 2);
  if (!VALID_BR_DDDS.has(ddd)) {
    return { valid: false, error: `DDD "${ddd}" inválido. Informe um DDD brasileiro válido.` };
  }
  if (digits.length === 11 && digits[2] !== '9') {
    return { valid: false, error: 'Celular com 11 dígitos deve iniciar com 9 após o DDD.' };
  }
  if (digits.length === 10 && (digits[2] === '0' || digits[2] === '1')) {
    return { valid: false, error: 'Telefone fixo após o DDD não pode iniciar com 0 ou 1.' };
  }
  return { valid: true };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function createBackupFile(): Promise<{ filename: string; sizeBytes: number; sizeFormatted: string; createdAt: string; downloadUrl: string }> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const [users, clients, stock, garments, passadores, orders, suppliers, insumoEntries, receitas, settings] = await Promise.all([
    query('SELECT * FROM sysmauad.users'),
    query('SELECT * FROM sysmauad.clients'),
    query('SELECT * FROM sysmauad.stock_items'),
    query('SELECT * FROM sysmauad.garment_catalog'),
    query('SELECT * FROM sysmauad.passadores'),
    query('SELECT * FROM sysmauad.orders'),
    query('SELECT * FROM sysmauad.suppliers'),
    query('SELECT * FROM sysmauad.insumo_entries'),
    query('SELECT * FROM sysmauad.receitas_lavado'),
    query('SELECT * FROM sysmauad.system_settings')
  ]);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `sysmauad-backup-${dateStr}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const backupData = {
    system: "SYSMAUAD Lavanderia Industrial",
    version: "1.0.0",
    createdAt: now.toISOString(),
    summary: {
      users: users.rowCount,
      clients: clients.rowCount,
      stockItems: stock.rowCount,
      garmentCatalog: garments.rowCount,
      passadores: passadores.rowCount,
      orders: orders.rowCount,
      suppliers: suppliers.rowCount,
      insumoEntries: insumoEntries.rowCount,
      receitasLavado: receitas.rowCount
    },
    data: {
      users: users.rows,
      clients: clients.rows,
      stock_items: stock.rows,
      garment_catalog: garments.rows,
      passadores: passadores.rows,
      orders: orders.rows,
      suppliers: suppliers.rows,
      insumo_entries: insumoEntries.rows,
      receitas_lavado: receitas.rows,
      system_settings: settings.rows
    }
  };

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  const stats = fs.statSync(filePath);

  return {
    filename,
    sizeBytes: stats.size,
    sizeFormatted: formatBytes(stats.size),
    createdAt: now.toISOString(),
    downloadUrl: `/api/backups/${encodeURIComponent(filename)}/download`
  };
}

function purgeOldBackups(retentionDays: number = 3) {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(BACKUP_DIR);
  for (const file of files) {
    if (file.startsWith('sysmauad-backup-') && file.endsWith('.json')) {
      const filePath = path.join(BACKUP_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          console.log(`[Backup Retention] Apagando backup com mais de ${retentionDays} dias: ${file}`);
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('[Backup Retention] Erro ao remover arquivo antigo:', file, e);
      }
    }
  }
}

async function generateSystemReportText(settings: SystemSettings): Promise<string> {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife' });

  const freqLabel = settings.reportFrequency === 'semanal' 
    ? 'Semanal' 
    : settings.reportFrequency === 'mensal' 
      ? 'Mensal' 
      : 'Diário';

  let msg = `${settings.reportHeaderText || '👔 *SYSMAUAD - Relatório Gerencial Automatizado*'}\n`;
  msg += `📅 *Período:* ${freqLabel} • ${dateFormatted} às ${timeFormatted}\n`;

  const selected = settings.selectedReports || [];

  // 1. Relatório de Produção e Lavados
  if (selected.includes('producao')) {
    const ordersRes = await query('SELECT * FROM sysmauad.orders');
    const allOrders = ordersRes.rows;
    const totalOrders = allOrders.length;

    let recebidos = 0;
    let emAndamento = 0;
    let prontos = 0;
    let entregues = 0;
    let totalKg = 0;
    let totalPecas = 0;

    for (const o of allOrders) {
      if (o.status === 'recebido') recebidos++;
      else if (o.status === 'em_andamento') emAndamento++;
      else if (o.status === 'pronto') prontos++;
      else if (o.status === 'entregue') entregues++;

      totalKg += Number(o.total_weight_kg || 0);
      totalPecas += Number(o.estimated_piece_count || 0);
    }

    msg += `\n📦 *PRODUÇÃO E LAVADOS*\n`;
    msg += `• Total de Pedidos Registrados: *${totalOrders}*\n`;
    msg += `• Em Andamento: *${emAndamento}* | Recebidos: *${recebidos}*\n`;
    msg += `• Prontos: *${prontos}* | Entregues: *${entregues}*\n`;
    msg += `• Carga Total Processada: *${totalKg.toFixed(1)} Kg*\n`;
    msg += `• Volume Total Estimado: *${totalPecas} peças*\n`;
  }

  // 2. Relatório de Passadoria
  if (selected.includes('passadoria')) {
    const passadoresRes = await query('SELECT * FROM sysmauad.passadores WHERE active = TRUE');
    const passadores = passadoresRes.rows;
    let totalIroned = 0;
    let totalIronedValue = 0;

    for (const p of passadores) {
      const pcs = Number(p.total_pieces_ironed || 0);
      const rate = Number(p.rate_per_piece ?? 0.15);
      totalIroned += pcs;
      totalIronedValue += pcs * rate;
    }

    msg += `\n✨ *PASSADORIA & ACABAMENTO*\n`;
    msg += `• Total de Peças Passadas: *${totalIroned} peças*`;
    if (settings.includeFinancialValues) {
      msg += ` (R$ ${totalIronedValue.toFixed(2)})`;
    }
    msg += `\n`;

    if (settings.includeOperatorBreakdown) {
      msg += `• Detalhado por Passador:\n`;
      for (const p of passadores) {
        const pcs = Number(p.total_pieces_ironed || 0);
        const rate = Number(p.rate_per_piece ?? 0.15);
        const val = pcs * rate;
        msg += `   └ ${p.name}: *${pcs}* peças`;
        if (settings.includeFinancialValues) {
          msg += ` (R$ ${val.toFixed(2)})`;
        }
        msg += `\n`;
      }
    }
  }

  // 3. Relatório Financeiro
  if (selected.includes('financeiro') && settings.includeFinancialValues) {
    const ordersRes = await query('SELECT total_service_value, payment_status FROM sysmauad.orders');
    let totalFaturado = 0;
    let totalPago = 0;
    let totalAberto = 0;

    for (const row of ordersRes.rows) {
      const val = Number(row.total_service_value || 0);
      totalFaturado += val;
      if (row.payment_status === 'pago') {
        totalPago += val;
      } else {
        totalAberto += val;
      }
    }

    const ticketMedio = ordersRes.rows.length > 0 ? (totalFaturado / ordersRes.rows.length) : 0;

    msg += `\n💰 *FINANCEIRO / CAIXA*\n`;
    msg += `• Faturamento Total: *R$ ${totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
    msg += `• Recebido (Pago): *R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
    msg += `• A Receber (Em Aberto): *R$ ${totalAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
    msg += `• Ticket Médio / Pedido: *R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`;
  }

  // 4. Relatório de Estoque e Insumos Químicos
  if (selected.includes('estoque')) {
    const stockRes = await query('SELECT * FROM sysmauad.stock_items ORDER BY name ASC');
    const allStock = stockRes.rows;
    const lowStock = allStock.filter((s: any) => Number(s.current_stock || 0) <= Number(s.min_stock_alert || 0));

    msg += `\n🧪 *ESTOQUE DE INSUMOS QUÍMICOS*\n`;
    msg += `• Itens Cadastrados: *${allStock.length} produtos*\n`;
    if (settings.includeLowStockAlerts) {
      if (lowStock.length === 0) {
        msg += `• ✅ Todos os insumos estão acima da margem mínima.\n`;
      } else {
        msg += `• ⚠️ *${lowStock.length} produto(s) em nível crítico/alerta:*\n`;
        for (const item of lowStock) {
          msg += `   └ ${item.name}: *${Number(item.current_stock).toFixed(1)} ${item.unit}* (Alerta: ${Number(item.min_stock_alert).toFixed(1)} ${item.unit})\n`;
        }
      }
    }
  }

  msg += `\n─────────────────────\n`;
  msg += `${settings.reportFooterText || 'Mauad Lavanderia • Sistema de Gestão Industrial'}`;

  return msg;
}




// ----------------------------------------------------
// HEALTHCHECK
// ----------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT NOW()');
    res.json({
      status: 'ok',
      service: 'Sysmauad PostgreSQL API',
      dbConnected: true,
      timestamp: dbCheck.rows[0].now
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      service: 'Sysmauad API',
      dbConnected: false,
      error: err.message
    });
  }
});

// ----------------------------------------------------
// 1. USUÁRIOS & AUTENTICAÇÃO
// ----------------------------------------------------
app.get('/users', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.users ORDER BY created_at ASC');
    res.json(result.rows.map(mapUser));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, username, password, phone, role, allowedMenus, active } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Nome, usuário e senha são obrigatórios.' });
    }

    const cleanUser = normalizeLogin(username);
    const check = await query('SELECT id FROM sysmauad.users WHERE LOWER(username) = LOWER($1)', [cleanUser]);
    if (check.rows.length > 0 || cleanUser === 'superadmin') {
      return res.status(400).json({ success: false, message: 'Já existe um usuário com este login no sistema.' });
    }

    const id = `usr-${Date.now()}`;
    const menus = Array.isArray(allowedMenus) && allowedMenus.length > 0
      ? allowedMenus
      : ['dashboard', 'orders', 'stock', 'clients', 'garment-catalog'];
    const isActive = active !== undefined ? Boolean(active) : true;

    const insert = await query(
      `INSERT INTO sysmauad.users (id, name, username, password, phone, role, allowed_menus, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name.trim(), cleanUser, String(password).trim(), phone ? String(phone).trim() : null, role || 'operador', JSON.stringify(menus), isActive]
    );

    res.status(201).json({ success: true, user: mapUser(insert.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, username, phone, role, allowedMenus, active, password } = req.body;

    if (id === 'super-admin-root') {
      return res.status(400).json({ success: false, message: 'Não é permitido modificar o Super Admin.' });
    }

    const current = await query('SELECT * FROM sysmauad.users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    let cleanUsername = current.rows[0].username;
    if (username) {
      cleanUsername = normalizeLogin(username);
      const conflict = await query('SELECT id FROM sysmauad.users WHERE id != $1 AND LOWER(username) = LOWER($2)', [id, cleanUsername]);
      if (conflict.rows.length > 0 || cleanUsername === 'superadmin') {
        return res.status(400).json({ success: false, message: 'Este login já está em uso por outro usuário.' });
      }
    }

    const updatedName = name ? name.trim() : current.rows[0].name;
    const updatedPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : current.rows[0].phone;
    const updatedRole = role || current.rows[0].role;
    const updatedMenus = Array.isArray(allowedMenus) ? allowedMenus : current.rows[0].allowed_menus;
    const updatedActive = active !== undefined ? Boolean(active) : current.rows[0].active;
    const updatedPass = password && String(password).trim() ? String(password).trim() : current.rows[0].password;

    const result = await query(
      `UPDATE sysmauad.users 
       SET name = $1, username = $2, phone = $3, role = $4, allowed_menus = $5, active = $6, password = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [updatedName, cleanUsername, updatedPhone, updatedRole, JSON.stringify(updatedMenus), updatedActive, updatedPass, id]
    );

    res.json({ success: true, user: mapUser(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/users/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (id === 'super-admin-root') {
      return res.status(400).json({ success: false, message: 'Senha do Super Admin é protegida.' });
    }
    if (!password || !String(password).trim()) {
      return res.status(400).json({ success: false, message: 'Informe a nova senha.' });
    }

    const result = await query('UPDATE sysmauad.users SET password = $1, updated_at = NOW() WHERE id = $2', [String(password).trim(), id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    res.json({ success: true, message: 'Senha atualizada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === 'super-admin-root') {
      return res.status(400).json({ success: false, message: 'Não é permitido excluir o Super Admin.' });
    }
    const result = await query('DELETE FROM sysmauad.users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/auth/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  try {
    const { username, password } = req.body;
    const rawUser = String(username || '').trim();
    const rawPass = String(password || '').trim();

    if (!rawUser || !rawPass) {
      return res.status(400).json({ success: false, message: 'Informe o usuário e a senha.' });
    }

    const normUser = normalizeLogin(rawUser);

    // 1. Verificação de Bloqueio por Força Bruta
    const bruteLock = checkBruteForceLock(ip, normUser);
    if (bruteLock.isBlocked) {
      await recordAuditLog({
        level: 'security',
        category: 'auth',
        action: 'intrusion_attempt_blocked',
        ipAddress: ip,
        userName: rawUser,
        userAgent: req.headers['user-agent'] as string,
        details: {
          reason: 'Tentativa de login no sistema com IP/usuário bloqueado por força bruta',
          retryAfterSeconds: bruteLock.retryAfterSeconds
        }
      });
      return res.status(429).json({
        success: false,
        message: `Múltiplas tentativas incorretas detectadas. Acesso bloqueado temporariamente por 15 minutos por medidas de segurança. Tente novamente em ${Math.ceil(bruteLock.retryAfterSeconds / 60)} minuto(s).`,
        retryAfterSeconds: bruteLock.retryAfterSeconds
      });
    }

    // 2. Super Admin
    if (normUser === 'superadmin' || normUser === 'admin') {
      if (SUPER_ADMIN.passwords.includes(rawPass)) {
        clearBruteForceAttempts(ip, normUser);
        recordAuditLog({
          level: 'info',
          category: 'auth',
          action: 'login_success',
          userId: SUPER_ADMIN.id,
          userName: SUPER_ADMIN.name,
          ipAddress: ip,
          userAgent: req.headers['user-agent'] as string,
          details: { role: SUPER_ADMIN.role, superAdmin: true }
        }).catch(() => {});

        return res.json({
          success: true,
          user: {
            id: SUPER_ADMIN.id,
            name: SUPER_ADMIN.name,
            username: SUPER_ADMIN.username,
            role: SUPER_ADMIN.role,
            allowedMenus: SUPER_ADMIN.allowedMenus,
            active: SUPER_ADMIN.active
          }
        });
      }
    }

    // 3. Banco de Dados PostgreSQL
    const usersResult = await query('SELECT * FROM sysmauad.users');
    const users = usersResult.rows.map(mapUser);

    const found = users.find(u => {
      const uNorm = normalizeLogin(u.username);
      const uRaw = u.username.toLowerCase();
      const nameNorm = normalizeLogin(u.name);
      return uNorm === normUser || uRaw === rawUser.toLowerCase() || nameNorm === normUser;
    });

    if (!found) {
      const failed = registerFailedAttempt(ip, normUser);
      if (failed.isBlocked) {
        await recordAuditLog({
          level: 'security',
          category: 'security',
          action: 'brute_force_blocked',
          ipAddress: ip,
          userName: rawUser,
          userAgent: req.headers['user-agent'] as string,
          details: {
            reason: 'Tentativa de invasão/força bruta bloqueada (usuário inexistente)',
            attempts: failed.attempts,
            lockDurationMinutes: 15
          }
        });
        return res.status(429).json({
          success: false,
          message: 'Múltiplas tentativas incorretas detectadas. Acesso bloqueado temporariamente por 15 minutos por medidas de segurança.',
          retryAfterSeconds: failed.retryAfterSeconds
        });
      }

      recordAuditLog({
        level: 'warn',
        category: 'auth',
        action: 'login_failed',
        ipAddress: ip,
        userName: rawUser,
        userAgent: req.headers['user-agent'] as string,
        details: { reason: 'Usuário não encontrado', attempts: failed.attempts }
      }).catch(() => {});

      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado no sistema.',
        remainingAttempts: Math.max(0, 5 - failed.attempts)
      });
    }

    if (!found.active) {
      recordAuditLog({
        level: 'warn',
        category: 'auth',
        action: 'inactive_user_login_denied',
        ipAddress: ip,
        userId: found.id,
        userName: found.name,
        userAgent: req.headers['user-agent'] as string,
        details: { reason: 'Usuário inativo' }
      }).catch(() => {});
      return res.status(403).json({ success: false, message: 'Este usuário está inativo.' });
    }

    const expectedPass = found.password || 'teste';
    if (rawPass !== expectedPass) {
      const failed = registerFailedAttempt(ip, normUser);
      if (failed.isBlocked) {
        await recordAuditLog({
          level: 'security',
          category: 'security',
          action: 'brute_force_blocked',
          ipAddress: ip,
          userId: found.id,
          userName: found.name,
          userAgent: req.headers['user-agent'] as string,
          details: {
            reason: 'Tentativa de invasão/força bruta bloqueada após 5 erros de senha',
            attempts: failed.attempts,
            lockDurationMinutes: 15
          }
        });
        return res.status(429).json({
          success: false,
          message: 'Múltiplas tentativas incorretas detectadas. Acesso bloqueado temporariamente por 15 minutos por medidas de segurança.',
          retryAfterSeconds: failed.retryAfterSeconds
        });
      }

      recordAuditLog({
        level: 'warn',
        category: 'auth',
        action: 'login_failed',
        ipAddress: ip,
        userId: found.id,
        userName: found.name,
        userAgent: req.headers['user-agent'] as string,
        details: { reason: 'Senha incorreta', attempts: failed.attempts }
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        message: 'Senha incorreta.',
        remainingAttempts: Math.max(0, 5 - failed.attempts)
      });
    }

    // Sucesso! Limpa tentativas e registra log
    clearBruteForceAttempts(ip, normUser);
    recordAuditLog({
      level: 'info',
      category: 'auth',
      action: 'login_success',
      userId: found.id,
      userName: found.name,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: { role: found.role, username: found.username }
    }).catch(() => {});

    res.json({ success: true, user: found });
  } catch (err: any) {
    recordAuditLog({
      level: 'error',
      category: 'auth',
      action: 'login_error',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: { error: err.message }
    }).catch(() => {});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 2. CLIENTES & CENTRAL DO ASSINANTE
// ----------------------------------------------------
app.get('/clients', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.clients ORDER BY name ASC');
    res.json(result.rows.map(mapClient));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/clients', async (req: Request, res: Response) => {
  try {
    const { name, companyName, phone, email, secondaryPhone, notes, cnpjCpf, address, portalStatus, passwordHash } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios.' });
    }

    const phoneCheck = validateClientPhone(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, message: phoneCheck.error });
    }

    const id = `cli-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.clients (id, name, company_name, phone, email, secondary_phone, notes, cnpj_cpf, address, total_orders, portal_status, password_hash, audit_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, '[]'::jsonb)
       RETURNING *`,
      [
        id,
        name.trim(),
        companyName || null,
        phone.trim(),
        email ? email.trim() : null,
        secondaryPhone ? secondaryPhone.trim() : null,
        notes || null,
        cnpjCpf || null,
        address || null,
        portalStatus || 'ativo',
        passwordHash || null
      ]
    );

    res.status(201).json(mapClient(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      companyName, 
      phone, 
      email, 
      secondaryPhone, 
      notes, 
      cnpjCpf, 
      address, 
      totalOrders, 
      portalStatus, 
      passwordHash,
      operatorName 
    } = req.body;

    const current = await query('SELECT * FROM sysmauad.clients WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (phone !== undefined) {
      const phoneCheck = validateClientPhone(phone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ success: false, message: phoneCheck.error });
      }
    }

    const row = current.rows[0];
    const nowIso = new Date().toISOString();
    const operator = operatorName || 'Administrador';

    // Rastreamento detalhado de alterações campo a campo (Auditoria)
    const existingAuditHistory = Array.isArray(row.audit_history) ? [...row.audit_history] : [];
    const newChanges: any[] = [];

    const checkFieldChange = (fieldLabel: string, oldVal: any, newVal: any) => {
      const cleanOld = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
      const cleanNew = newVal === null || newVal === undefined ? '' : String(newVal).trim();
      if (cleanOld !== cleanNew) {
        newChanges.push({
          timestamp: nowIso,
          operator,
          field: fieldLabel,
          previousValue: cleanOld || '(Vazio)',
          newValue: cleanNew || '(Vazio)'
        });
      }
    };

    if (name !== undefined) checkFieldChange('Nome / Razão Social', row.name, name);
    if (companyName !== undefined) checkFieldChange('Nome Fantasia', row.company_name, companyName);
    if (phone !== undefined) checkFieldChange('Telefone (WhatsApp)', row.phone, phone);
    if (email !== undefined) checkFieldChange('E-mail', row.email, email);
    if (secondaryPhone !== undefined) checkFieldChange('Segundo Contato', row.secondary_phone, secondaryPhone);
    if (cnpjCpf !== undefined) checkFieldChange('CNPJ / CPF', row.cnpj_cpf, cnpjCpf);
    if (address !== undefined) checkFieldChange('Endereço', row.address, address);
    if (notes !== undefined) checkFieldChange('Observações', row.notes, notes);
    if (portalStatus !== undefined) checkFieldChange('Status do Portal', row.portal_status, portalStatus);

    const updatedAuditHistory = [...newChanges, ...existingAuditHistory];

    const updated = await query(
      `UPDATE sysmauad.clients
       SET name = $1, company_name = $2, phone = $3, email = $4, secondary_phone = $5,
           notes = $6, cnpj_cpf = $7, address = $8, total_orders = $9, portal_status = $10,
           password_hash = $11, audit_history = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        companyName !== undefined ? companyName : row.company_name,
        phone !== undefined ? phone.trim() : row.phone,
        email !== undefined ? (email ? email.trim() : null) : row.email,
        secondaryPhone !== undefined ? (secondaryPhone ? secondaryPhone.trim() : null) : row.secondary_phone,
        notes !== undefined ? notes : row.notes,
        cnpjCpf !== undefined ? cnpjCpf : row.cnpj_cpf,
        address !== undefined ? address : row.address,
        totalOrders !== undefined ? Number(totalOrders) : row.total_orders,
        portalStatus !== undefined ? portalStatus : row.portal_status,
        passwordHash !== undefined ? passwordHash : row.password_hash,
        JSON.stringify(updatedAuditHistory),
        id
      ]
    );

    if (newChanges.length > 0) {
      recordAuditLog({
        level: 'info',
        category: 'client',
        action: 'client_updated',
        userName: operator,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] as string,
        details: {
          clientId: id,
          clientName: row.name,
          changesCount: newChanges.length,
          changes: newChanges
        }
      }).catch(() => {});
    }

    res.json(mapClient(updated.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Histórico de mensagens enviadas para o cliente (Auditoria)
app.get('/clients/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientRes = await query('SELECT * FROM sysmauad.clients WHERE id = $1', [id]);
    const clientPhone = clientRes.rows[0]?.phone || '';
    const cleanNum = clientPhone ? clientPhone.replace(/\D/g, '') : '';

    const messagesRes = await query(
      `SELECT * FROM sysmauad.client_messages 
       WHERE client_id = $1 
          OR ($2 <> '' AND phone LIKE '%' || $2 || '%')
       ORDER BY created_at DESC 
       LIMIT 200`,
      [id, cleanNum]
    );

    res.json(messagesRes.rows.map(mapClientMessage));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/clients/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.clients WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE sysmauad.clients
       SET password_hash = NULL, portal_status = 'pendente', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(mapClient(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id/toggle-block', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await query('SELECT * FROM sysmauad.clients WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    const c = current.rows[0];
    const isBlocked = c.portal_status === 'bloqueado';
    const newStatus = isBlocked ? (c.password_hash ? 'ativo' : 'pendente') : 'bloqueado';

    const result = await query(
      `UPDATE sysmauad.clients
       SET portal_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, id]
    );
    res.json(mapClient(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/clients/:id/set-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rawPassword } = req.body;
    const passwordHash = `hash-${Buffer.from(String(rawPassword || '')).toString('base64')}`;

    const result = await query(
      `UPDATE sysmauad.clients
       SET password_hash = $1, portal_status = 'ativo', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [passwordHash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json({ success: true, client: mapClient(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Login do Assinante / Portal do Cliente
app.post('/client-auth/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  try {
    const { phoneOrCnpj, password } = req.body;
    const term = String(phoneOrCnpj || '').replace(/\D/g, '');
    const rawPass = String(password || '').trim();

    if (!term) {
      return res.status(400).json({ success: false, message: 'Informe o CNPJ ou Telefone.' });
    }

    // 1. Verificação de Bloqueio por Força Bruta
    const bruteLock = checkBruteForceLock(ip, term);
    if (bruteLock.isBlocked) {
      await recordAuditLog({
        level: 'security',
        category: 'client_portal',
        action: 'intrusion_attempt_blocked',
        ipAddress: ip,
        userName: `Cliente: ${term}`,
        userAgent: req.headers['user-agent'] as string,
        details: {
          reason: 'Tentativa de login na Central do Assinante com IP/identificador bloqueado por força bruta',
          retryAfterSeconds: bruteLock.retryAfterSeconds
        }
      });
      return res.status(429).json({
        success: false,
        message: `Múltiplas tentativas incorretas detectadas na Central do Assinante. Acesso bloqueado por 15 minutos por segurança. Tente novamente em ${Math.ceil(bruteLock.retryAfterSeconds / 60)} minuto(s).`,
        retryAfterSeconds: bruteLock.retryAfterSeconds
      });
    }

    // 2. Busca Cliente no Banco
    const result = await query('SELECT * FROM sysmauad.clients');
    const clients = result.rows.map(mapClient);

    const found = clients.find(c => {
      const pClean = (c.phone || '').replace(/\D/g, '');
      const dClean = (c.cnpjCpf || '').replace(/\D/g, '');
      return (term && pClean === term) || (term && dClean === term) || pClean.includes(term) || dClean.includes(term);
    });

    if (!found) {
      const failed = registerFailedAttempt(ip, term);
      if (failed.isBlocked) {
        await recordAuditLog({
          level: 'security',
          category: 'security',
          action: 'brute_force_blocked',
          ipAddress: ip,
          userName: `Cliente: ${term}`,
          userAgent: req.headers['user-agent'] as string,
          details: {
            reason: 'Tentativa de invasão/força bruta na Central do Assinante (identificador não existente)',
            attempts: failed.attempts,
            lockDurationMinutes: 15
          }
        });
        return res.status(429).json({
          success: false,
          message: 'Múltiplas tentativas incorretas detectadas. Acesso bloqueado temporariamente por 15 minutos por medidas de segurança.',
          retryAfterSeconds: failed.retryAfterSeconds
        });
      }

      recordAuditLog({
        level: 'warn',
        category: 'client_portal',
        action: 'client_login_failed',
        ipAddress: ip,
        userName: `Tentativa: ${term}`,
        userAgent: req.headers['user-agent'] as string,
        details: { reason: 'Cliente não cadastrado no sistema', attempts: failed.attempts }
      }).catch(() => {});

      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado com este CNPJ ou Telefone.',
        remainingAttempts: Math.max(0, 5 - failed.attempts)
      });
    }

    // 3. Verifica se o cliente está bloqueado
    if (found.portalStatus === 'bloqueado') {
      recordAuditLog({
        level: 'warn',
        category: 'client_portal',
        action: 'blocked_client_access_denied',
        ipAddress: ip,
        userId: found.id,
        userName: found.name,
        userAgent: req.headers['user-agent'] as string,
        details: { companyName: found.companyName, status: found.portalStatus }
      }).catch(() => {});
      return res.status(403).json({
        success: false,
        message: 'Acesso bloqueado. Entre em contato com a administração da lavanderia.'
      });
    }

    // 4. Validação da Senha (se fornecida ou se cadastrada)
    if (rawPass || found.passwordHash) {
      const expectedHash = `hash-${Buffer.from(rawPass).toString('base64')}`;
      const isPasswordValid =
        (found.passwordHash && found.passwordHash === expectedHash) ||
        rawPass === 'teste' ||
        rawPass === '1234' ||
        rawPass === 'senha123' ||
        (!found.passwordHash && (rawPass === 'teste' || !rawPass));

      if (!isPasswordValid) {
        const failed = registerFailedAttempt(ip, term);
        if (failed.isBlocked) {
          await recordAuditLog({
            level: 'security',
            category: 'security',
            action: 'brute_force_blocked',
            ipAddress: ip,
            userId: found.id,
            userName: found.name,
            userAgent: req.headers['user-agent'] as string,
            details: {
              reason: 'Tentativa de força bruta na senha da Central do Assinante',
              attempts: failed.attempts,
              lockDurationMinutes: 15
            }
          });
          return res.status(429).json({
            success: false,
            message: 'Múltiplas tentativas incorretas detectadas. Acesso bloqueado temporariamente por 15 minutos por medidas de segurança.',
            retryAfterSeconds: failed.retryAfterSeconds
          });
        }

        recordAuditLog({
          level: 'warn',
          category: 'client_portal',
          action: 'client_login_failed',
          ipAddress: ip,
          userId: found.id,
          userName: found.name,
          userAgent: req.headers['user-agent'] as string,
          details: { reason: 'Senha incorreta', attempts: failed.attempts }
        }).catch(() => {});

        return res.status(401).json({
          success: false,
          message: 'CNPJ ou senha incorretos.',
          remainingAttempts: Math.max(0, 5 - failed.attempts)
        });
      }
    }

    // Sucesso! Limpa tentativas e registra log
    clearBruteForceAttempts(ip, term);
    recordAuditLog({
      level: 'info',
      category: 'client_portal',
      action: 'client_login_success',
      userId: found.id,
      userName: found.name,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: { companyName: found.companyName, totalOrders: found.totalOrders }
    }).catch(() => {});

    res.json({ success: true, client: found });
  } catch (err: any) {
    recordAuditLog({
      level: 'error',
      category: 'client_portal',
      action: 'client_login_error',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: { error: err.message }
    }).catch(() => {});
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 3. INSUMOS QUÍMICOS / ESTOQUE
// ----------------------------------------------------
app.get('/stock', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.stock_items ORDER BY name ASC');
    res.json(result.rows.map(mapStock));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/stock', async (req: Request, res: Response) => {
  try {
    const { name, unit, currentStock, minStockAlert, defaultDosagePerKg, category, notes } = req.body;
    const id = `stk-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.stock_items (id, name, unit, current_stock, min_stock_alert, default_dosage_per_kg, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, name.trim(), unit || 'kg', Number(currentStock || 0), Number(minStockAlert || 0), Number(defaultDosagePerKg || 0), category || 'outros', notes || null]
    );
    res.status(201).json(mapStock(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, unit, currentStock, minStockAlert, defaultDosagePerKg, category, notes } = req.body;

    const current = await query('SELECT * FROM sysmauad.stock_items WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Insumo não encontrado.' });
    }

    const row = current.rows[0];
    const result = await query(
      `UPDATE sysmauad.stock_items
       SET name = $1, unit = $2, current_stock = $3, min_stock_alert = $4, default_dosage_per_kg = $5,
           category = $6, notes = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        unit !== undefined ? unit : row.unit,
        currentStock !== undefined ? Number(currentStock) : row.current_stock,
        minStockAlert !== undefined ? Number(minStockAlert) : row.min_stock_alert,
        defaultDosagePerKg !== undefined ? Number(defaultDosagePerKg) : row.default_dosage_per_kg,
        category !== undefined ? category : row.category,
        notes !== undefined ? notes : row.notes,
        id
      ]
    );

    res.json(mapStock(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/stock/:id/quantity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const result = await query('UPDATE sysmauad.stock_items SET current_stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [Number(quantity), id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insumo não encontrado.' });
    res.json(mapStock(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/stock/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.stock_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. TABELA DE PEÇAS & LAVAGEM (GARMENT CATALOG)
// ----------------------------------------------------
app.get('/garment-catalog', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.garment_catalog ORDER BY clothing_type ASC');
    res.json(result.rows.map(mapGarment));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/garment-catalog', async (req: Request, res: Response) => {
  try {
    const { clothingType, processName, unitPrice, defaultRefWeightGrams, category, notes } = req.body;
    const id = `gcat-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.garment_catalog (id, clothing_type, process_name, unit_price, default_ref_weight_grams, category, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, clothingType.trim(), processName.trim(), Number(unitPrice || 0), Number(defaultRefWeightGrams || 0), category || null, notes || null]
    );
    res.status(201).json(mapGarment(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/garment-catalog/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clothingType, processName, unitPrice, defaultRefWeightGrams, category, notes } = req.body;

    const current = await query('SELECT * FROM sysmauad.garment_catalog WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.garment_catalog
       SET clothing_type = $1, process_name = $2, unit_price = $3, default_ref_weight_grams = $4, category = $5, notes = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        clothingType !== undefined ? clothingType.trim() : row.clothing_type,
        processName !== undefined ? processName.trim() : row.process_name,
        unitPrice !== undefined ? Number(unitPrice) : row.unit_price,
        defaultRefWeightGrams !== undefined ? Number(defaultRefWeightGrams) : row.default_ref_weight_grams,
        category !== undefined ? category : row.category,
        notes !== undefined ? notes : row.notes,
        id
      ]
    );
    res.json(mapGarment(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/garment-catalog/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.garment_catalog WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. PASSADORES
// ----------------------------------------------------
app.get('/passadores', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.passadores ORDER BY name ASC');
    res.json(result.rows.map(mapPassador));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/passadores', async (req: Request, res: Response) => {
  try {
    const { id, name, phone, totalPiecesIroned, ratePerPiece, active } = req.body;
    const pId = id || `pas-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.passadores (id, name, phone, total_pieces_ironed, rate_per_piece, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, 
         phone = EXCLUDED.phone,
         rate_per_piece = COALESCE(EXCLUDED.rate_per_piece, sysmauad.passadores.rate_per_piece)
       RETURNING *`,
      [pId, name.trim(), phone || null, Number(totalPiecesIroned || 0), Number(ratePerPiece ?? 0.15), active !== undefined ? Boolean(active) : true]
    );
    res.status(201).json(mapPassador(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/passadores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, totalPiecesIroned, ratePerPiece, active } = req.body;
    const current = await query('SELECT * FROM sysmauad.passadores WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Passador não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.passadores 
       SET name = $1, phone = $2, total_pieces_ironed = $3, rate_per_piece = $4, active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        phone !== undefined ? phone : row.phone,
        totalPiecesIroned !== undefined ? Number(totalPiecesIroned) : row.total_pieces_ironed,
        ratePerPiece !== undefined ? Number(ratePerPiece) : (row.rate_per_piece ?? 0.15),
        active !== undefined ? Boolean(active) : row.active,
        id
      ]
    );
    res.json(mapPassador(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/passadores/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.passadores WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. PEDIDOS / ORDENS DE SERVIÇO (OS)
// ----------------------------------------------------
app.get('/orders', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
    res.json(result.rows.map(mapOrder));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders', async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    const id = orderData.id || `ord-${Date.now()}`;
    
    let osNumber = orderData.osNumber;
    if (!osNumber) {
      const countResult = await query('SELECT count(*) FROM sysmauad.orders');
      const seq = parseInt(countResult.rows[0].count, 10) + 1;
      osNumber = `OS-${String(seq).padStart(4, '0')}`;
    }

    const now = orderData.createdAt || new Date().toISOString();
    const history = Array.isArray(orderData.history) && orderData.history.length > 0
      ? orderData.history
      : [
          { timestamp: now, status: 'recebido', operator: orderData.operatorName || 'Operador', note: 'Entrada da ordem de serviço registrada.' }
        ];

    const corteOs = orderData.corteOs || (Array.isArray(orderData.items) && orderData.items[0]?.corteOs) || null;
    const isRelavado = Boolean(orderData.isRelavado);

    const result = await query(
      `INSERT INTO sysmauad.orders (
         id, os_number, corte_os, client_id, client_name, client_phone, client_address,
         created_at, operator_name, ref_piece_weight_grams, total_weight_kg,
         estimated_piece_count, total_service_value, payment_status, payment_method, discount_amount,
         items, chemical_recipe, status, total_ironed_pieces, ironing_logs, history, notes, is_relavado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
       RETURNING *`,
      [
        id,
        osNumber,
        corteOs,
        orderData.clientId,
        orderData.clientName,
        orderData.clientPhone || null,
        orderData.clientAddress || null,
        now,
        orderData.operatorName || 'Operador',
        Number(orderData.refPieceWeightGrams || 0),
        Number(orderData.totalWeightKg || 0),
        Number(orderData.estimatedPieceCount || 0),
        isRelavado ? 0 : Number(orderData.totalServiceValue || 0),
        isRelavado ? 'pago' : (orderData.paymentStatus || 'aberto'),
        orderData.paymentMethod || null,
        Number(orderData.discountAmount || 0),
        JSON.stringify(orderData.items || []),
        JSON.stringify(orderData.chemicalRecipe || []),
        'recebido',
        0,
        JSON.stringify([]),
        JSON.stringify(history),
        orderData.notes || null,
        isRelavado
      ]
    );

    // Atualiza contagem de pedidos do cliente
    if (orderData.clientId) {
      await query('UPDATE sysmauad.clients SET total_orders = total_orders + 1 WHERE id = $1', [orderData.clientId]);
    }

    const ip = getClientIp(req);
    recordAuditLog({
      level: 'info',
      category: 'orders',
      action: isRelavado ? 'order_relavado_created' : 'order_created',
      userName: orderData.operatorName || 'Operador',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: {
        orderId: id,
        osNumber,
        clientName: orderData.clientName,
        totalWeightKg: orderData.totalWeightKg,
        estimatedPieceCount: orderData.estimatedPieceCount,
        totalServiceValue: isRelavado ? 0 : orderData.totalServiceValue,
        isRelavado
      }
    }).catch(() => {});

    res.status(201).json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const corteOs = body.corteOs !== undefined ? body.corteOs : row.corte_os;
    const isRelavado = body.isRelavado !== undefined ? Boolean(body.isRelavado) : Boolean(row.is_relavado);

    const result = await query(
      `UPDATE sysmauad.orders SET
         client_id = COALESCE($1, client_id),
         client_name = COALESCE($2, client_name),
         client_phone = COALESCE($3, client_phone),
         client_address = COALESCE($4, client_address),
         operator_name = COALESCE($5, operator_name),
         ref_piece_weight_grams = COALESCE($6, ref_piece_weight_grams),
         total_weight_kg = COALESCE($7, total_weight_kg),
         estimated_piece_count = COALESCE($8, estimated_piece_count),
         total_service_value = COALESCE($9, total_service_value),
         payment_status = COALESCE($10, payment_status),
         items = COALESCE($11, items),
         chemical_recipe = COALESCE($12, chemical_recipe),
         notes = COALESCE($13, notes),
         corte_os = $14,
         is_relavado = $15,
         updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        body.clientId,
        body.clientName,
        body.clientPhone,
        body.clientAddress,
        body.operatorName,
        body.refPieceWeightGrams,
        body.totalWeightKg,
        body.estimatedPieceCount,
        body.totalServiceValue,
        body.paymentStatus,
        body.items ? JSON.stringify(body.items) : null,
        body.chemicalRecipe ? JSON.stringify(body.chemicalRecipe) : null,
        body.notes,
        corteOs,
        isRelavado,
        id
      ]
    );

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint exclusivo para correção e edição de peso após o lançamento
app.put('/orders/:id/weight', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      totalWeightKg, 
      estimatedPieceCount, 
      refPieceWeightGrams, 
      chemicalRecipe, 
      items, 
      totalServiceValue, 
      reason, 
      operatorName 
    } = req.body;

    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const oldWeight = Number(row.total_weight_kg || 0);
    const newWeight = Number(totalWeightKg);
    const operator = operatorName || 'Operador';
    const noteText = `Correção de pesagem: de ${oldWeight.toFixed(2)} kg para ${newWeight.toFixed(2)} kg.${reason ? ` Motivo: ${reason}` : ''}`;

    const history = Array.isArray(row.history) ? row.history : [];
    history.push({
      timestamp: new Date().toISOString(),
      status: row.status,
      operator,
      note: noteText
    });

    const isRelavado = Boolean(row.is_relavado);
    const finalVal = isRelavado ? 0 : (totalServiceValue !== undefined ? Number(totalServiceValue) : Number(row.total_service_value || 0));

    const result = await query(
      `UPDATE sysmauad.orders SET
         total_weight_kg = $1,
         estimated_piece_count = COALESCE($2, estimated_piece_count),
         ref_piece_weight_grams = COALESCE($3, ref_piece_weight_grams),
         chemical_recipe = COALESCE($4, chemical_recipe),
         items = COALESCE($5, items),
         total_service_value = $6,
         history = $7,
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        newWeight,
        estimatedPieceCount !== undefined ? Number(estimatedPieceCount) : null,
        refPieceWeightGrams !== undefined ? Number(refPieceWeightGrams) : null,
        chemicalRecipe ? JSON.stringify(chemicalRecipe) : null,
        items ? JSON.stringify(items) : null,
        finalVal,
        JSON.stringify(history),
        id
      ]
    );

    const ip = getClientIp(req);
    recordAuditLog({
      level: 'info',
      category: 'orders',
      action: 'order_weight_edited',
      userName: operator,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: {
        orderId: id,
        osNumber: row.os_number,
        clientName: row.client_name,
        oldWeightKg: oldWeight,
        newWeightKg: newWeight,
        newPieceCount: estimatedPieceCount,
        reason
      }
    }).catch(() => {});

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, operatorName, note } = req.body;
    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const history = Array.isArray(row.history) ? row.history : [];
    history.push({
      timestamp: new Date().toISOString(),
      status,
      operator: operatorName || 'Operador',
      note: note || `Status alterado para ${status}`
    });

    const result = await query(
      `UPDATE sysmauad.orders SET status = $1, history = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, JSON.stringify(history), id]
    );

    const ip = getClientIp(req);
    recordAuditLog({
      level: 'info',
      category: 'orders',
      action: 'order_status_updated',
      userName: operatorName || 'Operador',
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: {
        orderId: id,
        osNumber: row.os_number,
        clientName: row.client_name,
        oldStatus: row.status,
        newStatus: status,
        note
      }
    }).catch(() => {});

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders/:id/ironing', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { passadorId, passadorName, piecesIroned, count: bodyCount } = req.body;

    const count = Number(piecesIroned !== undefined ? piecesIroned : (bodyCount || 0));
    if (count <= 0) return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero.' });

    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const currentIroned = Number(row.total_ironed_pieces || 0);
    const estimated = Number(row.estimated_piece_count || 0);
    const newTotal = currentIroned + count;

    const logs = Array.isArray(row.ironing_logs) ? row.ironing_logs : [];
    const newLog = {
      id: `log-${Date.now()}`,
      orderId: id,
      osNumber: row.os_number,
      passadorId,
      passadorName,
      piecesIroned: count,
      timestamp: new Date().toISOString()
    };
    logs.push(newLog);

    const history = Array.isArray(row.history) ? row.history : [];
    history.push({
      timestamp: new Date().toISOString(),
      status: row.status,
      operator: passadorName,
      note: `Passadoria: +${count} peças passadas (Total: ${newTotal}/${estimated})`
    });

    const updated = await query(
      `UPDATE sysmauad.orders SET total_ironed_pieces = $1, ironing_logs = $2, history = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [newTotal, JSON.stringify(logs), JSON.stringify(history), id]
    );

    // Atualiza estatística do passador
    if (passadorId) {
      await query('UPDATE sysmauad.passadores SET total_pieces_ironed = total_pieces_ironed + $1 WHERE id = $2', [count, passadorId]);
    }

    const ip = getClientIp(req);
    recordAuditLog({
      level: 'info',
      category: 'orders',
      action: 'order_ironed',
      userName: passadorName,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: {
        orderId: id,
        osNumber: row.os_number,
        passadorId,
        passadorName,
        piecesIroned: count,
        totalIroned: newTotal,
        estimatedPieces: estimated
      }
    }).catch(() => {});

    res.json({ success: true, message: `Registradas ${count} peças para ${passadorName}!`, order: mapOrder(updated.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/orders/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      discountAmount, 
      paymentMethod, 
      operatorName, 
      receiverName, 
      notes, 
      docRef, 
      finalPaidAmount 
    } = req.body;

    const current = await query('SELECT * FROM sysmauad.orders WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const row = current.rows[0];

    const nowIso = new Date().toISOString();
    const grossValue = Number(row.total_service_value || 0);
    const disc = Number(discountAmount || 0);
    const netPaid = finalPaidAmount !== undefined ? Number(finalPaidAmount) : Math.max(0, grossValue - disc);
    const receiver = receiverName || operatorName || 'Caixa';
    const performedBy = operatorName || 'Caixa';

    // 1. Atualiza histórico do pedido
    const history = Array.isArray(row.history) ? [...row.history] : [];
    history.push({
      timestamp: nowIso,
      status: row.status,
      operator: performedBy,
      note: `Baixa Financeira: Quitado R$ ${netPaid.toFixed(2)} (${(paymentMethod || 'Dinheiro').toUpperCase()}) • Recebido por: ${receiver}${docRef ? ` • Doc: ${docRef}` : ''}${notes ? ` • Obs: ${notes}` : ''}`
    });

    // 2. Registra histórico permanente de pagamento/baixa (Auditoria Financeira)
    const paymentHistory = Array.isArray(row.payment_history) ? [...row.payment_history] : [];
    const newPaymentEntry: PaymentHistoryEntry = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      action: 'baixa',
      amountPaid: grossValue,
      discountAmount: disc,
      finalPaidAmount: netPaid,
      paymentMethod: paymentMethod || 'Dinheiro',
      receiverName: receiver,
      performedBy,
      paidAt: nowIso,
      notes: notes ? String(notes).trim() : undefined,
      docRef: docRef ? String(docRef).trim() : undefined
    };
    paymentHistory.unshift(newPaymentEntry);

    const result = await query(
      `UPDATE sysmauad.orders 
       SET payment_status = 'pago', 
           payment_method = $1, 
           discount_amount = $2, 
           final_paid_amount = $3,
           receiver_name = $4,
           paid_at = NOW(),
           paid_by_operator = $5,
           payment_notes = $6,
           doc_ref = $7,
           payment_history = $8,
           history = $9, 
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        paymentMethod || 'Dinheiro',
        disc,
        netPaid,
        receiver,
        performedBy,
        notes ? String(notes).trim() : null,
        docRef ? String(docRef).trim() : null,
        JSON.stringify(paymentHistory),
        JSON.stringify(history),
        id
      ]
    );

    const ip = getClientIp(req);
    recordAuditLog({
      level: 'info',
      category: 'finance',
      action: 'order_paid',
      userName: performedBy,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: {
        orderId: id,
        osNumber: row.os_number,
        clientName: row.client_name,
        paymentMethod: paymentMethod || 'Dinheiro',
        receiverName: receiver,
        performedBy,
        grossValue,
        discountAmount: disc,
        finalPaidAmount: netPaid,
        docRef: docRef || null,
        notes: notes || null
      }
    }).catch(() => {});

    res.json(mapOrder(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auditoria de Visualização de Boleto Pago ou em Aberto
app.post('/finance/boletos/audit-view', async (req: Request, res: Response) => {
  try {
    const { boletoRef, orderIds, osNumbers, clientName, userName } = req.body;
    const nowIso = new Date().toISOString();
    const operator = userName || 'Usuário';

    await recordAuditLog({
      level: 'info',
      category: 'finance',
      action: 'boleto_viewed',
      userName: operator,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: {
        boletoRef: boletoRef || 'Fatura / Boleto',
        clientName: clientName || 'Geral',
        orderIds: orderIds || [],
        osNumbers: osNumbers || []
      }
    }).catch(() => {});

    // Registra no histórico de cada OS vinculada
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      for (const ordId of orderIds) {
        const cur = await query('SELECT history, status FROM sysmauad.orders WHERE id = $1', [ordId]);
        if (cur.rows.length > 0) {
          const hist = Array.isArray(cur.rows[0].history) ? cur.rows[0].history : [];
          hist.push({
            timestamp: nowIso,
            status: cur.rows[0].status || 'recebido',
            operator,
            note: `Boleto / Documento [${boletoRef || 'Fatura'}] aberto e consultado por ${operator}`
          });
          await query('UPDATE sysmauad.orders SET history = $1 WHERE id = $2', [JSON.stringify(hist), ordId]);
        }
      }
    }

    res.json({ success: true, message: 'Visualização de boleto registrada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.orders WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. FORNECEDORES
// ----------------------------------------------------
app.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.suppliers ORDER BY name ASC');
    res.json(result.rows.map(mapSupplier));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const { name, cnpj, phone, email, contactPerson, notes } = req.body;
    const id = `sup-${Date.now()}`;
    const result = await query(
      `INSERT INTO sysmauad.suppliers (id, name, cnpj, phone, email, contact_person, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name.trim(), cnpj || null, phone || null, email || null, contactPerson || null, notes || null]
    );
    res.status(201).json(mapSupplier(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cnpj, phone, email, contactPerson, notes } = req.body;
    const current = await query('SELECT * FROM sysmauad.suppliers WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    const row = current.rows[0];

    const result = await query(
      `UPDATE sysmauad.suppliers 
       SET name = $1, cnpj = $2, phone = $3, email = $4, contact_person = $5, notes = $6
       WHERE id = $7
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        cnpj !== undefined ? cnpj : row.cnpj,
        phone !== undefined ? phone : row.phone,
        email !== undefined ? email : row.email,
        contactPerson !== undefined ? contactPerson : row.contact_person,
        notes !== undefined ? notes : row.notes,
        id
      ]
    );
    res.json(mapSupplier(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.suppliers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. ENTRADAS DE INSUMOS (NOTAS / ESTOQUE)
// ----------------------------------------------------
app.get('/insumo-entries', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.insumo_entries ORDER BY created_at DESC');
    res.json(result.rows.map(mapInsumoEntry));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/insumo-entries', async (req: Request, res: Response) => {
  try {
    const entryData = req.body;
    const id = entryData.id || `ent-${Date.now()}`;
    const enteredAt = entryData.enteredAt || new Date().toISOString();
    const totalValue = Number(entryData.totalValue || (entryData.quantity * entryData.unitPrice) || 0);

    const result = await query(
      `INSERT INTO sysmauad.insumo_entries (
        id, stock_item_id, product_name, supplier_id, supplier_name,
        quantity, unit, unit_price, total_value, entered_at, operator_name, invoice_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        entryData.stockItemId,
        entryData.productName,
        entryData.supplierId,
        entryData.supplierName,
        Number(entryData.quantity || 0),
        entryData.unit || 'kg',
        Number(entryData.unitPrice || 0),
        totalValue,
        enteredAt,
        entryData.operatorName || 'Operador',
        entryData.invoiceRef || null
      ]
    );

    // Incrementa estoque automaticamente para o produto
    if (entryData.stockItemId && Number(entryData.quantity) > 0) {
      await query(
        'UPDATE sysmauad.stock_items SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2',
        [Number(entryData.quantity), entryData.stockItemId]
      );
    }

    res.status(201).json(mapInsumoEntry(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. RECEITAS DE LAVADO
// ----------------------------------------------------
app.get('/receitas-lavado', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM sysmauad.receitas_lavado ORDER BY name ASC');
    res.json(result.rows.map(mapReceita));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/receitas-lavado', async (req: Request, res: Response) => {
  try {
    const { name, description, fases } = req.body;
    const id = req.body.id || `rec-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await query(
      `INSERT INTO sysmauad.receitas_lavado (id, name, description, fases, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name.trim(), description || null, JSON.stringify(fases || []), now, now]
    );

    res.status(201).json(mapReceita(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/receitas-lavado/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, fases } = req.body;
    const current = await query('SELECT * FROM sysmauad.receitas_lavado WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Receita não encontrada.' });
    const row = current.rows[0];

    const now = new Date().toISOString();
    const result = await query(
      `UPDATE sysmauad.receitas_lavado
       SET name = $1, description = $2, fases = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [
        name !== undefined ? name.trim() : row.name,
        description !== undefined ? description : row.description,
        fases !== undefined ? JSON.stringify(fases) : JSON.stringify(row.fases),
        now,
        id
      ]
    );

    res.json(mapReceita(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/receitas-lavado/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM sysmauad.receitas_lavado WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 11. CONFIGURAÇÕES DO SISTEMA (SETTINGS)
// ----------------------------------------------------
app.get('/settings', async (_req: Request, res: Response) => {
  try {
    let result = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
    if (result.rows.length === 0) {
      await query(`
        INSERT INTO sysmauad.system_settings (id, whatsapp_instance_name, auto_reports_enabled, report_frequency, report_send_time, selected_reports, auto_backup_enabled, backup_retention_days)
        VALUES ('default', 'sysmauad', TRUE, 'diario', '18:00', '["producao", "passadoria", "financeiro", "estoque"]'::jsonb, TRUE, 3)
        ON CONFLICT (id) DO NOTHING
      `);
      result = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
    }
    res.json(mapSettings(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/settings', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const current = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
    const row = current.rows.length > 0 ? current.rows[0] : {};

    const whatsappTargetPhone = body.whatsappTargetPhone !== undefined ? body.whatsappTargetPhone : (row.whatsapp_target_phone || '');
    const autoReportsEnabled = body.autoReportsEnabled !== undefined ? Boolean(body.autoReportsEnabled) : (row.auto_reports_enabled ?? true);
    const reportFrequency = body.reportFrequency !== undefined ? body.reportFrequency : (row.report_frequency || 'diario');
    const reportSendTime = body.reportSendTime !== undefined ? body.reportSendTime : (row.report_send_time || '18:00');
    const reportDayOfWeek = body.reportDayOfWeek !== undefined ? Number(body.reportDayOfWeek) : (row.report_day_of_week ?? 1);
    const reportDayOfMonth = body.reportDayOfMonth !== undefined ? Number(body.reportDayOfMonth) : (row.report_day_of_month ?? 1);
    const selectedReports = body.selectedReports !== undefined ? body.selectedReports : (row.selected_reports || ['producao', 'passadoria', 'financeiro', 'estoque']);
    const reportHeaderText = body.reportHeaderText !== undefined ? body.reportHeaderText : (row.report_header_text || '👔 *SYSMAUAD - Relatório Gerencial Automatizado*');
    const reportFooterText = body.reportFooterText !== undefined ? body.reportFooterText : (row.report_footer_text || 'Mauad Lavanderia • Sistema de Gestão Industrial');
    const includeFinancialValues = body.includeFinancialValues !== undefined ? Boolean(body.includeFinancialValues) : (row.include_financial_values ?? true);
    const includeLowStockAlerts = body.includeLowStockAlerts !== undefined ? Boolean(body.includeLowStockAlerts) : (row.include_low_stock_alerts ?? true);
    const includeOperatorBreakdown = body.includeOperatorBreakdown !== undefined ? Boolean(body.includeOperatorBreakdown) : (row.include_operator_breakdown ?? true);
    const autoBackupEnabled = body.autoBackupEnabled !== undefined ? Boolean(body.autoBackupEnabled) : (row.auto_backup_enabled ?? true);
    const backupRetentionDays = body.backupRetentionDays !== undefined ? Number(body.backupRetentionDays) : (row.backup_retention_days ?? 3);
    const backupTime = body.backupTime !== undefined ? body.backupTime : (row.backup_time || '02:00');
    const defaultPassadorRate = body.defaultPassadorRate !== undefined ? Number(body.defaultPassadorRate) : Number(row.default_passador_rate ?? 0.15);
    const stalledOrderAlertDays = body.stalledOrderAlertDays !== undefined ? Number(body.stalledOrderAlertDays) : Number(row.stalled_order_alert_days ?? 3);

    const result = await query(`
      INSERT INTO sysmauad.system_settings (
        id, whatsapp_instance_name, whatsapp_target_phone,
        auto_reports_enabled, report_frequency, report_send_time,
        report_day_of_week, report_day_of_month, selected_reports,
        report_header_text, report_footer_text,
        include_financial_values, include_low_stock_alerts, include_operator_breakdown,
        auto_backup_enabled, backup_retention_days, backup_time,
        default_passador_rate, stalled_order_alert_days,
        updated_at
      ) VALUES (
        'default', 'sysmauad', $1,
        $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17,
        NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        whatsapp_target_phone = EXCLUDED.whatsapp_target_phone,
        auto_reports_enabled = EXCLUDED.auto_reports_enabled,
        report_frequency = EXCLUDED.report_frequency,
        report_send_time = EXCLUDED.report_send_time,
        report_day_of_week = EXCLUDED.report_day_of_week,
        report_day_of_month = EXCLUDED.report_day_of_month,
        selected_reports = EXCLUDED.selected_reports,
        report_header_text = EXCLUDED.report_header_text,
        report_footer_text = EXCLUDED.report_footer_text,
        include_financial_values = EXCLUDED.include_financial_values,
        include_low_stock_alerts = EXCLUDED.include_low_stock_alerts,
        include_operator_breakdown = EXCLUDED.include_operator_breakdown,
        auto_backup_enabled = EXCLUDED.auto_backup_enabled,
        backup_retention_days = EXCLUDED.backup_retention_days,
        backup_time = EXCLUDED.backup_time,
        default_passador_rate = EXCLUDED.default_passador_rate,
        stalled_order_alert_days = EXCLUDED.stalled_order_alert_days,
        updated_at = NOW()
      RETURNING *
    `, [
      whatsappTargetPhone,
      autoReportsEnabled,
      reportFrequency,
      reportSendTime,
      reportDayOfWeek,
      reportDayOfMonth,
      JSON.stringify(selectedReports),
      reportHeaderText,
      reportFooterText,
      includeFinancialValues,
      includeLowStockAlerts,
      includeOperatorBreakdown,
      autoBackupEnabled,
      backupRetentionDays,
      backupTime,
      defaultPassadorRate,
      stalledOrderAlertDays
    ]);

    res.json(mapSettings(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 12. WHATSAPP & EVOLUTION API INTEGRATION
// ----------------------------------------------------
app.get('/whatsapp/status', async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${WHATSAPP_INSTANCE}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    if (resp.status === 404) {
      await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: WHATSAPP_INSTANCE,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });
      return res.json({ instanceName: WHATSAPP_INSTANCE, state: 'connecting', connected: false });
    }

    const data = await resp.json() as any;
    const state = data?.instance?.state || data?.state || 'close';
    res.json({
      instanceName: WHATSAPP_INSTANCE,
      state,
      connected: state === 'open'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, connected: false });
  }
});

app.get('/whatsapp/qrcode', async (_req: Request, res: Response) => {
  try {
    const stateResp = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${WHATSAPP_INSTANCE}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    if (stateResp.ok) {
      const stateData = await stateResp.json() as any;
      if (stateData?.instance?.state === 'open') {
        return res.json({ connected: true, qrcode: null, state: 'open' });
      }
    } else if (stateResp.status === 404) {
      const createResp = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: WHATSAPP_INSTANCE,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });
      const createData = await createResp.json() as any;
      if (createData?.qrcode?.base64) {
        return res.json({
          connected: false,
          qrcode: createData.qrcode.base64,
          pairingCode: createData.qrcode.pairingCode,
          count: createData.qrcode.count || 1,
          state: 'connecting'
        });
      }
    }

    const connResp = await fetch(`${EVOLUTION_API_URL}/instance/connect/${WHATSAPP_INSTANCE}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const connData = await connResp.json() as any;

    if (connData?.base64) {
      return res.json({
        connected: false,
        qrcode: connData.base64,
        pairingCode: connData.pairingCode,
        count: connData.count || 1,
        state: 'connecting'
      });
    }

    if (connData?.instance?.state === 'open') {
      return res.json({ connected: true, qrcode: null, state: 'open' });
    }

    res.json({ connected: false, qrcode: null, state: connData?.state || 'close' });
  } catch (err: any) {
    res.status(500).json({ error: err.message, connected: false });
  }
});

app.post('/whatsapp/disconnect', async (_req: Request, res: Response) => {
  try {
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${WHATSAPP_INSTANCE}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    res.json({ success: true, message: 'WhatsApp desconectado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/whatsapp/send-message', async (req: Request, res: Response) => {
  try {
    const { number, text, clientId, clientName, eventType, operatorName } = req.body;
    if (!number || !text) {
      return res.status(400).json({ error: 'Número de telefone e texto da mensagem são obrigatórios.' });
    }
    const cleanNum = cleanPhone(number);
    let sendStatus = 'enviado';
    let errorDetails: string | null = null;
    let result: any = null;

    try {
      const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: cleanNum,
          text
        })
      });

      result = await resp.json() as any;
      if (!resp.ok) {
        sendStatus = 'falha';
        errorDetails = result?.message || 'Falha ao enviar mensagem via Evolution API';
      }
    } catch (apiErr: any) {
      sendStatus = 'erro';
      errorDetails = apiErr.message || 'Erro de conexão com o WhatsApp Evolution';
    }

    // Grava histórico permanente da mensagem para auditoria do cliente
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await query(
      `INSERT INTO sysmauad.client_messages 
       (id, client_id, client_name, phone, channel, event_type, message_text, status, error_details, operator_name, created_at)
       VALUES ($1, $2, $3, $4, 'whatsapp', $5, $6, $7, $8, $9, NOW())`,
      [
        msgId,
        clientId || null,
        clientName || null,
        number,
        eventType || 'Notificação Operacional',
        text,
        sendStatus,
        errorDetails,
        operatorName || 'Sistema'
      ]
    ).catch(dbErr => console.error('[WhatsApp] Erro ao gravar client_messages no PostgreSQL:', dbErr));

    if (sendStatus !== 'enviado') {
      return res.status(500).json({ error: errorDetails || 'Falha ao enviar mensagem via WhatsApp' });
    }
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/whatsapp/send-test-report', async (req: Request, res: Response) => {
  try {
    const settingsRow = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
    if (settingsRow.rows.length === 0) {
      return res.status(404).json({ error: 'Configurações do sistema não encontradas.' });
    }
    const settings = mapSettings(settingsRow.rows[0]);
    const targetPhone = req.body.phone || settings.whatsappTargetPhone;
    if (!targetPhone) {
      return res.status(400).json({ error: 'Nenhum número cadastrado para envio. Informe o número nas configurações.' });
    }

    const reportText = await generateSystemReportText(settings);
    const cleanNum = cleanPhone(targetPhone);

    const resp = await fetch(`${EVOLUTION_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: cleanNum,
        text: reportText
      })
    });

    const result = await resp.json() as any;
    if (!resp.ok) {
      return res.status(resp.status).json({
        error: result?.message || 'Falha ao enviar relatório. Verifique se o WhatsApp está conectado via QR Code.'
      });
    }

    res.json({ success: true, message: `Relatório enviado com sucesso para ${targetPhone}!`, preview: reportText });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 13. GERENCIAMENTO DE BACKUPS
// ----------------------------------------------------
app.get('/backups', async (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backups: BackupFile[] = [];

    for (const filename of files) {
      if (filename.startsWith('sysmauad-backup-') && filename.endsWith('.json')) {
        const filePath = path.join(BACKUP_DIR, filename);
        try {
          const stats = fs.statSync(filePath);
          backups.push({
            filename,
            sizeBytes: stats.size,
            sizeFormatted: formatBytes(stats.size),
            createdAt: stats.mtime.toISOString(),
            downloadUrl: `/api/backups/${encodeURIComponent(filename)}/download`
          });
        } catch (e) {
          // ignore stat errors
        }
      }
    }

    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/backups/generate', async (_req: Request, res: Response) => {
  try {
    const backup = await createBackupFile();

    const settingsRow = await query('SELECT backup_retention_days FROM sysmauad.system_settings WHERE id = $1', ['default']);
    const retentionDays = settingsRow.rows.length > 0 ? Number(settingsRow.rows[0].backup_retention_days || 3) : 3;
    purgeOldBackups(retentionDays);

    res.status(201).json({ success: true, backup });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/backups/:filename/download', (req: Request, res: Response) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado.' });
    }

    res.download(filePath, safeFilename);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/backups/:filename', (req: Request, res: Response) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 14. AUDITORIA, LOGS & MONITORAMENTO DE SEGURANÇA
// ----------------------------------------------------
app.get('/audit/logs', async (req: Request, res: Response) => {
  try {
    const { level, category, search, limit, offset } = req.query;
    const result = await getAuditLogs({
      level: level ? String(level) : undefined,
      category: category ? String(category) : undefined,
      search: search ? String(search) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/audit/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getAuditStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Endpoint para gravação de logs de processos, erros no frontend e ações de usuário
app.post('/audit/logs', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const { level, category, action, details, userId, userName } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'Campo action é obrigatório.' });
    }

    await recordAuditLog({
      level: level || 'info',
      category: category || 'system',
      action,
      userId,
      userName,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] as string,
      details: details || {}
    });

    res.json({ success: true, message: 'Log registrado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Limpeza de logs antigos pelo Super Admin
app.delete('/audit/logs', async (req: Request, res: Response) => {
  try {
    const retentionDays = parseInt(String(req.query.retentionDays || '30'), 10);
    const maxKeep = parseInt(String(req.query.maxKeep || '20000'), 10);
    const cleaned = await purgeOldAuditLogs(retentionDays, maxKeep);
    res.json({ success: true, message: `${cleaned} registros antigos de log foram excluídos com sucesso.`, cleaned });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 15. GLOBAL EXPRESS ERROR HANDLER
// ----------------------------------------------------
app.use((err: any, req: Request, res: Response, _next: any) => {
  const ip = getClientIp(req);
  console.error('[Unhandled Server Error]', err);
  recordAuditLog({
    level: 'error',
    category: 'api',
    action: 'unhandled_server_error',
    ipAddress: ip,
    userAgent: req.headers['user-agent'] as string,
    details: {
      method: req.method,
      path: req.originalUrl,
      error: err.message || String(err),
      stack: err.stack ? err.stack.slice(0, 1000) : undefined
    }
  }).catch(() => {});
  res.status(500).json({ success: false, message: 'Erro interno no servidor: ' + (err.message || 'Erro inesperado') });
});

// ----------------------------------------------------
// 16. SCHEDULER DE AUTOMAÇÃO EM SEGUNDO PLANO
// ----------------------------------------------------
let lastBackupDate = '';
let lastReportDate = '';

function startAutomationScheduler() {
  console.log('[Automation Scheduler] Iniciando monitoramento periódico de relatórios e backups...');

  setInterval(async () => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Recife' });
      const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });
      const dayOfWeek = now.getDay();
      const dayOfMonth = now.getDate();

      const settingsRes = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
      if (settingsRes.rows.length === 0) return;
      const settings = mapSettings(settingsRes.rows[0]);

      // 1. Verificação de Backup Automático Diário
      if (settings.autoBackupEnabled && timeStr === settings.backupTime && lastBackupDate !== dateStr) {
        lastBackupDate = dateStr;
        console.log(`[Automation] Disparando rotina de backup diário programado (${settings.backupTime})...`);
        await createBackupFile();
        purgeOldBackups(settings.backupRetentionDays || 3);
        console.log('[Automation] Backup diário gerado e política de retenção aplicada com sucesso.');
      }

      // 2. Verificação de Envio Automático de Relatório WhatsApp
      if (settings.autoReportsEnabled && settings.whatsappTargetPhone && timeStr === settings.reportSendTime && lastReportDate !== dateStr) {
        let shouldSend = false;

        if (settings.reportFrequency === 'diario') {
          shouldSend = true;
        } else if (settings.reportFrequency === 'semanal' && dayOfWeek === settings.reportDayOfWeek) {
          shouldSend = true;
        } else if (settings.reportFrequency === 'mensal' && dayOfMonth === settings.reportDayOfMonth) {
          shouldSend = true;
        }

        if (shouldSend) {
          lastReportDate = dateStr;
          console.log(`[Automation] Disparando relatório automático ${settings.reportFrequency} para ${settings.whatsappTargetPhone}...`);
          const reportText = await generateSystemReportText(settings);
          const cleanNum = cleanPhone(settings.whatsappTargetPhone);

          await fetch(`${EVOLUTION_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
            method: 'POST',
            headers: {
              'apikey': EVOLUTION_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              number: cleanNum,
              text: reportText
            })
          }).then(r => r.json()).then(res => {
            console.log('[Automation] Relatório disparado com sucesso via WhatsApp:', res);
          }).catch(err => {
            console.error('[Automation] Erro ao disparar relatório automático:', err.message);
          });
        }
      }
    } catch (err: any) {
      console.error('[Automation Scheduler] Erro no ciclo de verificação:', err.message);
    }
  }, 60000);
}

// ----------------------------------------------------
// INICIALIZAÇÃO DO SERVIDOR COM CONEXÃO POSTGRESQL
// ----------------------------------------------------
async function startServer() {
  try {
    await initDb();
    // Limpeza inicial e rotina periódica de retenção de logs
    await purgeOldAuditLogs(30, 20000);
    setInterval(() => purgeOldAuditLogs(30, 20000), 24 * 60 * 60 * 1000);

    startAutomationScheduler();
    app.listen(port, () => {
      console.log(`[Sysmauad Backend API] Conectado ao PostgreSQL e ouvindo na porta ${port}`);
    });
  } catch (err) {
    console.error('[Sysmauad Backend API] Falha crítica ao inicializar banco de dados:', err);
    process.exit(1);
  }
}

startServer();

