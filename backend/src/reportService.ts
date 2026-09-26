import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from './db';
import { SharedReport, SystemSettings } from './types';

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

export function formatLocalDateStr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatLocalDateTimeStr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function toIsoDateOnly(date: Date): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Calcula intervalos pré-definidos no fuso de Brasília
 */
export function getReportPeriodDates(preset: 'hoje' | 'semana' | 'mes' | 'custom', customStart?: string, customEnd?: string) {
  const now = getNowBrasilia();
  const todayStr = toIsoDateOnly(now);

  if (preset === 'hoje') {
    return { startDate: todayStr, endDate: todayStr, label: 'Hoje (Diário)' };
  }

  if (preset === 'semana') {
    const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: toIsoDateOnly(pastWeek), endDate: todayStr, label: 'Últimos 7 Dias (Semanal)' };
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
    label: `Personalizado (${customStart || todayStr} a ${customEnd || todayStr})`
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

    // 1. Busca relatórios com expires_at vencido
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

    // 2. Limpeza por segurança de arquivos órfãos com mais de retentionDays dias no diretório
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const diskFiles = fs.readdirSync(REPORTS_BACKLOG_DIR);
    for (const f of diskFiles) {
      if (f.startsWith('relatorio_') && f.endsWith('.html')) {
        const fullPath = path.join(REPORTS_BACKLOG_DIR, f);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs < cutoff) {
            console.log(`[Reports Backlog] Limpando arquivo órfão antigo: ${f}`);
            fs.unlinkSync(fullPath);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (err: any) {
    console.error('[Reports Backlog] Erro na rotina de expurgo de relatórios:', err.message);
  }
}

/**
 * Página HTML amigável exibida quando o relatório expira ou não existe
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
      display: inline-block;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 12px 0;
      color: #f1f5f9;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      background-color: #3b82f620;
      color: #60a5fa;
      border: 1px solid #3b82f640;
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #0284c7;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      border-radius: 10px;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #0369a1;
    }
    .footer {
      margin-top: 28px;
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #334155;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⏱️</div>
    <h1>Relatório Expirado ou Indisponível</h1>
    <p>
      Este link de acesso ao relatório não está mais ativo. Por motivos de segurança e governança de dados da <strong>Mauad Lavanderia Industrial</strong>, os arquivos de relatórios gerados temporariamente no backlog expiram automaticamente após <strong>${retentionDays} dias</strong>.
    </p>
    <div class="badge">Identificador: ${token ? token.slice(0, 12) : 'N/A'}...</div>
    <div>
      <a href="https://sysmauad.jeffgsan.com.br" class="btn">Acessar Painel SysMauad</a>
    </div>
    <div class="footer">
      Mauad Lavanderia Industrial • Sistema Integrado de Gestão
    </div>
  </div>
</body>
</html>`;
}

/**
 * Interface dos Parâmetros de Geração de Relatório
 */
export interface GenerateReportParams {
  reportType: 'lavados' | 'passadores' | 'fornecedores' | 'gerencial_completo';
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

/**
 * Gera os dados, o arquivo HTML e grava no backlog
 */
export async function generateAndSaveReport(params: GenerateReportParams) {
  // 1. Obtém configurações do sistema para política de retenção
  const settingsRes = await query('SELECT * FROM sysmauad.system_settings WHERE id = $1', ['default']);
  const settingsRow = settingsRes.rows.length > 0 ? settingsRes.rows[0] : {};
  const retentionDays = Number(settingsRow.report_retention_days || 30);

  // 2. Calcula intervalo de datas oficial
  const period = getReportPeriodDates(params.periodPreset, params.startDate, params.endDate);
  const now = getNowBrasilia();
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  // 3. Gera identificadores seguros
  const token = crypto.randomBytes(24).toString('hex');
  const timestampStr = toIsoDateOnly(now).replace(/-/g, '');
  const fileName = `relatorio_${params.reportType}_${timestampStr}_${token.slice(0, 8)}.html`;
  const filePath = path.join(REPORTS_BACKLOG_DIR, fileName);

  // 4. Coleta dados e constrói o relatório específico
  let title = 'Relatório Geral';
  let summaryText = '';
  let htmlContent = '';
  let totalPieces = 0;
  let totalKg = 0;
  let totalOrders = 0;
  let totalValue = 0;

  if (params.reportType === 'lavados') {
    title = `Relatório de Lavados & Produção (${period.startDate} a ${period.endDate})`;
    const data = await extractLavadosData(period.startDate, period.endDate, params.statusFilter || 'todos');
    totalPieces = data.totalPieces;
    totalKg = data.totalKg;
    totalOrders = data.orders.length;
    totalValue = data.totalValue;

    summaryText = `• Volume Total: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Carga Processada: *${totalKg.toFixed(1)} Kg*\n` +
                  `• Total de Pedidos: *${totalOrders} OSs*\n` +
                  `• Status: Recebidos: ${data.statusCounts.recebido} | Em Andamento: ${data.statusCounts.em_andamento} | Prontos: ${data.statusCounts.pronto} | Entregues: ${data.statusCounts.entregue}`;

    htmlContent = buildLavadosHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      statusFilter: params.statusFilter || 'todos',
      data,
      token,
      retentionDays,
      expiresAt: formatLocalDateTimeStr(expiresAt),
      generatedAt: formatLocalDateTimeStr(now),
      notes: params.notes,
      baseUrl: params.baseUrl
    });
  } else if (params.reportType === 'passadores') {
    title = `Relatório de Produção por Passador (${period.startDate} a ${period.endDate})`;
    const data = await extractPassadoresData(period.startDate, period.endDate, params.passadorId || 'all');
    totalPieces = data.totalPieces;
    totalValue = data.totalValue;

    summaryText = `• Total de Peças Passadas: *${totalPieces.toLocaleString('pt-BR')} peças*\n` +
                  `• Valor Total Produção: *${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n` +
                  `• Passadores Ativos: *${data.passadoresSummary.length}*\n` +
                  `• Total de Registros de Passadoria: *${data.logs.length}*`;

    htmlContent = buildPassadoresHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      passadorFilter: params.passadorId || 'all',
      data,
      token,
      retentionDays,
      expiresAt: formatLocalDateTimeStr(expiresAt),
      generatedAt: formatLocalDateTimeStr(now),
      notes: params.notes,
      baseUrl: params.baseUrl
    });
  } else if (params.reportType === 'fornecedores') {
    title = `Relatório de Entradas de Insumos & Fornecedores (${period.startDate} a ${period.endDate})`;
    const data = await extractFornecedoresData(period.startDate, period.endDate, params.supplierId || 'all');
    totalPieces = data.entries.length;
    totalValue = data.totalValue;
    totalKg = data.totalQuantity;

    summaryText = `• Total de Entradas de Insumos: *${data.entries.length} compras*\n` +
                  `• Volume Total Adquirido: *${totalKg.toFixed(1)} Kg/L*\n` +
                  `• Valor Total Investido: *${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n` +
                  `• Fornecedores Atendidos: *${data.suppliersSummary.length}*`;

    htmlContent = buildFornecedoresHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      supplierFilter: params.supplierId || 'all',
      data,
      token,
      retentionDays,
      expiresAt: formatLocalDateTimeStr(expiresAt),
      generatedAt: formatLocalDateTimeStr(now),
      notes: params.notes,
      baseUrl: params.baseUrl
    });
  } else {
    // gerencial_completo
    title = `Relatório Gerencial Consolidado (${period.startDate} a ${period.endDate})`;
    const lavados = await extractLavadosData(period.startDate, period.endDate, 'todos');
    const passadores = await extractPassadoresData(period.startDate, period.endDate, 'all');
    const stockRes = await query('SELECT * FROM sysmauad.stock_items ORDER BY name ASC');
    const lowStock = stockRes.rows.filter((s: any) => Number(s.current_stock || 0) <= Number(s.min_stock_alert || 0));

    totalPieces = lavados.totalPieces;
    totalKg = lavados.totalKg;
    totalOrders = lavados.orders.length;
    totalValue = lavados.totalValue;

    summaryText = `• Produção / Lavados: *${totalPieces.toLocaleString('pt-BR')} peças* (${totalKg.toFixed(1)} Kg em ${totalOrders} OSs)\n` +
                  `• Faturamento das Ordens: *${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n` +
                  `• Passadoria: *${passadores.totalPieces.toLocaleString('pt-BR')} peças* (${passadores.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})\n` +
                  `• Insumos Críticos no Estoque: *${lowStock.length} produtos*`;

    htmlContent = buildGerencialCompletoHtml({
      title,
      periodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      lavados,
      passadores,
      stockItems: stockRes.rows,
      lowStock,
      token,
      retentionDays,
      expiresAt: formatLocalDateTimeStr(expiresAt),
      generatedAt: formatLocalDateTimeStr(now),
      notes: params.notes,
      baseUrl: params.baseUrl
    });
  }

  // 5. Salva o arquivo no backlog em disco
  fs.writeFileSync(filePath, htmlContent, 'utf-8');
  const fileStat = fs.statSync(filePath);

  // 6. Registra no banco PostgreSQL
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

  const viewUrl = `${params.baseUrl}/api/reports/view/${token}`;
  const downloadUrl = `${params.baseUrl}/api/reports/download/${token}`;

  // 7. Monta mensagem formatada para WhatsApp
  const whatsAppMessage = formatWhatsAppMessage({
    title,
    periodLabel: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    summaryText,
    viewUrl,
    retentionDays,
    notes: params.notes
  });

  return {
    reportId,
    token,
    title,
    fileName,
    filePath,
    fileSizeBytes: fileStat.size,
    viewUrl,
    downloadUrl,
    summaryText,
    whatsAppMessage,
    retentionDays,
    expiresAt: expiresAt.toISOString(),
    totalPieces,
    totalKg,
    totalOrders,
    totalValue
  };
}

