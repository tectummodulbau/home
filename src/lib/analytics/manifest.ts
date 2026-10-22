/**
 * Statische Beschreibung des Messaufbaus — Messkanäle und Event-Katalog.
 *
 * Diese Datei ist bewusst FREI von Importen, DOM-Zugriffen und
 * `import.meta.env`. Sie wird von drei Seiten gelesen:
 *
 *   1. src/lib/consent/registry.ts   — bezieht das `enabled`-Flag der Messkanäle
 *   2. src/lib/analytics/tracker.ts  — bezieht die Zuordnung zu Meta-Standardevents
 *   3. (früher) die Analyseübersicht im Admin-Bereich — entfernt; die Datei
 *      bleibt frei von Browser-APIs, damit sie auch serverseitig lesbar ist
 *
 * Punkt 3 ist der Grund für die Datei: eine Cloudflare Pages Function läuft
 * im Worker, nicht im Browser. Sie darf registry.ts nicht importieren, weil
 * dort `document`, `location` und `window` vorkommen. Ohne diese Datei müsste
 * der Admin-Bereich den Messaufbau ein zweites Mal beschreiben — und würde
 * beim nächsten Umbau still danebenliegen.
 *
 * Faustregel: Was der Admin-Bereich über das Tracking anzeigen soll, steht
 * hier. Was ein Skript lädt oder aufräumt, steht in registry.ts.
 */

export type ConsentCategoryId = 'necessary' | 'analytics' | 'marketing' | 'externalMedia';

/**
 * Bezeichnungen der Einwilligungskategorien. Stehen hier, weil sie sowohl im
 * Einstellungsdialog (über registry.ts) als auch in der Analyseübersicht
 * auftauchen — zwei Listen wären zwei Gelegenheiten, sie auseinanderlaufen
 * zu lassen.
 */
export const CATEGORY_LABELS: Record<ConsentCategoryId, string> = {
  necessary: 'Technisch notwendig',
  analytics: 'Statistik',
  marketing: 'Marketing',
  externalMedia: 'Externe Inhalte',
};

/** IDs sind identisch mit den `id`-Feldern in src/lib/consent/registry.ts. */
export type MeasurementChannelId =
  | 'google-analytics-4'
  | 'google-ads'
  | 'meta-pixel'
  | 'google-tag-manager';

/**
 * GA4 Measurement ID der Property „tectum-modulbau.de".
 *
 * Steht als Konstante im Quelltext, weil Astro/Vite `import.meta.env.*` zur
 * BUILD-Zeit ersetzt, die `[vars]` in wrangler.toml aber Runtime-Bindings für
 * Pages Functions sind — eine dort eingetragene ID käme im ausgelieferten
 * JavaScript nie an. Die Mess-ID ist kein Geheimnis: sie steht in jedem
 * Request an Google und im Quelltext jeder GA4-Seite.
 */
export const GA4_MEASUREMENT_ID_DEFAULT = 'G-ZLHWPYQ9LJ';

/**
 * Hosts, auf denen gemessen werden darf. Weil die Mess-ID fest im Build
 * steht, würde sonst jedes Vorschau-Deployment (`*.pages.dev`) in dieselbe
 * Property senden.
 */
export const ANALYTICS_HOSTS_DEFAULT = ['tectum-modulbau.de', 'www.tectum-modulbau.de'];

export interface EnvRequirement {
  name: string;
  /** Ohne diese Variable kann der Kanal nicht senden. */
  required: boolean;
  purpose: string;
  /**
   * Darf der Wert im Admin-Bereich im Klartext stehen? Mess-, Conversion- und
   * Pixel-IDs sind keine Geheimnisse (sie stehen im ausgelieferten HTML),
   * Schlüssel wie ein Maps-API-Key wären es sehr wohl.
   */
  showValue: boolean;
}

