import { Request, Response, NextFunction } from 'express';
import { query } from './db';
import { AuditLog, AuditLevel, AuditCategory, AuditStats } from './types';

// ============================================================================
// 1. IP DETECTION
// ============================================================================
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp.trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// ============================================================================
// 2. BRUTE FORCE PROTECTION (LOGIN & PORTAL DO CLIENTE)
// ============================================================================
interface BruteForceRecord {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const BRUTE_FORCE_MAX_ATTEMPTS = 5;            // Máximo 5 falhas antes de bloquear
const BRUTE_FORCE_LOCK_MS = 15 * 60 * 1000;    // Bloqueia por 15 minutos

const bruteForceMap = new Map<string, BruteForceRecord>();

// Limpeza periódica de memória para evitar vazamento
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of bruteForceMap.entries()) {
    if (record.blockedUntil && record.blockedUntil > now) {
      continue; // Mantém enquanto bloqueado
    }
    if (now - record.lastAttemptAt > BRUTE_FORCE_WINDOW_MS) {
      bruteForceMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkBruteForceLock(ip: string, identifier: string): { isBlocked: boolean; retryAfterSeconds: number; remainingAttempts: number } {
  const key = `${ip}:${identifier.toLowerCase().trim()}`;
  const record = bruteForceMap.get(key);
  const now = Date.now();

  if (record && record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { isBlocked: true, retryAfterSeconds, remainingAttempts: 0 };
  }

  // Verifica se o IP individual também está bloqueado por excesso de tentativas globais
  const ipKey = `ip-global:${ip}`;
  const ipRecord = bruteForceMap.get(ipKey);
  if (ipRecord && ipRecord.blockedUntil && ipRecord.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((ipRecord.blockedUntil - now) / 1000);
    return { isBlocked: true, retryAfterSeconds, remainingAttempts: 0 };
  }

  const currentAttempts = record ? record.attempts : 0;
  return { 
    isBlocked: false, 
    retryAfterSeconds: 0, 
    remainingAttempts: Math.max(0, BRUTE_FORCE_MAX_ATTEMPTS - currentAttempts) 
  };
}

export function registerFailedAttempt(ip: string, identifier: string): { isBlocked: boolean; retryAfterSeconds: number; attempts: number } {
  const key = `${ip}:${identifier.toLowerCase().trim()}`;
  const now = Date.now();
  let record = bruteForceMap.get(key);

  if (!record || (now - record.firstAttemptAt > BRUTE_FORCE_WINDOW_MS && (!record.blockedUntil || record.blockedUntil <= now))) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now
    };
  } else {
    record.attempts += 1;
    record.lastAttemptAt = now;
  }

  let isBlocked = false;
  let retryAfterSeconds = 0;

  if (record.attempts >= BRUTE_FORCE_MAX_ATTEMPTS) {
    record.blockedUntil = now + BRUTE_FORCE_LOCK_MS;
    isBlocked = true;
    retryAfterSeconds = Math.ceil(BRUTE_FORCE_LOCK_MS / 1000);
  }

  bruteForceMap.set(key, record);

  // Também conta no acumulador por IP para evitar ataques de dicionário com múltiplos usuários diferentes
  const ipKey = `ip-global:${ip}`;
  let ipRecord = bruteForceMap.get(ipKey);
  if (!ipRecord || (now - ipRecord.firstAttemptAt > BRUTE_FORCE_WINDOW_MS)) {
    ipRecord = { attempts: 1, firstAttemptAt: now, lastAttemptAt: now };
  } else {
    ipRecord.attempts += 1;
    ipRecord.lastAttemptAt = now;
  }
  if (ipRecord.attempts >= (BRUTE_FORCE_MAX_ATTEMPTS * 2)) {
    ipRecord.blockedUntil = now + BRUTE_FORCE_LOCK_MS;
    isBlocked = true;
    retryAfterSeconds = Math.ceil(BRUTE_FORCE_LOCK_MS / 1000);
  }
  bruteForceMap.set(ipKey, ipRecord);

  return { isBlocked, retryAfterSeconds, attempts: record.attempts };
}

export function clearBruteForceAttempts(ip: string, identifier: string) {
  const key = `${ip}:${identifier.toLowerCase().trim()}`;
  bruteForceMap.delete(key);
}

