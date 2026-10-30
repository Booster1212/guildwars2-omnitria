/**
 * Omnitria Update Checker & Version Comparison Service
 * Provides semver comparison, background update checks, and update state.
 */

export interface UpdateCheckResult {
  ok: boolean;
  currentVersion: string;
  latestVersion?: string;
  latestTag?: string;
  hasUpdate: boolean;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  htmlUrl?: string;
  downloadUrl?: string | null;
  assetName?: string | null;
  assetSize?: number;
  isPackaged?: boolean;
  devMode?: boolean;
  error?: string;
}

/**
 * Parses semver string into [major, minor, patch] numeric tuple.
 * Strips leading 'v', metadata, and handles missing segments.
 */
export function parseSemver(v: string | undefined | null): [number, number, number] {
  const clean = (v || '').trim().replace(/^v/, '');
  const parts = clean.split('-')[0].split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return [parts[0], parts[1], parts[2]];
}

/**
 * Compares two semver strings. Returns true if `latest` is strictly newer than `current`.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const [cMaj, cMin, cPat] = parseSemver(current);
  const [lMaj, lMin, lPat] = parseSemver(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

/**
 * Executes an update check via Electron IPC or GitHub Releases API fallback.
 */
export async function checkForAppUpdate(fallbackVersion = '0.2.7'): Promise<UpdateCheckResult> {
  const api = (window as unknown as {
    electronAPI?: {
      getAppVersion?: () => Promise<string>;
      checkUpdate?: () => Promise<UpdateCheckResult>;
    };
  })?.electronAPI;

  let currentVersion = fallbackVersion;
  if (api?.getAppVersion) {
    try {
      const v = await api.getAppVersion();
      if (v) currentVersion = v;
    } catch {
      /* ignore */
    }
  }

  // 1. Prefer native Electron IPC handler (handles proxy, headers, and packaged asset detection)
  if (api?.checkUpdate) {
    try {
      const res = await api.checkUpdate();
      return res;
    } catch (err: any) {
      console.warn('[Updater] Electron IPC checkUpdate failed, falling back to fetch:', err);
    }
  }

  // 2. Direct browser/web fetch fallback
  try {
    const res = await fetch('https://api.github.com/repos/Booster1212/guildwars2-omnitria/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        currentVersion,
        hasUpdate: false,
        error: `GitHub API error (${res.status} ${res.statusText})`,
      };
    }

    const rel = await res.json();
    const latestTag = rel.tag_name || '';
    const latestVer = latestTag.replace(/^v/, '');
    const hasUpdate = isNewerVersion(currentVersion, latestVer);
    const assets = Array.isArray(rel.assets) ? rel.assets : [];
    const zipAsset =
      assets.find((a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.zip') && a.name.toLowerCase().includes('windows')) ||
      assets.find((a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.zip'));

    return {
      ok: true,
      currentVersion,
      latestVersion: latestVer,
      latestTag,
      hasUpdate,
      releaseName: rel.name || rel.tag_name,
      releaseNotes: rel.body,
      publishedAt: rel.published_at,
      htmlUrl: rel.html_url,
      downloadUrl: zipAsset ? zipAsset.browser_download_url : rel.html_url,
      assetName: zipAsset ? zipAsset.name : null,
      assetSize: zipAsset ? zipAsset.size : 0,
      isPackaged: false,
    };
  } catch (err: any) {
    return {
      ok: false,
      currentVersion,
      hasUpdate: false,
      error: err?.message || 'Network error checking for updates',
    };
  }
}
