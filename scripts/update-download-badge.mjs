import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const REPO_OWNER = 'Booster1212';
const REPO_NAME = 'guildwars2-omnitria';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;

async function updateDownloadBadge() {
  const headers = {
    'User-Agent': 'Omnitria-Badge-Updater',
    Accept: 'application/vnd.github.v3+json',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  console.log(`[+] Fetching releases from ${API_URL}...`);
  const res = await fetch(API_URL, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch releases: ${res.status} ${res.statusText}`);
  }

  const releases = await res.json();
  let totalRaw = 0;
  let totalZipRaw = 0;
  let realDownloads = 0;

  for (const rel of releases) {
    if (!rel.assets || !Array.isArray(rel.assets)) continue;

    for (const asset of rel.assets) {
      const count = asset.download_count || 0;
      totalRaw += count;

      // Ignore checksum and signature assets (.sha256, .sig, etc.)
      if (asset.name.endsWith('.sha256') || asset.name.endsWith('.sig') || asset.name.endsWith('.md5')) {
        continue;
      }

      // Count only standalone installer/executable archives
      if (asset.name.endsWith('.zip') || asset.name.endsWith('.exe')) {
        totalZipRaw += count;
        // Exclude the 1 initial automated malware/integrity scan performed by GitHub on release upload
        const userDownloads = Math.max(0, count - 1);
        realDownloads += userDownloads;
      }
    }
  }

  console.log(`[+] Download analysis:`);
  console.log(`    - Total raw downloads across all assets: ${totalRaw}`);
  console.log(`    - Total raw ZIP downloads: ${totalZipRaw}`);
  console.log(`    - Verified real user downloads (excluding scanner & sha256): ${realDownloads}`);

  const badgeDir = path.join(rootDir, '.github', 'badges');
  if (!fs.existsSync(badgeDir)) {
    fs.mkdirSync(badgeDir, { recursive: true });
  }

  const badgeData = {
    schemaVersion: 1,
    label: 'Downloads',
    message: String(realDownloads),
    color: '8b5cf6',
  };

  const badgePath = path.join(badgeDir, 'downloads.json');
  fs.writeFileSync(badgePath, JSON.stringify(badgeData, null, 2) + '\n', 'utf8');
  console.log(`[+] Badge JSON saved successfully to: ${badgePath}`);
}

updateDownloadBadge().catch((err) => {
  console.error('[-] Error updating download badge:', err);
  process.exit(1);
});
