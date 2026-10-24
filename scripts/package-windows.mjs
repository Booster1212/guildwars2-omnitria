import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Version ermitteln (entweder aus CLI-Argument wie v0.1.0 oder aus package.json)
const pkgJsonPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

const argVersion = process.argv[2];
let version = argVersion ? argVersion.trim() : `v${pkg.version}`;
if (!version.startsWith('v')) {
  version = `v${version}`;
}

console.log(`=======================================================`);
console.log(` Omnitria Windows Release Packaging Tool`);
console.log(` Target Version: ${version}`);
console.log(` Root Directory: ${rootDir}`);
console.log(`=======================================================\n`);

// 2. Prüfen, ob der Produktionsbuild (dist/index.html) vorhanden ist
const distHtml = path.join(rootDir, 'dist', 'index.html');
if (!fs.existsSync(distHtml)) {
  console.log('[-] dist/index.html nicht gefunden. Fuehre Vite Produktionsbuild aus...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} else {
  console.log('[+] Vite Produktionsbuild (dist/) ist vorhanden.');
}

// 3. Prüfen, ob Electron Binary in node_modules vorhanden ist
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
if (!fs.existsSync(electronDistDir)) {
  console.error(`[-] Fehler: Electron-Distributable nicht gefunden unter: ${electronDistDir}`);
  console.error('    Bitte fuehre "npm ci" oder "npm install" aus.');
  process.exit(1);
}
console.log('[+] Electron-Distributable in node_modules verifiziert.');

// 4. Zielverzeichnisse vorbereiten
const releaseDir = path.join(rootDir, 'release');
const stagingDirName = `Omnitria-${version}-windows-x64`;
const stagingDir = path.join(releaseDir, stagingDirName);

if (fs.existsSync(stagingDir)) {
  console.log(`[*] Bereinige vorherigen Staging-Ordner: ${stagingDir}`);
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 5. Electron Runtime-Dateien kopieren
console.log('[+] Kopiere Electron Runtime-Dateien in Staging-Verzeichnis...');
fs.cpSync(electronDistDir, stagingDir, { recursive: true });

// 6. electron.exe in Omnitria.exe umbenennen
const electronExe = path.join(stagingDir, 'electron.exe');
const omnitriaExe = path.join(stagingDir, 'Omnitria.exe');
if (fs.existsSync(electronExe)) {
  fs.renameSync(electronExe, omnitriaExe);
  console.log('[+] electron.exe erfolgreich zu Omnitria.exe umbenannt.');
} else {
  console.warn('[!] Warnung: electron.exe nicht gefunden.');
}

// default_app.asar entfernen, damit Electron sauber aus resources/app startet
const defaultAppAsar = path.join(stagingDir, 'resources', 'default_app.asar');
if (fs.existsSync(defaultAppAsar)) {
  fs.rmSync(defaultAppAsar, { force: true });
  console.log('[+] default_app.asar entfernt (ersetzt durch eigene App).');
}

// 7. App-Ressourcen unter resources/app anlegen
const appDir = path.join(stagingDir, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });

// Kopiere dist/
console.log('[+] Kopiere dist/ nach resources/app/dist...');
fs.cpSync(path.join(rootDir, 'dist'), path.join(appDir, 'dist'), { recursive: true });

// Kopiere electron/
console.log('[+] Kopiere electron/ nach resources/app/electron...');
fs.cpSync(path.join(rootDir, 'electron'), path.join(appDir, 'electron'), {
  recursive: true,
  filter: (src) => !src.endsWith('electron.log'),
});

// Kopiere assets/
console.log('[+] Kopiere assets/ nach resources/app/assets...');
fs.cpSync(path.join(rootDir, 'assets'), path.join(appDir, 'assets'), { recursive: true });

// Kopiere package.json (fuer Metadaten und main-Entrypoint)
console.log('[+] Erstelle package.json fuer resources/app...');
const appPkg = {
  name: pkg.name || 'omnitria',
  version: version.replace(/^v/, ''),
  description: pkg.description || 'Omnitria - Guild Wars 2 In-Game Overlay',
  main: 'electron/main.cjs',
  author: pkg.author || '',
  license: pkg.license || 'MIT',
};
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');

// 8. Launcher-Skripte im Hauptverzeichnis des Release-Pakets bereitstellen
const launcherBat = `@echo off
title Omnitria • Guild Wars 2
cd /d "%~dp0"
start "" "%~dp0Omnitria.exe"
exit
`;
fs.writeFileSync(path.join(stagingDir, 'Omnitria.bat'), launcherBat, 'utf8');

const silentVbs = `' Omnitria Silent Background Launcher
Dim shell, fso, currentDir
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = currentDir
shell.Run """" & currentDir & "\\Omnitria.exe""", 0, False
`;
fs.writeFileSync(path.join(stagingDir, 'Omnitria-Silent.vbs'), silentVbs, 'utf8');

// Lies README.md und kopiere es
const readmeSrc = path.join(rootDir, 'README.md');
if (fs.existsSync(readmeSrc)) {
  fs.copyFileSync(readmeSrc, path.join(stagingDir, 'README.md'));
}

console.log('[+] Staging-Verzeichnis vollstaendig befuellt.');

// 9. ZIP-Archiv erstellen
const zipFileName = `Omnitria-${version}-windows-x64.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);

if (fs.existsSync(zipFilePath)) {
  fs.rmSync(zipFilePath, { force: true });
}

console.log(`[+] Erstelle ZIP-Archiv: ${zipFileName}...`);
// Verwende tar.exe fuer schnelle, verlustfreie ZIP-Erstellung auf Windows
try {
  execSync(`tar -a -cf "${zipFilePath}" -C "${releaseDir}" "${stagingDirName}"`, {
    stdio: 'inherit',
  });
} catch (e) {
  console.log('[*] Fallback auf PowerShell Compress-Archive...');
  const psCmd = `Compress-Archive -Path "${stagingDir}" -DestinationPath "${zipFilePath}" -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
}

// 10. SHA256-Prüfsumme generieren
console.log('[+] Berechne SHA256-Pruefsumme...');
const fileBuffer = fs.readFileSync(zipFilePath);
const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const sha256FileName = `${zipFileName}.sha256`;
const sha256FilePath = path.join(releaseDir, sha256FileName);
const sha256Content = `${hash}  ${zipFileName}\n`;
fs.writeFileSync(sha256FilePath, sha256Content, 'utf8');

const stats = fs.statSync(zipFilePath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n=======================================================');
console.log(' Build erfolgreich abgeschlossen!');
console.log(` Release-Paket: ${zipFilePath} (${sizeMb} MB)`);
console.log(` SHA256:        ${hash}`);
console.log(` Pruefsumme in: ${sha256FilePath}`);
console.log('=======================================================\n');
