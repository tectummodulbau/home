/**
 * Zentrale Tracking-Hilfsfunktion — die EINZIGE Stelle im Projekt, die
 * Events an einen Messdienst übergibt.
 *
 * Komponenten rufen ausschließlich `track()` / `trackOnce()` auf und wissen
 * nichts über gtag, dataLayer, Consent, Google Ads oder Meta. Wer einen
 * weiteren Messdienst anbinden will, ändert nur `dispatch()` in dieser Datei.
 *
 * Sperre: Solange keine Zustimmung zur Kategorie „Statistik" vorliegt, wird
 * JEDES Event verworfen — es wird nicht zwischengespeichert und auch nicht
 * nachträglich nachgesendet. Ereignisse, die vor der Zustimmung passieren,
 * sind bewusst verloren; das ist der Preis dafür, dass vor der Entscheidung
 * nichts erhoben wird.
 *
 * Einmal-pro-Sitzung-Marker werden erst gesetzt, wenn ein Event tatsächlich
 * gesendet wurde. Ein während der Sperre unterdrücktes `section_view` kann
 * nach erteilter Zustimmung also noch einmal ausgelöst werden.
 */

import { CONSENT_EVENT, getGrantedCategories, type ConsentChangeDetail } from '../consent/state';
import {
  GOOGLE_ADS_ID,
  GOOGLE_ADS_LEAD_LABEL,
  HAS_ANALYTICS_DESTINATION,
  MAX_PARAM_LENGTH,
  META_PIXEL_ID,
} from './config';
import { gtag } from './gtag';
import { META_EVENT_MAP } from './manifest';
import { trackMetaEvent } from './meta';

export type EventParams = Record<string, string | number | boolean | undefined>;

const ONCE_STORAGE_PREFIX = 'tectum_evt_';

let analyticsGranted = false;
let marketingGranted = false;

/** Rückfallebene, wenn sessionStorage nicht verfügbar ist (privater Modus). */
const memoryOnceKeys = new Set<string>();

const isBrowser = typeof window !== 'undefined';
const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

function syncConsent(categories: string[]) {
  analyticsGranted = categories.includes('analytics');
  marketingGranted = categories.includes('marketing');
}

if (isBrowser) {
  syncConsent(getGrantedCategories());
  document.addEventListener(CONSENT_EVENT, (event) => {
    const detail = (event as CustomEvent<ConsentChangeDetail>).detail;
    syncConsent(detail?.categories ?? []);
  });
}

export function isAnalyticsGranted(): boolean {
  return analyticsGranted;
}

/**
 * Kürzt Strings auf das GA4-Limit und entfernt leere Parameter. Zahlen werden
 * auf ganze Werte gerundet, damit im Report keine Fließkomma-Kardinalität
 * entsteht.
 */
function normalizeParams(params: EventParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'string') {
      const trimmed = value.trim().replace(/\s+/g, ' ');
      if (!trimmed) continue;
      out[key] = trimmed.length > MAX_PARAM_LENGTH ? `${trimmed.slice(0, MAX_PARAM_LENGTH - 1)}…` : trimmed;
    } else if (typeof value === 'number') {
      out[key] = Number.isFinite(value) ? Math.round(value) : 0;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Reicht ein Event an den Meta-Pixel weiter, sofern es dort ein passendes
 * Standardereignis gibt (Zuordnung in manifest.ts).
 *
 * Drei Bedingungen, alle notwendig:
 *   - Marketing-Zustimmung liegt vor (Statistik allein reicht nicht),
 *   - eine Pixel-ID ist konfiguriert,
 *   - der Pixel läuft tatsächlich — `trackMetaEvent` prüft auf `window.fbq`
 *     und legt selbst nie einen Stub an. Ist der Pixel in der Registry
 *     abgeschaltet, ist der Aufruf ein No-Op; es entsteht keine
 *     Warteschlange, die später unbemerkt abfließen könnte.
 *
 * Bewusst ohne Parameter: Metas Parameter-Semantik deckt sich nicht mit den
 * GA4-Parametern dieses Projekts. Sie unverändert weiterzureichen hieße,
 * Daten zu senden, die für Meta nie vorgesehen waren.
 */
function forwardToMeta(name: string) {
  if (!marketingGranted || !META_PIXEL_ID) return;
  const standardEvent = META_EVENT_MAP[name];
  if (!standardEvent) return;
  trackMetaEvent(standardEvent);
}

/** Einzige Stelle, an der ein Event tatsächlich abgesetzt wird. */
function dispatch(name: string, params: Record<string, string | number | boolean>) {
  gtag('event', name, params);
  forwardToMeta(name);

  if (isDev) {
    const suffix = HAS_ANALYTICS_DESTINATION ? '' : ' (kein Ziel konfiguriert — nur dataLayer)';
    console.info(`[tectum-analytics] ${name}${suffix}`, params);
  }
}

/**
 * Sendet ein Event, sofern eine Statistik-Zustimmung vorliegt.
 * Gibt zurück, ob tatsächlich gesendet wurde.
 */
export function track(name: string, params: EventParams = {}): boolean {
  if (!isBrowser || !analyticsGranted) return false;
  dispatch(name, normalizeParams(params));
  return true;
}

function onceKey(key: string): string {
  return `${ONCE_STORAGE_PREFIX}${key}`;
}

function wasSent(key: string): boolean {
  if (memoryOnceKeys.has(key)) return true;
  try {
    return sessionStorage.getItem(onceKey(key)) !== null;
  } catch {
    return false;
  }
}

function markSent(key: string) {
  memoryOnceKeys.add(key);
  try {
    sessionStorage.setItem(onceKey(key), '1');
  } catch {
    // sessionStorage nicht verfügbar — der In-Memory-Marker greift für diesen
    // Seitenaufruf, nach einem Reload kann das Event erneut ausgelöst werden.
  }
}

/**
 * Sendet ein Event höchstens einmal pro Browser-Sitzung. Der Marker wird nur
 * gesetzt, wenn das Event die Consent-Sperre passiert hat.
 */
export function trackOnce(key: string, name: string, params: EventParams = {}): boolean {
  if (!isBrowser || !analyticsGranted || wasSent(key)) return false;
  const sent = track(name, params);
  if (sent) markSent(key);
  return sent;
}

/**
 * Erzeugt eine Funktion, die das Event erst nach `delayMs` ohne weiteren
 * Aufruf absetzt. Wird für `calculator_configured` genutzt (2 Sekunden
 * Inaktivität), damit nicht jede Slider-Bewegung ein Event erzeugt.
 */
export function createDebouncedTracker(name: string, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (paramsFactory: () => EventParams) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      track(name, paramsFactory());
    }, delayMs);
  };
}

/**
 * Bestätigter Lead. Feuert `generate_lead` und — falls Google Ads konfiguriert
 * UND Marketing zugestimmt ist — zusätzlich die Ads-Conversion.
 *
 * Das Meta-Standardereignis `Lead` kommt hier NICHT vor: es hängt an der
 * Zuordnung in manifest.ts und wird bereits von `dispatch()` gesendet. Ein
 * zweiter Aufruf an dieser Stelle würde den Lead bei Meta doppelt zählen.
 *
 * Wird ausschließlich nach bestätigtem Erfolg des Endpunkts aufgerufen,
 * niemals beim Klick auf „Absenden".
 */
export function trackLead(params: EventParams): void {
  const sent = track('generate_lead', params);
  if (!sent) return;

  if (marketingGranted && GOOGLE_ADS_ID && GOOGLE_ADS_LEAD_LABEL) {
    gtag('event', 'conversion', { send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}` });
  }
}
