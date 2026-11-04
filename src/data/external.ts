/** External links: in Electron via secured IPC channel (host allowlist in main process), otherwise new window. */
export function openExternal(url: string): void {
  const api = (window as unknown as { electronAPI?: { openExternal?: (u: string) => void } }).electronAPI;
  if (api?.openExternal) api.openExternal(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Builds a search query URL to the official Guild Wars 2 Wiki.
 * Respects user language: German queries go to wiki-de.guildwars2.com,
 * English queries go to wiki.guildwars2.com.
 */
export const wikiSearchUrl = (query: string, lang: 'de' | 'en' = 'en'): string => {
  const base = lang === 'de' ? 'https://wiki-de.guildwars2.com' : 'https://wiki.guildwars2.com';
  return `${base}/index.php?search=${encodeURIComponent(query)}`;
};

/**
 * Builds a direct article URL to an official Guild Wars 2 Wiki page.
 */
export const wikiArticleUrl = (articleTitle: string, lang: 'de' | 'en' = 'en'): string => {
  const base = lang === 'de' ? 'https://wiki-de.guildwars2.com/wiki' : 'https://wiki.guildwars2.com/wiki';
  return `${base}/${encodeURIComponent(articleTitle.replace(/ /g, '_'))}`;
};

/**
 * Generates an authentic Guild Wars 2 in-game chat link ([&...]) for an item.
 * Specification: 0x02 header, count byte, 3-byte little-endian item ID, 0x00 terminator, base64-encoded.
 */
export function encodeItemChatCode(itemId: number, count = 1): string {
  if (!itemId || itemId <= 0) return '';
  const bytes = new Uint8Array([
    0x02,
    Math.min(255, Math.max(1, count)),
    itemId & 0xff,
    (itemId >> 8) & 0xff,
    (itemId >> 16) & 0xff,
    0x00,
  ]);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `[&${btoa(binary)}]`;
}
