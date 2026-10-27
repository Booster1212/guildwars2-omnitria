/** External links: in Electron via secured IPC channel (host allowlist in main process), otherwise new window. */
export function openExternal(url: string): void {
  const api = (window as unknown as { electronAPI?: { openExternal?: (u: string) => void } }).electronAPI;
  if (api?.openExternal) api.openExternal(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

export const wikiSearchUrl = (name: string): string =>
  `https://wiki-de.guildwars2.com/index.php?search=${encodeURIComponent(name)}`;
