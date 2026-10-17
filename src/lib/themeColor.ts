/**
 * The browser's own bar takes the page's background.
 *
 * `index.html` carried one `theme-color`, the interactive cobalt, so on a phone
 * the address bar and status bar stayed bright blue above a dark page, and
 * above the classic look's warm white (settings council, 17 October 2026). The
 * page's background is whatever the theme and the look resolve it to, so it is
 * read back from the stylesheet after either changes rather than listed here.
 */
export function syncThemeColor(): void {
  if (typeof document === 'undefined') return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
  if (!bg) return; // stylesheet not applied yet
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = bg;
}
