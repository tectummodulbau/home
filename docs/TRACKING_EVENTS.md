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

