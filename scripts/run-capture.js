import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronExe = path.join(__dirname, '../node_modules/electron/dist/electron.exe');
const script = path.join(__dirname, 'capture-screenshots.cjs');

console.log('[Runner] Launching electron capture session...');
const res = spawnSync(electronExe, [script], {
  env,
  stdio: 'inherit',
});

console.log('[Runner] Completed with code:', res.status);
process.exit(res.status || 0);


