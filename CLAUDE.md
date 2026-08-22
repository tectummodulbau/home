# CLAUDE.md — tectum-modulbau.de

Arbeitsanleitung für dieses Repository. Enthält vor allem das, was man beim
Ändern kaputt machen kann, ohne es zu merken.

## Projekt

Onepager für **Tectum Ecobau GmbH & Co. KG** (Marke „Tectum Modulbau"),
B2B-Vertrieb modularer Tiny Houses an Campingplatzbetreiber, Wohnparks,
Kommunen, Projektentwickler und Händler.

- **Astro 7**, `output: 'static'`, einzige Integration: `@astrojs/sitemap`
- **Cloudflare Pages** (`wrangler.toml` → `pages_build_output_dir = "dist"`)
- Serverseitiges läuft als **Pages Functions** in `functions/`
- Schriften liegen selbst gehostet in `src/assets` bzw. über `@fontsource`,
  **kein** Google-Fonts-CDN
- Seiten: `/` (Onepager), `/impressum/`, `/datenschutz/`

```bash
npm run dev      # Entwicklung
npm run build    # Produktions-Build nach dist/
npm run preview  # gebautes Ergebnis lokal ausliefern
npx astro check  # Typprüfung
```

> `npx astro check` meldet 11 vorbestehende Typfehler: 6 in `LeadForm.astro`
> (Union-Typen als Generic für `querySelectorAll`), 1 in `PrivacyDialog.astro`
> (Index auf ein `Record` ohne `necessary`) und 4 in `astro.config.mjs`
> (`changefreq`-Literale, impliziter Rest-Parameter). Die sind älter als das
> Tracking und blockieren den Build nicht. **Neue** Fehler sind ein
> Regressionssignal.
>
> `npx tsc --noEmit` prüft zusätzlich `functions/` — dort ist der Stand sauber,
> jeder Fehler ist also neu. `astro check` allein deckt den Ordner nicht ab.

---

## Tracking und Consent

### Eingesetzte Dienste

| Dienst | Kategorie | Status | Umgebungsvariable |
|---|---|---|---|
| Cloudflare Hosting/Sicherheit | notwendig | aktiv | – |
| Cloudflare Web Analytics | notwendig | aktiv, Skript kommt von der Plattform | – |
| Google Analytics 4 (gtag direkt) | Statistik | aktiv, `G-ZLHWPYQ9LJ` | optional `PUBLIC_GA4_MEASUREMENT_ID` |
| Google Tag Manager | Statistik | vorbereitet, aus | `PUBLIC_GTM_ID` |
| Google Ads | Marketing | vorbereitet, aus | `PUBLIC_GOOGLE_ADS_ID`, `PUBLIC_GOOGLE_ADS_LEAD_LABEL` |
| Meta-Pixel | Marketing | vorbereitet, aus | `PUBLIC_META_PIXEL_ID` |
| Google Maps | Externe Inhalte | vorbereitet, aus | `PUBLIC_GOOGLE_MAPS_API_KEY` |

**Kein GTM.** Die Messung läuft direkt über `gtag.js`. Der GTM-Eintrag bleibt
nur als Option bestehen.

**Google Ads und Meta-Pixel sind vollständig verdrahtet, nur abgeschaltet.**
Zum Aktivieren genügen zwei Dinge: `enabled: true` beim betreffenden Kanal in
`src/lib/analytics/manifest.ts` und die zugehörige Umgebungsvariable. Der
Tracker reicht die zugeordneten Ereignisse dann von selbst weiter, ein
Code-Umbau ist nicht nötig. Den jeweils aktuellen Stand — welche Variablen
gesetzt sind, was noch fehlt, welcher Kanal tatsächlich sendet — zeigt die
**Analyseübersicht unter `/admin/analyse`** (siehe unten).

### Warum die Mess-ID im Quelltext steht und nicht in wrangler.toml

Astro/Vite ersetzt `import.meta.env.*` zur **Build-Zeit**. Die `[vars]` in
`wrangler.toml` sind dagegen **Runtime-Bindings für Pages Functions** — sie
stehen dem statischen Build nicht zur Verfügung und kämen im ausgelieferten
JavaScript nie an. Eine dort eingetragene Mess-ID hätte keine Wirkung.

Im Cloudflare-Dashboard lassen sich für dieses Projekt außerdem nur noch
*Secrets* pflegen, weil die Variablen über `wrangler.toml` verwaltet werden. Eine
Measurement ID ist aber kein Secret: Sie steht in jedem Request an Google und ist
im Quelltext jeder GA4-Seite ablesbar.

Deshalb steht sie als Konstante `GA4_MEASUREMENT_ID_DEFAULT` in
`src/lib/analytics/manifest.ts` — nicht in `config.ts`, weil auch die
Analyseübersicht im Admin-Bereich sie anzeigen muss und eine Pages Function
`config.ts` wegen `import.meta.env` nicht importieren kann. `config.ts` liest
sie von dort. `PUBLIC_GA4_MEASUREMENT_ID` überschreibt sie, falls mal gegen eine
Test-Property gemessen werden soll.

**Host-Sperre statt Umgebungstrennung:** Weil die ID fest im Build steht, würde
sonst jedes Vorschau-Deployment in dieselbe Property senden. `isAnalyticsHost()`
begrenzt die Messung deshalb auf `tectum-modulbau.de` und
`www.tectum-modulbau.de`. Lokal und auf `*.pages.dev` lädt GA4 **nie**, auch
nicht nach Zustimmung. Zum Testen:
`PUBLIC_ANALYTICS_HOSTS=127.0.0.1 npm run build`.

Die übrigen Variablen (Ads, Meta, Maps, GTM) gehören in **Cloudflare Pages →
Settings → Environment variables** bzw. in `wrangler.toml`, sobald der jeweilige
Dienst aktiviert wird — und unterliegen dann derselben Build-Zeit-Einschränkung.

**Cloudflare Web Analytics** wird nicht vom Repository geladen, sondern muss im
Cloudflare-Dashboard für das Pages-Projekt eingeschaltet werden. Der
Registry-Eintrag `cloudflare-web-analytics` existiert nur zur Transparenz im
Einstellungsdialog. Wird der Dienst dort nicht aktiviert, ist der Eintrag zu
entfernen.

### Consent-Architektur

Eigene Lösung, keine Bibliothek. Vier Kategorien: `necessary`, `analytics`
(„Statistik"), `marketing`, `externalMedia` („Externe Inhalte").

```
src/lib/consent/
  registry.ts   Dienstliste — die EINZIGE Stelle, an der Drittanbieter-Skripte
                verdrahtet werden. Jeder Eintrag hat load()/cleanup().
  state.ts      Speicherung, Gültigkeit, Benachrichtigung. Wird von manager.ts
                UND vom Tracking gelesen.
  manager.ts    Banner-/Dialog-Logik, ruft load()/cleanup() auf.
src/components/privacy/   Banner, Dialog, Widget (unverändertes Design)
src/components/analytics/ConsentModeDefaults.astro
```

**Eine Ausnahme beim `enabled`-Flag:** Für die vier Messkanäle (GA4, Google Ads,
Meta-Pixel, GTM) steht es nicht in `registry.ts`, sondern in
`src/lib/analytics/manifest.ts`. Grund ist die Analyseübersicht unter
`/admin/analyse`: Sie läuft als Pages Function im Worker und kann `registry.ts`
nicht importieren, weil dort `window`, `document` und `location` vorkommen. Das
Flag an zwei Stellen zu pflegen wäre die schlechtere Antwort gewesen —
`load()`/`cleanup()` bleiben in der Registry. Auch `CATEGORY_LABELS` liegt
inzwischen im Manifest und wird von `registry.ts` re-exportiert.

**Speicherung:** `localStorage`, Schlüssel `tectum_privacy_consent`, 365 Tage
gültig, kein Cookie.

**Ablauf einer Entscheidung:**

1. `ConsentModeDefaults.astro` rendert als **erstes Skript im `<head>`** ein
   Inline-Snippet: legt `dataLayer`/`gtag` an, setzt die Consent-Mode-v2-
   Defaults (`ad_storage`, `ad_user_data`, `ad_personalization`,
   `analytics_storage` = `denied`; `functionality_storage`, `security_storage`
   = `granted`) und registriert einen Listener auf das Consent-Event.
2. Nutzer entscheidet → `manager.ts` → `applyConsent()`.
3. `applyConsent()` löst **zuerst** das DOM-Event `tectum:consent-change` auf
   `document` aus (Konstante `CONSENT_EVENT` in `state.ts`), **danach** werden
   die Dienste geladen. Diese Reihenfolge ist zwingend: nur so steht das
   `consent update` im `dataLayer` vor dem `config`-Aufruf des Tags.
4. Das Inline-Snippet mappt: Statistik → `analytics_storage`, Marketing →
   `ad_storage` + `ad_user_data` + `ad_personalization`.
5. `tracker.ts` hört auf dasselbe Event und öffnet/schließt die Event-Sperre.

Der Weg über Banner und über „Datenschutz-Einstellungen" ist identisch — beide
laufen durch `decide()` → `applyConsent()`. Nachträgliche Änderungen schlagen
deshalb automatisch durch.

**Consent Mode v2 läuft im Basic-Modus:** vor der Entscheidung wird kein
Google-Skript geladen und keine Verbindung aufgebaut, auch kein cookieloser Ping.

**Beim Widerruf** wird das Skript aus dem DOM entfernt *und* die gesetzten
Cookies werden gelöscht (`deleteCookiesByPrefix`, siehe `gtag.ts`).

### Wichtig beim Ändern der Registry

Wer einen Dienst aktiviert oder dessen Kategorie/Zweck ändert, muss
**`CONSENT_VERSION` in `registry.ts` erhöhen** — sonst behalten alle Besucher
eine Einwilligung, die den neuen Umfang nicht abdeckt. Eine höhere Version
erzwingt die erneute Abfrage. Zusätzlich die Datenschutzerklärung ergänzen; die
fertigen Bausteine liegen in `docs/datenschutz-bausteine.md`.

Der Satz „Derzeit sind in dieser Kategorie keine Dienste im Einsatz" im Dialog
ist **kein fester Text**, sondern der Platzhalter für Kategorien ohne Dienst mit
`enabled: true`. Er verschwindet automatisch. Nicht von Hand überschreiben.

---

## Tracking-Hilfsfunktion

`src/lib/analytics/tracker.ts` ist die **einzige** Stelle, die Events absetzt.
In Komponenten stehen keine `gtag`-Aufrufe.

```
src/lib/analytics/
  manifest.ts  Statische Beschreibung des Messaufbaus: Kanäle inkl. enabled-Flag,
               Event-Katalog, Zuordnung zu Meta-Standardereignissen. Frei von
               Importen und Browser-APIs — deshalb auch aus einer Pages Function
               lesbar. Wird von registry.ts, tracker.ts und /admin/analyse genutzt.
  config.ts    IDs aus Umgebungsvariablen, GA4-Parameterlimit, ?ga_debug=1
  gtag.ts      dataLayer-/gtag-Zugriff, Skript-Injektion, Cookie-Löschung
  meta.ts      fbq-Bootstrap, Standardereignisse, Aufräumen beim Widerruf
  tracker.ts   track / trackOnce / createDebouncedTracker / trackLead
src/scripts/analytics-init.ts   seitenweite Events (CTA, Kontakt, Section, FAQ)
```

| Funktion | Zweck |
|---|---|
| `track(name, params)` | Event senden. Gibt `false` zurück, wenn die Consent-Sperre greift. |
| `trackOnce(key, name, params)` | Höchstens einmal pro Sitzung (`sessionStorage`, Präfix `tectum_evt_`). |
| `createDebouncedTracker(name, ms)` | Sendet erst nach Inaktivität. Für `calculator_configured`. |
| `trackLead(params)` | `generate_lead` plus — falls Ads aktiv und Marketing zugestimmt — die Ads-Conversion. |

**Regeln, die der Tracker durchsetzt:**

- Ohne Zustimmung zur Kategorie „Statistik" wird **jedes** Event verworfen. Es
  wird nichts zwischengespeichert und nichts nachgesendet. Ereignisse vor der
  Zustimmung sind bewusst verloren.
- Einmal-pro-Sitzung-Marker werden erst gesetzt, wenn das Event tatsächlich
  gesendet wurde. Ein während der Sperre unterdrücktes `section_view` kann nach
  erteilter Zustimmung noch ausgelöst werden.
- Stringparameter werden auf 100 Zeichen gekürzt (GA4-Limit), Mehrfach-Leerraum
  wird normalisiert, leere Werte entfallen.
- Im Dev-Modus loggt jedes gesendete Event nach `console.info`.
- Ereignisse mit einem `metaEvent` im Manifest gehen zusätzlich an den
  Meta-Pixel — aber nur, wenn **Marketing** zugestimmt ist, eine Pixel-ID
  konfiguriert ist und der Pixel tatsächlich läuft. `trackMetaEvent()` prüft auf
  `window.fbq` und legt selbst nie einen Stub an; ist der Pixel abgeschaltet,
  ist der Aufruf ein No-Op. So entsteht keine Warteschlange, die später
  unbemerkt abfließen könnte.
- An Meta gehen **keine Parameter**, nur der Name des Standardereignisses. Metas
  Parameter-Semantik deckt sich nicht mit der von GA4; sie unverändert
  weiterzureichen hieße, Daten zu senden, die für Meta nie vorgesehen waren.

### Meta-Pixel

`src/lib/analytics/meta.ts` ist das Gegenstück zu `gtag.ts`. Zwei Funktionen mit
bewusst unterschiedlichen Rechten:

| Funktion | Aufrufer | Verhalten |
|---|---|---|
| `bootMetaPixel(id)` | **nur** die Consent-Registry | Legt den `fbq`-Stub an, lädt `fbevents.js`, initialisiert, sendet `PageView`. |
| `trackMetaEvent(name)` | der Tracker | Sendet nur, wenn `window.fbq` schon existiert. Legt nie einen Stub an. |

`bootMetaPixel` setzt **vor** dem `init` die Option `autoConfig: false`. Das ist
die wichtigste Zeile der Datei: ohne sie sammelt Meta automatisch
Button-Beschriftungen und Formularfeld-Inhalte ein („Automatischer erweiterter
Abgleich") — also genau die Kontaktdaten, die nach der Linie dieses Projekts nie
an einen Messdienst gehen. Das lässt sich nicht nachträglich reparieren, nur
vorher verhindern. Derselbe Schalter existiert im Meta Events Manager und muss
dort ebenfalls aus bleiben.

Alle drei Werbekanäle (GA4, Google Ads, Meta-Pixel) unterliegen derselben
**Host-Sperre**. Bei Ads und Meta fehlte sie vorher — ohne sie hätte jedes
Vorschau-Deployment echte Conversions in die Werbekonten geschrieben, ein
Fehler, den man erst an den Kampagnenkosten bemerkt.

---

## Event-Liste

Genau diese Events, keine weiteren. `page_view` kommt zusätzlich von GA4 selbst.

Die Liste unten ist die Erläuterung; die maschinenlesbare Fassung steht in
`TRACKED_EVENTS` in `src/lib/analytics/manifest.ts` und wird von
`/admin/analyse` gerendert. Wer ein Event hinzufügt, ändert oder entfernt,
pflegt **beides**.

**Zuordnung zu Meta-Standardereignissen** (Feld `metaEvent` im Manifest, greift
erst bei aktivem Pixel): `form_start` → `InitiateCheckout`, `generate_lead` →
`Lead`, `click_phone` und `click_email` → `Contact`, `calculator_configured` →
`CustomizeProduct`. Alle übrigen Events gehen ausschließlich an GA4 — für sie
gibt es kein sinnvolles Meta-Gegenstück, und ein erfundenes Custom Event wäre in
den Meta-Berichten wertlos.

### Formular — `src/components/LeadForm.astro`

| Event | Auslöser | Parameter |
|---|---|---|
| `form_start` | Schritt 1 wird erstmals sichtbar (IntersectionObserver, 30 %), 1×/Sitzung | – |
| `form_step_view` | Anzeige eines Schritts, auch beim Zurückspringen | `step_number`, `step_name` (`flaeche`, `rolle`, `vorhaben`, `kontakt`) |
| `form_step_complete` | „Weiter" bzw. Absenden | Schritt 1: `flaeche_vorhanden` (`ja`/`nein`) · Schritt 2: `rolle` · Schritt 3: `vorhaben`, `einheiten_range`, `erwerbsmodell` · Schritt 4: nur `step_number` |
| `form_validation_error` | Formular zeigt einen Feldfehler an | `step_number`, `feldname` |
| `form_abandon` | `visibilitychange`→hidden bzw. `pagehide` bei begonnenem, nicht abgesendetem Formular, 1× | `step_number` (höchster erreichter Schritt) |
| `generate_lead` | Endpunkt bestätigt: HTTP 200 **und** `ok: true` **und** Honeypot leer | `rolle`, `einheiten_range`, `erwerbsmodell`, `flaeche_vorhanden` |

**Niemals als Parameter übertragen:** Name, E-Mail, Telefon, Firma. Nur die
Auswahlwerte aus Radio und Dropdowns. Bei `form_validation_error` wird
ausschließlich der **Feldname** gemeldet, nie ein eingegebener Wert; die
zulässigen Namen stehen in der Konstante `FIELD_LABELS` — was dort nicht steht,
wird nicht gemeldet.

> **Zu `form_validation_error`:** Der „Weiter"-Button ist `disabled`, solange
> ein Schritt ungültig ist. Für die Schritte 1–3 kann deshalb gar kein
> Fehlerklick entstehen — der `markErrors()`-Zweig im Klick-Handler ist im
> bestehenden Formular unerreichbar. In der Praxis feuert das Event nur in
> Schritt 4 über den Absende-Button. Der Hook liegt trotzdem an beiden Stellen,
> damit er greift, falls die Button-Logik geändert wird.

> **Zu `generate_lead`:** `functions/api/lead.ts` beantwortet auch einen
> ausgefüllten Honeypot mit `200 {ok:true}`, um Bots nicht zu verraten. Der
> Client prüft deshalb zusätzlich, ob das Honeypot-Feld leer war.

### Kontakt und CTA — `src/scripts/analytics-init.ts`

| Event | Auslöser | Parameter |
|---|---|---|
| `click_phone` | Klick auf `a[href^="tel:"]` | `position` (ID des Abschnitts, sonst `header`/`footer`) |
| `click_email` | Klick auf `a[href^="mailto:"]` | – |
| `cta_click` | Klick auf einen Link, dessen `href` auf `#anfrage` endet | `cta_label` (Linktext), `section` |

Die CTA-Erkennung läuft über das **Sprungziel**, nicht über die Beschriftung —
eine Textänderung im Marketing hängt das Tracking damit nicht stillschweigend
ab. Erfasst sind „Unverbindliches Angebot", „Projekt anfragen", „Angebot
anfragen", „Unverbindliche Projektprüfung" und „Jetzt kontaktieren". „Unsere
Module" (`#module`) ist reine Navigation und bleibt außen vor.

**Ein neuer CTA wird automatisch mitgezählt, sobald er auf `#anfrage` zeigt.**
Zeigt ein neuer Anfrage-Button woanders hin, muss `CTA_SELECTOR` erweitert
werden.

### Ertragsrechner — `src/components/Rechner.astro`

| Event | Auslöser | Parameter |
|---|---|---|
| `calculator_interact` | erste Interaktion (Tab oder Slider), 1×/Sitzung | – |
| `calculator_configured` | 2 s nach der letzten Interaktion | `modultyp` (Beschriftung des aktiven Tabs), `anzahl_einheiten`, `auslastung`, `preis_pro_nacht`, `berechneter_mehrertrag` |

`modultyp` wird zur Laufzeit aus dem aktiven Tab gelesen, nicht aus einer
zweiten Liste — Umbenennungen im Markup schlagen automatisch durch.

### Engagement

| Event | Auslöser | Parameter |
|---|---|---|
| `section_view` | Abschnitt zu 50 % sichtbar (oder füllt 50 % der Viewporthöhe), 1× pro Abschnitt pro Sitzung | `section_id` |
| `faq_open` | `<details>` im FAQ wird geöffnet | `frage` |
| `video_play` | **nutzerinitiierter** Klick auf den Play-Button des Hero-Films, 1×/Sitzung | – |

Beobachtet werden alle `main section[id]`: `zielgruppen`, `vorteile`, `module`,
`werk`, `galerie`, `konfiguration`, `vergleich`, `rechner`, `ablauf`, `faq`,
`anfrage`. Hero und StatsBand haben keine ID und werden nicht gezählt.

Das Hero-Video läuft mit `autoplay muted loop`. Würde man das `play`-Event des
Elements auswerten, wäre `video_play` faktisch ein zweiter Seitenaufruf. Der
Hook hängt deshalb am Play-Button, nicht am Video.

### GA4-Schlüsselereignisse

Als Schlüsselereignis markieren, in dieser Funnel-Reihenfolge:

1. `form_start` — Formularkontakt
2. `form_step_complete` — Qualifizierung begonnen
3. `generate_lead` — **die eigentliche Conversion**

`cta_click` und `calculator_configured` sind starke Zwischensignale, aber keine
Schlüsselereignisse — sonst verwässert die Conversion-Rate.

---

## Admin-Bereich

Läuft vollständig als Cloudflare Pages Functions unter `functions/admin/`,
geschützt über ein signiertes Session-Cookie (`_middleware.ts`). Kein Astro, kein
`Layout.astro` — und damit bewusst auch kein Cookie-Banner.

| Route | Datei | Inhalt |
|---|---|---|
| `/admin` | `index.ts` | Weiterleitung auf die Analyseübersicht |
| `/admin/analyse` | `analyse.ts` | Kennzahlen und Messaufbau — die Landeseite |
| `/admin/leads` | `leads.ts` | Kartenliste der Anfragen, Status pflegbar |
| `/admin/login` · `/admin/logout` | `login.ts` · `logout.ts` | Anmeldung |

Gemeinsame Bausteine in `functions/admin/_lib/`:

```
theme.ts          HTML-Hülle, Kopfleiste mit Navigation, gemeinsames CSS
                  (ADMIN_PAGES ist die einzige Definition der Seitenliste —
                  Navigation, /admin-Weiterleitung und das Login-Ziel lesen daraus)
status.ts         Lead-Status und ihre Bezeichnungen
lead-source.ts    Supabase-Zugriff und Datensatz-Typ (von analyse.ts UND leads.ts)
lead-stats.ts     Aggregation: Zeitfenster, Verlauf, Verteilungen — reine Funktionen
tracking-status.ts  Manifest + Runtime-Umgebung → Zustand je Messkanal
```

### Analyseübersicht (`/admin/analyse`)

Zwei Blöcke, bewusst voneinander unabhängig:

**Anfragen** — aus der Supabase-Tabelle `leads`: Kennzahlen mit Vergleich zum
gleich langen Vorzeitraum, ein Verlauf über zwölf Sieben-Tage-Fenster, der
Bearbeitungsstand nach Status und die Verteilung der Qualifizierungsangaben aus
den Formularschritten 1–3. Kontaktdaten werden auf dieser Seite **nicht**
ausgegeben.

Der Verlauf nutzt gleitende Sieben-Tage-Fenster und keine Kalenderwochen: die
laufende Kalenderwoche wäre angebrochen und damit systematisch niedriger als die
davor — im Diagramm sähe das nach einem Einbruch aus, der keiner ist.

**Messaufbau** — je Kanal Zustand, Kategorie, wirksame ID, gesetzte und fehlende
Umgebungsvariablen sowie die offene Aktivierungs-Checkliste; dazu die Host-Sperre
mit der Angabe, ob der gerade aufgerufene Host gemessen wird, und der
vollständige Event-Katalog inklusive Meta-Zuordnung. Alles davon stammt aus
`src/lib/analytics/manifest.ts`. Die Seite kann deshalb nicht veralten, ohne dass
sich der Messaufbau selbst ändert.

Fehlt die Supabase-Konfiguration oder antwortet die Datenbank mit einem Fehler,
bleibt der Messaufbau-Block trotzdem nutzbar — genau dann braucht man ihn meist.

**Ein Stolperstein, den die Seite auch selbst anzeigt:** Die Function liest die
Variablen zur **Laufzeit**, das ausgelieferte JavaScript bekommt sie zur
**Build-Zeit** von Vite eingesetzt. Beides stimmt nur überein, wenn die Variable
unter *Cloudflare Pages → Settings → Environment variables* steht. Eine Variable
nur in den `[vars]` der `wrangler.toml` erscheint in der Übersicht als „gesetzt",
käme im Frontend aber nie an. Und Änderungen greifen im Frontend erst nach einem
neuen Deployment.

### Prüfen ohne Deployment

Die Function lässt sich bündeln und direkt aufrufen — schneller als jeder
Deploy und ohne Supabase:

```bash
npx esbuild functions/admin/analyse.ts --bundle --format=esm \
  --platform=neutral --outfile=/tmp/analyse.mjs
```

Dann in Node `globalThis.fetch` durch eine Attrappe ersetzen, die eine
Lead-Liste als JSON zurückgibt, `onRequestGet({ env, request })` aufrufen und das
HTML prüfen. Sinnvolle Fälle: Daten vorhanden, leere Tabelle, Supabase nicht
konfiguriert, Supabase-Fehler, Aufruf über einen `*.pages.dev`-Host.

---

## Suchmaschinen-Metadaten

`Layout.astro` erzeugt den kompletten SEO-Kopf. Jede Seite übergibt nur `title`
und `description`; alles andere leitet sich daraus und aus
`src/lib/seo/structured-data.ts` ab.

| Konstante | Datei | Wirkung |
|---|---|---|
| `SITE_NAME` | `structured-data.ts` | `og:site_name` **und** `WebSite.name` |
| `OG_IMAGE` | `structured-data.ts` | `og:image`/`twitter:image` inkl. Maßen |
| `SITE_URL` | `structured-data.ts` | Basis aller absoluten URLs im Schema |

**Warum `SITE_NAME` an genau einer Stelle steht:** Google hat den Startseiten-
titel im Suchergebnis durch einen selbst hergeleiteten Namen ersetzt
(„Tectum Modulbau“), obwohl `<title>` etwas anderes sagte. Das passiert, wenn
die expliziten Signale fehlen. Jetzt sagen `og:site_name`, das WebSite-Schema
und der Markenteil des Titels dasselbe. Wer eines davon ändert, muss die
anderen mitziehen — sonst kommt die Umschreibung zurück.

**`OG_IMAGE` zeigt bewusst auf `public/`**, nicht auf `src/assets`: Astro hasht
optimierte Bilder beim Build, `og:image` braucht aber eine stabile absolute
URL. Breite und Höhe müssen zur echten Datei passen (aktuell 1280×720) —
falsche Maße lassen manche Netzwerke die Vorschau verwerfen.

**`noindex`** ist eine Prop von `Layout.astro`, derzeit nirgends gesetzt. Der
Admin-Bereich ist bereits über `public/robots.txt` und den Sitemap-Filter
ausgeschlossen.

### Kein `<meta name="keywords">`

Google wertet das Tag seit 2009 nicht aus, Bing behandelt es als Spam-Signal.
Die Begriffe stehen stattdessen dort, wo sie gelesen werden: im `<title>`, in
der Description, in H1/H2, in den Alt-Texten und in `knowsAbout` am
Organization-Schema. Wer „Keywords pflegen“ will, pflegt diese Stellen.

**Titel und sichtbarer Text müssen zusammenpassen.** Ein `<title>`, der Begriffe
nennt, die auf der Seite nicht vorkommen, ist der häufigste Grund für eine
Umschreibung durch Google. Wer den Titel ändert, prüft danach mit
`grep -io '<begriff>' dist/index.html`, ob der Begriff im Fließtext gedeckt ist.

**Zielbegriffe der Startseite** (Reihenfolge = Priorität): Modulhaus/Modulhäuser,
modulare Wohneinheiten, Mobilheim (als Abgrenzung), Tiny House gewerblich,
Glamping-Unterkünfte, Camping-Chalets, schlüsselfertig, DGNB/TÜV/GEG, Leasing
mit Rückkaufoption, Whitelabel, Arbeitnehmer- und Kommunalunterkünfte.

## Strukturierte Daten

```
src/lib/content/faq.ts        FAQ-Inhalte (Anzeige UND Schema)
src/lib/seo/structured-data.ts  Organization + hasOfferCatalog, FAQPage
src/components/seo/JsonLd.astro rendert die Blöcke im <head>
```

`Layout.astro` gibt **Organization** auf jeder Seite aus. **FAQPage** nur, wenn
die Seite `faqPage` als Prop setzt — aktuell nur `src/pages/index.astro`, weil
Google verlangt, dass der ausgezeichnete Inhalt auf der Seite sichtbar ist.

**Kein Product-Schema.** Auf der Seite werden keine Preise ausgewiesen; ein
`Product` ohne `offers` erzeugt Warnungen, ohne ein Rich Result zu ermöglichen.
Stattdessen beschreibt `hasOfferCatalog` an der Organization die drei Module.
Werden später Preise veröffentlicht, gehören sie als `offers` in
`structured-data.ts` — und dann erst ist ein Product-Schema sinnvoll.

### Beim Ändern von FAQ-Inhalten

**Antworten und Fragen ausschließlich in `src/lib/content/faq.ts` pflegen.**
`Faq.astro` rendert daraus, `structured-data.ts` erzeugt daraus das Schema.
Beide gehen durch `normalizeText()` — dieselbe Funktion, dieselbe Quelle. Der
Schema-Text ist dadurch zeichengenau identisch mit dem angezeigten Text und
kann nicht auseinanderlaufen.

Es gibt **keine** zweite Fassung der Antworten. Wer eine anlegt (z. B. eine
gekürzte Variante fürs Schema), bricht genau die Garantie, für die diese
Struktur existiert.

Nach einer Änderung: `npm run build`, dann im erzeugten `dist/index.html`
stichprobenartig prüfen, dass Schema und sichtbarer Text übereinstimmen.

### Organisationsdaten

Adresse, Telefon, E-Mail und USt-IdNr. stehen in `structured-data.ts` in der
Konstante `COMPANY` und müssen mit `src/pages/impressum.astro` und
`src/components/Footer.astro` übereinstimmen. Bei einer Adressänderung alle drei
Stellen anfassen.

Als Logo dient derzeit `/favicon.png` (512×512). Ausreichend für die
Google-Anforderung (min. 112×112), aber ein echtes Markenlogo wäre besser.

---

## Verifikation

### Grundprüfung ohne GA4-Konto

```bash
npm run build && npm run preview
```

Im Browser mit offener Konsole:

1. **Vor der Zustimmung:** Netzwerk-Tab, nach `google` filtern → **keine
   Treffer**. `window.dataLayer` enthält genau einen Eintrag: das
   `consent default`.
2. Zustimmen → `dataLayer` bekommt `consent update`, danach `js`, danach
   `config`. Die Reihenfolge muss stimmen.
3. Events prüfen:
   ```js
   window.dataLayer.map(a => Array.from(a)).filter(a => a[0] === 'event')
   ```
4. Widerruf über „Datenschutz-Einstellungen" → `#tectum-ga4-script` ist aus dem
   DOM verschwunden, `document.cookie` enthält kein `_ga` mehr, `dataLayer`
   endet mit einem `consent update` auf `denied`.

Im Dev-Modus (`npm run dev`) loggt der Tracker jedes gesendete Event mit
Parametern nach `console.info` — der schnellste Weg, ein einzelnes Event zu
prüfen.

### GA4 DebugView

Seite mit `?ga_debug=1` aufrufen. Der Tag setzt dann `debug_mode: true` und alle
Events erscheinen in GA4 unter **Verwaltung → DebugView** (ohne dass die
Browser-Erweiterung nötig ist). Zustimmung zur Kategorie „Statistik" ist
Voraussetzung.

### Netzwerkanalyse

Nach `collect?` filtern. Jedes Event ist ein Request an
`https://www.google-analytics.com/g/collect`. Der Query-String zeigt
`en=<eventname>` und die Parameter als `ep.<name>`. Damit lässt sich direkt
gegenprüfen, dass **keine** Kontaktdaten mitgehen.

---

## Datenschutz und Consent

Vollständige Bestandsaufnahme mit Fundstellen, fertigen Textbausteinen für die
Datenschutzerklärung und der Liste offener Punkte:
**`docs/datenschutz-bausteine.md`**. Dieser Abschnitt ist die Kurzfassung.

### Dienstetabelle

| Dienst | Anbieter | Kategorie | Rechtsgrundlage | Speicher / Laufzeit |
|---|---|---|---|---|
| Hosting & CDN | Cloudflare, Inc. (USA) | notwendig | Art. 6 I f | `__cf_bm` 30 Min. (je nach Zonen-Setup) |
| Cloudflare Web Analytics | Cloudflare, Inc. (USA) | notwendig | Art. 6 I f | cookiefrei |
| Google Analytics 4 | Google Ireland Ltd. | **Statistik** | **Art. 6 I a** + § 25 I TDDDG | `_ga`, `_ga_<ID>`: 2 Jahre |
| Google Consent Mode v2 | Google Ireland Ltd. | akzessorisch | – | nur lokaler `dataLayer` |
| Einwilligungsverwaltung | selbst betrieben | notwendig | § 25 II Nr. 2 TDDDG | `localStorage` `tectum_privacy_consent`, 365 Tage |
| Session-Marker | selbst betrieben | akzessorisch | – | `sessionStorage` `tectum_evt_*` |
| Supabase | Supabase (Region offen) | Backend | Art. 6 I b | Lead-Datensätze |
| Resend | Resend, Inc. (USA) | Backend | Art. 6 I b | Versand-Metadaten |
| Rate-Limiting `/api/lead` | selbst betrieben | notwendig | Art. 6 I f | IP flüchtig, 10-Min.-Fenster |
| Admin-Session | selbst betrieben | nicht öffentlich | Art. 6 I f | signiertes Cookie |

**Vorbereitet, aber aus** (`enabled: false`): Google Tag Manager, Google Ads,
Meta-Pixel, Google Maps. Sie gehören **nicht** in die Datenschutzerklärung,
solange sie deaktiviert sind.

**Nachweislich nicht vorhanden:** Google Fonts von Google-Servern (alle Schriften
liegen lokal unter `/_astro/`), Turnstile, externe Video- oder Kartendienste,
Social-Media-Einbindungen, Chat-Widgets, externe Icon- oder Skript-CDNs. Der
Hero-Film liegt selbst gehostet unter `public/video/`.

### Pflicht bei jedem neuen Dienst

Ein neuer Dienst ist erst fertig eingebaut, wenn **alle fünf** Punkte erledigt
sind:

1. Eintrag in `src/lib/consent/registry.ts` mit korrekter Kategorie, `purpose`,
   `provider`, `storageInfo` (Cookie-Name **und** Laufzeit) und
   `thirdCountryNotice`. Handelt es sich um einen **Messkanal**, zusätzlich
   einen Eintrag in `MEASUREMENT_CHANNELS` in `src/lib/analytics/manifest.ts` —
   sonst fehlt er in der Analyseübersicht, und `enabled` hätte keine
   gemeinsame Quelle.
2. **`CONSENT_VERSION` erhöhen** — sonst behalten alle Besucher eine
   Einwilligung, die den neuen Umfang nicht abdeckt.
3. Datenschutzerklärung in `src/pages/datenschutz.astro` ergänzen. Baustein aus
   `docs/datenschutz-bausteine.md` nehmen oder dort einen neuen anlegen.
4. Auftragsverarbeitungsvertrag prüfen und ins Verarbeitungsverzeichnis
   aufnehmen.
5. Nach dem Deployment gegenprüfen: Vor der Zustimmung darf im Netzwerk-Tab
   kein Request an den Anbieter erscheinen.

Der Cookie-Banner selbst muss **nicht** von Hand gepflegt werden — er liest die
Dienstliste aus der Registry. Der Satz „Derzeit sind in dieser Kategorie keine
Dienste im Einsatz" ist der Platzhalter für Kategorien ohne aktiven Dienst und
verschwindet automatisch. Nicht überschreiben.

### Formulierungen, die zum Ist-Zustand passen müssen

„Anonym" ist seit dem Einsatz von GA4 falsch — der Dienst setzt Cookies und
arbeitet mit pseudonymen Kennungen. Banner und Dialog sagen deshalb
„pseudonym". Wer die Kategorienbeschreibung ändert, muss diese Unterscheidung
halten.

### Bekannte offene Punkte

Die vollständige Liste steht in `docs/datenschutz-bausteine.md`, Phase 5. Die
wichtigsten: Auftragsverarbeitungsverträge mit Cloudflare, Supabase, Resend und
Google; Verarbeitungsregion von Supabase; Verzeichnis von
Verarbeitungstätigkeiten; Aufbewahrungsdauer in GA4 (Standard 2 Monate);
Firmierung der Komplementär-GmbH fürs Impressum; ob Cloudflare Web Analytics und
die E-Mail-Verschleierung im Dashboard tatsächlich aktiv sind.

### Aufbau der Datenschutzerklärung

`src/pages/datenschutz.astro` hat 14 Ziffern und deckt jeden im Code
nachweisbaren Dienst ab:

| Ziffer | Inhalt |
|---|---|
| 3 | Website, Logfiles, Cloudflare als CDN inkl. Drittland |
| 4 | Cookies, Einwilligungsverwaltung, Local/Session Storage |
| 5 | Google Analytics 4 |
| 6 | Google Consent Mode v2 |
| 7 | Anfrageformular, Supabase als Empfänger, Ratenbegrenzung, Löschfristen |
| 8 | Resend inkl. AVV, 30 Tage Speicherdauer, Drittland |
| 9 | Schriftarten (lokal) |
| 10 | Videoinhalte (selbst gehostet) |

Wer eine Ziffer einfügt oder entfernt, muss die **Nummerierung und die
Querverweise** nachziehen — Ziffer 8 verweist dreimal auf Ziffer 7.

Zwei Angaben im veröffentlichten Text hängen von Einstellungen außerhalb des
Repositorys ab und müssen dort tatsächlich zutreffen:

- **Ziffer 5** nennt 14 Monate Aufbewahrungsdauer. GA4 steht standardmäßig auf
  2 Monate — Verwaltung → Datenaufbewahrung entsprechend setzen.
- **Ziffer 3** behauptet einen Auftragsverarbeitungsvertrag mit Cloudflare.
  Im Dashboard bestätigen (Manage Account → Configurations → Data Protection
  Agreement) oder den Satz streichen.

## Randbedingungen, die eingehalten werden müssen

- **Kein Third-Party-Skript vor der Zustimmung.** Auch kein cookieloser Ping.
- **Kein Blockieren des Renderings.** Das Inline-Snippet im `<head>` schreibt
  nur in ein lokales Array; alle geladenen Skripte sind `async` bzw. Module.
- **Keine `gtag`-Aufrufe in Komponenten.** Immer über `tracker.ts`.
- **Keine Kontaktdaten in Event-Parametern.**
- **Keine neuen Abhängigkeiten** ohne Rückfrage — das Tracking kommt mit
  Bordmitteln aus.
- Design, Texte und die Formularlogik selbst sind unverändert; das Tracking
  hängt sich nur an bestehende Zustandswechsel an.
