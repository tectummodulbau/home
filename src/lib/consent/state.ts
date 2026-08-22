/**
 * Consent-Zustand — gemeinsame Quelle für Speicherung, Gültigkeitsprüfung und
 * Benachrichtigung.
 *
 * Vorher lag diese Logik ausschließlich in manager.ts. Sie wurde hierher
 * gezogen, weil ab sofort ein zweiter Konsument existiert: das Analytics-
 * Modul (src/lib/analytics/) muss wissen, ob eine Statistik-Zustimmung
 * vorliegt, ohne die Banner-/Dialog-Logik zu kennen oder das Speicherformat
 * ein zweites Mal zu implementieren.
 *
 * manager.ts bleibt allein für die Oberfläche und das Laden der Dienste
 * zuständig und importiert von hier.
 */

import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  type ConsentCategory,
} from './registry';

/**
 * Die drei optionalen Kategorien werden im Dialog immer angeboten, unabhängig
 * davon, ob aktuell ein Dienst dieser Kategorie aktiv ist. So kann der Nutzer
 * eine vollwertige Einwilligung dokumentiert abgeben — auch bevor konkrete
 * Drittanbieter freigeschaltet werden.
 */
export const OPTIONAL_CATEGORIES: ConsentCategory[] = ['analytics', 'marketing', 'externalMedia'];

/**
 * Wird auf `document` ausgelöst, sobald eine Entscheidung angewendet wird —
 * beim Seitenaufbau mit gültiger gespeicherter Entscheidung ebenso wie bei
 * jeder nachträglichen Änderung über Banner oder Datenschutz-Einstellungen.
 *
 * Der Name ist bewusst auch im Inline-Skript des <head> hartkodiert
 * (ConsentModeDefaults.astro liest ihn über diese Konstante ein) — es gibt
 * keine zweite Definition.
 */
export const CONSENT_EVENT = 'tectum:consent-change';

export interface ConsentChangeDetail {
  /** Kategorien, denen aktuell zugestimmt ist. `necessary` ist nie enthalten. */
  categories: ConsentCategory[];
}

export interface StoredConsent {
  version: number;
  timestamp: number;
  expiresAt: number;
  /** Kategorien, denen zugestimmt wurde. */
  categories: ConsentCategory[];
  /** Alle optionalen Kategorien, die zum Entscheidungszeitpunkt zur Wahl standen. */
  decidedCategories: ConsentCategory[];
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
}

export function readConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (
      typeof parsed.version !== 'number' ||
      typeof parsed.timestamp !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.decidedCategories)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null; // beschädigter Wert — wie "keine Entscheidung" behandeln
  }
}

export function writeConsent(categories: ConsentCategory[]) {
  const decidedCategories = OPTIONAL_CATEGORIES;
  const now = Date.now();
  const consent: StoredConsent = {
    version: CONSENT_VERSION,
    timestamp: now,
    expiresAt: now + CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    categories,
    decidedCategories,
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Privater Modus / voller Storage: Entscheidung gilt für diese Sitzung,
    // beim nächsten Aufruf wird erneut gefragt. Kein harter Fehler.
  }
}

export function isConsentValid(consent: StoredConsent | null): consent is StoredConsent {
  if (!consent) return false;
  if (consent.version !== CONSENT_VERSION) return false;
  if (consent.expiresAt < Date.now()) return false;
  if (!sameMembers(consent.decidedCategories, OPTIONAL_CATEGORIES)) return false;
  return true;
}

/**
 * Kategorien mit gültiger Zustimmung. Leeres Array bedeutet "keine
 * Entscheidung getroffen" ebenso wie "alles abgelehnt" — für die
 * Tracking-Sperre ist beides gleichbedeutend.
 */
export function getGrantedCategories(): ConsentCategory[] {
  const consent = readConsent();
  return isConsentValid(consent) ? consent.categories : [];
}

export function hasConsent(category: ConsentCategory): boolean {
  return getGrantedCategories().includes(category);
}

/** Benachrichtigt alle Konsumenten synchron über die aktuelle Auswahl. */
export function notifyConsentChange(categories: ConsentCategory[]) {
  document.dispatchEvent(
    new CustomEvent<ConsentChangeDetail>(CONSENT_EVENT, {
      detail: { categories: [...categories] },
    })
  );
}
