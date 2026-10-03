import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

function resolveDataDir(): string {
  // Em ambiente Docker, /app/data é montado do volume
  if (fs.existsSync('/app/data')) {
    return '/app/data';
  }
  // Em ambiente local/desenvolvimento
  const localData = path.resolve(__dirname, '../../../data');
  if (fs.existsSync(localData)) {
    return localData;
  }
  return os.tmpdir();
}

export function getMachineId(): string {
  if (process.env.MACHINE_ID && process.env.MACHINE_ID.trim()) {
    return process.env.MACHINE_ID.trim();
  }

  const dataDir = resolveDataDir();
  const machineFile = path.join(dataDir, 'machine_id.txt');

  try {
    if (fs.existsSync(machineFile)) {
      const savedId = fs.readFileSync(machineFile, 'utf-8').trim();
      if (savedId) {
        return savedId;
      }
    }
  } catch (e) {
    console.warn('[MachineID] Erro ao ler machine_id.txt persistido:', e);
  }

  // Gera um novo identificador baseado em hardware + SO
  try {
    const networkInterfaces = os.networkInterfaces();
    const macs: string[] = [];

    for (const iface of Object.values(networkInterfaces)) {
      if (iface) {
        for (const alias of iface) {
          if (!alias.internal && alias.mac && alias.mac !== '00:00:00:00:00:00') {
            macs.push(alias.mac);
          }
        }
      }
    }

    const rawFingerprint = [
      os.hostname(),
      os.platform(),
      os.arch(),
      macs.sort().join(';')
    ].join('::');

    const generatedId = 'sysm-' + crypto.createHash('sha256').update(rawFingerprint).digest('hex').substring(0, 24);

    try {
      fs.writeFileSync(machineFile, generatedId, 'utf-8');
      console.log(`[MachineID] Identificador de máquina gerado e persistido: ${generatedId}`);
    } catch (saveErr) {
      console.warn('[MachineID] Não foi possível salvar machine_id.txt:', saveErr);
    }

    return generatedId;
  } catch {
    return 'sysm-host-default';
  }
}