export interface MeasurementChannel {
  id: MeasurementChannelId;
  name: string;
  provider: string;
  category: ConsentCategoryId;
  /**
   * Einzige Definition, ob der Kanal produktiv läuft. registry.ts liest sie
   * über CHANNEL_ENABLED, der Admin-Bereich zeigt sie an.
   */
  enabled: boolean;
  purpose: string;
  env: EnvRequirement[];
  /** Im Quelltext hinterlegter Rückfallwert, falls keine Variable gesetzt ist. */
  fallbackId?: string;
  /** Ziffer der Datenschutzerklärung, falls der Kanal dort beschrieben ist. */
  privacyPolicySection?: string;
  /**
   * Schritte, die über das Setzen der Variablen hinaus nötig sind, bevor der
   * Kanal live gehen darf. Der Admin-Bereich zeigt sie als Checkliste.
   */
  activationSteps: string[];
  /**
   * Einstellungen im Konto des Anbieters. Sie entscheiden mit darüber, ob und
   * wie gemessen wird — liegen aber außerhalb dieses Repositorys und lassen
   * sich von der Analyseübersicht **nicht** prüfen. Sie werden deshalb immer
   * angezeigt, auch bei einem Kanal, der im Code fertig ist.
   */
  accountSteps: string[];
  /** Gilt der Kanal nur auf den Hosts aus ANALYTICS_HOSTS? */
  hostLocked: boolean;
}