// ============================================================================
// 3. RATE LIMITING GERAL DA API (PROTEÇÃO CONTRA FLOOD/DOS)
// ============================================================================
interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 240;    // 240 requisições por minuto por IP

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitMap.entries()) {
    if (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Ignora rotas estáticas ou de health check se houver
  if (req.path === '/health') {
    return next();
  }

  const ip = getClientIp(req);
  const now = Date.now();
  let bucket = rateLimitMap.get(ip);

  if (!bucket || (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS)) {
    bucket = { count: 1, windowStart: now };
  } else {
    bucket.count += 1;
  }

  rateLimitMap.set(ip, bucket);

  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfter);

    // Registra aviso de segurança se for flood abusivo
    if (bucket.count === RATE_LIMIT_MAX_REQUESTS + 1) {
      recordAuditLog({
        level: 'security',
        category: 'security',
        action: 'rate_limit_exceeded',
        ipAddress: ip,
        userAgent: req.headers['user-agent'] as string,
        details: {
          path: req.originalUrl,
          method: req.method,
          requestCount: bucket.count,
          limit: RATE_LIMIT_MAX_REQUESTS
        }
      }).catch(() => {});
    }

    return res.status(429).json({
      success: false,
      message: 'Limite de requisições excedido. Por favor, aguarde alguns segundos antes de tentar novamente.',
      retryAfterSeconds: retryAfter
    });
  }

  next();
}

// ============================================================================
// 4. AUDIT LOGGING SERVICE (GRAVAÇÃO, CONSULTA E RASTREABILIDADE)
// ============================================================================

// Política de retenção: mantém o banco leve independente do volume de uso
export const AUDIT_RETENTION_DAYS = 30;
export const AUDIT_MAX_RECORDS = 20000;

const AUDIT_LEVELS: AuditLevel[] = ['info', 'warn', 'error', 'security'];
const MAX_DETAILS_BYTES = 2048;
const MAX_STRING_FIELD = 400;
const MAX_ARRAY_ITEMS = 20;

// Ações que representam ameaças reais bloqueadas pelo sistema
export const AUDIT_THREAT_ACTIONS = [
  'brute_force_blocked',
  'intrusion_attempt_blocked',
  'rate_limit_exceeded',
  'login_blocked_brute_force',
  'backup_download_unauthorized',
  'backup_restore_unauthorized',
  'license_update_denied',
  'blocked_client_access_denied'
];
const AUDIT_LOGIN_SUCCESS_ACTIONS = ['login_success', 'client_login_success'];
const AUDIT_LOGIN_FAILED_ACTIONS = [
  'login_failed',
  'client_login_failed',
  'inactive_user_login_denied',
  'login_denied_concurrent_session'
];

// Classificação única de "Acessos" (usada na listagem e nas estatísticas)
const ACCESS_CONDITION_SQL = `(category IN ('auth', 'client_portal') OR action ~ '(login|logout|session|brute_force|intrusion|rate_limit)')`;

// Reduz o JSON de detalhes antes de gravar (evita linhas pesadas no banco)
function compactDetails(details?: Record<string, any>): Record<string, any> {
  if (!details || typeof details !== 'object') return {};

  const clip = (value: any, key: string, depth: number): any => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
      if (key === 'stack') return value.split('\n').slice(0, 4).join('\n').slice(0, MAX_STRING_FIELD);
      return value.length > MAX_STRING_FIELD ? `${value.slice(0, MAX_STRING_FIELD)}…` : value;
    }
    if (Array.isArray(value)) {
      const arr = value.slice(0, MAX_ARRAY_ITEMS).map(item => clip(item, key, depth + 1));
      if (value.length > MAX_ARRAY_ITEMS) arr.push(`… +${value.length - MAX_ARRAY_ITEMS} itens`);
      return arr;
    }
    if (value && typeof value === 'object') {
      if (depth > 3) return '[objeto]';
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        const clipped = clip(v, k, depth + 1);
        if (clipped !== undefined) out[k] = clipped;
      }
      return out;
    }
    return value;
  };

  let compact: Record<string, any> = clip(details, '', 0) || {};
  let json = JSON.stringify(compact);

  if (Buffer.byteLength(json) > MAX_DETAILS_BYTES && compact.stack) {
    delete compact.stack;
    json = JSON.stringify(compact);
  }
  if (Buffer.byteLength(json) > MAX_DETAILS_BYTES) {
    compact = {
      truncated: true,
      message: compact.message || compact.reason || undefined,
      preview: json.slice(0, 1500)
    };
  }
  return compact;
}

