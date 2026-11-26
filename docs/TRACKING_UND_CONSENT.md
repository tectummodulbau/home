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

