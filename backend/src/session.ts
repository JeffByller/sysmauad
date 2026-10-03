import crypto from 'crypto';
import { query } from './db';
import { recordAuditLog } from './security';

// Tempo máximo de inatividade da sessão (15 minutos)
export const SESSION_TIMEOUT_MINUTES = 15;

export interface UserSession {
  id: string;
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  isActive: boolean;
  endedAt?: string;
}

/**
 * Encerra sessões que excederam o tempo limite de inatividade (15 minutos sem interação)
 * e gera logs de auditoria informando a expiração.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const expiredRes = await query(`
      UPDATE sysmauad.user_sessions
      SET is_active = FALSE, ended_at = last_seen_at
      WHERE is_active = TRUE 
        AND last_seen_at <= NOW() - (INTERVAL '1 minute' * $1)
      RETURNING id, user_id, user_name, ip_address, user_agent, last_seen_at
    `, [SESSION_TIMEOUT_MINUTES]);

    if (expiredRes.rows.length > 0) {
      for (const row of expiredRes.rows) {
        recordAuditLog({
          level: 'info',
          category: 'auth',
          action: 'session_expired_timeout',
          userId: row.user_id,
          userName: row.user_name,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          details: {
            sessionId: row.id,
            reason: `Sessão encerrada automaticamente após ${SESSION_TIMEOUT_MINUTES} minutos de inatividade`,
            lastActivity: row.last_seen_at
          }
        }).catch(() => {});
      }
    }

    return expiredRes.rows.length;
  } catch (err: any) {
    console.error('[Session Manager] Erro ao limpar sessões expiradas:', err.message);
    return 0;
  }
}

/**
 * Verifica se já existe uma sessão ativa para o usuário especificado.
 * Retorna os dados da sessão ativa se existir, ou null.
 */
export async function checkActiveSession(userId: string): Promise<UserSession | null> {
  try {
    await cleanupExpiredSessions();

    const result = await query(`
      SELECT * FROM sysmauad.user_sessions
      WHERE user_id = $1 
        AND is_active = TRUE 
        AND last_seen_at > NOW() - (INTERVAL '1 minute' * $2)
      ORDER BY last_seen_at DESC 
      LIMIT 1
    `, [userId, SESSION_TIMEOUT_MINUTES]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      isActive: row.is_active,
      endedAt: row.ended_at
    };
  } catch (err: any) {
    console.error('[Session Manager] Erro ao verificar sessão ativa:', err.message);
    return null;
  }
}

/**
 * Cria uma nova sessão de usuário única e registra o id.
 */
export async function createSession(params: {
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  // Desativa qualquer sessão anterior residual do mesmo usuário
  await query(`
    UPDATE sysmauad.user_sessions
    SET is_active = FALSE, ended_at = NOW()
    WHERE user_id = $1 AND is_active = TRUE
  `, [params.userId]);

  await query(`
    INSERT INTO sysmauad.user_sessions 
      (id, user_id, user_name, ip_address, user_agent, created_at, last_seen_at, is_active)
    VALUES 
      ($1, $2, $3, $4, $5, NOW(), NOW(), TRUE)
  `, [
    sessionId,
    params.userId,
    params.userName,
    params.ipAddress || null,
    params.userAgent || null
  ]);

  return sessionId;
}

/**
 * Atualiza o timestamp de última atividade da sessão (Heartbeat).
 * Retorna true se a sessão estiver ativa e válida, false se tiver expirado.
 */
export async function touchSession(sessionId: string): Promise<boolean> {
  try {
    const result = await query(`
      UPDATE sysmauad.user_sessions
      SET last_seen_at = NOW()
      WHERE id = $1 
        AND is_active = TRUE 
        AND last_seen_at > NOW() - (INTERVAL '1 minute' * $2)
      RETURNING id
    `, [sessionId, SESSION_TIMEOUT_MINUTES]);

    return (result.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.error('[Session Manager] Erro ao atualizar heartbeat da sessão:', err.message);
    return false;
  }
}

/**
 * Encerra uma sessão específica ou todas as sessões de um usuário (Logout explícito).
 */
export async function endSession(sessionId?: string, userId?: string): Promise<void> {
  try {
    if (sessionId) {
      await query(`
        UPDATE sysmauad.user_sessions
        SET is_active = FALSE, ended_at = NOW()
        WHERE id = $1 AND is_active = TRUE
      `, [sessionId]);
    } else if (userId) {
      await query(`
        UPDATE sysmauad.user_sessions
        SET is_active = FALSE, ended_at = NOW()
        WHERE user_id = $1 AND is_active = TRUE
      `, [userId]);
    }
  } catch (err: any) {
    console.error('[Session Manager] Erro ao encerrar sessão:', err.message);
  }
}

/**
 * Retorna a lista de sessões atualmente ativas no sistema.
 */
export async function getActiveSessions(): Promise<UserSession[]> {
  try {
    await cleanupExpiredSessions();

    const result = await query(`
      SELECT * FROM sysmauad.user_sessions
      WHERE is_active = TRUE 
        AND last_seen_at > NOW() - (INTERVAL '1 minute' * $1)
      ORDER BY last_seen_at DESC
    `, [SESSION_TIMEOUT_MINUTES]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      isActive: row.is_active,
      endedAt: row.ended_at
    }));
  } catch (err: any) {
    console.error('[Session Manager] Erro ao listar sessões ativas:', err.message);
    return [];
  }
}

// Limpeza automática a cada 60 segundos
setInterval(() => {
  cleanupExpiredSessions().catch(() => {});
}, 60 * 1000);