export const MEASUREMENT_CHANNELS: MeasurementChannel[] = [
  {
    id: 'google-analytics-4',
    name: 'Google Analytics 4',
    provider: 'Google Ireland Limited',
    category: 'analytics',
    enabled: true,
    purpose:
      'Reichweite, Herkunft der Besucher, Nutzung der Seitenabschnitte sowie Verlauf und Abschluss des Anfrageformulars.',
    env: [
      {
        name: 'PUBLIC_GA4_MEASUREMENT_ID',
        required: false,
        purpose: 'Überschreibt die im Quelltext hinterlegte Mess-ID, z. B. für eine Test-Property.',
        showValue: true,
      },
    ],
    fallbackId: GA4_MEASUREMENT_ID_DEFAULT,
    privacyPolicySection: 'Ziffer 5',
    activationSteps: [],
    accountSteps: [
      'Datenaufbewahrung auf 14 Monate stellen (Verwaltung → Dateneinstellungen → Datenaufbewahrung). GA4 steht standardmäßig auf 2 Monate, Ziffer 5 der veröffentlichten Datenschutzerklärung nennt aber bereits 14 Monate — solange das auseinanderläuft, ist die Erklärung falsch.',
      'Schlüsselereignisse markieren, in dieser Reihenfolge: form_start, form_step_complete, generate_lead (Verwaltung → Ereignisse).',
      'Internen Traffic ausschließen (Verwaltung → Datenstreams → Tag-Einstellungen → Internen Traffic definieren), sonst zählen die eigenen Besuche mit.',
      'Google-Signale ausgeschaltet lassen. Eingeschaltet kämen geräteübergreifende Profile hinzu — das wäre eine neue Verarbeitung und müsste in der Datenschutzerklärung stehen.',
      'Prüfen, dass unter dieser Mess-ID tatsächlich Daten ankommen: Berichte → Echtzeit, während die Seite mit erteilter Statistik-Zustimmung offen ist.',
    ],
    hostLocked: true,
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    provider: 'Google Ireland Limited',
    category: 'marketing',
    enabled: false,
    purpose: 'Conversion-Messung von Werbekampagnen. Die Conversion feuert beim bestätigten Lead.',
    env: [
      {
        name: 'PUBLIC_GOOGLE_ADS_ID',
        required: true,
        purpose: 'Conversion-ID im Format AW-XXXXXXXXX.',
        showValue: true,
      },
      {
        name: 'PUBLIC_GOOGLE_ADS_LEAD_LABEL',
        required: true,
        purpose: 'Conversion-Label des Lead-Ziels, wird zu send_to: "AW-…/Label" zusammengesetzt.',
        showValue: true,
      },
    ],
    activationSteps: [
      'In src/lib/analytics/manifest.ts bei google-ads enabled auf true setzen.',
      'CONSENT_VERSION in src/lib/consent/registry.ts erhöhen — sonst gilt die alte Einwilligung weiter.',
      'Datenschutzerklärung um Google Ads ergänzen (Baustein in docs/datenschutz-bausteine.md).',
      'Auftragsverarbeitungsvertrag prüfen und ins Verarbeitungsverzeichnis aufnehmen.',
      'Nach dem Deployment im Netzwerk-Tab gegenprüfen: vor der Zustimmung kein Request an Google.',
    ],
    accountSteps: [
      'Conversion-Aktion vom Typ „Lead" anlegen; Conversion-ID und Label daraus übernehmen.',
      'Entscheiden, ob die Conversion aus GA4 importiert ODER über dieses Tag gemessen wird. Beides gleichzeitig zählt jeden Lead doppelt.',
      'Erweiterte Conversions ausgeschaltet lassen — dabei würden gehashte Kontaktdaten aus dem Formular an Google gehen.',
    ],
    hostLocked: true,
  },
  {
    id: 'meta-pixel',
    name: 'Meta-Pixel',
    provider: 'Meta Platforms Ireland Limited',
    category: 'marketing',
    enabled: false,
    purpose:
      'Erfolgsmessung von Anzeigen auf Facebook und Instagram. Erhält eine feste Auswahl an Standardereignissen, keine Parameter.',
    env: [
      {
        name: 'PUBLIC_META_PIXEL_ID',
        required: true,
        purpose: 'Pixel-ID, rein numerisch.',
        showValue: true,
      },
    ],
    activationSteps: [
      'In src/lib/analytics/manifest.ts bei meta-pixel enabled auf true setzen.',
      'CONSENT_VERSION in src/lib/consent/registry.ts erhöhen — sonst gilt die alte Einwilligung weiter.',
      'Datenschutzerklärung um den Meta-Pixel ergänzen (Baustein in docs/datenschutz-bausteine.md).',
      'Auftragsverarbeitungsvertrag mit Meta prüfen und ins Verarbeitungsverzeichnis aufnehmen.',
      'Im Meta Events Manager prüfen, dass „Automatischer erweiterter Abgleich" ausgeschaltet bleibt.',
      'Nach dem Deployment im Netzwerk-Tab gegenprüfen: vor der Zustimmung kein Request an Meta.',
    ],
    accountSteps: [
      'Pixel im Events Manager anlegen und dessen ID übernehmen.',
      '„Automatischer erweiterter Abgleich" im Events Manager ausgeschaltet lassen. Der Code schaltet ihn zwar mit autoConfig: false ab, die Kontoeinstellung ist aber die zweite Sicherung.',
      'Die Conversions API bleibt außen vor — gemessen wird ausschließlich über den Browser-Pixel.',
    ],
    hostLocked: true,
  },
  {
    id: 'google-tag-manager',
    name: 'Google Tag Manager',
    provider: 'Google Ireland Limited',
    category: 'analytics',
    enabled: false,
    purpose:
      'Container zur Verwaltung nachgelagerter Tags. Bewusst nicht im Einsatz — die Messung läuft direkt über gtag.js.',
    env: [
      {
        name: 'PUBLIC_GTM_ID',
        required: true,
        purpose: 'Container-ID im Format GTM-XXXXXXX.',
        showValue: true,
      },
    ],
    activationSteps: [
      'Nur aktivieren, wenn die Tag-Pflege an nicht-technische Kollegen übergeben werden soll.',
      'CONSENT_VERSION in src/lib/consent/registry.ts erhöhen.',
      'Datenschutzerklärung um Google Tag Manager ergänzen.',
      'Doppelmessung ausschließen: bei aktivem GTM darf GA4 nicht zusätzlich direkt geladen werden.',
    ],
    accountSteps: [
      'Container anlegen und im Container die Consent-Einstellungen konfigurieren; die Tags müssen auf die hier gesetzten Consent-Mode-Signale hören.',
    ],
    hostLocked: false,
  },
];

