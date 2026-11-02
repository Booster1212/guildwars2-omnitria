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
