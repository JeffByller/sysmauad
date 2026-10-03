import { Request, Response, NextFunction } from 'express';
import { licenseService } from './license.service';

const DEFAULT_BYPASS_PREFIXES = [
  '/license',
  '/auth/login',
  '/client-auth/login',
  '/health',
  '/favicon.ico'
];

export function licenseGuard(options: { supportContact?: string } = {}) {
  const supportContact = options.supportContact || 'suporte@jeffgsan.com.br';

  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Sempre permitir rotas essenciais de configuração, status da licença e login
    const path = req.path;

    for (const prefix of DEFAULT_BYPASS_PREFIXES) {
      if (path === prefix || path.startsWith(prefix + '/')) {
        return next();
      }
    }

    // Permitir consulta de configurações básicas (GET /settings) para exibição na UI
    if (path === '/settings' && req.method === 'GET') {
      return next();
    }

    // Permitir leitura de usuários (GET /users) para carregar lista de login/operadores
    if (path === '/users' && req.method === 'GET') {
      return next();
    }

    // 2. Se a licença estiver ativa e autorizada (ou em período de tolerância)
    if (licenseService.isAuthorized()) {
      return next();
    }

    // 3. Sistema sem licença ativa / bloqueado / expirado
    const state = licenseService.getState();

    return res.status(403).json({
      success: false,
      error: 'LICENSE_SUSPENDED',
      status: state.status,
      message: state.message || 'O acesso ao sistema está temporariamente suspenso devido ao status da licença.',
      clientName: state.clientName || null,
      machineId: state.machineId,
      support: supportContact,
      lastVerifiedAt: state.lastVerifiedAt
    });
  };
}