/**
 * Ist der Kanal im Code freigeschaltet? Wird von registry.ts gelesen, damit es
 * für diese Frage genau eine Antwort im Projekt gibt.
 */
export const CHANNEL_ENABLED: Record<MeasurementChannelId, boolean> = MEASUREMENT_CHANNELS.reduce(
  (acc, channel) => {
    acc[channel.id] = channel.enabled;
    return acc;
  },
  {} as Record<MeasurementChannelId, boolean>
);

export function getChannel(id: MeasurementChannelId): MeasurementChannel {
  const channel = MEASUREMENT_CHANNELS.find((c) => c.id === id);
  if (!channel) throw new Error(`Unbekannter Messkanal: ${id}`);
  return channel;
}

// ---------------------------------------------------------------------------
// Event-Katalog
// ---------------------------------------------------------------------------

export type EventGroup = 'formular' | 'kontakt' | 'rechner' | 'engagement';

export const EVENT_GROUP_LABELS: Record<EventGroup, string> = {
  formular: 'Anfrageformular',
  kontakt: 'Kontakt & Handlungsaufforderungen',
  rechner: 'Ertragsrechner',
  engagement: 'Seitennutzung',
};

export interface TrackedEvent {
  name: string;
  group: EventGroup;
  trigger: string;
  /** GA4-Event-Parameter. Enthält niemals Kontaktdaten. */
  params: string[];
  /** Datei, in der der Auslöser hängt. */
  source: string;
  /** Höchstens einmal pro Browser-Sitzung. */
  oncePerSession: boolean;
  /** In GA4 als Schlüsselereignis zu markieren. */
  keyEvent: boolean;
  /**
   * Meta-Standardereignis, an das der Tracker dieses Event weiterreicht,
   * sobald der Pixel aktiv ist und eine Marketing-Zustimmung vorliegt.
   * Ohne Eintrag geht das Event ausschließlich an GA4.
   */
  metaEvent?: string;
}

