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
    const detailsJson = JSON.stringify(entry.details || {});

    await query(
      `INSERT INTO sysmauad.audit_logs 
       (id, timestamp, level, category, action, user_id, user_name, ip_address, user_agent, details)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        entry.level || 'info',
        entry.category || 'system',
        entry.action,
        entry.userId || null,
        entry.userName || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        detailsJson
      ]
    );
  } catch (err: any) {
    // Audit logging não deve travar a aplicação caso haja falha temporária
    console.error('[AuditLog] Erro ao gravar log no banco:', err.message);
  }
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
    details: parsedDetails
  };
}

export async function getAuditLogs(params: {
  level?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const limit = Math.min(Math.max(params.limit || 50, 1), 500);
  const offset = Math.max(params.offset || 0, 0);

  const whereClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIdx = 1;

  if (params.level && params.level !== 'all') {
    whereClauses.push(`level = $${paramIdx++}`);
    queryParams.push(params.level);
  }

  if (params.category && params.category !== 'all') {
    whereClauses.push(`category = $${paramIdx++}`);
    queryParams.push(params.category);
  }

  if (params.search && params.search.trim()) {
    const s = `%${params.search.trim()}%`;
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

  queryParams.push(limit);
  const limitIdx = paramIdx++;
  queryParams.push(offset);
  const offsetIdx = paramIdx++;

  const logsResult = await query(
    `SELECT * FROM sysmauad.audit_logs 
     ${whereSql} 
     ORDER BY timestamp DESC 
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    queryParams
  );

  return {
    logs: logsResult.rows.map(mapAuditLog),
    total
  };
}

export async function getAuditStats(): Promise<AuditStats> {
  const result = await query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE level = 'error') AS errors,
      COUNT(*) FILTER (WHERE level = 'security') AS security,
      COUNT(*) FILTER (WHERE level = 'warn') AS warnings,
      COUNT(*) FILTER (WHERE level = 'info') AS info,
      COUNT(*) FILTER (WHERE level = 'error' AND timestamp >= CURRENT_DATE) AS errors_today,
      COUNT(*) FILTER (WHERE level = 'security' AND timestamp >= CURRENT_DATE) AS security_today
    FROM sysmauad.audit_logs;
  `);

  const row = result.rows[0];
  return {
    total: parseInt(row.total || '0', 10),
    errors: parseInt(row.errors || '0', 10),
    security: parseInt(row.security || '0', 10),
    warnings: parseInt(row.warnings || '0', 10),
    info: parseInt(row.info || '0', 10),
    errorsToday: parseInt(row.errors_today || '0', 10),
    securityToday: parseInt(row.security_today || '0', 10)
  };
}

// Retenção escalável: limpa logs antigos para manter o banco leve e rápido
export async function purgeOldAuditLogs(retentionDays = 30, maxKeep = 20000): Promise<number> {
  try {
    // 1. Apaga registros anteriores aos dias de retenção
    const timePurge = await query(
      `DELETE FROM sysmauad.audit_logs 
       WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays]
    );

    // 2. Se ainda exceder maxKeep, remove os mais antigos excedentes
    const countRes = await query(`SELECT COUNT(*) FROM sysmauad.audit_logs`);
    const currentCount = parseInt(countRes.rows[0].count, 10);
    let overflowDeleted = 0;

    if (currentCount > maxKeep) {
      const deleteExcess = await query(`
        DELETE FROM sysmauad.audit_logs
        WHERE id IN (
          SELECT id FROM sysmauad.audit_logs
          ORDER BY timestamp ASC
          LIMIT $1
        )
      `, [currentCount - maxKeep]);
      overflowDeleted = deleteExcess.rowCount || 0;
    }

    const totalCleaned = (timePurge.rowCount || 0) + overflowDeleted;
    if (totalCleaned > 0) {
      console.log(`[AuditLog Purge] Limpeza automática: ${totalCleaned} registros antigos removidos.`);
    }
    return totalCleaned;
  } catch (err: any) {
    console.error('[AuditLog Purge] Erro na limpeza de logs:', err.message);
    return 0;
  }
}
