/**
 * Zentrale Consent-Service-Registry.
 *
 * Jeder Dienst, der Cookies setzt, Storage nutzt oder eine Verbindung zu
 * einem Drittanbieter aufbaut, wird hier als ein Eintrag gepflegt — Banner,
 * Einstellungsdialog und Lade-/Aufräumlogik lesen ausschließlich aus dieser
 * Datei. Es gibt keine zweite Stelle im Code, an der Drittanbieter-Skripte
 * verdrahtet werden.
 *
 * Aktivierung eines künftigen Dienstes: `enabled: true` setzen UND die in
 * `requiredEnv` genannte Umgebungsvariable in Cloudflare Pages konfigurieren.
 * Ohne gültige ID lädt der Dienst auch bei `enabled: true` nicht (siehe
 * `load()`). Nach jeder Aktivierung: CONSENT_VERSION erhöhen und die
 * Datenschutzerklärung ergänzen — die fertigen Textbausteine dafür liegen in
 * docs/datenschutz-bausteine.md.
 *
 * Ausnahme beim `enabled`-Flag: Für die vier Messkanäle (GA4, Google Ads,
 * Meta-Pixel, GTM) steht es in src/lib/analytics/manifest.ts. Grund war die
 * früheren Analyseübersicht im Admin-Bereich — sie lief als Pages Function im
 * Worker und kann diese Datei nicht importieren, weil hier `window`,
 * `document` und `location` vorkommen. Das Flag an zwei Stellen zu pflegen
 * wäre die schlechtere Antwort gewesen; load()/cleanup() bleiben hier.
 */

import {
  GA4_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  META_PIXEL_ID,
  isAnalyticsHost,
  isDebugRequested,
} from '../analytics/config';
import { deleteCookiesByPrefix, ensureGtag, gtag, injectScriptOnce, removeScript } from '../analytics/gtag';
import { CATEGORY_LABELS, CHANNEL_ENABLED } from '../analytics/manifest';
import { bootMetaPixel, removeMetaPixel } from '../analytics/meta';
import { MOCK_SERVICE } from './mock-service';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'externalMedia';

// Definition liegt in manifest.ts, damit die Analyseübersicht im Admin-Bereich
// dieselben Bezeichnungen anzeigt. Re-Export, damit die Komponenten weiterhin
// aus der Registry importieren können.
export { CATEGORY_LABELS };

export interface ConsentService {
  /** Eindeutige, stabile ID — wird im Storage referenziert, nie umbenennen. */
  id: string;
  name: string;
  provider: string;
  category: ConsentCategory;
  purpose: string;
  /** Muss standardmäßig false sein für alle nicht produktiv genutzten Dienste. */
  enabled: boolean;
  /** Namen der Cloudflare-Umgebungsvariablen, die für den Betrieb nötig sind. */
  requiredEnv: string[];
  privacyNotice: string;
  thirdCountryNotice?: string;
  storageInfo: string;
  /** Version, ab der dieser Dienst in der Registry erscheint (für Re-Consent-Prüfung). */
  consentVersion: number;
  /** Lädt den Dienst client-seitig. Wird nur nach erteilter Zustimmung aufgerufen. */
  load: () => void;
  /** Entfernt Skript, globale Objekte und first-party Storage-Einträge des Dienstes. */
  cleanup: () => void;
}

/**
 * Wird bei jeder inhaltlichen Änderung der Registry erhöht (neuer Dienst,
 * geänderte Kategorie, geänderter Zweck). Eine höhere Version als im
 * gespeicherten Consent löst automatisch eine erneute Abfrage aus.
 */
export const CONSENT_VERSION = 2;

export const CONSENT_STORAGE_KEY = 'tectum_privacy_consent';

/** Gültigkeitsdauer einer gespeicherten Entscheidung. Wert final juristisch prüfen. */
export const CONSENT_MAX_AGE_DAYS = 365;