export async function recordAuditLog(entry: {
  level: AuditLevel;
  category: AuditCategory;
  action: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}): Promise<void> {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const level = AUDIT_LEVELS.includes(entry.level) ? entry.level : 'info';
    const detailsJson = JSON.stringify(compactDetails(entry.details));

    await query(
      `INSERT INTO sysmauad.audit_logs 
       (id, timestamp, level, category, action, user_id, user_name, ip_address, user_agent, details)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        level,
        String(entry.category || 'system').slice(0, 50),
        String(entry.action || 'unknown').slice(0, 100),
        entry.userId ? String(entry.userId).slice(0, 100) : null,
        entry.userName ? String(entry.userName).slice(0, 255) : null,
        entry.ipAddress ? String(entry.ipAddress).slice(0, 100) : null,
        entry.userAgent ? String(entry.userAgent).slice(0, 300) : null,
        detailsJson
      ]
    );
  } catch (err: any) {
    // Audit logging não deve travar a aplicação caso haja falha temporária
    console.error('[AuditLog] Erro ao gravar log no banco:', err.message);
  }
}

// ----------------------------------------------------------------------------
// Proteção contra inundação de logs vindos do navegador (POST /audit/logs)
// Ignora repetições da mesma ação pelo mesmo IP em 60s e limita 30 logs/min por IP
// ----------------------------------------------------------------------------
const CLIENT_LOG_DEDUPE_MS = 60 * 1000;
const CLIENT_LOG_MAX_PER_MINUTE = 30;
const clientLogLastSeen = new Map<string, number>();
const clientLogBuckets = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of clientLogLastSeen.entries()) {
    if (now - ts > CLIENT_LOG_DEDUPE_MS) clientLogLastSeen.delete(key);
  }
  for (const [ip, bucket] of clientLogBuckets.entries()) {
    if (now - bucket.windowStart > 60 * 1000) clientLogBuckets.delete(ip);
  }
}, 60 * 1000);

export function shouldAcceptClientLog(ip: string, action: string): boolean {
  const now = Date.now();
  const key = `${ip}|${action}`;
  const last = clientLogLastSeen.get(key);
  if (last && now - last < CLIENT_LOG_DEDUPE_MS) return false;

  let bucket = clientLogBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > 60 * 1000) {
    bucket = { count: 0, windowStart: now };
  }
  if (bucket.count >= CLIENT_LOG_MAX_PER_MINUTE) return false;

  bucket.count += 1;
  clientLogBuckets.set(ip, bucket);
  clientLogLastSeen.set(key, now);
  return true;
}

// ----------------------------------------------------------------------------
// Resumo legível dos detalhes (calculado no servidor para a listagem ser leve)
// ----------------------------------------------------------------------------
const humanizeStatus = (s: any) => String(s ?? '').replace(/_/g, ' ');

export function buildAuditSummary(d: Record<string, any> | null | undefined): string {
  if (!d || typeof d !== 'object') return '';
  const parts: string[] = [];

  const text = d.message || d.reason || d.description || d.note;

  const os = d.osNumber || (Array.isArray(d.osNumbers) ? d.osNumbers.join(', ') : '');
  if (os) parts.push(String(os));

  const subject =
    d.clientName || d.userName || d.passadorName || d.supplierName ||
    d.recipeName || d.productName || d.clothingType || d.name || d.companyName;
  if (subject) parts.push(String(subject));

  if (d.oldStatus && d.newStatus) {
    parts.push(`${humanizeStatus(d.oldStatus)} → ${humanizeStatus(d.newStatus)}`);
  } else if (d.piecesIroned !== undefined) {
    parts.push(`${d.piecesIroned} peças`);
  } else if (d.oldPieces !== undefined && d.newPieces !== undefined) {
    parts.push(`${d.oldPieces} → ${d.newPieces} peças`);
  } else if (d.grossValue !== undefined) {
    parts.push(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.grossValue) || 0)
    );
  } else if (d.currentStock !== undefined) {
    parts.push(`Estoque: ${d.currentStock}${d.unit ? ` ${d.unit}` : ''}`);
  }

  if (Array.isArray(d.changes) && d.changes.length > 0) {
    const fields = d.changes
      .map((c: any) => (c && typeof c === 'object' ? c.field : c))
      .filter(Boolean);
    if (fields.length > 0) parts.push(`Alterado: ${Array.from(new Set(fields)).join(', ')}`);
  }

  if (d.path && d.method) parts.push(`${d.method} ${String(d.path).split('?')[0]}`);

  if (text && parts.length === 0) return String(text).slice(0, 160);
  if (text) parts.push(String(text));

  if (parts.length === 0) {
    // Fallback: primeiros campos simples, sem identificadores técnicos
    const simple = Object.entries(d)
      .filter(([k, v]) => ['string', 'number', 'boolean'].includes(typeof v) && !/id$/i.test(k) && k !== 'stack')
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`);
    return simple.join(' • ').slice(0, 160);
  }

  return parts.join(' • ').slice(0, 160);
}