/**
 * Monta o texto otimizado para o balão do WhatsApp
 */
export function formatWhatsAppMessage(params: {
  title: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  summaryText: string;
  viewUrl: string;
  retentionDays: number;
  notes?: string;
}): string {
  let msg = `👔 *MAUAD LAVANDERIA INDUSTRIAL*\n`;
  msg += `📊 *${params.title}*\n`;
  msg += `📅 *Período:* ${params.periodLabel} (${formatDatePt(params.startDate)} até ${formatDatePt(params.endDate)})\n\n`;

  msg += `*Resumo Operacional:*\n`;
  msg += `${params.summaryText}\n`;

  if (params.notes && params.notes.trim()) {
    msg += `\n📝 *Observação:* ${params.notes.trim()}\n`;
  }

  msg += `\n🔗 *Acesse o relatório completo e detalhado aqui:*\n`;
  msg += `${params.viewUrl}\n\n`;

  msg += `⏱️ _Acesso seguro via link. Arquivo disponível no servidor por ${params.retentionDays} dias._\n`;
  msg += `─────────────────────\n`;
  msg += `Mauad Lavanderia • Sistema de Gestão Industrial`;

  return msg;
}

function formatDatePt(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// ============================================================================
// EXTRAÇÃO DE DADOS DO BANCO POSTGRESQL
// ============================================================================

async function extractLavadosData(startDate: string, endDate: string, statusFilter: string) {
  const res = await query('SELECT * FROM sysmauad.orders ORDER BY created_at DESC');
  const allOrders = res.rows;

  const filteredOrders = allOrders.filter((o: any) => {
    const d = o.created_at ? o.created_at.slice(0, 10) : '';
    const inRange = (!startDate || d >= startDate) && (!endDate || d <= endDate);
    if (!inRange) return false;

    if (statusFilter === 'todos') return true;
    if (statusFilter === 'na_lavanderia') return o.status !== 'entregue';
    return o.status === statusFilter;
  });

  let totalPieces = 0;
  let totalKg = 0;
  let totalValue = 0;
  const statusCounts = { recebido: 0, em_andamento: 0, pronto: 0, entregue: 0 };
  const processMap: Record<string, { count: number; pieces: number; kg: number }> = {};

  filteredOrders.forEach((o: any) => {
    const pcs = Number(o.estimated_piece_count || 0);
    const kg = Number(o.total_weight_kg || 0);
    const val = Number(o.total_service_value || 0);

    totalPieces += pcs;
    totalKg += kg;
    totalValue += val;

    if (o.status in statusCounts) {
      statusCounts[o.status as keyof typeof statusCounts]++;
    }

    const items = Array.isArray(o.items) ? o.items : [];
    const proc = (items[0]?.process || 'Sem Processo').toUpperCase().trim();
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
    statusCounts,
    processSummary
  };
}

async function extractPassadoresData(startDate: string, endDate: string, passadorId: string) {
  const passadoresRes = await query('SELECT * FROM sysmauad.passadores WHERE active = TRUE ORDER BY name ASC');
  const passadores = passadoresRes.rows;

  const ordersRes = await query('SELECT id, os_number, client_name, ironing_logs FROM sysmauad.orders');
  const allLogs: any[] = [];

  ordersRes.rows.forEach((o: any) => {
    const logs = Array.isArray(o.ironing_logs) ? o.ironing_logs : [];
    logs.forEach((l: any) => {
      const logDate = l.timestamp ? l.timestamp.slice(0, 10) : '';
      const inRange = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
      if (inRange) {
        allLogs.push({
          ...l,
          clientName: o.client_name,
          osNumber: o.os_number || l.osNumber
        });
      }
    });
  });

  let totalPieces = 0;
  let totalValue = 0;

  const passadoresSummary = passadores
    .filter((p: any) => passadorId === 'all' || p.id === passadorId)
    .map((p: any) => {
      const pLogs = allLogs.filter((l: any) => l.passadorId === p.id || l.passadorName?.toLowerCase() === p.name?.toLowerCase());
      const pieces = pLogs.reduce((sum: number, l: any) => sum + Number(l.piecesIroned || 0), 0);
      const rate = Number(p.rate_per_piece ?? 0.15);
      const value = pieces * rate;

      totalPieces += pieces;
      totalValue += value;

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        pieces,
        rate,
        value,
        logCount: pLogs.length
      };
    })
    .sort((a, b) => b.pieces - a.pieces);

  const filteredLogs = passadorId === 'all' 
    ? allLogs 
    : allLogs.filter(l => l.passadorId === passadorId);

  filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    passadoresSummary,
    logs: filteredLogs,
    totalPieces,
    totalValue
  };
}

