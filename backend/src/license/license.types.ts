export type LicenseStatus =
  | 'ACTIVE'
  | 'BLOCKED'
  | 'EXPIRED'
  | 'INVALID_KEY'
  | 'UNREACHABLE'
  | 'PENDING';

export interface LicenseVerifyRequest {
  license_key: string;
  app_name: string;
  app_version: string;
  hostname: string;
  machine_id: string;
}

export interface LicenseVerifyResponse {
  valid: boolean;
  status: LicenseStatus | string;
  client_name?: string;
  expires_at?: string | null;
  message?: string;
  server_time?: string;
}

export interface LicenseState {
  isValid: boolean;
  status: LicenseStatus;
  licenseKey?: string;
  clientName?: string;
  expiresAt?: string | null;
  message?: string;
  lastVerifiedAt: string | null;
  lastSuccessfulContactAt: string | null;
  consecutiveFailures: number;
  inGracePeriod: boolean;
  machineId: string;
  isStreamConnected?: boolean;
}

export interface LicenseConfig {
  baseUrl: string;
  licenseKey: string;
  appName: string;
  appVersion: string;
  heartbeatIntervalMs: number;
  requestTimeoutMs: number;
  gracePeriodHours: number;
  maxConsecutiveFailures: number;
}
