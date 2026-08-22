/**
 * Zentrale Konfiguration aller Messdienste.
 *
 * Alle IDs kommen aus Umgebungsvariablen (Cloudflare Pages → Settings →
 * Environment variables) und werden von Vite zur Build-Zeit ersetzt. Ohne
 * gesetzte Variable bleibt der jeweilige Dienst vollständig inaktiv — es wird
 * kein Skript geladen und kein Request abgesetzt. Preview-Deployments ohne
 * Variablen sind dadurch automatisch trackingfrei.
 *
 * Nur `PUBLIC_`-Variablen landen im Client-Bundle. Measurement-IDs sind keine
 * Geheimnisse, gehören aber trotzdem nicht hartkodiert in den Quelltext,
 * damit Produktiv- und Vorschau-Umgebung sauber getrennt bleiben.
 */

import { ANALYTICS_HOSTS_DEFAULT, GA4_MEASUREMENT_ID_DEFAULT } from './manifest';

function readEnv(name: string): string | undefined {
  const value = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name];
  return value && value.trim() !== '' ? value : undefined;
}

/**
 * GA4 Measurement ID. Der Rückfallwert steht in manifest.ts, weil ihn auch
 * der Admin-Bereich anzeigen muss und eine Pages Function diese Datei hier
 * (wegen `import.meta.env`) nicht importieren kann. Die Umgebungsvariable
 * bleibt als Überschreibung erhalten, etwa für eine Test-Property.
 */
export const GA4_MEASUREMENT_ID = readEnv('PUBLIC_GA4_MEASUREMENT_ID') ?? GA4_MEASUREMENT_ID_DEFAULT;

/**
 * Hosts, auf denen gemessen werden darf.
 *
 * Weil die ID fest im Build steht, würde sonst jedes Vorschau-Deployment
 * (`*.pages.dev`) in dieselbe Property senden und die Zahlen verfälschen.
 * Für lokale Tests überschreibbar:
 * `PUBLIC_ANALYTICS_HOSTS=127.0.0.1 npm run build`
 */
export const ANALYTICS_HOSTS = (readEnv('PUBLIC_ANALYTICS_HOSTS')?.split(',') ?? ANALYTICS_HOSTS_DEFAULT)
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

/** Läuft die Seite auf einem Host, auf dem gemessen werden soll? */
export function isAnalyticsHost(): boolean {
  if (typeof window === 'undefined') return false;
  return ANALYTICS_HOSTS.includes(location.hostname.toLowerCase());
}

/** Google Ads Conversion-ID, Format `AW-XXXXXXXXX`. */
export const GOOGLE_ADS_ID = readEnv('PUBLIC_GOOGLE_ADS_ID');

/**
 * Conversion-Label für den Lead, Format `AbC-D_efGhIjK`. Wird zusammen mit
 * GOOGLE_ADS_ID zu `send_to: "AW-123/Label"` zusammengesetzt und ausschließlich
 * beim bestätigten `generate_lead` gesendet.
 */
export const GOOGLE_ADS_LEAD_LABEL = readEnv('PUBLIC_GOOGLE_ADS_LEAD_LABEL');

/** Meta-Pixel-ID (rein numerisch). Vorbereitet, aktuell nicht aktiviert. */
export const META_PIXEL_ID = readEnv('PUBLIC_META_PIXEL_ID');

/**
 * Ist mindestens ein Ziel konfiguriert, das Events entgegennimmt? Wird für
 * die Entwickler-Diagnose genutzt, nicht als Sperre — Events landen immer im
 * dataLayer, sobald eine Statistik-Zustimmung vorliegt.
 */
export const HAS_ANALYTICS_DESTINATION = Boolean(GA4_MEASUREMENT_ID);

/**
 * Name des GA4-Debug-Parameters. Wird gesetzt, wenn die Seite mit
 * `?ga_debug=1` aufgerufen wurde — damit erscheinen die Events im GA4
 * DebugView, ohne dass eine Browser-Erweiterung installiert sein muss.
 * Siehe Verifikationsanleitung in CLAUDE.md.
 */
export const GA_DEBUG_QUERY_PARAM = 'ga_debug';

/**
 * GA4 begrenzt Event-Parameterwerte auf 100 Zeichen. Längere Werte werden
 * serverseitig abgeschnitten — wir kürzen vorher selbst, damit im Report
 * sichtbar ist, dass gekürzt wurde.
 */
export const MAX_PARAM_LENGTH = 100;

/**
 * True, wenn die Seite mit `?ga_debug=1` aufgerufen wurde. Der GA4-Tag setzt
 * dann `debug_mode`, wodurch alle Events im GA4 DebugView erscheinen.
 */
export function isDebugRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(location.search).get(GA_DEBUG_QUERY_PARAM) === '1';
  } catch {
    return false;
  }
}