async function extractFornecedoresData(startDate: string, endDate: string, supplierId: string) {
  const entriesRes = await query('SELECT * FROM sysmauad.insumo_entries ORDER BY entered_at DESC');
  const allEntries = entriesRes.rows;

  const filteredEntries = allEntries.filter((e: any) => {
    const d = e.entered_at ? e.entered_at.slice(0, 10) : '';
    const inRange = (!startDate || d >= startDate) && (!endDate || d <= endDate);
    if (!inRange) return false;

    if (supplierId === 'all') return true;
    return e.supplier_id === supplierId || e.supplier_name?.toLowerCase().includes(supplierId.toLowerCase());
  });

  let totalQuantity = 0;
  let totalValue = 0;
  const supplierMap: Record<string, { count: number; quantity: number; value: number }> = {};

  filteredEntries.forEach((e: any) => {
    const qty = Number(e.quantity || 0);
    const val = Number(e.total_value || 0);
    totalQuantity += qty;
    totalValue += val;

    const sName = (e.supplier_name || 'Sem Fornecedor').trim();
    if (!supplierMap[sName]) {
      supplierMap[sName] = { count: 0, quantity: 0, value: 0 };
    }
    supplierMap[sName].count++;
    supplierMap[sName].quantity += qty;
    supplierMap[sName].value += val;
  });

  const suppliersSummary = Object.entries(supplierMap)
    .map(([name, stats]) => ({
      name,
      ...stats,
      pctValue: totalValue > 0 ? (stats.value / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  return {
    entries: filteredEntries,
    suppliersSummary,
    totalQuantity,
    totalValue
  };
}

// ============================================================================
// CONSTRUÇÃO DOS DOCUMENTOS HTML RESPONSIVOS E ESTILIZADOS
// ============================================================================

function getSharedHtmlHead(title: string): string {
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • Mauad Lavanderia</title>
  <style>
    :root {
      --primary: #0f172a;
      --accent: #0284c7;
      --accent-light: #e0f2fe;
      --success: #059669;
      --success-light: #d1fae5;
      --warning: #d97706;
      --warning-light: #fef3c7;
      --border: #e2e8f0;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 0;
      line-height: 1.4;
      font-size: 13px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    /* Barra Superior de Ações */
    .action-bar {
      background-color: var(--primary);
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .brand span { color: #38bdf8; }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background-color: var(--accent); color: #ffffff; }
    .btn-primary:hover { background-color: #0369a1; }
    .btn-outline { background-color: transparent; border: 1px solid #475569; color: #f8fafc; }
    .btn-outline:hover { background-color: #334155; }

    /* Banner de Retenção e Segurança */
    .retention-banner {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 10px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    .retention-badge {
      background-color: #dcfce7;
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-family: monospace;
    }

    /* Cabeçalho do Documento */
    .doc-header {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .doc-title h1 {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary);
      margin: 0 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-meta {
      font-size: 12px;
      color: var(--text-muted);
    }
    .doc-meta strong { color: var(--text); }

    /* Grid de Métricas Principais (KPIs) */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .kpi-val {
      font-size: 22px;
      font-weight: 900;
      font-family: monospace;
      color: var(--primary);
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Tabelas e Cartões de Dados */
    .data-card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow-x: auto;
    }
    .data-card-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--primary);
      margin: 0 0 14px 0;
      border-bottom: 2px solid var(--accent);
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      color: var(--primary);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-bottom: 2px solid var(--border);
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid var(--border);
    }
    tr:nth-child(even) td { background-color: #f8fafc; }
    tr:hover td { background-color: #f1f5f9; }
    .mono { font-family: monospace; font-weight: 700; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Badges */
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-recebido { background-color: var(--warning-light); color: var(--warning); }
    .status-em_andamento { background-color: var(--accent-light); color: var(--accent); }
    .status-pronto { background-color: #e0e7ff; color: #4338ca; }
    .status-entregue { background-color: var(--success-light); color: var(--success); }
    .status-pago { background-color: var(--success-light); color: var(--success); }
    .status-aberto { background-color: var(--warning-light); color: var(--warning); }

    /* Rodapé */
    .doc-footer {
      text-align: center;
      padding: 24px 0;
      font-size: 11px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      margin-top: 32px;
    }

    /* Regras de Impressão A4 sem Cabeçalhos do Browser */
    @page {
      margin: 10mm 12mm;
      size: A4 portrait;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff !important; color: #000000 !important; font-size: 10px !important; }
      .container { padding: 0 !important; max-width: 100% !important; }
      .doc-header, .kpi-card, .data-card {
        border: 1px solid #000000 !important;
        box-shadow: none !important;
        padding: 10px !important;
        margin-bottom: 12px !important;
      }
      th { background-color: #e2e8f0 !important; color: #000000 !important; }
      tr:nth-child(even) td { background-color: #ffffff !important; }
      .retention-banner { display: none !important; }
      .page-break { page-break-before: always; }
    }
  </style>`;
}

function buildLavadosHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, data, token, retentionDays, expiresAt, generatedAt, notes, baseUrl } = ctx;

  const ordersRows = data.orders.map((o: any) => {
    const items = Array.isArray(o.items) ? o.items : [];
    const proc = items[0]?.process || 'Padrão';
    const roupa = items[0]?.clothingType || 'Peça';
    const dateFormatted = o.created_at ? o.created_at.slice(0, 10).split('-').reverse().join('/') : '';
    const statusClass = `status-${o.status}`;
    const statusText = o.status.replace('_', ' ').toUpperCase();

    return `
      <tr>
        <td class="mono font-bold">${o.os_number}</td>
        <td>${dateFormatted}</td>
        <td><strong>${o.client_name}</strong></td>
        <td>${proc}</td>
        <td>${roupa}</td>
        <td class="mono">${o.corte_os || '-'}</td>
        <td class="mono text-right">${Number(o.total_weight_kg || 0).toFixed(1)} Kg</td>
        <td class="mono text-right">${Number(o.estimated_piece_count || 0)}</td>
        <td class="mono text-right">R$ ${Number(o.total_service_value || 0).toFixed(2)}</td>
        <td class="text-center"><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');

  const processRows = data.processSummary.map((p: any) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="mono text-center">${p.count}</td>
      <td class="mono text-right">${p.pieces.toLocaleString('pt-BR')}</td>
      <td class="mono text-right">${p.kg.toFixed(1)} Kg</td>
      <td class="mono text-right">${p.pctPieces.toFixed(1)}%</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSharedHtmlHead(title)}
</head>
<body>
  <div class="action-bar no-print">
    <div class="brand">
      MAUAD <span>LAVANDERIA</span> • Gestão Industrial
    </div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-primary">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-outline">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="container">
    <div class="retention-banner no-print">
      <div>
        🔒 <strong>Link de Acesso Seguro & Temporário</strong> • Disponível para consulta por <strong>${retentionDays} dias</strong>.
      </div>
      <div class="retention-badge">Expira em: ${expiresAt}</div>
    </div>

    <div class="doc-header">
      <div class="doc-title">
        <h1>${title}</h1>
        <div class="doc-meta">
          Período: <strong>${periodLabel}</strong> (${formatDatePt(startDate)} até ${formatDatePt(endDate)}) • Filtro: <strong>${ctx.statusFilter.toUpperCase()}</strong>
        </div>
      </div>
      <div class="doc-meta text-right">
        <div>Emissão: <strong>${generatedAt}</strong></div>
        <div>Mauad Lavanderia Industrial Ltda</div>
        <div>Código: <span class="mono">${token.slice(0, 10)}</span></div>
      </div>
    </div>

    ${notes ? `
    <div class="data-card" style="padding: 12px 18px; margin-bottom: 18px; background-color: #f0f9ff; border-color: #bae6fd;">
      <strong style="color: #0369a1;">Observação Operacional:</strong> ${notes}
    </div>
    ` : ''}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Volume Total de Peças</div>
        <div class="kpi-val">${data.totalPieces.toLocaleString('pt-BR')}</div>
        <div class="kpi-sub">Total faturado no período</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Carga Total Processada</div>
        <div class="kpi-val">${data.totalKg.toFixed(1)} <span style="font-size: 14px;">Kg</span></div>
        <div class="kpi-sub">Peso em balança industrial</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total de Ordens de Serviço</div>
        <div class="kpi-val">${data.orders.length} <span style="font-size: 14px;">OSs</span></div>
        <div class="kpi-sub">Lotes registrados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Valor Total dos Serviços</div>
        <div class="kpi-val" style="color: #059669;">R$ ${data.totalValue.toFixed(2)}</div>
        <div class="kpi-sub">Faturamento bruto do lote</div>
      </div>
    </div>

    <!-- Tabela 1: Resumo Consolidado por Processo -->
    <div class="data-card">
      <div class="data-card-title">
        <span>Resumo por Processo de Lavado</span>
        <span style="font-size: 11px; color: var(--text-muted);">${data.processSummary.length} processos catalogados</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Processo de Lavado</th>
            <th class="text-center">Quantidade de Lotes</th>
            <th class="text-right">Total de Peças</th>
            <th class="text-right">Peso Total (Kg)</th>
            <th class="text-right">% do Volume</th>
          </tr>
        </thead>
        <tbody>
          ${processRows || '<tr><td colspan="5" class="text-center">Nenhum lote registrado no período.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Tabela 2: Relação Completa de Ordens de Serviço -->
    <div class="data-card">
      <div class="data-card-title">
        <span>Relação Detalhada de Ordens de Serviço (${data.orders.length} pedidos)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>O.S.</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Processo</th>
            <th>Tipo Peça</th>
            <th>Corte/Ref</th>
            <th class="text-right">Peso</th>
            <th class="text-right">Peças</th>
            <th class="text-right">Valor</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${ordersRows || '<tr><td colspan="10" class="text-center">Nenhum pedido encontrado.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="doc-footer">
      Mauad Lavanderia Industrial • Sistema Integrado de Gestão SysMauad • Documento oficial emitido em conformidade com as diretrizes operacionais.
    </div>
  </div>
</body>
</html>`;
}

function buildPassadoresHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, data, token, retentionDays, expiresAt, generatedAt, notes, baseUrl } = ctx;

  const passadoresRows = data.passadoresSummary.map((p: any) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.phone || '—'}</td>
      <td class="mono text-right">${p.pieces.toLocaleString('pt-BR')}</td>
      <td class="mono text-right">R$ ${p.rate.toFixed(2)}</td>
      <td class="mono text-right" style="color: #059669;">R$ ${p.value.toFixed(2)}</td>
      <td class="mono text-center">${p.logCount}</td>
    </tr>
  `).join('');

  const logRows = data.logs.slice(0, 500).map((l: any) => `
    <tr>
      <td>${formatLocalDateTimeStr(l.timestamp)}</td>
      <td><strong>${l.passadorName}</strong></td>
      <td class="mono font-bold">${l.osNumber || '—'}</td>
      <td>${l.clientName || '—'}</td>
      <td class="mono text-right font-bold">${l.piecesIroned} peças</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSharedHtmlHead(title)}
</head>
<body>
  <div class="action-bar no-print">
    <div class="brand">
      MAUAD <span>LAVANDERIA</span> • Gestão Industrial
    </div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-primary">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-outline">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="container">
    <div class="retention-banner no-print">
      <div>
        🔒 <strong>Link de Acesso Seguro & Temporário</strong> • Disponível para consulta por <strong>${retentionDays} dias</strong>.
      </div>
      <div class="retention-badge">Expira em: ${expiresAt}</div>
    </div>

    <div class="doc-header">
      <div class="doc-title">
        <h1>${title}</h1>
        <div class="doc-meta">
          Período: <strong>${periodLabel}</strong> (${formatDatePt(startDate)} até ${formatDatePt(endDate)})
        </div>
      </div>
      <div class="doc-meta text-right">
        <div>Emissão: <strong>${generatedAt}</strong></div>
        <div>Mauad Lavanderia Industrial Ltda</div>
        <div>Código: <span class="mono">${token.slice(0, 10)}</span></div>
      </div>
    </div>

    ${notes ? `
    <div class="data-card" style="padding: 12px 18px; margin-bottom: 18px; background-color: #f0f9ff; border-color: #bae6fd;">
      <strong style="color: #0369a1;">Observação Operacional:</strong> ${notes}
    </div>
    ` : ''}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total de Peças Passadas</div>
        <div class="kpi-val">${data.totalPieces.toLocaleString('pt-BR')}</div>
        <div class="kpi-sub">Acabamento e passadoria</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Valor Total a Pagar</div>
        <div class="kpi-val" style="color: #059669;">R$ ${data.totalValue.toFixed(2)}</div>
        <div class="kpi-sub">Remuneração da equipe</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Passadores com Produção</div>
        <div class="kpi-val">${data.passadoresSummary.length}</div>
        <div class="kpi-sub">Colaboradores ativos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Lançamentos Registrados</div>
        <div class="kpi-val">${data.logs.length}</div>
        <div class="kpi-sub">Registros mobile / sistema</div>
      </div>
    </div>

    <!-- Tabela 1: Resumo Consolidado por Passador -->
    <div class="data-card">
      <div class="data-card-title">
        <span>Resumo por Operador de Passadoria</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Nome do Passador</th>
            <th>Telefone</th>
            <th class="text-right">Peças Passadas</th>
            <th class="text-right">Taxa / Peça</th>
            <th class="text-right">Total a Pagar</th>
            <th class="text-center">Apontamentos</th>
          </tr>
        </thead>
        <tbody>
          ${passadoresRows || '<tr><td colspan="6" class="text-center">Nenhum apontamento no período.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Tabela 2: Registro Detalhado -->
    <div class="data-card">
      <div class="data-card-title">
        <span>Histórico de Apontamentos (${data.logs.length} registros)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data e Hora</th>
            <th>Passador</th>
            <th>O.S.</th>
            <th>Cliente</th>
            <th class="text-right">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${logRows || '<tr><td colspan="5" class="text-center">Nenhum registro.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="doc-footer">
      Mauad Lavanderia Industrial • Sistema Integrado de Gestão SysMauad.
    </div>
  </div>
</body>
</html>`;
}

function buildFornecedoresHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, data, token, retentionDays, expiresAt, generatedAt, notes, baseUrl } = ctx;

  const summaryRows = data.suppliersSummary.map((s: any) => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td class="mono text-center">${s.count}</td>
      <td class="mono text-right">${s.quantity.toFixed(1)} Kg/L</td>
      <td class="mono text-right" style="color: #059669;">R$ ${s.value.toFixed(2)}</td>
      <td class="mono text-right">${s.pctValue.toFixed(1)}%</td>
    </tr>
  `).join('');

  const entriesRows = data.entries.map((e: any) => `
    <tr>
      <td>${formatLocalDateStr(e.entered_at)}</td>
      <td class="mono">${e.invoice_ref || '—'}</td>
      <td><strong>${e.supplier_name}</strong></td>
      <td>${e.product_name}</td>
      <td class="mono text-right">${Number(e.quantity).toFixed(1)} ${e.unit}</td>
      <td class="mono text-right">R$ ${Number(e.unit_price || 0).toFixed(2)}</td>
      <td class="mono text-right" style="color: #059669;">R$ ${Number(e.total_value || 0).toFixed(2)}</td>
      <td>${e.operator_name || 'Sistema'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSharedHtmlHead(title)}
</head>
<body>
  <div class="action-bar no-print">
    <div class="brand">
      MAUAD <span>LAVANDERIA</span> • Gestão Industrial
    </div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-primary">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-outline">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="container">
    <div class="retention-banner no-print">
      <div>
        🔒 <strong>Link de Acesso Seguro & Temporário</strong> • Disponível para consulta por <strong>${retentionDays} dias</strong>.
      </div>
      <div class="retention-badge">Expira em: ${expiresAt}</div>
    </div>

    <div class="doc-header">
      <div class="doc-title">
        <h1>${title}</h1>
        <div class="doc-meta">
          Período: <strong>${periodLabel}</strong> (${formatDatePt(startDate)} até ${formatDatePt(endDate)})
        </div>
      </div>
      <div class="doc-meta text-right">
        <div>Emissão: <strong>${generatedAt}</strong></div>
        <div>Mauad Lavanderia Industrial Ltda</div>
        <div>Código: <span class="mono">${token.slice(0, 10)}</span></div>
      </div>
    </div>

    ${notes ? `
    <div class="data-card" style="padding: 12px 18px; margin-bottom: 18px; background-color: #f0f9ff; border-color: #bae6fd;">
      <strong style="color: #0369a1;">Observação Operacional:</strong> ${notes}
    </div>
    ` : ''}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Investido em Insumos</div>
        <div class="kpi-val" style="color: #059669;">R$ ${data.totalValue.toFixed(2)}</div>
        <div class="kpi-sub">Compras no período</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Volume Total de Insumos</div>
        <div class="kpi-val">${data.totalQuantity.toFixed(1)} <span style="font-size: 14px;">Kg/L</span></div>
        <div class="kpi-sub">Carga química adquirida</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total de Entradas / NF</div>
        <div class="kpi-val">${data.entries.length}</div>
        <div class="kpi-sub">Lançamentos de estoque</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Fornecedores Atendidos</div>
        <div class="kpi-val">${data.suppliersSummary.length}</div>
        <div class="kpi-sub">Parceiros comerciais</div>
      </div>
    </div>

    <!-- Tabela 1: Resumo por Fornecedor -->
    <div class="data-card">
      <div class="data-card-title">
        <span>Resumo Financeiro por Fornecedor</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th class="text-center">Compras</th>
            <th class="text-right">Volume (Kg/L)</th>
            <th class="text-right">Total Investido</th>
            <th class="text-right">% do Valor</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows || '<tr><td colspan="5" class="text-center">Nenhuma entrada no período.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Tabela 2: Relação das Entradas -->
    <div class="data-card">
      <div class="data-card-title">
        <span>Detalhamento das Entradas de Insumos</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>NF / Ref</th>
            <th>Fornecedor</th>
            <th>Produto</th>
            <th class="text-right">Quantidade</th>
            <th class="text-right">Preço Unit.</th>
            <th class="text-right">Valor Total</th>
            <th>Operador</th>
          </tr>
        </thead>
        <tbody>
          ${entriesRows || '<tr><td colspan="8" class="text-center">Nenhum lançamento encontrado.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="doc-footer">
      Mauad Lavanderia Industrial • Sistema Integrado de Gestão SysMauad.
    </div>
  </div>
</body>
</html>`;
}

function buildGerencialCompletoHtml(ctx: any): string {
  const { title, periodLabel, startDate, endDate, lavados, passadores, lowStock, token, retentionDays, expiresAt, generatedAt, notes, baseUrl } = ctx;

  const lowStockRows = lowStock.map((s: any) => `
    <tr style="background-color: #fef2f2;">
      <td><strong>${s.name}</strong></td>
      <td class="mono font-bold" style="color: #dc2626;">${Number(s.current_stock).toFixed(1)} ${s.unit}</td>
      <td class="mono">${Number(s.min_stock_alert).toFixed(1)} ${s.unit}</td>
      <td>${s.category || 'Químico'}</td>
      <td style="color: #dc2626; font-weight: 700;">⚠️ Nível Crítico de Reposição</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${getSharedHtmlHead(title)}
</head>
<body>
  <div class="action-bar no-print">
    <div class="brand">
      MAUAD <span>LAVANDERIA</span> • Gestão Industrial
    </div>
    <div class="btn-group">
      <button onclick="window.print()" class="btn btn-primary">🖨️ Imprimir / Salvar PDF</button>
      <a href="${baseUrl}/api/reports/download/${token}" class="btn btn-outline">⬇️ Baixar HTML</a>
    </div>
  </div>

  <div class="container">
    <div class="retention-banner no-print">
      <div>
        🔒 <strong>Link de Acesso Seguro & Temporário</strong> • Disponível para consulta por <strong>${retentionDays} dias</strong>.
      </div>
      <div class="retention-badge">Expira em: ${expiresAt}</div>
    </div>

    <div class="doc-header">
      <div class="doc-title">
        <h1>${title}</h1>
        <div class="doc-meta">
          Período: <strong>${periodLabel}</strong> (${formatDatePt(startDate)} até ${formatDatePt(endDate)}) • Relatório Executivo Integrado
        </div>
      </div>
      <div class="doc-meta text-right">
        <div>Emissão: <strong>${generatedAt}</strong></div>
        <div>Mauad Lavanderia Industrial Ltda</div>
        <div>Código: <span class="mono">${token.slice(0, 10)}</span></div>
      </div>
    </div>

    ${notes ? `
    <div class="data-card" style="padding: 12px 18px; margin-bottom: 18px; background-color: #f0f9ff; border-color: #bae6fd;">
      <strong style="color: #0369a1;">Observação Operacional:</strong> ${notes}
    </div>
    ` : ''}

    <!-- KPIs Executivos Globais -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Volume Total de Peças</div>
        <div class="kpi-val">${lavados.totalPieces.toLocaleString('pt-BR')}</div>
        <div class="kpi-sub">${lavados.totalKg.toFixed(1)} Kg processados</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Faturamento Total</div>
        <div class="kpi-val" style="color: #059669;">R$ ${lavados.totalValue.toFixed(2)}</div>
        <div class="kpi-sub">Total faturado no período</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Passadoria & Acabamento</div>
        <div class="kpi-val">${passadores.totalPieces.toLocaleString('pt-BR')} <span style="font-size: 14px;">peças</span></div>
        <div class="kpi-sub">R$ ${passadores.totalValue.toFixed(2)} pagos</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Alertas de Estoque Químico</div>
        <div class="kpi-val" style="color: ${lowStock.length > 0 ? '#dc2626' : '#059669'};">
          ${lowStock.length} ${lowStock.length > 0 ? '⚠️' : '✅'}
        </div>
        <div class="kpi-sub">${lowStock.length > 0 ? 'Itens abaixo da margem' : 'Estoque regular'}</div>
      </div>
    </div>

    <!-- Seção 1: Produção por Processo -->
    <div class="data-card">
      <div class="data-card-title">
        <span>1. Produção e Lavados por Processo Industrial</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Processo de Lavado</th>
            <th class="text-center">Quantidade de Lotes</th>
            <th class="text-right">Total de Peças</th>
            <th class="text-right">Peso (Kg)</th>
            <th class="text-right">% do Volume</th>
          </tr>
        </thead>
        <tbody>
          ${lavados.processSummary.map((p: any) => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td class="mono text-center">${p.count}</td>
              <td class="mono text-right">${p.pieces.toLocaleString('pt-BR')}</td>
              <td class="mono text-right">${p.kg.toFixed(1)} Kg</td>
              <td class="mono text-right">${p.pctPieces.toFixed(1)}%</td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="text-center">Nenhum lote.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Seção 2: Passadoria -->
    <div class="data-card">
      <div class="data-card-title">
        <span>2. Desempenho e Acabamento da Passadoria</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Colaborador</th>
            <th class="text-right">Peças Passadas</th>
            <th class="text-right">Taxa / Peça</th>
            <th class="text-right">Total Produzido</th>
          </tr>
        </thead>
        <tbody>
          ${passadores.passadoresSummary.map((p: any) => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td class="mono text-right">${p.pieces.toLocaleString('pt-BR')}</td>
              <td class="mono text-right">R$ ${p.rate.toFixed(2)}</td>
              <td class="mono text-right" style="color: #059669;">R$ ${p.value.toFixed(2)}</td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="text-center">Sem apontamentos.</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Seção 3: Alertas de Insumos -->
    ${lowStock.length > 0 ? `
    <div class="data-card" style="border-color: #fca5a5;">
      <div class="data-card-title" style="border-bottom-color: #dc2626; color: #dc2626;">
        <span>3. Insumos Químicos Críticos para Reposição</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Insumo / Produto</th>
            <th>Estoque Atual</th>
            <th>Estoque Mínimo</th>
            <th>Categoria</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${lowStockRows}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="doc-footer">
      Mauad Lavanderia Industrial • Sistema Integrado de Gestão SysMauad • Documento Gerencial Consolidado.
    </div>
  </div>
</body>
</html>`;
}