export const TRACKED_EVENTS: TrackedEvent[] = [
  // --- Anfrageformular ---
  {
    name: 'form_start',
    group: 'formular',
    trigger: 'Schritt 1 wird erstmals zu 30 % sichtbar.',
    params: [],
    source: 'src/components/LeadForm.astro',
    oncePerSession: true,
    keyEvent: true,
    metaEvent: 'InitiateCheckout',
  },
  {
    name: 'form_step_view',
    group: 'formular',
    trigger: 'Anzeige eines Schritts, auch beim Zurückspringen.',
    params: ['step_number', 'step_name'],
    source: 'src/components/LeadForm.astro',
    oncePerSession: false,
    keyEvent: false,
  },
  {
    name: 'form_step_complete',
    group: 'formular',
    trigger: 'Klick auf „Weiter" bzw. auf „Absenden".',
    params: ['step_number', 'flaeche_vorhanden', 'rolle', 'vorhaben', 'einheiten_range', 'erwerbsmodell'],
    source: 'src/components/LeadForm.astro',
    oncePerSession: false,
    keyEvent: true,
  },
  {
    name: 'form_validation_error',
    group: 'formular',
    trigger:
      'Das Formular zeigt einen Feldfehler an. Praktisch nur in Schritt 4, weil „Weiter" vorher deaktiviert ist.',
    params: ['step_number', 'feldname'],
    source: 'src/components/LeadForm.astro',
    oncePerSession: false,
    keyEvent: false,
  },
  {
    name: 'form_abandon',
    group: 'formular',
    trigger: 'Seite wird verlassen, nachdem das Formular begonnen, aber nicht abgesendet wurde.',
    params: ['step_number'],
    source: 'src/components/LeadForm.astro',
    oncePerSession: true,
    keyEvent: false,
  },
  {
    name: 'generate_lead',
    group: 'formular',
    trigger: 'Endpunkt bestätigt den Lead: HTTP 200, ok: true und leeres Honeypot-Feld.',
    params: ['rolle', 'einheiten_range', 'erwerbsmodell', 'flaeche_vorhanden'],
    source: 'src/components/LeadForm.astro',
    oncePerSession: false,
    keyEvent: true,
    metaEvent: 'Lead',
  },
  // --- Kontakt & CTA ---
  {
    name: 'click_phone',
    group: 'kontakt',
    trigger: 'Klick auf einen tel:-Link.',
    params: ['position'],
    source: 'src/scripts/analytics-init.ts',
    oncePerSession: false,
    keyEvent: false,
    metaEvent: 'Contact',
  },
  {
    name: 'click_email',
    group: 'kontakt',
    trigger: 'Klick auf einen mailto:-Link.',
    params: [],
    source: 'src/scripts/analytics-init.ts',
    oncePerSession: false,
    keyEvent: false,
    metaEvent: 'Contact',
  },
  {
    name: 'cta_click',
    group: 'kontakt',
    trigger: 'Klick auf einen Link, dessen Ziel auf #anfrage endet.',
    params: ['cta_label', 'section'],
    source: 'src/scripts/analytics-init.ts',
    oncePerSession: false,
    keyEvent: false,
  },
  // --- Rechner ---
  {
    name: 'calculator_interact',
    group: 'rechner',
    trigger: 'Erste Interaktion mit Tab oder Slider.',
    params: [],
    source: 'src/components/Rechner.astro',
    oncePerSession: true,
    keyEvent: false,
  },
  {
    name: 'calculator_configured',
    group: 'rechner',
    trigger: '2 Sekunden nach der letzten Interaktion.',
    params: ['modultyp', 'anzahl_einheiten', 'auslastung', 'preis_pro_nacht', 'berechneter_mehrertrag'],
    source: 'src/components/Rechner.astro',
    oncePerSession: false,
    keyEvent: false,
    metaEvent: 'CustomizeProduct',
  },
  // --- Seitennutzung ---
  {
    name: 'section_view',
    group: 'engagement',
    trigger: 'Abschnitt zu 50 % sichtbar oder füllt die halbe Viewporthöhe.',
    params: ['section_id'],
    source: 'src/scripts/analytics-init.ts',
    oncePerSession: true,
    keyEvent: false,
  },
  {
    name: 'faq_open',
    group: 'engagement',
    trigger: 'Eine FAQ-Frage wird aufgeklappt.',
    params: ['frage'],
    source: 'src/scripts/analytics-init.ts',
    oncePerSession: false,
    keyEvent: false,
  },
  {
    name: 'video_play',
    group: 'engagement',
    trigger: 'Nutzerklick auf den Play-Button des Hero-Films (nicht der Autoplay-Start).',
    params: [],
    source: 'src/components/Hero.astro',
    oncePerSession: true,
    keyEvent: false,
  },
];

/**
 * Zuordnung interner Ereignisname → Meta-Standardereignis. Aus TRACKED_EVENTS
 * abgeleitet, damit es keine zweite Liste gibt, die auseinanderlaufen kann.
 */
export const META_EVENT_MAP: Record<string, string> = TRACKED_EVENTS.reduce(
  (acc, event) => {
    if (event.metaEvent) acc[event.name] = event.metaEvent;
    return acc;
  },
  {} as Record<string, string>
);

/** Reihenfolge, in der die Schlüsselereignisse in GA4 den Funnel abbilden. */
export const KEY_EVENT_FUNNEL = ['form_start', 'form_step_complete', 'generate_lead'];
