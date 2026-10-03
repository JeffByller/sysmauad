import os from 'os';
import https from 'node:https';
import http from 'node:http';
import http2 from 'node:http2';
import {
  LicenseConfig,
  LicenseState,
  LicenseStatus,
  LicenseVerifyRequest,
  LicenseVerifyResponse
} from './license.types';
import { getMachineId } from './machine-id.util';

export class LicenseService {
  private static instance: LicenseService;

  private config: LicenseConfig = {
    baseUrl: process.env.LICENSE_SERVER_URL || 'https://bkp.jeffgsan.com.br',
    licenseKey: process.env.LICENSE_KEY || '',
    appName: process.env.APP_NAME || 'SysMauad',
    appVersion: process.env.APP_VERSION || '1.0.0',
    heartbeatIntervalMs: 15 * 60 * 1000, // 15 minutos
    requestTimeoutMs: 10 * 1000,         // 10s
    gracePeriodHours: 24,                // 24 horas offline
    maxConsecutiveFailures: 5            // 5 tentativas seguidas
  };

  private machineId: string;

  private state: LicenseState = {
    isValid: false,
    status: 'PENDING',
    licenseKey: '',
    clientName: undefined,
    expiresAt: null,
    message: 'Nenhuma chave de licença configurada ou validação inicial pendente.',
    lastVerifiedAt: null,
    lastSuccessfulContactAt: null,
    consecutiveFailures: 0,
    inGracePeriod: false,
    machineId: '',
    isStreamConnected: false
  };

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private h2Client: http2.ClientHttp2Session | null = null;
  private h2Req: http2.ClientHttp2Stream | null = null;
  private streamReconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: LicenseState) => void> = new Set();

  private constructor() {
    this.machineId = getMachineId();
    this.state.machineId = this.machineId;
  }

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  /**
   * Inicializa o serviço com uma chave opcional do banco ou do .env
   */
  public async initialize(customConfig?: Partial<LicenseConfig>): Promise<LicenseState> {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    this.state.licenseKey = this.config.licenseKey || '';

    if (!this.config.licenseKey || !this.config.licenseKey.trim()) {
      this.state.isValid = false;
      this.state.status = 'PENDING';
      this.state.message = 'Chave de licença não configurada no sistema. Insira a chave nas configurações como Super Admin.';
      this.state.isStreamConnected = false;
      this.disconnectRealtimeStream();
      this.stopHeartbeat();
      console.log('[LicenseService] ℹ️ Aguardando configuração da chave de licença pelo Super Admin.');
      this.notifyStateListeners();
      return this.state;
    }

    // 1. Verificação inicial imediata
    await this.verifyLicense();

    // 2. Inicia heartbeat em segundo plano
    this.startHeartbeat();

    // 3. Conecta ao stream em tempo real SSE (Push instantâneo / Selo Ao Vivo)
    this.connectRealtimeStream();

    return this.state;
  }

  /**
   * Executa a checagem no endpoint /api/license/verify
   */
  public async verifyLicense(): Promise<LicenseState> {
    return this.executeRemoteCheck('/api/license/verify');
  }

  /**
   * Executa o heartbeat periódico no endpoint /api/license/heartbeat
   */
  public async sendHeartbeat(): Promise<LicenseState> {
    return this.executeRemoteCheck('/api/license/heartbeat');
  }

  /**
   * Testa a conectividade com o servidor de licenças
   */
  public async ping(): Promise<{ online: boolean; serverTime?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${this.config.baseUrl}/api/license/ping`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json() as any;
        return { online: true, serverTime: data.server_time };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  }

  /**
   * Requisição centralizada com controle de Grace Period
   */
  private async executeRemoteCheck(endpoint: string): Promise<LicenseState> {
    const key = (this.config.licenseKey || '').trim();

    if (!key) {
      this.state.isValid = false;
      this.state.status = 'PENDING';
      this.state.message = 'Chave de licença não preenchida.';
      this.notifyStateListeners();
      return this.state;
    }

    const payload: LicenseVerifyRequest = {
      license_key: key,
      app_name: this.config.appName,
      app_version: this.config.appVersion,
      hostname: os.hostname(),
      machine_id: this.machineId
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-License-Key': key
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = (await response.json()) as LicenseVerifyResponse;
      const nowIso = new Date().toISOString();

      if (data.valid === true && (data.status === 'ACTIVE' || !data.status)) {
        // Licença 100% ativa e autorizada
        this.state = {
          ...this.state,
          isValid: true,
          status: 'ACTIVE',
          licenseKey: key,
          clientName: data.client_name || 'SysMauad Cliente',
          expiresAt: data.expires_at || null,
          message: data.message || 'Licença ativa e autorizada.',
          lastVerifiedAt: nowIso,
          lastSuccessfulContactAt: nowIso,
          consecutiveFailures: 0,
          inGracePeriod: false,
          machineId: this.machineId
        };
        console.log(`[LicenseService] ✅ Licença autorizada com sucesso: ${this.state.clientName} (Status: ACTIVE)`);
      } else {
        // SERVIDOR RESPONDEU BLOQUEIO OU INVÁLIDA: Corte imediato!
        const returnedStatus = (data.status as LicenseStatus) || 'BLOCKED';
        this.state = {
          ...this.state,
          isValid: false,
          status: returnedStatus,
          licenseKey: key,
          clientName: data.client_name || this.state.clientName,
          expiresAt: data.expires_at || null,
          message: data.message || 'Licença revogada, bloqueada ou inválida no servidor.',
          lastVerifiedAt: nowIso,
          lastSuccessfulContactAt: nowIso,
          consecutiveFailures: 0,
          inGracePeriod: false,
          machineId: this.machineId
        };
        console.warn(`[LicenseService] ⛔ Licença NÃO autorizada: ${this.state.status} - ${this.state.message}`);
      }
    } catch (netErr: any) {
      clearTimeout(timeout);
      this.handleNetworkFailure(netErr);
    }

    this.notifyStateListeners();
    return this.state;
  }

  /**
   * Tratamento de falhas de conectividade (Grace Period)
   */
  private handleNetworkFailure(err: any): void {
    const now = Date.now();
    const nowIso = new Date().toISOString();
    this.state.lastVerifiedAt = nowIso;
    this.state.consecutiveFailures += 1;

    const lastContactTime = this.state.lastSuccessfulContactAt
      ? new Date(this.state.lastSuccessfulContactAt).getTime()
      : 0;
    const hoursSinceLastContact = lastContactTime > 0 ? (now - lastContactTime) / (1000 * 60 * 60) : Infinity;

    // Se já estava válida anteriormente e está dentro da tolerância de tempo/tentativas
    const canUseGracePeriod =
      this.state.isValid &&
      hoursSinceLastContact <= this.config.gracePeriodHours &&
      this.state.consecutiveFailures <= this.config.maxConsecutiveFailures;

    if (canUseGracePeriod) {
      this.state.inGracePeriod = true;
      this.state.message = `Servidor de licenças momentaneamente inacessível. Operando em período de tolerância offline (${this.state.consecutiveFailures}/${this.config.maxConsecutiveFailures} tentativas).`;
      console.warn(`[LicenseService] ⚠️ ${this.state.message}`);
    } else {
      this.state.isValid = false;
      this.state.inGracePeriod = false;
      this.state.status = 'UNREACHABLE';
      this.state.message = 'Não foi possível validar a licença com o servidor após o período de tolerância. Verifique sua conexão com a internet.';
      console.error(`[LicenseService] ❌ ${this.state.message} (Erro: ${err?.message || 'timeout'})`);
    }
  }

  /**
   * Inicia o agendador de heartbeat periódico
   */
  public startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (this.config.licenseKey && this.config.licenseKey.trim()) {
          await this.sendHeartbeat();
        }
      } catch (e: any) {
        console.error('[LicenseService] Erro no loop de heartbeat:', e.message);
      }
    }, this.config.heartbeatIntervalMs);

    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Conecta ao stream SSE do bkp.jeffgsan.com.br via HTTP/2 para receber
   * bloqueio/desbloqueio push NO MESMO SEGUNDO (Ao Vivo)
   */
  public connectRealtimeStream(): void {
    const key = (this.config.licenseKey || '').trim();
    if (!key) {
      return;
    }

    this.disconnectRealtimeStream();

    const baseUrl = this.config.baseUrl;
    const path = `/api/license/stream?key=${encodeURIComponent(key)}`;

    console.log(`[LicenseService] 📡 Conectando ao stream em tempo real SSE via HTTP/2: ${baseUrl}${path}...`);

    try {
      const client = http2.connect(baseUrl);
      this.h2Client = client;

      client.on('error', (err: any) => {
        console.error('[LicenseService] Erro na sessão HTTP/2:', err.message);
        this.state.isStreamConnected = false;
        this.notifyStateListeners();
        this.scheduleStreamReconnect(10000);
      });

      const req = client.request({
        ':method': 'GET',
        ':path': path,
        'accept': 'text/event-stream',
        'cache-control': 'no-cache',
        'x-license-key': key
      });

      this.h2Req = req;

      req.on('response', (headers) => {
        const status = Number(headers[':status'] || 200);
        if (status !== 200) {
          this.state.isStreamConnected = false;
          console.warn(`[LicenseService] ⚠️ Resposta do stream SSE HTTP/2: HTTP ${status}`);
          if (status === 401 || status === 403 || status === 404) {
            this.triggerLockdown(`Falha de autorização com o servidor de licenças (HTTP ${status}).`);
          }
          this.scheduleStreamReconnect(15000);
          return;
        }

        this.state.isStreamConnected = true;
        console.log('[LicenseService] 🟢 Conectado ao servidor de licenças em tempo real (● Ao Vivo via HTTP/2 SSE).');
        this.notifyStateListeners();
      });

      req.setEncoding('utf8');
      let buffer = '';

      req.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const raw = trimmed.replace(/^data:\s*/, '').trim();
            if (!raw) continue;
            try {
              const payload = JSON.parse(raw);
              console.log('[LicenseService] ⚡ Evento push em tempo real recebido via HTTP/2:', payload);

              const evt = String(payload.event || payload.status || '').toUpperCase();

              if (evt === 'BLOCKED') {
                this.triggerLockdown(payload.message || 'Licença bloqueada pelo administrador.');
              } else if (evt === 'ACTIVE') {
                this.triggerUnlock(payload.client_name, payload.message);
              } else if (evt === 'EXPIRED') {
                this.triggerExpired(payload.message);
              }
            } catch (err) {
              // Keep-alive ou non-JSON
            }
          }
        }
      });

      req.on('end', () => {
        this.state.isStreamConnected = false;
        console.warn('[LicenseService] ⚠️ Stream SSE HTTP/2 encerrado pelo servidor. Reconectando em 5 segundos...');
        this.notifyStateListeners();
        this.scheduleStreamReconnect(5000);
      });

      req.on('error', (err: any) => {
        this.state.isStreamConnected = false;
        console.error('[LicenseService] Erro na stream HTTP/2:', err.message);
        this.notifyStateListeners();
        this.scheduleStreamReconnect(10000);
      });
    } catch (err: any) {
      this.state.isStreamConnected = false;
      console.error('[LicenseService] Falha ao iniciar sessão HTTP/2:', err.message);
      this.notifyStateListeners();
      this.scheduleStreamReconnect(10000);
    }
  }

  public disconnectRealtimeStream(): void {
    if (this.streamReconnectTimer) {
      clearTimeout(this.streamReconnectTimer);
      this.streamReconnectTimer = null;
    }
    if (this.h2Req) {
      try { this.h2Req.close(); } catch (_) {}
      this.h2Req = null;
    }
    if (this.h2Client) {
      try { this.h2Client.close(); } catch (_) {}
      this.h2Client = null;
    }
    this.state.isStreamConnected = false;
  }

  private scheduleStreamReconnect(delayMs: number): void {
    if (this.streamReconnectTimer) {
      clearTimeout(this.streamReconnectTimer);
    }
    this.streamReconnectTimer = setTimeout(() => {
      this.streamReconnectTimer = null;
      const key = (this.config.licenseKey || '').trim();
      if (key) {
        this.connectRealtimeStream();
      }
    }, delayMs);
    if (this.streamReconnectTimer.unref) {
      this.streamReconnectTimer.unref();
    }
  }

  private triggerLockdown(reason: string): void {
    const nowIso = new Date().toISOString();
    this.state.isValid = false;
    this.state.status = 'BLOCKED';
    this.state.message = reason || 'Esta licença foi bloqueada pelo administrador. Acesso negado.';
    this.state.lastVerifiedAt = nowIso;
    this.state.lastSuccessfulContactAt = nowIso;
    this.state.inGracePeriod = false;

    console.error('====================================================');
    console.error('>>> [SYSMAUAD] APLICAÇÃO BLOQUEADA NO MESMO SEGUNDO <<<');
    console.error('Motivo:', this.state.message);
    console.error('====================================================');

    this.notifyStateListeners();
  }

  private triggerUnlock(clientName?: string, message?: string): void {
    const nowIso = new Date().toISOString();
    this.state.isValid = true;
    this.state.status = 'ACTIVE';
    if (clientName) this.state.clientName = clientName;
    this.state.message = message || 'Licença ativa e autorizada.';
    this.state.lastVerifiedAt = nowIso;
    this.state.lastSuccessfulContactAt = nowIso;
    this.state.consecutiveFailures = 0;
    this.state.inGracePeriod = false;

    console.log('====================================================');
    console.log('>>> [SYSMAUAD] APLICAÇÃO DESBLOQUEADA EM TEMPO REAL <<<');
    console.log('Cliente:', this.state.clientName || 'sysmauad');
    console.log('====================================================');

    this.notifyStateListeners();
  }

  private triggerExpired(message?: string): void {
    const nowIso = new Date().toISOString();
    this.state.isValid = false;
    this.state.status = 'EXPIRED';
    this.state.message = message || 'A licença do sistema expirou.';
    this.state.lastVerifiedAt = nowIso;
    this.state.lastSuccessfulContactAt = nowIso;
    this.state.inGracePeriod = false;

    this.notifyStateListeners();
  }

  /**
   * Inscrição para receber atualizações do estado da licença instantaneamente
   */
  public subscribe(listener: (state: LicenseState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyStateListeners(): void {
    const copy = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.error('[LicenseService] Erro ao notificar listener:', err);
      }
    }
  }

  /**
   * Atualiza a chave de licença em tempo de execução e executa revalidação
   */
  public async updateLicenseKey(newKey: string): Promise<LicenseState> {
    this.config.licenseKey = newKey.trim();
    this.state.licenseKey = this.config.licenseKey;
    this.disconnectRealtimeStream();

    const result = await this.verifyLicense();
    this.startHeartbeat();
    this.connectRealtimeStream();

    return result;
  }

  public isAuthorized(): boolean {
    return this.state.isValid;
  }

  public getState(): Readonly<LicenseState> {
    return { ...this.state };
  }

  public getRawConfig(): Readonly<LicenseConfig> {
    return { ...this.config };
  }
}

export const licenseService = LicenseService.getInstance();
