/**
 * Schmaler Zugriff auf dataLayer und gtag.
 *
 * Der eigentliche Bootstrap (`window.dataLayer`, `window.gtag`) passiert im
 * Inline-Skript des <head> (siehe components/analytics/ConsentModeDefaults.astro),
 * damit der Consent-Default garantiert vor jedem Tag-Skript steht. Dieses
 * Modul greift nur darauf zu und legt die Strukturen defensiv an, falls es —
 * etwa in einem Test — ohne das Inline-Skript geladen wird.
 *
 * Wichtig: `gtag()` schreibt ausschließlich in ein lokales Array. Solange
 * kein Google-Skript geladen ist, verlässt dadurch kein einziges Byte den
 * Browser.
 */

interface GtagWindow extends Window {
  dataLayer?: IArguments[] | unknown[];
  gtag?: (...args: unknown[]) => void;
}

function win(): GtagWindow | null {
  return typeof window === 'undefined' ? null : (window as GtagWindow);
}

/** Legt dataLayer und gtag an, falls noch nicht vorhanden. Idempotent. */
export function ensureGtag(): ((...args: unknown[]) => void) | null {
  const w = win();
  if (!w) return null;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== 'function') {
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      (w.dataLayer as unknown[]).push(arguments);
    };
  }
  return w.gtag;
}

/** Ruft gtag auf. Ohne Browser-Kontext ein No-Op. */
export function gtag(...args: unknown[]): void {
  const fn = ensureGtag();
  fn?.(...args);
}

/**
 * Lädt ein Skript einmalig. Gibt `false` zurück, wenn es bereits vorhanden
 * war — so lassen sich doppelte `config`-Aufrufe vermeiden.
 */
export function injectScriptOnce(id: string, src: string): boolean {
  if (typeof document === 'undefined' || document.getElementById(id)) return false;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
  return true;
}

export function removeScript(id: string): void {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.remove();
}

/**
 * Löscht first-party Cookies, deren Name mit einem der Präfixe beginnt.
 * Wird beim Widerruf einer Kategorie aufgerufen. Cookies auf Subdomain-Ebene
 * werden mitgenommen, indem zusätzlich mit `domain=.<host>` gelöscht wird.
 */
export function deleteCookiesByPrefix(prefixes: string[]): void {
  if (typeof document === 'undefined') return;
  const host = location.hostname;
  const domains = [undefined, host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim();
    if (!name || !prefixes.some((p) => name.startsWith(p))) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${
        domain ? `; domain=${domain}` : ''
      }`;
    }
  }
}
