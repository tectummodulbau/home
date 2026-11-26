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

