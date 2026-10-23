import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from './db';
import { SharedReport } from './types';

export const REPORTS_BACKLOG_DIR = process.env.REPORTS_BACKLOG_DIR || '/app/data/reports_backlog';

// Garante que o diretório de backlog exista no servidor
if (!fs.existsSync(REPORTS_BACKLOG_DIR)) {
  try {
    fs.mkdirSync(REPORTS_BACKLOG_DIR, { recursive: true });
  } catch (err: any) {
    console.error('[Reports Backlog] Falha ao criar diretório:', err.message);
  }
}

/**
 * Retorna data/hora formatada no fuso de Brasília (America/Sao_Paulo)
 */
export function getNowBrasilia(): Date {
  return new Date();
}

export function getLocalDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function formatLocalDateStr(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatLocalDateTimeStr(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatLocalTimeStr(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

export function formatDatePt(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatMoney(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Calcula intervalos pré-definidos no fuso de Brasília
 */
export function getReportPeriodDates(preset: 'hoje' | 'semana' | 'mes' | 'custom', customStart?: string, customEnd?: string) {
  const now = getNowBrasilia();
  const todayStr = getLocalDateString(now);

  if (preset === 'hoje') {
    return { startDate: todayStr, endDate: todayStr, label: 'Hoje (Diário)' };
  }

  if (preset === 'semana') {
    const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: getLocalDateString(pastWeek), endDate: todayStr, label: 'Últimos 7 Dias (Semanal)' };
  }

  if (preset === 'mes') {
    const parts = todayStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
    return { startDate: firstDay, endDate: lastDay, label: 'Este Mês (Mensal)' };
  }

  return {
    startDate: customStart || todayStr,
    endDate: customEnd || todayStr,
    label: `Personalizado (${formatDatePt(customStart || todayStr)} a ${formatDatePt(customEnd || todayStr)})`
  };
}

/**
 * Mapeia linha da tabela sysmauad.shared_reports para a interface TypeScript
 */
export function mapSharedReportRow(row: any, baseUrl: string): SharedReport {
  const token = row.token;
  return {
    id: row.id,
    token: row.token,
    title: row.title,
    reportType: row.report_type,
    periodPreset: row.period_preset,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    fileName: row.file_name,
    fileSizeBytes: Number(row.file_size_bytes || 0),
    targetPhone: row.target_phone || undefined,
    summaryText: row.summary_text || undefined,
    createdBy: row.created_by || 'Sistema',
    accessCount: Number(row.access_count || 0),
    lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at).toISOString() : undefined,
    expiresAt: new Date(row.expires_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    viewUrl: `${baseUrl}/api/reports/view/${token}`,
    downloadUrl: `${baseUrl}/api/reports/download/${token}`
  };
}

/**
 * Rotina de expurgo e limpeza automática dos relatórios que expiraram
 */
export async function purgeExpiredReports(retentionDays: number = 30) {
  try {
    if (!fs.existsSync(REPORTS_BACKLOG_DIR)) return;

    const expiredRes = await query(
      `SELECT id, file_path, file_name, token FROM sysmauad.shared_reports WHERE expires_at < NOW()`
    );

    for (const rep of expiredRes.rows) {
      try {
        if (rep.file_path && fs.existsSync(rep.file_path)) {
          fs.unlinkSync(rep.file_path);
          console.log(`[Reports Backlog] Arquivo expirado excluído: ${rep.file_name}`);
        }
      } catch (err: any) {
        console.warn(`[Reports Backlog] Falha ao excluir arquivo em disco: ${rep.file_name}`, err.message);
      }
    }

    if (expiredRes.rows.length > 0) {
      await query(`DELETE FROM sysmauad.shared_reports WHERE expires_at < NOW()`);
      console.log(`[Reports Backlog] ${expiredRes.rows.length} relatórios expirados expurgados do banco.`);
    }

    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const diskFiles = fs.readdirSync(REPORTS_BACKLOG_DIR);
    for (const f of diskFiles) {
      if (f.startsWith('relatorio_') && (f.endsWith('.html') || f.endsWith('.pdf'))) {
        const fullPath = path.join(REPORTS_BACKLOG_DIR, f);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs < cutoff) {
            console.log(`[Reports Backlog] Limpando arquivo órfão antigo: ${f}`);
            fs.unlinkSync(fullPath);
          }
        } catch (_) {}
      }
    }
  } catch (err: any) {
    console.error('[Reports Backlog] Erro na rotina de expurgo de relatórios:', err.message);
  }
}

/**
 * Página amigável quando o relatório expira
 */
export function renderExpiredReportPage(token: string, retentionDays: number = 30): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Indisponível • Mauad Lavanderia</title>
  <style>
    body {
      font-family: monospace, -apple-system, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 520px;
      width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      background-color: #3b82f620;
      color: #60a5fa;
      border: 1px solid #3b82f640;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #0284c7;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1 style="font-size: 20px;">⏱️ Relatório Expirado</h1>
    <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
      Este documento temporário expirou por política de segurança após <strong>${retentionDays} dias</strong>.
    </p>
    <div class="badge">Identificador: ${token ? token.slice(0, 12) : 'N/A'}...</div>
    <div>
      <a href="/" class="btn">Acessar Painel SysMauad</a>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// CSS OFICIAL DA FOLHA SYSMAUAD (IDÊNTICO À FOLHA IMPRESSA DO SISTEMA)
// ============================================================================
export function getSysMauadSheetCss(title: string): string {
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • Mauad Lavanderia</title>
  <style>
    @page {
      margin: 0;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 12mm 15mm;
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000000 !important;
      background-color: #ffffff !important;
    }
    .web-bar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      margin: -12mm -15mm 15px -15mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 999;
    }
    .web-bar .brand-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .web-bar .btn-group {
      display: flex;
      gap: 8px;
    }
    .web-bar .btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .web-bar .btn-print { background-color: #0284c7; color: #ffffff; }
    .web-bar .btn-dl { background-color: #334155; color: #ffffff; }

    /* Cabeçalho de Ponta a Ponta */
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      padding-bottom: 4px;
      border-bottom: 2px solid #000000;
    }
    .sheet-header .brand {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .sheet-header .doc-title {
      font-weight: 800;
      letter-spacing: 0.5px;
      text-align: center;
      flex: 1;
      padding: 0 10px;
    }
    .sheet-header .page {
      font-size: 9.5px;
    }

    /* Linha de Metadados e Emissão */
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0 6px 0;
      font-size: 9.5px;
      font-weight: 600;
      border-bottom: 1px dashed #94a3b8;
      margin-bottom: 8px;
    }

    /* Divisor com Título Central */
    .dashed-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 6px 0;
    }
    .dashed-divider .line {
      flex: 1;
      border-bottom: 1px dashed #64748b;
    }
    .dashed-divider .label {
      font-weight: 800;
      font-size: 9.5px;
      text-transform: uppercase;
      color: #334155;
      padding: 0 4px;
      white-space: nowrap;
    }

    /* Parâmetros do Relatório */
    .params-box {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 10.5px;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .params-box div {
      margin-bottom: 1px;
    }

    /* Seções */
    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 800;
      font-size: 11px;
      padding-bottom: 3px;
      border-bottom: 1px solid #000000;
      margin-top: 10px;
      margin-bottom: 4px;
    }
    .section-title-row .sub {
      font-size: 9.5px;
      color: #64748b;
      font-weight: normal;
    }

    /* Tabelas SysMauad */
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-bottom: 6px;
    }
    table.report-table th {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9.5px;
      color: #334155;
      padding: 3px 5px;
      border-bottom: 1px dashed #94a3b8;
      text-align: left;
    }
    table.report-table td {
      padding: 3px 5px;
      border-bottom: 1px dotted #e2e8f0;
      vertical-align: middle;
    }
    table.report-table tr {
      page-break-inside: avoid;
    }
    table.report-table tfoot td {
      font-weight: 800;
      font-size: 11px;
      border-top: 1px solid #000000;
      border-bottom: none;
      padding-top: 4px;
    }

    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .font-bold { font-weight: 800 !important; }

    /* Badges de Status (Idêntico ao sistema) */
    .badge-status {
      display: inline-block;
      padding: 1px 5px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      border: 1px solid #94a3b8;
      border-radius: 3px;
      background-color: #ffffff;
      white-space: nowrap;
    }

    /* Quadro Financeiro */
    .finance-totals-box {
      border: 2px solid #000000;
      background-color: #f8fafc;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-radius: 4px;
      font-size: 10.5px;
    }
    .finance-totals-box .col-left {
      line-height: 1.5;
    }
    .finance-totals-box .col-right {
      text-align: right;
      line-height: 1.5;
    }
    .finance-totals-box .grand-total {
      font-size: 12.5px;
      font-weight: 900;
      padding-top: 3px;
      margin-top: 3px;
      border-top: 1px solid #000000;
    }

    .doc-footer {
      text-align: center;
      padding-top: 10px;
      margin-top: 12px;
      border-top: 1px dashed #cbd5e1;
      font-size: 9px;
      color: #64748b;
    }

    .page-break {
      page-break-before: always;
      margin-top: 20px;
    }

    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
    }
  </style>`;
}

// ============================================================================
// EXTRAÇÃO DOS DADOS DO BANCO POSTGRESQL (COM FUSO AMERICA/SAO_PAULO)
// ============================================================================

// Helper: Extrai a data da entrega do pedido
export function getOrderDeliveryDate(ord: any): { dateStr: string; timeStr: string } {
  if (ord.status !== 'entregue') return { dateStr: '', timeStr: '' };
  let rawDate: string | Date = '';
  if (Array.isArray(ord.history)) {
    const delivEvt = ord.history.slice().reverse().find((h: any) => h.status === 'entregue');
    if (delivEvt && delivEvt.timestamp) rawDate = delivEvt.timestamp;
  }
  if (!rawDate) rawDate = ord.updated_at || ord.created_at;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' };
  const dateStr = getLocalDateString(d);
  const timeStr = formatLocalTimeStr(d);
  return { dateStr, timeStr };
}

// Helper: Extrai a data do pagamento/baixa do pedido (idêntico ao FinanceCaixaView)
export function getOrderPaymentDate(ord: any): { dateStr: string; timeStr: string } {
  if (ord.payment_status !== 'pago') return { dateStr: '', timeStr: '' };
  let rawDate: string | Date = '';
  if (ord.paid_at) {
    rawDate = ord.paid_at;
  } else if (ord.payment_history && Array.isArray(ord.payment_history) && ord.payment_history.length > 0) {
    const last = ord.payment_history[0];
    if (last.paidAt || last.paid_at) rawDate = last.paidAt || last.paid_at;
  } else if (Array.isArray(ord.history)) {
    const payEvt = ord.history.slice().reverse().find((h: any) =>
      (h.note || '').toLowerCase().includes('baixa financeira') ||
      (h.note || '').toLowerCase().includes('pagamento recebido')
    );
    if (payEvt && payEvt.timestamp) rawDate = payEvt.timestamp;
  }
  if (!rawDate) rawDate = ord.created_at;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' };
  const dateStr = getLocalDateString(d);
  const timeStr = formatLocalTimeStr(d);
  return { dateStr, timeStr };
}

// 1. Extração: Peças Atualmente na Lavanderia (Tudo que tá na fábrica, não entregue)
export async function extractNaLavanderiaData() {
  const res = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
  const allOrders = res.rows;

  // Filtro operacional oficial: status !== 'entregue'
  const inLaundryOrders = allOrders.filter((o: any) => o.status !== 'entregue');

  let totalPieces = 0;
  let totalKg = 0;
  const processMap: Record<string, { count: number; pieces: number; kg: number }> = {};

  inLaundryOrders.forEach((o: any) => {
    const pcs = Number(o.estimated_piece_count || 0);
    const kg = Number(o.total_weight_kg || 0);
    totalPieces += pcs;
    totalKg += kg;

    const items = Array.isArray(o.items) ? o.items : [];
    const proc = (items[0]?.process || 'SEM PROCESSO').toUpperCase().trim();
    if (!processMap[proc]) {
      processMap[proc] = { count: 0, pieces: 0, kg: 0 };
    }
    processMap[proc].count++;
    processMap[proc].pieces += pcs;
    processMap[proc].kg += kg;
  });

  const processSummary = Object.entries(processMap)
    .map(([name, stats]) => ({
      name,
      ...stats,
      pctPieces: totalPieces > 0 ? (stats.pieces / totalPieces) * 100 : 0
    }))
    .sort((a, b) => b.pieces - a.pieces);

  return {
    orders: inLaundryOrders,
    totalPieces,
    totalKg,
    totalOrders: inLaundryOrders.length,
    processSummary
  };
}

// 2. Extração: Pedidos Entregues Hoje (Saídas do dia)
export async function extractEntreguesHojeData(targetDate?: string) {
  const todayStr = targetDate || getLocalDateString(getNowBrasilia());
  const res = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
  const allOrders = res.rows;

  const deliveredTodayOrders = allOrders.filter((o: any) => {
    if (o.status !== 'entregue') return false;
    const { dateStr } = getOrderDeliveryDate(o);
    return dateStr === todayStr;
  });

  let totalPieces = 0;
  let totalKg = 0;
  const processMap: Record<string, { count: number; pieces: number; kg: number }> = {};

  deliveredTodayOrders.forEach((o: any) => {
    const pcs = Number(o.estimated_piece_count || 0);
    const kg = Number(o.total_weight_kg || 0);
    totalPieces += pcs;
    totalKg += kg;

    const items = Array.isArray(o.items) ? o.items : [];
    const proc = (items[0]?.process || 'SEM PROCESSO').toUpperCase().trim();
    if (!processMap[proc]) {
      processMap[proc] = { count: 0, pieces: 0, kg: 0 };
    }
    processMap[proc].count++;
    processMap[proc].pieces += pcs;
    processMap[proc].kg += kg;
  });

  const processSummary = Object.entries(processMap)
    .map(([name, stats]) => ({
      name,
      ...stats,
      pctPieces: totalPieces > 0 ? (stats.pieces / totalPieces) * 100 : 0
    }))
    .sort((a, b) => b.pieces - a.pieces);

  return {
    targetDate: todayStr,
    orders: deliveredTodayOrders,
    totalPieces,
    totalKg,
    totalOrders: deliveredTodayOrders.length,
    processSummary
  };
}

// 3. Extração: Recebimentos Financeiros de Hoje (Baixas do dia no caixa)
export async function extractFinanceiroHojeData(targetDate?: string) {
  const todayStr = targetDate || getLocalDateString(getNowBrasilia());
  const res = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
  const allOrders = res.rows;

  const paidTodayOrders = allOrders.filter((o: any) => {
    if (o.payment_status !== 'pago') return false;
    const { dateStr } = getOrderPaymentDate(o);
    return dateStr === todayStr;
  });

  let totalGross = 0;
  let totalDiscounts = 0;
  let totalPaid = 0;
  let totalPieces = 0;
  let totalKg = 0;

  const itemsList = paidTodayOrders.map((o: any) => {
    const { timeStr } = getOrderPaymentDate(o);
    const pcs = Number(o.estimated_piece_count || 0);
    const kg = Number(o.total_weight_kg || 0);
    const gross = Number(o.total_service_value || 0);
    const discount = Number(o.discount_amount || 0);
    const paid = Number(o.final_paid_amount || gross);

    totalGross += gross;
    totalDiscounts += discount;
    totalPaid += paid;
    totalPieces += pcs;
    totalKg += kg;

    let payMethod = (o.payment_method || '').toUpperCase();
    let receiver = o.receiver_name || o.paid_by_operator || '';
    if (Array.isArray(o.payment_history) && o.payment_history.length > 0) {
      const last = o.payment_history[0];
      if (last.paymentMethod) payMethod = String(last.paymentMethod).toUpperCase();
      if (last.receiverName) receiver = last.receiverName;
    }

    return {
      osNumber: o.os_number,
      clientName: o.client_name,
      pieces: pcs,
      kg,
      gross,
      discount,
      paid,
      payMethod: payMethod || 'PIX',
      receiver: receiver || 'Caixa',
      timeStr: timeStr || '—'
    };
  });

  return {
    targetDate: todayStr,
    ordersCount: paidTodayOrders.length,
    totalPieces,
    totalKg,
    totalGross,
    totalDiscounts,
    totalPaid,
    items: itemsList
  };
}

// 4. Extração Geral de Lavados (Personalizado por Status / Período)
export async function extractLavadosData(startDate: string, endDate: string, statusFilter: string) {
  const res = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
  const allOrders = res.rows;

  const filteredOrders = allOrders.filter((o: any) => {
    const orderDate = getLocalDateString(o.created_at);

    if (statusFilter === 'todos') {
      return (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);
    }
    if (statusFilter === 'recebido') {
      return (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate) && o.status === 'recebido';
    }
    if (statusFilter === 'em_andamento') {
      if (o.status !== 'em_andamento') return false;
      const history = Array.isArray(o.history) ? o.history : [];
      const progEvt = history.find((h: any) => h.status === 'em_andamento');
      const progDate = progEvt ? getLocalDateString(progEvt.timestamp) : orderDate;
      return (!startDate || progDate >= startDate || orderDate >= startDate) && (!endDate || progDate <= endDate);
    }
    if (statusFilter === 'pronto') {
      if (o.status !== 'pronto') return false;
      const history = Array.isArray(o.history) ? o.history : [];
      const readyEvt = history.find((h: any) => h.status === 'pronto');
      const readyDate = readyEvt ? getLocalDateString(readyEvt.timestamp) : orderDate;
      return (!startDate || readyDate >= startDate || orderDate >= startDate) && (!endDate || readyDate <= endDate);
    }
    if (statusFilter === 'entregue') {
      if (o.status !== 'entregue') return false;
      const { dateStr: delivDate } = getOrderDeliveryDate(o);
      return (!startDate || delivDate >= startDate) && (!endDate || delivDate <= endDate);
    }
    if (statusFilter === 'na_lavanderia') {
      if (o.status === 'entregue') return false;
      return !endDate || orderDate <= endDate;
    }
    return true;
  });

  let totalPieces = 0;
  let totalKg = 0;
  let totalValue = 0;
  const processMap: Record<string, { count: number; pieces: number; kg: number }> = {};

  filteredOrders.forEach((o: any) => {
    const pcs = Number(o.estimated_piece_count || 0);
    const kg = Number(o.total_weight_kg || 0);
    const val = Number(o.total_service_value || 0);

    totalPieces += pcs;
    totalKg += kg;
    totalValue += val;

    const items = Array.isArray(o.items) ? o.items : [];
    const proc = (items[0]?.process || 'SEM PROCESSO').toUpperCase().trim();
    if (!processMap[proc]) {
      processMap[proc] = { count: 0, pieces: 0, kg: 0 };
    }
    processMap[proc].count++;
    processMap[proc].pieces += pcs;
    processMap[proc].kg += kg;
  });

  const processSummary = Object.entries(processMap)
    .map(([name, stats]) => ({
      name,
      ...stats,
      pctPieces: totalPieces > 0 ? (stats.pieces / totalPieces) * 100 : 0
    }))
    .sort((a, b) => b.pieces - a.pieces);

  return {
    orders: filteredOrders,
    totalPieces,
    totalKg,
    totalValue,
    totalOrders: filteredOrders.length,
    processSummary
  };
}

// 5. Extração de Passadoria
export async function extractPassadoresData(startDate: string, endDate: string, passadorId: string = 'all') {
  const [ordersRes, passadoresRes, settingsRes] = await Promise.all([
    query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC'),
    query('SELECT * FROM sysmauad.passadores WHERE active = TRUE ORDER BY name ASC'),
    query('SELECT default_passador_rate, default_passador_rate_after_17 FROM sysmauad.system_settings WHERE id = $1', ['default'])
  ]);

  const defRate = Number(settingsRes.rows[0]?.default_passador_rate ?? 0.15);
  const defRateAfter17 = Number(settingsRes.rows[0]?.default_passador_rate_after_17 ?? 0.20);

  const allLogs: any[] = [];
  ordersRes.rows.forEach((o: any) => {
    const logs = Array.isArray(o.ironing_logs) ? o.ironing_logs : [];
    logs.forEach((l: any) => {
      const logDate = getLocalDateString(l.timestamp);
      if ((!startDate || logDate >= startDate) && (!endDate || logDate <= endDate)) {
        allLogs.push({ ...l, clientName: o.client_name });
      }
    });
  });

  const activePassadores = passadoresRes.rows;
  const passadoresSummary = activePassadores.map((pas: any) => {
    const pasLogs = allLogs.filter((l: any) => l.passadorId === pas.id || l.passadorName?.toLowerCase() === pas.name?.toLowerCase());
    const normalLogs = pasLogs.filter((l: any) => !l.isAfter17);
    const after17Logs = pasLogs.filter((l: any) => Boolean(l.isAfter17));

    const normalPieces = normalLogs.reduce((s: number, l: any) => s + Number(l.piecesIroned || 0), 0);
    const after17Pieces = after17Logs.reduce((s: number, l: any) => s + Number(l.piecesIroned || 0), 0);
    const pieces = normalPieces + after17Pieces;

    const rateNormal = pas.rate_per_piece !== null && pas.rate_per_piece !== undefined ? Number(pas.rate_per_piece) : defRate;
    const rateAfter17 = pas.rate_per_piece_after_17 !== null && pas.rate_per_piece_after_17 !== undefined ? Number(pas.rate_per_piece_after_17) : defRateAfter17;

    const normalValue = normalPieces * rateNormal;
    const after17Value = after17Pieces * rateAfter17;
    const totalValue = normalValue + after17Value;

    return {
      id: pas.id,
      name: pas.name,
      phone: pas.phone,
      pieces,
      normalPieces,
      after17Pieces,
      rateNormal,
      rateAfter17,
      value: totalValue,
      logCount: pasLogs.length,
      logs: pasLogs
    };
  });

  const displayedPassadores = passadorId !== 'all'
    ? passadoresSummary.filter(p => p.id === passadorId || p.name === passadorId)
    : passadoresSummary;

  const totalPieces = displayedPassadores.reduce((s, p) => s + p.pieces, 0);
  const totalNormalPieces = displayedPassadores.reduce((s, p) => s + p.normalPieces, 0);
  const totalAfter17Pieces = displayedPassadores.reduce((s, p) => s + p.after17Pieces, 0);
  const totalValue = displayedPassadores.reduce((s, p) => s + p.value, 0);

  const displayedLogs = passadorId !== 'all'
    ? allLogs.filter((l: any) => l.passadorId === passadorId || l.passadorName === passadorId)
    : allLogs;

  return {
    passadoresSummary: displayedPassadores,
    totalPieces,
    totalNormalPieces,
    totalAfter17Pieces,
    totalValue,
    logs: displayedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  };
}

// 5.1 Extração de Diferenciados
export async function extractDiferenciadosData(startDate: string, endDate: string, diferenciadoId: string = 'all') {
  const [ordersRes, diferenciadosRes, settingsRes] = await Promise.all([
    query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC'),
    query('SELECT * FROM sysmauad.diferenciados WHERE active = TRUE ORDER BY name ASC'),
    query('SELECT default_diferenciado_rate, default_diferenciado_rate_after_17 FROM sysmauad.system_settings WHERE id = $1', ['default'])
  ]);

  const defRate = Number(settingsRes.rows[0]?.default_diferenciado_rate ?? 0.50);
  const defRateAfter17 = Number(settingsRes.rows[0]?.default_diferenciado_rate_after_17 ?? 0.60);

  const allLogs: any[] = [];
  ordersRes.rows.forEach((o: any) => {
    const logs = Array.isArray(o.diferenciado_logs) ? o.diferenciado_logs : [];
    logs.forEach((l: any) => {
      const logDate = getLocalDateString(l.timestamp);
      if ((!startDate || logDate >= startDate) && (!endDate || logDate <= endDate)) {
        allLogs.push({ ...l, clientName: o.client_name });
      }
    });
  });

  const activeDiferenciados = diferenciadosRes.rows;
  const diferenciadosSummary = activeDiferenciados.map((dif: any) => {
    const difLogs = allLogs.filter((l: any) => l.diferenciadoId === dif.id || l.diferenciadoName?.toLowerCase() === dif.name?.toLowerCase());
    const normalLogs = difLogs.filter((l: any) => !l.isAfter17);
    const after17Logs = difLogs.filter((l: any) => Boolean(l.isAfter17));

    const normalPieces = normalLogs.reduce((s: number, l: any) => s + Number(l.piecesProduced || 0), 0);
    const after17Pieces = after17Logs.reduce((s: number, l: any) => s + Number(l.piecesProduced || 0), 0);
    const pieces = normalPieces + after17Pieces;

    const rateNormal = dif.rate_per_piece !== null && dif.rate_per_piece !== undefined ? Number(dif.rate_per_piece) : defRate;
    const rateAfter17 = dif.rate_per_piece_after_17 !== null && dif.rate_per_piece_after_17 !== undefined ? Number(dif.rate_per_piece_after_17) : defRateAfter17;

    const normalValue = normalPieces * rateNormal;
    const after17Value = after17Pieces * rateAfter17;
    const totalValue = normalValue + after17Value;

    return {
      id: dif.id,
      name: dif.name,
      phone: dif.phone,
      pieces,
      normalPieces,
      after17Pieces,
      rateNormal,
      rateAfter17,
      value: totalValue,
      logCount: difLogs.length,
      logs: difLogs
    };
  });

  const displayedDiferenciados = diferenciadoId !== 'all'
    ? diferenciadosSummary.filter(d => d.id === diferenciadoId || d.name === diferenciadoId)
    : diferenciadosSummary;

  const totalPieces = displayedDiferenciados.reduce((s, d) => s + d.pieces, 0);
  const totalNormalPieces = displayedDiferenciados.reduce((s, d) => s + d.normalPieces, 0);
  const totalAfter17Pieces = displayedDiferenciados.reduce((s, d) => s + d.after17Pieces, 0);
  const totalValue = displayedDiferenciados.reduce((s, d) => s + d.value, 0);

  const displayedLogs = diferenciadoId !== 'all'
    ? allLogs.filter((l: any) => l.diferenciadoId === diferenciadoId || l.diferenciadoName === diferenciadoId)
    : allLogs;

  return {
    diferenciadosSummary: displayedDiferenciados,
    totalPieces,
    totalNormalPieces,
    totalAfter17Pieces,
    totalValue,
    logs: displayedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  };
}

// 6. Extração de Fornecedores / Insumos
export async function extractFornecedoresData(startDate: string, endDate: string, supplierId: string = 'all') {
  const res = await query('SELECT * FROM sysmauad.insumo_entries ORDER BY entered_at DESC');
  const allEntries = res.rows;

  const filteredEntries = allEntries.filter((e: any) => {
    const entryDate = getLocalDateString(e.entered_at);
    const inRange = (!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate);
    if (!inRange) return false;
    if (supplierId !== 'all') {
      return e.supplier_id === supplierId || (e.supplier_name || '').toLowerCase() === supplierId.toLowerCase();
    }
    return true;
  });

  let totalValue = 0;
  let totalQuantity = 0;
  const supplierMap: Record<string, { count: number; value: number }> = {};

  filteredEntries.forEach((e: any) => {
    const val = Number(e.total_value || 0);
    const qty = Number(e.quantity || 0);
    totalValue += val;
    totalQuantity += qty;

    const sName = (e.supplier_name || 'Desconhecido').trim();
    if (!supplierMap[sName]) {
      supplierMap[sName] = { count: 0, value: 0 };
    }
    supplierMap[sName].count++;
    supplierMap[sName].value += val;
  });

  const suppliersSummary = Object.entries(supplierMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.value - a.value);

  return {
    entries: filteredEntries,
    totalValue,
    totalQuantity,
    suppliersSummary
  };
}

// ============================================================================
// CONSTRUTORES DE HTML (FOLHAS DE IMPRESSÃO SYSMAUAD)
// ============================================================================

function getOrderStatusBadge(status: string) {
  switch (status) {
    case 'recebido': return '1. Feito';
    case 'em_andamento': return '2. Andamento';
    case 'pronto': return '3. Pronto';
    case 'entregue': return '4. Entregue';
    default: return status;
  }
}

// HTML 1: PEÇAS ATUALMENTE NA LAVANDERIA
export function buildNaLavanderiaHtml(ctx: any): string {
  const { title, periodLabel, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const processRows = data.processSummary.map((p: any) => `
    <tr>
      <td style="font-weight: 700;">${p.name}</td>
      <td class="text-center">${p.count} lote(s)</td>
      <td class="text-right">${p.kg.toFixed(2)} kg</td>
      <td class="text-right font-bold">${p.pieces.toLocaleString('pt-BR')} Pcs <span style="font-size: 9px; color: #64748b; font-weight: normal;">(${p.pctPieces.toFixed(1)}%)</span></td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum lote na lavanderia.</td></tr>';

  const orderRows = data.orders.map((o: any) => {
    const items = Array.isArray(o.items) ? o.items : [];
    const proc = items[0]?.process || '—';
    const roupa = items[0]?.clothingType || 'Peça';
    const corte = o.corte_os || items[0]?.corteOs;
    const entryDate = formatLocalDateStr(o.created_at).split('/').slice(0, 2).join('/');
    const badgeText = getOrderStatusBadge(o.status);

    return `
      <tr>
        <td><strong>${o.os_number}</strong><div style="font-size: 9px; color: #64748b;">${entryDate}</div></td>
        <td><strong>${o.client_name}</strong></td>
        <td>${roupa}${corte ? `<div style="font-size: 9px; color: #64748b;">CORTE: ${corte}</div>` : ''}</td>
        <td>${proc}</td>
        <td class="text-right font-bold">${Number(o.estimated_piece_count || 0).toLocaleString('pt-BR')}</td>
        <td class="text-right" style="color: #475569;">${Number(o.total_weight_kg || 0).toFixed(1)}</td>
        <td class="text-center"><span class="badge-status badge-${o.status}">${badgeText}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" class="text-center">Nenhum pedido na fábrica.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${periodLabel}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="section-title-row">
    <span>CONSOLIDADO POR PROCESSO DE LAVADO</span>
    <span class="sub">DISTRIBUIÇÃO DA PRODUÇÃO</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 42%;">LAVADO</th>
        <th style="width: 18%;" class="text-center">LOTES</th>
        <th style="width: 20%;" class="text-right">PESO (KG)</th>
        <th style="width: 20%;" class="text-right">QUANTIDADE (PÇS)</th>
      </tr>
    </thead>
    <tbody>
      ${processRows}
    </tbody>
    <tfoot>
      <tr>
        <td>TOTAL:</td>
        <td class="text-center">${data.totalOrders} lotes</td>
        <td class="text-right">${data.totalKg.toFixed(2)} kg</td>
        <td class="text-right">TOTAL PECAS: ${data.totalPieces.toLocaleString('pt-BR')}</td>
      </tr>
    </tfoot>
  </table>

  <div class="dashed-divider">
    <div class="line"></div>
  </div>

  <div class="section-title-row">
    <span>LISTAGEM DETALHADA</span>
    <span class="sub">${data.totalOrders} registros</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 13%;">PEDIDO</th>
        <th style="width: 27%;">CLIENTE</th>
        <th style="width: 18%;">ROUPA</th>
        <th style="width: 18%;">LAVADO</th>
        <th style="width: 8%;" class="text-right">PÇS</th>
        <th style="width: 7%;" class="text-right">KG</th>
        <th style="width: 9%;" class="text-center">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${orderRows}
    </tbody>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 2: PEDIDOS ENTREGUES HOJE
export function buildEntreguesHojeHtml(ctx: any): string {
  const { title, periodLabel, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const processRows = data.processSummary.map((p: any) => `
    <tr>
      <td style="font-weight: 700;">${p.name}</td>
      <td class="text-center">${p.count} lote(s)</td>
      <td class="text-right">${p.kg.toFixed(2)} kg</td>
      <td class="text-right font-bold">${p.pieces.toLocaleString('pt-BR')} Pcs <span style="font-size: 9px; color: #64748b; font-weight: normal;">(${p.pctPieces.toFixed(1)}%)</span></td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum lote entregue na data.</td></tr>';

  const orderRows = data.orders.map((o: any) => {
    const items = Array.isArray(o.items) ? o.items : [];
    const proc = items[0]?.process || '—';
    const roupa = items[0]?.clothingType || 'Peça';
    const corte = o.corte_os || items[0]?.corteOs;
    const { timeStr } = getOrderDeliveryDate(o);

    return `
      <tr>
        <td><strong>${o.os_number}</strong><div style="font-size: 9px; color: #64748b;">${timeStr || 'Entregue'}</div></td>
        <td><strong>${o.client_name}</strong></td>
        <td>${roupa}${corte ? `<div style="font-size: 9px; color: #64748b;">CORTE: ${corte}</div>` : ''}</td>
        <td>${proc}</td>
        <td class="text-right font-bold">${Number(o.estimated_piece_count || 0).toLocaleString('pt-BR')}</td>
        <td class="text-right" style="color: #475569;">${Number(o.total_weight_kg || 0).toFixed(1)}</td>
        <td class="text-center"><span class="badge-status badge-entregue">4. Entregue</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" class="text-center">Nenhuma entrega registrada hoje.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${periodLabel}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="section-title-row">
    <span>CONSOLIDADO POR PROCESSO DE LAVADO</span>
    <span class="sub">SAÍDAS ENTREGUES HOJE</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 42%;">LAVADO</th>
        <th style="width: 18%;" class="text-center">LOTES</th>
        <th style="width: 20%;" class="text-right">PESO (KG)</th>
        <th style="width: 20%;" class="text-right">QUANTIDADE (PÇS)</th>
      </tr>
    </thead>
    <tbody>
      ${processRows}
    </tbody>
    <tfoot>
      <tr>
        <td>TOTAL ENTREGUE HOJE:</td>
        <td class="text-center">${data.totalOrders} lotes</td>
        <td class="text-right">${data.totalKg.toFixed(2)} kg</td>
        <td class="text-right">TOTAL PECAS: ${data.totalPieces.toLocaleString('pt-BR')}</td>
      </tr>
    </tfoot>
  </table>

  <div class="dashed-divider">
    <div class="line"></div>
  </div>

  <div class="section-title-row">
    <span>LISTAGEM DETALHADA DE ENTREGAS</span>
    <span class="sub">${data.totalOrders} registros</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 13%;">PEDIDO</th>
        <th style="width: 27%;">CLIENTE</th>
        <th style="width: 18%;">ROUPA</th>
        <th style="width: 18%;">LAVADO</th>
        <th style="width: 8%;" class="text-right">PÇS</th>
        <th style="width: 7%;" class="text-right">KG</th>
        <th style="width: 9%;" class="text-center">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${orderRows}
    </tbody>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 3: RECEBIMENTOS FINANCEIROS DO DIA
export function buildFinanceiroHojeHtml(ctx: any): string {
  const { title, periodLabel, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const itemRows = data.items.map((it: any) => `
    <tr>
      <td><strong>${it.osNumber}</strong><div style="font-size: 9px; color: #64748b;">${it.timeStr}</div></td>
      <td><strong>${it.clientName}</strong></td>
      <td>${it.payMethod} <span style="font-size: 9px; color: #64748b;">(${it.receiver})</span></td>
      <td class="text-right">${it.pieces.toLocaleString('pt-BR')}</td>
      <td class="text-right" style="color: #64748b;">${formatMoney(it.gross)}</td>
      <td class="text-right" style="color: #b91c1c;">${it.discount > 0 ? formatMoney(it.discount) : '—'}</td>
      <td class="text-right font-bold" style="color: #047857;">${formatMoney(it.paid)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-center">Nenhum pagamento baixado na data.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${periodLabel}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="finance-totals-box">
    <div class="col-left">
      <div><strong>Total de OSs Quitadas:</strong> ${data.ordersCount} ordens</div>
      <div><strong>Total de Peças:</strong> ${data.totalPieces.toLocaleString('pt-BR')} peças</div>
      <div><strong>Peso Total:</strong> ${data.totalKg.toFixed(1)} kg</div>
    </div>
    <div class="col-right">
      <div>Subtotal dos Serviços: <strong>${formatMoney(data.totalGross)}</strong></div>
      <div>Descontos Concedidos: <strong>${formatMoney(data.totalDiscounts)}</strong></div>
      <div class="grand-total">TOTAL RECEBIDO NO CAIXA: ${formatMoney(data.totalPaid)}</div>
    </div>
  </div>

  <div class="section-title-row">
    <span>LISTAGEM DETALHADA DAS BAIXAS FINANCEIRAS</span>
    <span class="sub">${data.ordersCount} lançamentos</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 14%;">OS</th>
        <th style="width: 28%;">CLIENTE</th>
        <th style="width: 18%;">FORMA PGTO / RECEBEDOR</th>
        <th style="width: 8%;" class="text-right">PÇS</th>
        <th style="width: 10%;" class="text-right">SUBTOTAL</th>
        <th style="width: 10%;" class="text-right">DESCONTO</th>
        <th style="width: 12%;" class="text-right">VALOR PAGO</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">TOTAL GERAL RECEBIDO:</td>
        <td class="text-right">${data.totalPieces.toLocaleString('pt-BR')}</td>
        <td class="text-right">${formatMoney(data.totalGross)}</td>
        <td class="text-right">${formatMoney(data.totalDiscounts)}</td>
        <td class="text-right font-bold" style="color: #047857;">${formatMoney(data.totalPaid)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 4: RELATÓRIO PRINCIPAL CONSOLIDADO (PÁGINA COMPLETA COM AS 3 SEÇÕES)
export function buildPrincipalCompletoHtml(ctx: any): string {
  const { title, periodLabel, naLavanderia, entreguesHoje, financeiroHoje, token, retentionDays, generatedAt, baseUrl } = ctx;

  const naLavanderiaProcessRows = naLavanderia.processSummary.map((p: any) => `
    <tr>
      <td style="font-weight: 700;">${p.name}</td>
      <td class="text-center">${p.count} lote(s)</td>
      <td class="text-right">${p.kg.toFixed(2)} kg</td>
      <td class="text-right font-bold">${p.pieces.toLocaleString('pt-BR')} Pcs</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum lote.</td></tr>';

  const entreguesProcessRows = entreguesHoje.processSummary.map((p: any) => `
    <tr>
      <td style="font-weight: 700;">${p.name}</td>
      <td class="text-center">${p.count} lote(s)</td>
      <td class="text-right">${p.kg.toFixed(2)} kg</td>
      <td class="text-right font-bold">${p.pieces.toLocaleString('pt-BR')} Pcs</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum lote.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${periodLabel}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="dashed-divider">
    <div class="line"></div>
    <span class="label">RESUMO OPERACIONAL E FINANCEIRO DO DIA</span>
    <div class="line"></div>
  </div>

  <!-- SEÇÃO 1: NA LAVANDERIA -->
  <div class="section-title-row">
    <span>1. TUDO QUE ESTÁ ATUALMENTE NA LAVANDERIA</span>
    <span class="sub">${naLavanderia.totalOrders} lotes • ${naLavanderia.totalPieces.toLocaleString('pt-BR')} peças (${naLavanderia.totalKg.toFixed(1)} kg)</span>
  </div>
  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 42%;">LAVADO</th>
        <th style="width: 18%;" class="text-center">LOTES</th>
        <th style="width: 20%;" class="text-right">PESO (KG)</th>
        <th style="width: 20%;" class="text-right">QUANTIDADE (PÇS)</th>
      </tr>
    </thead>
    <tbody>
      ${naLavanderiaProcessRows}
    </tbody>
  </table>

  <!-- SEÇÃO 2: ENTREGUES HOJE -->
  <div class="section-title-row" style="margin-top: 16px;">
    <span>2. TUDO QUE FOI ENTREGUE HOJE</span>
    <span class="sub">${entreguesHoje.totalOrders} lotes • ${entreguesHoje.totalPieces.toLocaleString('pt-BR')} peças (${entreguesHoje.totalKg.toFixed(1)} kg)</span>
  </div>
  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 42%;">LAVADO</th>
        <th style="width: 18%;" class="text-center">LOTES</th>
        <th style="width: 20%;" class="text-right">PESO (KG)</th>
        <th style="width: 20%;" class="text-right">QUANTIDADE (PÇS)</th>
      </tr>
    </thead>
    <tbody>
      ${entreguesProcessRows}
    </tbody>
  </table>

  <!-- SEÇÃO 3: FINANCEIRO HOJE -->
  <div class="section-title-row" style="margin-top: 16px;">
    <span>3. TUDO QUE FOI RECEBIDO DE FINANCEIRO HOJE</span>
    <span class="sub">${financeiroHoje.ordersCount} ordens quitadas</span>
  </div>
  <div class="finance-totals-box">
    <div class="col-left">
      <div><strong>Ordens Quitadas Hoje:</strong> ${financeiroHoje.ordersCount}</div>
      <div><strong>Volume de Peças Recebidas:</strong> ${financeiroHoje.totalPieces.toLocaleString('pt-BR')} pçs</div>
    </div>
    <div class="col-right">
      <div>Subtotal Bruto: <strong>${formatMoney(financeiroHoje.totalGross)}</strong></div>
      <div class="grand-total">TOTAL RECEBIDO NO CAIXA: ${formatMoney(financeiroHoje.totalPaid)}</div>
    </div>
  </div>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 5: TUDO QUE É LAVADO (CUSTOMIZADO POR STATUS / PERÍODO)
export function buildLavadosHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, statusFilter, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const processRows = data.processSummary.map((p: any) => `
    <tr>
      <td style="font-weight: 700;">${p.name}</td>
      <td class="text-center">${p.count} lote(s)</td>
      <td class="text-right">${p.kg.toFixed(2)} kg</td>
      <td class="text-right font-bold">${p.pieces.toLocaleString('pt-BR')} Pcs <span style="font-size: 9px; color: #64748b; font-weight: normal;">(${p.pctPieces.toFixed(1)}%)</span></td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">Nenhum lote processado.</td></tr>';

  const orderRows = data.orders.map((o: any) => {
    const items = Array.isArray(o.items) ? o.items : [];
    const proc = items[0]?.process || '—';
    const roupa = items[0]?.clothingType || 'Peça';
    const corte = o.corte_os || items[0]?.corteOs;
    const entryDate = formatLocalDateStr(o.created_at).split('/').slice(0, 2).join('/');
    const badgeText = getOrderStatusBadge(o.status);

    return `
      <tr>
        <td><strong>${o.os_number}</strong><div style="font-size: 9px; color: #64748b;">${entryDate}</div></td>
        <td><strong>${o.client_name}</strong></td>
        <td>${roupa}${corte ? `<div style="font-size: 9px; color: #64748b;">CORTE: ${corte}</div>` : ''}</td>
        <td>${proc}</td>
        <td class="text-right font-bold">${Number(o.estimated_piece_count || 0).toLocaleString('pt-BR')}</td>
        <td class="text-right" style="color: #475569;">${Number(o.total_weight_kg || 0).toFixed(1)}</td>
        <td class="text-center"><span class="badge-status badge-${o.status}">${badgeText}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" class="text-center">Nenhum pedido encontrado.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${formatDatePt(startDate)} a ${formatDatePt(endDate)}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="section-title-row">
    <span>CONSOLIDADO POR PROCESSO DE LAVADO</span>
    <span class="sub">DISTRIBUIÇÃO DA PRODUÇÃO</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 42%;">LAVADO</th>
        <th style="width: 18%;" class="text-center">LOTES</th>
        <th style="width: 20%;" class="text-right">PESO (KG)</th>
        <th style="width: 20%;" class="text-right">QUANTIDADE (PÇS)</th>
      </tr>
    </thead>
    <tbody>
      ${processRows}
    </tbody>
    <tfoot>
      <tr>
        <td>TOTAL:</td>
        <td class="text-center">${data.totalOrders} lotes</td>
        <td class="text-right">${data.totalKg.toFixed(2)} kg</td>
        <td class="text-right">TOTAL PECAS: ${data.totalPieces.toLocaleString('pt-BR')}</td>
      </tr>
    </tfoot>
  </table>

  <div class="dashed-divider">
    <div class="line"></div>
  </div>

  <div class="section-title-row">
    <span>LISTAGEM DETALHADA</span>
    <span class="sub">${data.totalOrders} registros</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 13%;">PEDIDO</th>
        <th style="width: 27%;">CLIENTE</th>
        <th style="width: 18%;">ROUPA</th>
        <th style="width: 18%;">LAVADO</th>
        <th style="width: 8%;" class="text-right">PÇS</th>
        <th style="width: 7%;" class="text-right">KG</th>
        <th style="width: 9%;" class="text-center">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${orderRows}
    </tbody>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 6: PASSADORIA
export function buildPassadoresHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, passadorFilter, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const passadoresRows = data.passadoresSummary.map((p: any) => {
    const hasBoth = p.normalPieces > 0 && p.after17Pieces > 0;
    const piecesCol = hasBoth
      ? `${p.pieces.toLocaleString('pt-BR')}<div style="font-size: 9px; color: #64748b;">Normal: ${p.normalPieces} | Extra: ${p.after17Pieces}</div>`
      : `${p.pieces.toLocaleString('pt-BR')}${p.after17Pieces > 0 ? '<div style="font-size: 9px; color: #b45309;">(Extra)</div>' : ''}`;

    const rateCol = hasBoth
      ? `R$ ${p.rateNormal.toFixed(2)} / R$ ${p.rateAfter17.toFixed(2)}`
      : `R$ ${(p.after17Pieces > 0 ? p.rateAfter17 : p.rateNormal).toFixed(2)}`;

    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.phone || '—'}</td>
        <td class="text-right font-bold">${piecesCol}</td>
        <td class="text-right">${rateCol}</td>
        <td class="text-right font-bold" style="color: #047857;">${formatMoney(p.value)}</td>
        <td class="text-center">${p.logCount}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center">Nenhum apontamento no período.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${formatDatePt(startDate)} a ${formatDatePt(endDate)}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="section-title-row">
    <span>RESUMO POR OPERADOR DE PASSADORIA</span>
    <span class="sub">${data.passadoresSummary.length} operadores</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 30%;">COLABORADOR</th>
        <th style="width: 18%;">TELEFONE</th>
        <th style="width: 18%;" class="text-right">PEÇAS PASSADAS</th>
        <th style="width: 14%;" class="text-right">TAXA / PÇ</th>
        <th style="width: 12%;" class="text-right">VALOR TOTAL</th>
        <th style="width: 8%;" class="text-center">APONT.</th>
      </tr>
    </thead>
    <tbody>
      ${passadoresRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTAL:</td>
        <td class="text-right font-bold">${data.totalPieces.toLocaleString('pt-BR')} Pcs</td>
        <td></td>
        <td class="text-right font-bold" style="color: #047857;">${formatMoney(data.totalValue)}</td>
        <td class="text-center">${data.logs.length}</td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 6.1: PRODUÇÃO DIFERENCIADA
export function buildDiferenciadosHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, diferenciadoFilter, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const diferenciadosRows = data.diferenciadosSummary.map((d: any) => `
    <tr>
      <td class="font-bold">${d.name}</td>
      <td>${d.phone || '—'}</td>
      <td class="text-right font-bold">${d.pieces.toLocaleString('pt-BR')} Pcs</td>
      <td class="text-right">${formatMoney(d.rateNormal)}</td>
      <td class="text-right font-bold" style="color: #047857;">${formatMoney(d.value)}</td>
      <td class="text-center">${d.logCount}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${getSysMauadSheetCss(title)}
</head>
<body class="print-sheet">
  <div class="no-print actions-bar">
    <div class="actions-left">
      <span class="badge">PRODUÇÃO DIFERENCIADA</span>
      <span class="exp-info">⏱️ Acesso online válido por ${retentionDays} dias</span>
    </div>
    <div class="actions-right">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${formatDatePt(startDate)} a ${formatDatePt(endDate)}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="section-title-row">
    <span>RESUMO POR COLABORADOR DO DIFERENCIADO</span>
    <span class="sub">${data.diferenciadosSummary.length} colaboradores</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 30%;">COLABORADOR</th>
        <th style="width: 18%;">TELEFONE</th>
        <th style="width: 18%;" class="text-right">PEÇAS PRODUZIDAS</th>
        <th style="width: 14%;" class="text-right">TAXA / PÇ</th>
        <th style="width: 12%;" class="text-right">VALOR TOTAL</th>
        <th style="width: 8%;" class="text-center">APONT.</th>
      </tr>
    </thead>
    <tbody>
      ${diferenciadosRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTAL:</td>
        <td class="text-right font-bold">${data.totalPieces.toLocaleString('pt-BR')} Pcs</td>
        <td></td>
        <td class="text-right font-bold" style="color: #047857;">${formatMoney(data.totalValue)}</td>
        <td class="text-center">${data.logs.length}</td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// HTML 7: ENTRADAS / FORNECEDORES
export function buildFornecedoresHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, supplierFilter, data, token, retentionDays, generatedAt, baseUrl } = ctx;

  const entriesRows = data.entries.map((e: any) => `
    <tr>
      <td>${formatLocalDateStr(e.entered_at)}</td>
      <td><strong>${e.supplier_name || '—'}</strong></td>
      <td>${e.product_name}</td>
      <td class="text-center">${e.invoice_ref || '—'}</td>
      <td class="text-right font-bold">${Number(e.quantity || 0).toFixed(1)} ${e.unit || ''}</td>
      <td class="text-right">${formatMoney(Number(e.unit_price || 0))}</td>
      <td class="text-right font-bold">${formatMoney(Number(e.total_value || 0))}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-center">Nenhum lançamento no período.</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSysMauadSheetCss(title)}
</head>
<body>
  <div class="web-bar no-print">
    <div class="brand-title">MAUAD <span>LAVANDERIA</span> • Gestão Industrial</div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-print">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-dl">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="sheet-header">
    <span class="brand">MAUAD LAVANDERIA</span>
    <span class="doc-title">${title.toUpperCase()}</span>
    <span class="page">PÁGINA: 001</span>
  </div>

  <div class="meta-row">
    <div><strong>PERÍODO:</strong> ${formatDatePt(startDate)} a ${formatDatePt(endDate)}</div>
    <div>${generatedAt}</div>
  </div>

  <div class="section-title-row">
    <span>LISTAGEM DE ENTRADAS DE INSUMOS</span>
    <span class="sub">${data.entries.length} compras</span>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 12%;">DATA</th>
        <th style="width: 25%;">FORNECEDOR</th>
        <th style="width: 23%;">PRODUTO</th>
        <th style="width: 10%;" class="text-center">NF / REF</th>
        <th style="width: 10%;" class="text-right">QTD</th>
        <th style="width: 10%;" class="text-right">UNIT.</th>
        <th style="width: 10%;" class="text-right">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${entriesRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">TOTAL:</td>
        <td class="text-right font-bold">${data.totalQuantity.toFixed(1)}</td>
        <td></td>
        <td class="text-right font-bold">${formatMoney(data.totalValue)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="doc-footer">
    Mauad Lavanderia • Sistema de Gestão Industrial SysMauad • Acesso seguro disponível por ${retentionDays} dias.
  </div>
</body>
</html>`;
}

// ============================================================================
// GERAÇÃO PRINCIPAL E PERSISTÊNCIA NO BACKLOG
// ============================================================================

export interface GenerateReportParams {
  reportType: 'lavados' | 'passadores' | 'diferenciados' | 'fornecedores' | 'gerencial_completo' | 'principal_completo' | 'na_lavanderia' | 'entregues_hoje' | 'financeiro_hoje';
  periodPreset: 'hoje' | 'semana' | 'mes' | 'custom';
  startDate?: string;
  endDate?: string;
  statusFilter?: string;
  passadorId?: string;
  supplierId?: string;
  targetPhone?: string;
  notes?: string;
  createdBy?: string;
  baseUrl: string;
}

export async function generateAndSaveReport(params: GenerateReportParams) {
  const settingsRes = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
  const settingsRow = settingsRes.rows.length > 0 ? settingsRes.rows[0] : {};
  const retentionDays = Number(settingsRow.report_retention_days || 30);

  const period = getReportPeriodDates(params.periodPreset, params.startDate, params.endDate);
  const now = getNowBrasilia();
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  const token = crypto.randomBytes(24).toString('hex');
  const timestampStr = getLocalDateString(now).replace(/-/g, '');
  const fileName = `relatorio_${params.reportType}_${timestampStr}_${token.slice(0, 8)}.html`;
  const filePath = path.join(REPORTS_BACKLOG_DIR, fileName);

  let title = 'Relatório Geral';
  let summaryText = '';
  let htmlContent = '';
  let totalPieces = 0;
  let totalKg = 0;
  let totalOrders = 0;
  let totalValue = 0;

  // 1. TUDO QUE TÁ NA LAVANDERIA
  if (params.reportType === 'na_lavanderia') {
    title = 'Relatório de Peças na Lavanderia';
    const data = await extractNaLavanderiaData();
    totalPieces = data.totalPieces;
    totalKg = data.totalKg;
    totalOrders = data.totalOrders;

    summaryText = `📋 *RELATÓRIO DE PEÇAS NA LAVANDERIA*\n` +
                  `• Volume Atual na Fábrica: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Peso Total em Processamento: *${totalKg.toFixed(1)} Kg*\n` +
                  `• Lotes Ativos: *${totalOrders} OSs* (Aguardando / Em Lavagem / Prontos)\n` +
                  `• Posição da Lavanderia apurada em: *${formatLocalDateStr(now)}*`;

    htmlContent = buildNaLavanderiaHtml({
      title,
      periodLabel: `Posição em ${formatLocalDateStr(now)}`,
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 2. TUDO QUE FOI ENTREGUE HOJE
  } else if (params.reportType === 'entregues_hoje') {
    title = 'Relatório de Pedidos Entregues Hoje';
    const data = await extractEntreguesHojeData(period.startDate);
    totalPieces = data.totalPieces;
    totalKg = data.totalKg;
    totalOrders = data.totalOrders;

    summaryText = `🚚 *RELATÓRIO DE PEDIDOS ENTREGUES HOJE*\n` +
                  `• Total de Peças Entregues: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Carga Despachada: *${totalKg.toFixed(1)} Kg*\n` +
                  `• Total de Ordens Entregues: *${totalOrders} OSs*\n` +
                  `• Data das Saídas: *${formatDatePt(data.targetDate)}*`;

    htmlContent = buildEntreguesHojeHtml({
      title,
      periodLabel: formatDatePt(data.targetDate),
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 3. TUDO QUE FOI RECEBIDO DE FINANCEIRO HOJE
  } else if (params.reportType === 'financeiro_hoje') {
    title = 'Demonstrativo de Recebimentos Financeiros Hoje';
    const data = await extractFinanceiroHojeData(period.startDate);
    totalPieces = data.totalPieces;
    totalOrders = data.ordersCount;
    totalValue = data.totalPaid;

    summaryText = `💰 *RECEBIMENTOS FINANCEIROS DE HOJE*\n` +
                  `• Total Recebido no Caixa: *${formatMoney(data.totalPaid)}*\n` +
                  `• Ordens Quitadas Hoje: *${data.ordersCount} OSs*\n` +
                  `• Peças Baixadas: *${data.totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Descontos Concedidos: *${formatMoney(data.totalDiscounts)}*`;

    htmlContent = buildFinanceiroHojeHtml({
      title,
      periodLabel: formatDatePt(data.targetDate),
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 4. RELATÓRIO PRINCIPAL CONSOLIDADO
  } else if (params.reportType === 'principal_completo' || params.reportType === 'gerencial_completo') {
    title = 'Relatório Principal da Lavanderia';
    const [naLavanderia, entreguesHoje, financeiroHoje] = await Promise.all([
      extractNaLavanderiaData(),
      extractEntreguesHojeData(period.startDate),
      extractFinanceiroHojeData(period.startDate)
    ]);

    totalPieces = naLavanderia.totalPieces;
    totalKg = naLavanderia.totalKg;
    totalOrders = naLavanderia.totalOrders;
    totalValue = financeiroHoje.totalPaid;

    summaryText = `👔 *RELATÓRIO PRINCIPAL • MAUAD LAVANDERIA*\n\n` +
                  `📋 *Na Lavanderia (Fábrica):* *${naLavanderia.totalPieces.toLocaleString('pt-BR')} peças* (${naLavanderia.totalKg.toFixed(1)} Kg em ${naLavanderia.totalOrders} OSs)\n` +
                  `🚚 *Entregues Hoje:* *${entreguesHoje.totalPieces.toLocaleString('pt-BR')} peças* (${entreguesHoje.totalKg.toFixed(1)} Kg em ${entreguesHoje.totalOrders} OSs)\n` +
                  `💰 *Recebido no Caixa Hoje:* *${formatMoney(financeiroHoje.totalPaid)}* (${financeiroHoje.ordersCount} OSs quitadas)\n` +
                  `📅 *Data de Emissão:* ${formatLocalDateTimeStr(now)}`;

    htmlContent = buildPrincipalCompletoHtml({
      title,
      periodLabel: `Posição em ${formatLocalDateStr(now)}`,
      naLavanderia,
      entreguesHoje,
      financeiroHoje,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 5. LAVADOS (PERSONALIZADO POR STATUS / PERÍODO)
  } else if (params.reportType === 'lavados') {
    title = `Relatório de Lavados (${period.startDate} a ${period.endDate})`;
    const data = await extractLavadosData(period.startDate, period.endDate, params.statusFilter || 'todos');
    totalPieces = data.totalPieces;
    totalKg = data.totalKg;
    totalOrders = data.totalOrders;
    totalValue = data.totalValue;

    summaryText = `• Volume Total: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Carga Processada: *${totalKg.toFixed(1)} Kg*\n` +
                  `• Total de Pedidos: *${totalOrders} OSs*`;

    htmlContent = buildLavadosHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      statusFilter: params.statusFilter || 'todos',
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 6. PASSADORES
  } else if (params.reportType === 'passadores') {
    title = `Relatório de Passadoria (${period.startDate} a ${period.endDate})`;
    const data = await extractPassadoresData(period.startDate, period.endDate, params.passadorId || 'all');
    totalPieces = data.totalPieces;
    totalValue = data.totalValue;

    summaryText = `• Total de Peças Passadas: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Valor Produzido: *${formatMoney(totalValue)}*\n` +
                  `• Passadores Ativos: *${data.passadoresSummary.length}*`;

    htmlContent = buildPassadoresHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      passadorFilter: params.passadorId || 'all',
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 6.1 DIFERENCIADOS
  } else if (params.reportType === 'diferenciados') {
    title = `Relatório de Produção Diferenciada (${period.startDate} a ${period.endDate})`;
    const data = await extractDiferenciadosData(period.startDate, period.endDate, params.passadorId || 'all');
    totalPieces = data.totalPieces;
    totalValue = data.totalValue;

    summaryText = `• Total de Peças no Diferenciado: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Valor Produzido: *${formatMoney(totalValue)}*\n` +
                  `• Colaboradores Ativos: *${data.diferenciadosSummary.length}*`;

    htmlContent = buildDiferenciadosHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      diferenciadoFilter: params.passadorId || 'all',
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });

  // 7. FORNECEDORES
  } else {
    title = `Relatório de Fornecedores (${period.startDate} a ${period.endDate})`;
    const data = await extractFornecedoresData(period.startDate, period.endDate, params.supplierId || 'all');
    totalPieces = data.entries.length;
    totalValue = data.totalValue;
    totalKg = data.totalQuantity;

    summaryText = `• Compras Registradas: *${data.entries.length}*\n` +
                  `• Volume: *${totalKg.toFixed(1)} Kg/L*\n` +
                  `• Total Investido: *${formatMoney(totalValue)}*`;

    htmlContent = buildFornecedoresHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      supplierFilter: params.supplierId || 'all',
      data,
      token,
      retentionDays,
      generatedAt: `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}, ${formatLocalDateTimeStr(now)}`,
      baseUrl: params.baseUrl
    });
  }

  // Grava o arquivo HTML em disco
  fs.writeFileSync(filePath, htmlContent, 'utf-8');
  const fileStat = fs.statSync(filePath);

  // Registra no banco de dados
  const reportId = `rep-${Date.now()}-${token.slice(0, 6)}`;
  await query(`
    INSERT INTO sysmauad.shared_reports (
      id, token, title, report_type, period_preset,
      start_date, end_date, file_name, file_path,
      file_size_bytes, target_phone, summary_text,
      created_by, expires_at, created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12,
      $13, $14, NOW()
    )
  `, [
    reportId,
    token,
    title,
    params.reportType,
    params.periodPreset,
    period.startDate,
    period.endDate,
    fileName,
    filePath,
    fileStat.size,
    params.targetPhone || null,
    summaryText,
    params.createdBy || 'Sistema',
    expiresAt
  ]);

  return {
    reportId,
    token,
    title,
    reportType: params.reportType,
    fileName,
    filePath,
    fileSizeBytes: fileStat.size,
    viewUrl: `${params.baseUrl}/api/reports/view/${token}`,
    downloadUrl: `${params.baseUrl}/api/reports/download/${token}`,
    summaryText,
    whatsAppMessage: summaryText,
    retentionDays,
    expiresAt: expiresAt.toISOString(),
    totalPieces,
    totalKg,
    totalOrders,
    totalValue
  };
}

/**
 * Gera o Grupo de Relatórios Principais (3 PDFs separados: Na Lavanderia + Entregues Hoje + Financeiro Hoje)
 */
export async function generatePrincipalReportsGroup(params: {
  createdBy?: string;
  baseUrl: string;
  targetPhone?: string;
  notes?: string;
}) {
  const [repNaLavanderia, repEntreguesHoje, repFinanceiroHoje] = await Promise.all([
    generateAndSaveReport({
      reportType: 'na_lavanderia',
      periodPreset: 'hoje',
      createdBy: params.createdBy || 'Sistema',
      baseUrl: params.baseUrl,
      targetPhone: params.targetPhone,
      notes: params.notes
    }),
    generateAndSaveReport({
      reportType: 'entregues_hoje',
      periodPreset: 'hoje',
      createdBy: params.createdBy || 'Sistema',
      baseUrl: params.baseUrl,
      targetPhone: params.targetPhone,
      notes: params.notes
    }),
    generateAndSaveReport({
      reportType: 'financeiro_hoje',
      periodPreset: 'hoje',
      createdBy: params.createdBy || 'Sistema',
      baseUrl: params.baseUrl,
      targetPhone: params.targetPhone,
      notes: params.notes
    })
  ]);

  return [repNaLavanderia, repEntreguesHoje, repFinanceiroHoje];
}