export const SERVICES: ConsentService[] = [
  {
    id: 'hosting-security',
    name: 'Hosting & Sicherheit',
    provider: 'Cloudflare, Inc.',
    category: 'necessary',
    purpose:
      'Ausliefern der Website, Schutz vor Missbrauch (z. B. DDoS- und Bot-Abwehr) und Sicherstellung des technischen Betriebs.',
    enabled: true,
    requiredEnv: [],
    privacyNotice:
      'Details zur Verarbeitung durch den Hosting-Anbieter Cloudflare finden Sie in unserer Datenschutzerklärung.',
    // Offener Punkt: Welche Cookies Cloudflare im konkreten Zonen-Setup setzt,
    // hängt von den aktivierten Sicherheitsfunktionen ab (z. B. `__cf_bm` bei
    // Bot-Abwehr, `cf_clearance` bei Managed Challenge) und lässt sich nicht
    // aus dem Repository ableiten. Im Cloudflare-Dashboard prüfen und hier
    // konkret benennen — siehe docs/datenschutz-bausteine.md, offene Punkte.
    storageInfo:
      'Kann technisch notwendige Cookies zur Angriffsabwehr setzen (z. B. __cf_bm, Laufzeit 30 Minuten). Diese dienen ausschließlich der Sicherheit und nicht der Wiedererkennung zu Werbezwecken.',
    consentVersion: 1,
    load: () => {},
    cleanup: () => {},
  },
  {
    id: 'cloudflare-web-analytics',
    name: 'Cloudflare Web Analytics',
    provider: 'Cloudflare, Inc.',
    category: 'necessary',
    purpose:
      'Cookiefreie Reichweitenmessung (Seitenaufrufe, Herkunftsland, Gerätetyp). Erhebt keine seitenübergreifenden Kennungen und bildet keine Nutzerprofile.',
    // Das Skript wird NICHT von dieser Registry geladen, sondern von der
    // Plattform selbst eingefügt (Cloudflare Dashboard → Web Analytics für das
    // Pages-Projekt aktivieren). Der Eintrag steht hier ausschließlich zur
    // Transparenz im Einstellungsdialog. load()/cleanup() sind daher leer.
    enabled: true,
    requiredEnv: [],
    privacyNotice:
      'Läuft ohne Cookies und ohne Einwilligung auf Grundlage des berechtigten Interesses an einer datensparsamen Reichweitenmessung (Art. 6 Abs. 1 lit. f DSGVO).',
    storageInfo: 'Setzt keine Cookies und keine Einträge im lokalen Speicher.',
    consentVersion: 2,
    load: () => {},
    cleanup: () => {},
  },
  {
    id: 'google-analytics-4',
    name: 'Google Analytics 4',
    provider: 'Google Ireland Limited',
    category: 'analytics',
    purpose:
      'Statistische Auswertung der Websitenutzung: Reichweite, Herkunft der Besucher, Nutzung der Seitenabschnitte sowie Verlauf und Abschluss des Anfrageformulars.',
    enabled: CHANNEL_ENABLED['google-analytics-4'],
    requiredEnv: ['PUBLIC_GA4_MEASUREMENT_ID'],
    privacyNotice:
      'Wird ausschließlich nach Ihrer Zustimmung zur Kategorie „Statistik" geladen. Vorher wird kein Skript von Google angefordert.',
    thirdCountryNotice:
      'Google verarbeitet Daten auch in den USA. Die Übermittlung erfolgt auf Grundlage Ihrer Einwilligung (Art. 49 Abs. 1 lit. a DSGVO) sowie der EU-Standardvertragsklauseln.',
    storageInfo:
      'Setzt die Cookies _ga und _ga_<Property-ID> zur Unterscheidung von Sitzungen und wiederkehrenden Besuchern. Laufzeit bis zu 2 Jahre. Beim Widerruf werden sie gelöscht.',
    consentVersion: 2,
    load: () => {
      if (!GA4_MEASUREMENT_ID) return; // ohne echte ID kein Laden
      // Vorschau-Deployments (*.pages.dev) und lokale Builds messen nicht mit,
      // sonst landen Testklicks in derselben GA4-Property.
      if (!isAnalyticsHost()) return;
      ensureGtag();
      // `injectScriptOnce` meldet false, wenn der Tag bereits läuft — dann darf
      // `config` nicht erneut gesendet werden, sonst zählt der Seitenaufruf doppelt.
      const isFirstLoad = injectScriptOnce(
        'tectum-ga4-script',
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`
      );
      if (!isFirstLoad) return;
      gtag('js', new Date());
      gtag('config', GA4_MEASUREMENT_ID, {
        // Erlaubt GA4, die Sitzung auch ohne Cookie über die URL fortzuschreiben,
        // wenn die Marketing-Zustimmung fehlt (Teil von Consent Mode v2).
        url_passthrough: true,
        // Unterdrückt Werbe-Identifikatoren, solange ad_storage `denied` ist.
        ads_data_redaction: true,
        ...(isDebugRequested() ? { debug_mode: true } : {}),
      });
    },
    cleanup: () => {
      removeScript('tectum-ga4-script');
      deleteCookiesByPrefix(['_ga']);
    },
  },
  {
    id: 'google-tag-manager',
    name: 'Google Tag Manager',
    provider: 'Google Ireland Limited',
    category: 'analytics',
    purpose:
      'Container zur Verwaltung nachgelagerter Marketing- und Statistik-Skripte. Lädt selbst keine Inhalte, sondern nur nach Zustimmung freigeschaltete Tags.',
    // Bewusst deaktiviert: Die Messung läuft direkt über gtag.js (siehe
    // google-analytics-4). Der Eintrag bleibt erhalten, falls die Tag-Pflege
    // später an nicht-technische Kollegen übergeben werden soll.
    enabled: CHANNEL_ENABLED['google-tag-manager'],
    requiredEnv: ['PUBLIC_GTM_ID'],
    privacyNotice:
      'Nicht im Einsatz. Vor einer Aktivierung muss die Datenschutzerklärung um Google Tag Manager ergänzt werden.',
    thirdCountryNotice:
      'Google verarbeitet Daten auch in den USA. Rechtsgrundlage und Garantien vor Aktivierung juristisch prüfen.',
    storageInfo: 'Setzt selbst keine Cookies, lädt aber Skripte, die das tun können.',
    consentVersion: 1,
    load: () => {
      const gtmId = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.PUBLIC_GTM_ID;
      if (!gtmId) return;
      ensureGtag();
      (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
        'gtm.start': Date.now(),
        event: 'gtm.js',
      });
      injectScriptOnce(
        'tectum-gtm-script',
        `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
      );
    },
    cleanup: () => {
      removeScript('tectum-gtm-script');
    },
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    provider: 'Google Ireland Limited',
    category: 'marketing',
    purpose: 'Erfolgsmessung von Werbekampagnen (Conversion-Tracking) und Remarketing.',
    // Vorbereitet, nicht aktiv. Aktivierung: enabled im Manifest auf true
    // setzen und PUBLIC_GOOGLE_ADS_ID sowie PUBLIC_GOOGLE_ADS_LEAD_LABEL in
    // Cloudflare Pages hinterlegen. Die Conversion selbst feuert der Tracker
    // beim bestätigten generate_lead (src/lib/analytics/tracker.ts → trackLead).
    enabled: CHANNEL_ENABLED['google-ads'],
    requiredEnv: ['PUBLIC_GOOGLE_ADS_ID', 'PUBLIC_GOOGLE_ADS_LEAD_LABEL'],
    privacyNotice:
      'Nicht im Einsatz. Vor einer Aktivierung muss die Datenschutzerklärung um Google Ads ergänzt und CONSENT_VERSION erhöht werden.',
    thirdCountryNotice:
      'Google verarbeitet Daten auch in den USA. Rechtsgrundlage und Garantien vor Aktivierung juristisch prüfen.',
    storageInfo:
      'Setzt Cookies zur Zuordnung von Conversions und Remarketing-Listen (u. a. _gcl_*). Details bei Aktivierung konkretisieren.',
    consentVersion: 1,
    load: () => {
      if (!GOOGLE_ADS_ID) return;
      // Dieselbe Host-Sperre wie bei GA4. Ohne sie würde jedes
      // Vorschau-Deployment (*.pages.dev) echte Conversions in das
      // Werbekonto schreiben und die Gebotsoptimierung verfälschen —
      // ein Fehler, den man erst an den Kampagnenkosten bemerkt.
      if (!isAnalyticsHost()) return;
      ensureGtag();
      const isFirstLoad = injectScriptOnce(
        'tectum-google-ads-script',
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ADS_ID)}`
      );
      if (!isFirstLoad) return;
      gtag('js', new Date());
      gtag('config', GOOGLE_ADS_ID);
    },
    cleanup: () => {
      removeScript('tectum-google-ads-script');
      deleteCookiesByPrefix(['_gcl']);
    },
  },
  {
    id: 'meta-pixel',
    name: 'Meta-Pixel',
    provider: 'Meta Platforms Ireland Limited',
    category: 'marketing',
    purpose:
      'Erfolgsmessung von Werbeanzeigen auf Facebook und Instagram sowie Bildung von Zielgruppen für Remarketing.',
    // Vorbereitet, nicht aktiv. Aktivierung: enabled im Manifest auf true
    // setzen und PUBLIC_META_PIXEL_ID hinterlegen — mehr ist nicht nötig. Der
    // Tracker reicht die in manifest.ts zugeordneten Standardereignisse
    // (Lead, Contact, InitiateCheckout, CustomizeProduct) automatisch weiter.
    enabled: CHANNEL_ENABLED['meta-pixel'],
    requiredEnv: ['PUBLIC_META_PIXEL_ID'],
    privacyNotice:
      'Nicht im Einsatz. Vor einer Aktivierung muss die Datenschutzerklärung um den Meta-Pixel ergänzt und CONSENT_VERSION erhöht werden.',
    thirdCountryNotice:
      'Meta verarbeitet Daten auch in den USA. Rechtsgrundlage und Garantien vor Aktivierung juristisch prüfen.',
    storageInfo: 'Setzt das Cookie _fbp zur Wiedererkennung von Browsern. Laufzeit bis zu 3 Monate.',
    consentVersion: 2,
    load: () => {
      if (!META_PIXEL_ID) return;
      // Host-Sperre wie bei GA4 und Google Ads: keine Conversions aus
      // Vorschau-Deployments in das Werbekonto.
      if (!isAnalyticsHost()) return;
      // Legt den fbq-Stub an, schaltet den automatischen erweiterten Abgleich
      // ab, initialisiert den Pixel und sendet den PageView — siehe
      // src/lib/analytics/meta.ts.
      bootMetaPixel(META_PIXEL_ID);
    },
    cleanup: () => {
      removeMetaPixel();
    },
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    provider: 'Google Ireland Limited',
    category: 'externalMedia',
    purpose: 'Darstellung einer interaktiven Karte (z. B. Standort/Anfahrt).',
    enabled: false,
    requiredEnv: ['PUBLIC_GOOGLE_MAPS_API_KEY'],
    privacyNotice:
      'Wird erst nach Aktivierung und Zustimmung zur Kategorie „Externe Inhalte" geladen. Datenschutzerklärung muss vor Aktivierung ergänzt werden.',
    thirdCountryNotice:
      'Google verarbeitet Daten auch in den USA. Rechtsgrundlage und Garantien vor Aktivierung juristisch prüfen.',
    storageInfo: 'Kann beim Laden der Karte Cookies/Storage von Google setzen (Details bei Aktivierung dokumentieren).',
    consentVersion: 1,
    load: () => {
      const apiKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;
      injectScriptOnce(
        'tectum-google-maps-script',
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
      );
    },
    cleanup: () => {
      removeScript('tectum-google-maps-script');
    },
  },
];

export function getServicesByCategory(
  category: ConsentCategory,
  services: ConsentService[] = SERVICES
): ConsentService[] {
  return services.filter((s) => s.category === category);
}

export function getActiveOptionalCategories(services: ConsentService[] = SERVICES): ConsentCategory[] {
  const categories = new Set<ConsentCategory>();
  for (const service of services) {
    if (service.enabled && service.category !== 'necessary') categories.add(service.category);
  }
  return [...categories];
}

export function hasAnyActiveOptionalService(services: ConsentService[] = SERVICES): boolean {
  return getActiveOptionalCategories(services).length > 0;
}

export function getNecessaryServices(services: ConsentService[] = SERVICES): ConsentService[] {
  return getServicesByCategory('necessary', services);
}

/**
 * Liefert die Dienstliste für die aktuelle Ausführungsumgebung. `mockEnabled`
 * wird von den Aufrufern (Astro-Frontmatter bzw. Browser-Runtime) jeweils aus
 * `import.meta.env.DEV` + Umgebungsvariable `PUBLIC_CONSENT_MOCK=1` bestimmt — siehe
 * mock-service.ts. `import.meta.env.DEV` ist im Produktions-Build statisch
 * `false`, wodurch dieser Zweig dort nie aktiv wird.
 */
export function getRuntimeServices(mockEnabled: boolean): ConsentService[] {
  if (!mockEnabled) return SERVICES;
  return [...SERVICES, MOCK_SERVICE];
}
