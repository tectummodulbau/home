/**
 * Schmaler Zugriff auf den Meta-Pixel (`fbq`) — das Gegenstück zu gtag.ts.
 *
 * Vorher fehlte dieses Modul: registry.ts hat lediglich `fbevents.js`
 * eingebunden, ohne den `fbq`-Stub anzulegen und ohne `init`/`PageView` zu
 * senden. So aktiviert hätte der Pixel nichts gemessen. Diese Datei holt das
 * nach und bündelt alles, was der Pixel an globalem Zustand anfasst, an einer
 * Stelle — inklusive Aufräumen beim Widerruf.
 *
 * Arbeitsteilung, damit vor der Zustimmung nichts passiert:
 *   bootMetaPixel()  — legt Stub an, lädt das Skript, initialisiert. Wird
 *                      AUSSCHLIESSLICH von der Consent-Registry nach erteilter
 *                      Marketing-Zustimmung aufgerufen.
 *   trackMetaEvent() — sendet nur, wenn `window.fbq` bereits existiert. Legt
 *                      selbst nie einen Stub an. Der Tracker kann also
 *                      bedenkenlos aufrufen: ohne gebooteten Pixel ist es ein
 *                      No-Op, es entsteht keine Warteschlange, die später
 *                      unbemerkt abfließt.
 */

import { deleteCookiesByPrefix } from './gtag';

const SCRIPT_ID = 'tectum-meta-pixel-script';
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
}

interface MetaWindow extends Window {
  fbq?: FbqFunction;
  _fbq?: FbqFunction;
}

function win(): MetaWindow | null {
  return typeof window === 'undefined' ? null : (window as MetaWindow);
}

/**
 * Legt den offiziellen `fbq`-Stub an. Bis `fbevents.js` geladen ist, sammelt
 * er Aufrufe in `queue` und spielt sie danach ab — deshalb darf er erst nach
 * der Zustimmung entstehen.
 */
function ensureFbq(w: MetaWindow): FbqFunction {
  if (w.fbq) return w.fbq;

  const fbq: FbqFunction = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
    else fbq.queue?.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  w.fbq = fbq;
  w._fbq = w._fbq ?? fbq;
  return fbq;
}

/**
 * Bootet den Pixel: Stub, Skript, Initialisierung, PageView.
 *
 * `autoConfig: false` wird VOR `init` gesetzt und ist der wichtigste Teil.
 * Ohne diese Zeile sammelt Meta automatisch Button-Beschriftungen und
 * Formularfeld-Inhalte ein („Automatischer erweiterter Abgleich") — genau die
 * Kontaktdaten, die nach der Projektlinie niemals an einen Messdienst gehen
 * dürfen. Das lässt sich nicht nachträglich reparieren, sondern nur vorher
 * verhindern.
 *
 * Gibt zurück, ob der Pixel in diesem Aufruf neu gebootet wurde.
 */
export function bootMetaPixel(pixelId: string): boolean {
  const w = win();
  if (!w || typeof document === 'undefined') return false;
  if (document.getElementById(SCRIPT_ID)) return false;

  const fbq = ensureFbq(w);

  fbq('set', 'autoConfig', false, pixelId);
  fbq('init', pixelId);

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  document.head.appendChild(script);

  fbq('track', 'PageView');
  return true;
}

/**
 * Sendet ein Meta-Standardereignis, sofern der Pixel läuft. Bewusst ohne
 * Parameter: Metas Parameter-Semantik (`content_name`, `value`, `currency`)
 * deckt sich nicht mit den GA4-Parametern dieses Projekts. Sie unverändert
 * weiterzureichen hieße, Daten zu senden, die für Meta nie vorgesehen waren.
 */
export function trackMetaEvent(standardEvent: string): boolean {
  const w = win();
  if (!w?.fbq) return false;
  w.fbq('track', standardEvent);
  return true;
}

/** Entfernt Skript, globale Objekte und Cookies des Pixels. */
export function removeMetaPixel(): void {
  const w = win();
  if (typeof document !== 'undefined') document.getElementById(SCRIPT_ID)?.remove();
  if (w) {
    delete w.fbq;
    delete w._fbq;
  }
  deleteCookiesByPrefix(['_fbp', '_fbc']);
}
