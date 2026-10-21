import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

function reportNotice(title, msg) {
  console.log(`[NOTICE] ${title}: ${msg}`);
  const escaped = msg.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::notice title=${title}::${escaped}`);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      fs.appendFileSync(summaryFile, `**${title}**: ${msg}\n\n`);
    } catch (_) {}
  }
}

function reportError(title, msg) {
  console.error(`[ERROR] ${title}: ${msg}`);
  const escaped = msg.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::error title=${title}::${escaped}`);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      fs.appendFileSync(summaryFile, `❌ **${title}**: ${msg}\n\n`);
    } catch (_) {}
  }
}

reportNotice('DiagnosticoInicio', 'Iniciando fase de despliegue a Firebase Hosting...');

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!saRaw || saRaw.trim() === '') {
  reportError('SecretVacio', 'El secret FIREBASE_SERVICE_ACCOUNT está totalmente vacío en el entorno de GitHub Actions.');
  process.exit(1);
}

reportNotice('SecretDetectado', `Longitud recibida: ${saRaw.length} chars. Primeros 20 chars: "${saRaw.slice(0, 20)}..."`);

let sa;
try {
  let cleaned = saRaw.trim();
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || (cleaned.startsWith('"') && cleaned.endsWith('"') && !cleaned.startsWith('{\n'))) {
    cleaned = cleaned.slice(1, -1);
  }
  sa = JSON.parse(cleaned);
  reportNotice('JsonValido', `Proyecto: ${sa.project_id} | Client: ${sa.client_email}`);
} catch (err) {
  reportError('JsonInvalido', `No se pudo parsear el JSON: ${err.message}. Comprueba que pegaste todo el JSON.`);
  process.exit(1);
}

const tmpDir = os.tmpdir();
const saPath = path.join(tmpDir, 'firebase-sa-deploy.json');

try {
  fs.writeFileSync(saPath, JSON.stringify(sa, null, 2), 'utf8');
  reportNotice('CredencialesCreadas', `Archivo temporal en ${saPath}`);

  const env = {
    ...process.env,
    GOOGLE_APPLICATION_CREDENTIALS: saPath
  };

  const isWindows = process.platform === 'win32';
  const npxCmd = isWindows ? 'npx.cmd' : 'npx';
  const projectId = sa.project_id || 'democracia-viva-es';

  reportNotice('EjecutandoDeploy', `Lanzando npx firebase-tools deploy --only hosting --project ${projectId}`);

  const deploy = spawnSync(npxCmd, ['--yes', 'firebase-tools', 'deploy', '--only', 'hosting', '--project', projectId], {
    env,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (deploy.stdout) {
    console.log(deploy.stdout);
    reportNotice('DeployStdout', deploy.stdout.slice(-500));
  }

  if (deploy.stderr) {
    console.error(deploy.stderr);
    if (deploy.status !== 0) {
      reportError('DeployStderr', deploy.stderr.slice(-500));
    }
  }

  if (deploy.status === 0) {
    reportNotice('ExitoTotal', '¡Despliegue completado con éxito en Firebase Hosting!');
  } else {
    reportError('FalloCodigo', `firebase-tools finalizó con exit code ${deploy.status}`);
    process.exit(deploy.status || 1);
  }
} finally {
  try {
    if (fs.existsSync(saPath)) {
      fs.unlinkSync(saPath);
    }
  } catch (_) {}
}