export function mapAuditLog(row: any): AuditLog {
  let parsedDetails: Record<string, any> = {};
  if (typeof row.details === 'object' && row.details !== null) {
    parsedDetails = row.details;
  } else if (typeof row.details === 'string') {
    try {
      parsedDetails = JSON.parse(row.details);
    } catch {
      parsedDetails = { raw: row.details };
    }
  }

  return {
    id: row.id,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    level: row.level,
    category: row.category,
    action: row.action,
    userId: row.user_id || undefined,
    userName: row.user_name || undefined,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    details: parsedDetails,
    summary: buildAuditSummary(parsedDetails)
  };
}

// Versão leve para a listagem: sem user-agent e sem o JSON completo de detalhes
function mapAuditLogListItem(row: any): AuditLog {
  const full = mapAuditLog(row);
  return {
    id: full.id,
    timestamp: full.timestamp,
    level: full.level,
    category: full.category,
    action: full.action,
    userName: full.userName,
    ipAddress: full.ipAddress,
    summary: full.summary
  };
}

export async function getAuditLogs(params: {
  level?: string;
  category?: string;
  search?: string;
  tab?: 'access' | 'changes' | 'all' | string;
  limit?: number;
  offset?: number;
  full?: boolean;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const maxLimit = params.full ? 1000 : 100;
  const limit = Math.min(Math.max(params.limit || 20, 1), maxLimit);
  const offset = Math.max(params.offset || 0, 0);

  const whereClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (params.tab === 'access') {
    whereClauses.push(ACCESS_CONDITION_SQL);
  } else if (params.tab === 'changes') {
    whereClauses.push(`NOT ${ACCESS_CONDITION_SQL}`);
  }

  if (params.level && params.level !== 'all') {
    whereClauses.push(`level = $${paramIdx++}`);
    queryParams.push(params.level);
  }

  if (params.category && params.category !== 'all') {
    whereClauses.push(`category = $${paramIdx++}`);
    queryParams.push(params.category);
  }

  if (params.search && params.search.trim()) {
    const s = `%${params.search.trim().slice(0, 100)}%`;
    whereClauses.push(`(
      action ILIKE $${paramIdx} OR 
      user_name ILIKE $${paramIdx} OR 
      ip_address ILIKE $${paramIdx} OR 
      details::text ILIKE $${paramIdx}
    )`);
    queryParams.push(s);
    paramIdx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM sysmauad.audit_logs ${whereSql}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const listParams = [...queryParams, limit, offset];
  const columns = params.full
    ? '*'
    : 'id, timestamp, level, category, action, user_name, ip_address, details';

  const logsResult = await query(
    `SELECT ${columns} FROM sysmauad.audit_logs 
     ${whereSql} 
     ORDER BY timestamp DESC 
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    listParams
  );

  return {
    logs: logsResult.rows.map(params.full ? mapAuditLog : mapAuditLogListItem),
    total
  };
}

export async function getAuditLogById(id: string): Promise<AuditLog | null> {
  const result = await query(`SELECT * FROM sysmauad.audit_logs WHERE id = $1`, [id]);
  return result.rows.length > 0 ? mapAuditLog(result.rows[0]) : null;
}

export async function getAuditStats(): Promise<AuditStats> {
  const [countsRes, categoriesRes, sizeRes] = await Promise.all([
    query(
      `
      WITH bounds AS (
        SELECT (date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AS today_start
      )
      SELECT
        COUNT(*) AS total,
        MIN(l.timestamp) AS oldest,
        COUNT(*) FILTER (WHERE l.level = 'error') AS errors,
        COUNT(*) FILTER (WHERE l.level = 'security') AS security,
        COUNT(*) FILTER (WHERE l.level = 'warn') AS warnings,
        COUNT(*) FILTER (WHERE l.level = 'info') AS info,
        COUNT(*) FILTER (WHERE l.level = 'error' AND l.timestamp >= b.today_start) AS errors_today,
        COUNT(*) FILTER (WHERE l.action = ANY($1)) AS threats,
        COUNT(*) FILTER (WHERE l.action = ANY($1) AND l.timestamp >= b.today_start) AS threats_today,
        COUNT(*) FILTER (WHERE l.action = ANY($2) AND l.timestamp >= b.today_start) AS logins_today,
        COUNT(*) FILTER (WHERE l.action = ANY($3) AND l.timestamp >= b.today_start) AS failed_logins_today,
        COUNT(*) FILTER (
          WHERE l.level IN ('info', 'warn')
            AND NOT ${ACCESS_CONDITION_SQL}
            AND l.timestamp >= b.today_start
        ) AS changes_today
      FROM sysmauad.audit_logs l
      CROSS JOIN bounds b;
      `,
      [AUDIT_THREAT_ACTIONS, AUDIT_LOGIN_SUCCESS_ACTIONS, AUDIT_LOGIN_FAILED_ACTIONS]
    ),
    query(
      `SELECT category, COUNT(*) AS count 
       FROM sysmauad.audit_logs 
       GROUP BY category 
       ORDER BY count DESC`
    ),
    query(`SELECT pg_total_relation_size('sysmauad.audit_logs') AS bytes`)
  ]);

  const row = countsRes.rows[0];
  const n = (v: any) => parseInt(v || '0', 10);

  return {
    total: n(row.total),
    errors: n(row.errors),
    security: n(row.security),
    warnings: n(row.warnings),
    info: n(row.info),
    errorsToday: n(row.errors_today),
    threats: n(row.threats),
    threatsToday: n(row.threats_today),
    loginsToday: n(row.logins_today),
    failedLoginsToday: n(row.failed_logins_today),
    changesToday: n(row.changes_today),
    oldestTimestamp: row.oldest ? new Date(row.oldest).toISOString() : null,
    storageBytes: n(sizeRes.rows[0]?.bytes),
    retentionDays: AUDIT_RETENTION_DAYS,
    maxRecords: AUDIT_MAX_RECORDS,
    categories: categoriesRes.rows.map((r: any) => ({ category: r.category, count: n(r.count) }))
  };
}

// Retenção escalável: limpa logs antigos para manter o banco leve e rápido
export async function purgeOldAuditLogs(
  retentionDays = AUDIT_RETENTION_DAYS,
  maxKeep = AUDIT_MAX_RECORDS
): Promise<number> {
  try {
    // 1. Apaga registros anteriores aos dias de retenção
    const timePurge = await query(
      `DELETE FROM sysmauad.audit_logs 
       WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays]
    );

    // 2. Se ainda exceder maxKeep, remove os mais antigos excedentes (usa o índice de timestamp)
    const overflow = await query(
      `DELETE FROM sysmauad.audit_logs
       WHERE timestamp < (
         SELECT timestamp FROM sysmauad.audit_logs
         ORDER BY timestamp DESC
         OFFSET $1 LIMIT 1
       )`,
      [maxKeep]
    );

    const totalCleaned = (timePurge.rowCount || 0) + (overflow.rowCount || 0);
    if (totalCleaned > 0) {
      console.log(`[AuditLog Purge] Limpeza automática: ${totalCleaned} registros antigos removidos.`);
    }
    return totalCleaned;
  } catch (err: any) {
    console.error('[AuditLog Purge] Erro na limpeza de logs:', err.message);
    return 0;
  }
}
