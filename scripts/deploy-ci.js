import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

function logSummary(msg) {
  console.log(msg);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      fs.appendFileSync(summaryFile, msg + '\n');
    } catch (_) {}
  }
}

logSummary('### Diagnóstico de Despliegue en Firebase Hosting');

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!saRaw || saRaw.trim() === '') {
  logSummary('❌ **ERROR CRÍTICO**: El secret `FIREBASE_SERVICE_ACCOUNT_DEMOCRACIA_VIVA_ES` está vacío o no se ha encontrado.');
  logSummary('Comprueba que el nombre en GitHub Secrets sea exactamente `FIREBASE_SERVICE_ACCOUNT_DEMOCRACIA_VIVA_ES`.');
  process.exit(1);
}

logSummary(`ℹ Longitud del secreto recibido: ${saRaw.length} caracteres.`);

let sa;
try {
  // Manejar posibles comillas extras o encoding
  let cleaned = saRaw.trim();
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"') && !cleaned.startsWith('{\n'))) {
    cleaned = cleaned.slice(1, -1);
  }
  sa = JSON.parse(cleaned);
  logSummary(`✅ JSON válido. Proyecto detectado: \`${sa.project_id}\` | Email: \`${sa.client_email}\``);
} catch (err) {
  logSummary(`❌ **ERROR**: El secreto no es un JSON válido: ${err.message}`);
  logSummary(`Primeros 50 caracteres del secreto recibido: \`${saRaw.slice(0, 50)}\``);
  process.exit(1);
}

const tmpDir = os.tmpdir();
const saPath = path.join(tmpDir, 'firebase-sa-deploy.json');

try {
  fs.writeFileSync(saPath, JSON.stringify(sa, null, 2), 'utf8');
  logSummary('✅ Archivo temporal de credenciales creado correctamente.');

  const env = {
    ...process.env,
    GOOGLE_APPLICATION_CREDENTIALS: saPath
  };

  logSummary('🚀 Ejecutando `firebase deploy --only hosting`...');

  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';

  const deploy = spawnSync(npxCmd, ['--yes', 'firebase-tools', 'deploy', '--only', 'hosting', '--project', sa.project_id || 'democracia-viva-es'], {
    env,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (deploy.stdout) {
    console.log(deploy.stdout);
    logSummary('```text\n' + deploy.stdout + '\n```');
  }

  if (deploy.stderr) {
    console.error(deploy.stderr);
    if (deploy.status !== 0) {
      logSummary('⚠️ **Stderr output**:\n```text\n' + deploy.stderr + '\n```');
    }
  }

  if (deploy.status === 0) {
    logSummary('🎉 **¡Despliegue completado con éxito en Firebase Hosting!**');
  } else {
    logSummary(`❌ El comando finalizó con código de error ${deploy.status}.`);
    process.exit(deploy.status || 1);
  }
} finally {
  try {
    if (fs.existsSync(saPath)) {
      fs.unlinkSync(saPath);
    }
  } catch (_) {}
}
