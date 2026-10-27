import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Determine version (either from CLI argument like v0.1.5 or from package.json)
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

// 2. Verify production build exists (dist/index.html)
const distHtml = path.join(rootDir, 'dist', 'index.html');
if (!fs.existsSync(distHtml)) {
  console.log('[-] dist/index.html not found. Running Vite production build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} else {
  console.log('[+] Vite production build (dist/) verified.');
}

// 3. Verify Electron binary exists in node_modules
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
if (!fs.existsSync(electronDistDir)) {
  console.error(`[-] Error: Electron distributable not found at: ${electronDistDir}`);
  console.error('    Please run "npm ci" or "npm install".');
  process.exit(1);
}

const requiredFiles = [
  'electron.exe',
  'resources.pak',
  'chrome_100_percent.pak',
  'chrome_200_percent.pak',
  'icudtl.dat',
  'v8_context_snapshot.bin',
  'ffmpeg.dll',
  'd3dcompiler_47.dll',
  'libEGL.dll',
  'libGLESv2.dll',
  'vk_swiftshader.dll',
  'vulkan-1.dll',
];

for (const f of requiredFiles) {
  const p = path.join(electronDistDir, f);
  if (!fs.existsSync(p)) {
    console.error(`[-] CRITICAL ERROR: Required file missing in Electron distribution: ${p}`);
    console.error('    Please run "npm install electron".');
    process.exit(1);
  }
}
console.log(`[+] All ${requiredFiles.length} essential Electron files (pak & dlls) verified.`);

// 4. Prepare target directories
const releaseDir = path.join(rootDir, 'release');
const stagingDirName = `Omnitria-${version}-windows-x64`;
const stagingDir = path.join(releaseDir, stagingDirName);

if (fs.existsSync(stagingDir)) {
  console.log(`[*] Cleaning previous staging directory: ${stagingDir}`);
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// 5. Copy Electron runtime files
console.log('[+] Copying Electron runtime files to staging directory...');
fs.cpSync(electronDistDir, stagingDir, { recursive: true });

// Validate files in staging directory
for (const f of requiredFiles) {
  const destName = f === 'electron.exe' ? 'Omnitria.exe' : f;
  const destPath = path.join(stagingDir, f === 'electron.exe' ? f : destName);
  if (!fs.existsSync(destPath)) {
    console.error(`[-] ERROR: Copying ${f} to staging directory failed!`);
    process.exit(1);
  }
}

// 6. Rename electron.exe to Omnitria.exe
const electronExe = path.join(stagingDir, 'electron.exe');
const omnitriaExe = path.join(stagingDir, 'Omnitria.exe');
if (fs.existsSync(electronExe)) {
  fs.renameSync(electronExe, omnitriaExe);
  console.log('[+] Renamed electron.exe to Omnitria.exe successfully.');
} else {
  console.warn('[!] Warning: electron.exe not found.');
}

// Remove default_app.asar so Electron boots cleanly from resources/app
const defaultAppAsar = path.join(stagingDir, 'resources', 'default_app.asar');
if (fs.existsSync(defaultAppAsar)) {
  fs.rmSync(defaultAppAsar, { force: true });
  console.log('[+] Removed default_app.asar (replaced by application bundle).');
}

// 7. Assemble application resources under resources/app
const appDir = path.join(stagingDir, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });

// Copy dist/
console.log('[+] Copying dist/ to resources/app/dist...');
fs.cpSync(path.join(rootDir, 'dist'), path.join(appDir, 'dist'), { recursive: true });

// Copy electron/
console.log('[+] Copying electron/ to resources/app/electron...');
fs.cpSync(path.join(rootDir, 'electron'), path.join(appDir, 'electron'), {
  recursive: true,
  filter: (src) => !src.endsWith('electron.log'),
});

// Copy assets/
console.log('[+] Copying assets/ to resources/app/assets...');
fs.cpSync(path.join(rootDir, 'assets'), path.join(appDir, 'assets'), { recursive: true });

// Copy package.json for metadata and main entrypoint
console.log('[+] Creating package.json for resources/app...');
const appPkg = {
  name: pkg.name || 'omnitria',
  version: version.replace(/^v/, ''),
  description: pkg.description || 'Omnitria - Guild Wars 2 In-Game Overlay',
  main: 'electron/main.cjs',
  author: pkg.author || '',
  license: pkg.license || 'MIT',
};
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');

// 8. Provide launcher scripts in release root
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

// Read and copy README.md
const readmeSrc = path.join(rootDir, 'README.md');
if (fs.existsSync(readmeSrc)) {
  fs.copyFileSync(readmeSrc, path.join(stagingDir, 'README.md'));
}

console.log('[+] Staging directory populated successfully.');

// 9. Create ZIP archive
const zipFileName = `Omnitria-${version}-windows-x64.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);

if (fs.existsSync(zipFilePath)) {
  fs.rmSync(zipFilePath, { force: true });
}

console.log(`[+] Creating ZIP archive: ${zipFileName}...`);
// Use tar.exe for fast, lossless zip packaging on Windows
try {
  execSync(`tar -a -cf "${zipFilePath}" -C "${releaseDir}" "${stagingDirName}"`, {
    stdio: 'inherit',
  });
} catch (e) {
  console.log('[*] Falling back to PowerShell Compress-Archive...');
  const psCmd = `Compress-Archive -Path "${stagingDir}" -DestinationPath "${zipFilePath}" -Force`;
  execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
}

// 10. Generate SHA256 checksum
console.log('[+] Calculating SHA256 checksum...');
const fileBuffer = fs.readFileSync(zipFilePath);
const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const sha256FileName = `${zipFileName}.sha256`;
const sha256FilePath = path.join(releaseDir, sha256FileName);
const sha256Content = `${hash}  ${zipFileName}\n`;
fs.writeFileSync(sha256FilePath, sha256Content, 'utf8');

const stats = fs.statSync(zipFilePath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n=======================================================');
console.log(' Build completed successfully!');
console.log(` Release Package: ${zipFilePath} (${sizeMb} MB)`);
console.log(` SHA256:          ${hash}`);
console.log(` Checksum File:   ${sha256FilePath}`);
console.log('=======================================================\n');
