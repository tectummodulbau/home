# Datenschutz-Textbausteine

Fertige deutsche Abschnitte für die Datenschutzerklärung
(`src/pages/datenschutz.astro`), abgeleitet **ausschließlich** aus dem, was im
Repository nachweisbar ist.

> **Diese Texte ersetzen keine anwaltliche Prüfung.** Sie sind fachlich am
> tatsächlich implementierten Verhalten ausgerichtet und mit Dateipfad und
> Zeilennummer belegt. Die abschließende Bewertung von Rechtsgrundlagen,
> Drittlandgarantien, Löschfristen und der Frage, ob eine gesonderte
> Einwilligungs-Checkbox nötig ist, gehört in fachkundige Hände.

**Stand: alle Bausteine sind inzwischen eingebaut.**
`src/pages/datenschutz.astro` hat jetzt 14 Ziffern und deckt jeden im Code
nachweisbaren Dienst ab — Übersicht am Ende von Phase 5. Die Bausteine bleiben
hier als Referenz stehen; jeder trägt den Vermerk, welche Ziffer er speist.

Die Bestandsaufnahme in Phase 1 und der Abgleich in Phase 2 beschreiben den
Zustand **vor** dem Einbau. Sie sind bewusst als Nachweis der Lückenanalyse
erhalten geblieben und nicht nachträglich geglättet.

---

## Phase 1 — Bestandsaufnahme

Vollständige Liste aller Dienste und Technologien im Repository, die Daten von
Besuchern verarbeiten oder an Dritte übertragen. Stand: Branch
`claude/tectum-analytics-tracking-9nl2yr`.

### 1.1 Aktiv im Besucher-Frontend

| # | Dienst | Anbieter (Firmensitz) | Zweck | Rechtsgrundlage | Daten | Speicherdauer | Serverstandort / Drittland | Beleg |
|---|---|---|---|---|---|---|---|---|
| 1 | **Hosting & CDN** | Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA | Ausliefern der Website, TLS, Angriffsabwehr | Art. 6 Abs. 1 lit. f | IP-Adresse, Zeitpunkt, angeforderte Ressource, User-Agent, Referrer | Cloudflare-Logs, kurzfristig | Global (Anycast), Drittland **ja** | `wrangler.toml:2`, `functions/api/lead.ts:132` |
| 2 | **Google Analytics 4** | Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland | Reichweiten- und Nutzungsmessung, Formular-Funnel | **Art. 6 Abs. 1 lit. a** + § 25 Abs. 1 TDDDG | Seitenaufrufe, Events (siehe 1.4), gekürzte IP, Gerät/Browser, ungefährer Ort | `_ga`, `_ga_<ID>`: 2 Jahre | Irland/USA, Drittland **ja** | `src/lib/consent/registry.ts:115–158` |
| 3 | **Google Consent Mode v2** | Google Ireland Ltd. | Übermittelt den Einwilligungsstatus an den Google-Tag | akzessorisch zu Nr. 2 | Signalstatus granted/denied | – (nur `dataLayer`, lokal) | – bis zur Einwilligung | `src/components/analytics/ConsentModeDefaults.astro` |
| 4 | **Eigene Einwilligungsverwaltung** | Tectum Ecobau GmbH & Co. KG (selbst betrieben) | Speichert die Consent-Entscheidung | Art. 6 Abs. 1 lit. f / § 25 Abs. 2 Nr. 2 TDDDG | Zeitpunkt, gewählte Kategorien, Version | `localStorage` `tectum_privacy_consent`, **365 Tage** | Nur im Browser, **keine** Übertragung | `src/lib/consent/registry.ts:64–69`, `state.ts:64,88,93` |
| 5 | **Tracking-Session-Marker** | selbst betrieben | Verhindert Mehrfachzählung („1× pro Sitzung") | akzessorisch zu Nr. 2 | Schlüssel `tectum_evt_*`, Wert `1` | `sessionStorage`, endet mit der Sitzung | Nur im Browser | `src/lib/analytics/tracker.ts:108,117` |
| 6 | **Webfonts Urbanist & Hanken Grotesk** | – (lokal ausgeliefert) | Schriftdarstellung | keine, da kein Drittanbieterkontakt | keine | – | Eigener Auslieferungspfad `/_astro/*.woff2` | `src/layouts/Layout.astro:2–8`, Build-Prüfung: alle `url()` zeigen auf `/_astro/` |
| 7 | **Hero-Film** | – (selbst gehostet) | Imagefilm | keine, da kein Drittanbieterkontakt | keine | – | `public/video/hero-film.mp4`, 3,1 MB | `src/components/Hero.astro:59` |

### 1.2 Aktiv im Hintergrund (Formular-Endpunkt `/api/lead`)

| # | Dienst | Anbieter (Firmensitz) | Zweck | Rechtsgrundlage | Daten | Speicherdauer | Drittland | Beleg |
|---|---|---|---|---|---|---|---|---|
| 8 | **Supabase** (Datenbank) | Supabase, Inc., 970 Toa Payoh North, Singapur / Supabase Pte. Ltd. — **Region im Repository nicht bestimmbar** | Speicherung der Anfragen in Tabelle `leads` | Art. 6 Abs. 1 lit. b | alle Formularfelder inkl. Name, Firma, E-Mail, Telefon | unbefristet, bis manuelle Löschung | **offen** | `functions/api/lead.ts:113`, `supabase/schema.sql` |
| 9 | **Resend** (E-Mail-Versand) | Resend, Inc., San Francisco, CA, USA | Zustellung der Anfrage an `info@tectum-modulbau.de` | Art. 6 Abs. 1 lit. b | alle Formularfelder | **30 Tage**, danach automatische Löschung; nach Vertragsende 90 Tage | Versand aus Irland (`eu-west-1`), **Kontodaten/Logs/Metadaten in den USA** → Drittland **ja**, abgesichert durch DPF-Zertifizierung + SCC im AVV | `functions/api/lead.ts:231` |
| 10 | **Rate-Limiting** | selbst betrieben in der Pages Function | Missbrauchsschutz `/api/lead` | Art. 6 Abs. 1 lit. f | IP-Adresse (`CF-Connecting-IP`), Zeitstempel | nur im Arbeitsspeicher, 10-Minuten-Fenster | – | `functions/api/lead.ts:64–74, 132` |

### 1.3 Nicht öffentlich (Admin-Bereich `/admin`)

| # | Dienst | Zweck | Rechtsgrundlage | Daten | Speicherdauer | Beleg |
|---|---|---|---|---|---|---|
| 11 | **Admin-Session-Cookie** | Anmeldung des Vertriebs am Lead-Backend | Art. 6 Abs. 1 lit. f (kein Besucher-Cookie) | signierter Token mit Ablaufzeit, HMAC | siehe `session.ts` | `functions/admin/_lib/session.ts:29–41`, `login.ts:172–175` |
| 12 | **Login-Ratenbegrenzung** | Brute-Force-Schutz | Art. 6 Abs. 1 lit. f | IP-Adresse | flüchtig | `functions/admin/login.ts:151` |

`/admin` ist per `public/robots.txt` von der Indexierung ausgenommen und rendert
**nicht** über `Layout.astro` — dort erscheint folglich kein Cookie-Banner. Als
nicht-öffentlicher Bereich ist das vertretbar; die Verarbeitung gehört
trotzdem ins Verarbeitungsverzeichnis.

Die Analyseübersicht unter `/admin/analyse` (`functions/admin/analyse.ts`) ist
datenschutzrechtlich **kein neuer Vorgang**: Sie liest dieselben Datensätze aus
derselben Supabase-Tabelle wie `/admin/leads`, aggregiert sie im Speicher und
gibt ausschließlich Auswahlwerte und Summen aus. Name, Firma, E-Mail und Telefon
erscheinen auf dieser Seite nicht. Es kommt kein weiterer Empfänger hinzu, und es
wird nichts zusätzlich gespeichert.

### 1.4 Übertragene Event-Daten (nur bei Statistik-Einwilligung)

`form_start`, `form_step_view`, `form_step_complete`, `form_validation_error`,
`form_abandon`, `generate_lead`, `click_phone`, `click_email`, `cta_click`,
`calculator_interact`, `calculator_configured`, `section_view`, `faq_open`,
`video_play`.

Übertragen werden ausschließlich Auswahlwerte (Rolle, Vorhaben,
Größenordnung, Erwerbsmodell, Fläche ja/nein), Abschnitts-IDs, CTA-Beschriftungen
und Rechnerwerte. **Nicht** übertragen werden Name, Firma, E-Mail und Telefon;
bei `form_validation_error` wird nur der *Feldname* gemeldet, nie ein Inhalt.
Beleg: `src/components/LeadForm.astro` (Konstante `FIELD_LABELS`, Funktion
`qualificationParams`), abgesichert durch einen automatisierten Test.

### 1.5 Vorbereitet, aber **nicht** aktiv

`enabled: false` — es wird kein Skript geladen und kein Cookie gesetzt.
**Diese Dienste gehören nicht in die Datenschutzerklärung, solange sie aus
sind.** Für die drei Messkanäle steht das Flag in
`src/lib/analytics/manifest.ts` (von dort liest es die Registry und die
Analyseübersicht im Admin-Bereich), für Google Maps weiterhin direkt in
`src/lib/consent/registry.ts`.

| Dienst | Beleg | Kategorie |
|---|---|---|
| Google Tag Manager | `manifest.ts:182` | Statistik |
| Google Ads | `manifest.ts:126` | Marketing |
| Meta-Pixel | `manifest.ts:156` | Marketing |
| Google Maps | `registry.ts:277` | Externe Inhalte |

Den jeweils aktuellen Stand — inklusive der Frage, welche Umgebungsvariablen
gesetzt sind und was bis zur Aktivierung noch fehlt — zeigt die
Analyseübersicht unter `/admin/analyse`.

### 1.6 Ausdrücklich geprüft und **nicht** vorhanden

| Geprüft auf | Ergebnis |
|---|---|
| Google Fonts von Google-Servern | **Nein** — alle `url()` im gebauten CSS zeigen auf `/_astro/*.woff2` |
| `/cdn-cgi/l/email-protection` (E-Mail-Verschleierung) | **Kein Treffer im Quelltext** — siehe offener Punkt O-1 |
| Cloudflare Turnstile / `challenges.cloudflare.com` | Kein Treffer |
| Cloudflare Insights Beacon (`static.cloudflareinsights.com`) | Kein Treffer im Code — siehe offener Punkt O-2 |
| Karten, Social-Media-Einbindungen, Buchungstools, Chat-Widgets, iframes | Keine |
| Externe Icon- oder Skript-CDNs | Keine, alle Icons sind Inline-SVG |

Externe Hosts im gebauten Auslieferungsstand: `googletagmanager.com` und
`connect.facebook.net` stehen nur als Zeichenketten in der Registry und werden
ohne Einwilligung bzw. bei `enabled: false` nie angefordert. Alle übrigen Treffer
(`ec.europa.eu`, `resend.com`, `henneberg-webdesign.de`, `google.com/webmasters`) sind
reine Textlinks in Impressum, Datenschutz und Sitemap-Ansicht.

---

## Phase 2 — Abgleich mit der bestehenden Datenschutzerklärung

### Spalte 1 — Im Code aktiv, in der Datenschutzerklärung **nicht** erwähnt

| Dienst | Schwere | Anmerkung |
|---|---|---|
| **Google Analytics 4** | **kritisch** | Einwilligungspflichtiger Dienst, vollständig ungenannt |
| **Google Consent Mode v2** | hoch | Übermittlung des Einwilligungsstatus an Google |
| **Supabase** | **kritisch** | Empfänger sämtlicher Kontaktdaten, nirgends genannt. Ziffer 6 erweckt den Eindruck, Resend sei der einzige Empfänger |
| **Cookie-/Storage-Nutzung durch die Consent-Lösung** | mittel | Ziffer 4 beschreibt das Verfahren, nennt aber weder `localStorage` noch Schlüsselnamen und Laufzeit |
| **Cloudflare als CDN und Sicherheitsdienst** | mittel | Ziffer 3 nennt Cloudflare nur als „Hosting-Anbieter", ohne Drittlandbezug und ohne die eigene Verarbeitung durch Cloudflare |
| **IP-basierte Ratenbegrenzung** | niedrig | Eigenständige Verarbeitung, nicht beschrieben |
| **Admin-Bereich mit Session-Cookie** | niedrig | Nicht öffentlich, gehört aber ins Verarbeitungsverzeichnis |

### Spalte 2 — In der Datenschutzerklärung genannt, im Code **nicht (mehr)** vorhanden

| Passage | Befund |
|---|---|
| Ziffer 4: *„Diese Website kommt ohne nicht technisch notwendige Cookies aus."* | **Falsch geworden.** GA4 setzt `_ga` und `_ga_<ID>` nach Einwilligung |
| Ziffer 4: *„Sollten künftig Analyse-, Marketing- oder externe Mediendienste eingebunden werden…"* | Der Zukunftsfall ist eingetreten. Der Konjunktiv ist überholt |
| Ziffer 4: *„…einsehen, welche technisch notwendigen Funktionen zum Einsatz kommen"* | Verengt auf notwendige Funktionen; es gibt jetzt drei optionale Kategorien |

Es wurden **keine** Reste einer früheren WordPress-Installation gefunden — keine
Verweise auf Jetpack, WooCommerce, Gravatar, wp-content, Borlabs, Complianz oder
Contact Form 7.

### Spalte 3 — Vorhanden, aber inhaltlich veraltet oder unpräzise

| Ziffer | Befund | Empfehlung |
|---|---|---|
| 3 | „Die Logfiles werden nach kurzer Zeit automatisch gelöscht" — Frist unbestimmt, Cloudflare-Drittlandbezug fehlt | Durch **Baustein A** ersetzen |
| 4 | Siehe Spalte 2 — inhaltlich überholt | Vollständig durch **Baustein B** ersetzen |
| 5 | Feldliste korrekt und vollständig, aber Supabase als Empfänger fehlt; „lit. b **beziehungsweise** lit. f" ist unentschlossen | Durch **Baustein H** ersetzen |
| 6 | Resend korrekt beschrieben; der Hinweiskasten „Zur manuellen Prüfung" ist ein **interner Arbeitsvermerk und gehört nicht auf eine veröffentlichte Seite** | Durch **Baustein G** ersetzen, Kasten entfernen |
| 7 | Sachlich korrekt und durch die Build-Prüfung bestätigt | Unverändert lassen |
| 9 | Aufsichtsbehörde korrekt (LDI NRW), Anschrift fehlt | Optional ergänzen |
| 5 | Hinweiskasten „Zur manuellen Prüfung" zur Checkbox-Frage | Interner Vermerk, vor Veröffentlichung entfernen |

### Impressum — Pflichtangaben nach § 5 DDG

| Pflichtangabe | Status | Fundstelle |
|---|---|---|
| Vollständige Firmierung inkl. Rechtsform | ✅ Tectum Ecobau GmbH & Co. KG | `impressum.astro:12` |
| Ladungsfähige Anschrift | ✅ Hohenzollern Platz 7, 47167 Duisburg | `:13–14` |
| Telefon | ✅ zwei Nummern | `:17–18` |
| E-Mail | ✅ | `:19` |
| Registergericht und -nummer | ✅ AG Duisburg HRA 12678 (KG) / HRB 32242 (GmbH) | `:24–25` |
| USt-IdNr. nach § 27a UStG | ✅ DE815350234 | `:32` |
| Vertretungsberechtigte | ✅ Marlon Stankovic | `:35` |
| Verantwortlich nach § 18 Abs. 2 MStV | ✅ Marlon Stankovic | `:38` |
| EU-Streitschlichtung / Verbraucherschlichtung | ✅ | `:41–51` |

**Lücken:**

1. **Vertretungsberechtigung der Komplementär-GmbH.** Bei einer GmbH & Co. KG wird
   die KG durch ihre Komplementär-GmbH vertreten, diese wiederum durch ihre
   Geschäftsführer. Das Impressum nennt nur „Marlon Stankovic" ohne die
   Komplementärin zu benennen. Übliche Formulierung: *„Vertreten durch die
   [Firma der Komplementär-GmbH], diese vertreten durch den Geschäftsführer
   Marlon Stankovic."* — **Ich kenne die Firmierung der Komplementär-GmbH nicht
   und ergänze sie nicht. Bitte mitteilen.**
2. **Steuernummer** ist angegeben (`:28–29`). Sie ist keine Pflichtangabe und wird
   aus Datenschutzgründen üblicherweise weggelassen. Rein optional.
3. **Aufsichtsbehörde / Kammerzugehörigkeit** — nur relevant, falls eine
   Erlaubnispflicht besteht (z. B. Handwerksrolle, § 34c GewO). Bitte prüfen.
4. **Berufshaftpflichtversicherung** — nur bei bestimmten Berufen Pflicht.
   Vermutlich nicht einschlägig.

Die Datenschutzerklärung nennt keinen **Datenschutzbeauftragten**. Ob einer zu
benennen ist (§ 38 BDSG: in der Regel ab 20 Personen, die ständig mit
automatisierter Verarbeitung befasst sind), lässt sich aus dem Repository nicht
ableiten.

---

## Phase 3 — Textbausteine

### Baustein A — Bereitstellung der Website, Logfiles und Cloudflare
> ✅ **Eingebaut als Ziffer 3.**

> **Bereitstellung der Website, Server-Logfiles und Content Delivery Network**
>
> Beim Aufruf dieser Website werden automatisiert Daten Ihres Endgeräts erhoben,
> die technisch erforderlich sind, um Ihnen die Seite anzuzeigen. Erfasst werden
> IP-Adresse, Datum und Uhrzeit der Anfrage, die angeforderte Ressource, der
> Zugriffsstatus, die übertragene Datenmenge, der verwendete Browser, das
> Betriebssystem und die zuvor besuchte Seite.
>
> Diese Website wird über Cloudflare Pages betrieben. Anbieter ist die
> Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA. Cloudflare
> stellt zugleich das Content Delivery Network sowie Sicherheitsfunktionen
> (insbesondere Abwehr von Überlastungs- und Botangriffen) bereit. Sämtliche
> Anfragen an diese Website laufen daher über die Server von Cloudflare, wobei
> Ihre IP-Adresse verarbeitet wird. Cloudflare kann dabei technisch notwendige
> Cookies zur Angriffsabwehr setzen, etwa `__cf_bm` mit einer Laufzeit von
> 30 Minuten. Diese dienen ausschließlich der Sicherheit und nicht der
> Wiedererkennung zu Werbezwecken.
>
> Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren,
> verfügbaren und performanten Betrieb dieser Website (Art. 6 Abs. 1 lit. f
> DSGVO). Für die technisch notwendigen Sicherheits-Cookies ist nach § 25 Abs. 2
> Nr. 2 TDDDG keine Einwilligung erforderlich.
>
> Cloudflare betreibt ein weltweites Servernetz; eine Verarbeitung in den USA und
> damit in einem Drittland findet statt. Wir haben mit Cloudflare einen Vertrag
> zur Auftragsverarbeitung nach Art. 28 DSGVO geschlossen, der die
> Standardvertragsklauseln der EU-Kommission einbezieht. Cloudflare ist zudem
> unter dem EU-US Data Privacy Framework zertifiziert, für das die Europäische
> Kommission mit Beschluss vom 10. Juli 2023 ein angemessenes Schutzniveau
> festgestellt hat.
>
> Datenschutzerklärung von Cloudflare:
> <https://www.cloudflare.com/de-de/privacypolicy/>

> ⚠️ **Vor Veröffentlichung prüfen:** Der Satz zum Auftragsverarbeitungsvertrag
> muss zutreffen. Siehe offener Punkt O-4.

### Baustein B — Einwilligungsverwaltung, Cookies und Speichertechnologien
> ✅ **Eingebaut als Ziffer 4.** Der frühere Satz zu angeblich fehlenden
> nicht-notwendigen Cookies ist ersatzlos entfallen.

> **Cookies, Einwilligungsverwaltung und Speichertechnologien**
>
> Wir setzen auf dieser Website eine selbst betriebene Einwilligungsverwaltung
> ein. Es wird kein Dienst eines Drittanbieters für die Einwilligungsverwaltung
> genutzt; es werden dabei keine Daten an Dritte übertragen.
>
> Beim ersten Aufruf blenden wir ein Banner ein, über das Sie entscheiden, ob
> wir neben den technisch notwendigen Technologien auch solche für Statistik,
> Marketing oder externe Inhalte einsetzen dürfen. Bis zu Ihrer Entscheidung
> laden wir keinen einwilligungspflichtigen Dienst und bauen keine Verbindung zu
> Drittanbietern auf.
>
> Ihre Entscheidung speichern wir ausschließlich lokal in Ihrem Browser im
> sogenannten Local Storage:
>
> | Schlüssel | Inhalt | Laufzeit |
> |---|---|---|
> | `tectum_privacy_consent` | Zeitpunkt der Entscheidung, freigegebene Kategorien, Versionsnummer | 365 Tage |
> | `tectum_evt_*` (Session Storage) | Merker, damit bestimmte statistische Ereignisse pro Sitzung nur einmal gezählt werden | endet mit der Browsersitzung |
>
> Diese Einträge werden nicht an uns oder an Dritte übertragen. Ändern sich die
> von uns eingesetzten Dienste, fragen wir Ihre Einwilligung erneut ab.
>
> Sie können Ihre Auswahl jederzeit ändern oder vollständig widerrufen — über den
> Link „Datenschutz-Einstellungen" im Fußbereich sowie über die runde
> Schaltfläche am linken Bildschirmrand. Ein Widerruf wirkt sofort: Wir entfernen
> die betroffenen Skripte aus der Seite und löschen die von ihnen gesetzten
> Cookies. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt
> unberührt.
>
> Rechtsgrundlage für den Einsatz einwilligungspflichtiger Dienste ist Ihre
> Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO in Verbindung mit § 25 Abs. 1
> TDDDG. Das Speichern Ihrer Entscheidung selbst ist zur Bereitstellung des von
> Ihnen ausdrücklich gewünschten Dienstes erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG)
> und dient zugleich unserem berechtigten Interesse an einem Nachweis der
> Einwilligung (Art. 6 Abs. 1 lit. f DSGVO).

### Baustein C — Google Analytics 4
> ✅ **Eingebaut als Ziffer 5.**

> **Google Analytics 4**
>
> Nach Ihrer Einwilligung nutzen wir Google Analytics 4, einen Webanalysedienst
> der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland
> („Google").
>
> Google Analytics hilft uns zu verstehen, wie unsere Website genutzt wird:
> welche Abschnitte gelesen werden, über welchen Weg Besucher zu uns finden und
> an welcher Stelle unser Anfrageformular abgebrochen wird. Daraus verbessern wir
> Aufbau und Inhalte der Seite.
>
> **Verarbeitete Datenkategorien**
>
> - Aufgerufene Seiten und Seitenabschnitte, Verweildauer, Reihenfolge der Aufrufe
> - Herkunft des Zugriffs (Suchmaschine, Werbeanzeige, verweisende Website)
> - Gekürzte IP-Adresse, daraus abgeleiteter ungefährer Ort auf Stadt- oder
>   Regionsebene
> - Endgerät, Bildschirmauflösung, Betriebssystem, Browser, Spracheinstellung
> - Interaktionen: Klicks auf Handlungsaufforderungen, Telefon- und
>   E-Mail-Links, Öffnen von FAQ-Einträgen, Start des Imagefilms, Nutzung des
>   Ertragsrechners
> - Verlauf des Anfrageformulars: erreichter Schritt, abgeschlossene Schritte,
>   aufgetretene Eingabefehler (nur der Name des betroffenen Feldes, niemals der
>   eingegebene Inhalt), Abbrüche sowie der erfolgreiche Abschluss
> - Aus dem Anfrageformular ausschließlich Ihre Auswahlangaben: Ihre Rolle als
>   Anfragender, Ihr Vorhaben, die geplante Größenordnung, das gewünschte
>   Erwerbsmodell und ob eine Fläche vorhanden ist
>
> **Wir übermitteln keine Klarnamen, E-Mail-Adressen, Telefonnummern und keine
> Firmennamen an Google.**
>
> **Cookies**
>
> | Name | Zweck | Laufzeit |
> |---|---|---|
> | `_ga` | Unterscheidung von Besuchern | 2 Jahre |
> | `_ga_<Property-ID>` | Fortschreiben der Sitzung | 2 Jahre |
>
> **Rechtsgrundlage.** Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und
> § 25 Abs. 1 TDDDG.
>
> **Speicherdauer.** Die vorgenannten Cookies laufen nach 2 Jahren ab. Die
> Aufbewahrungsdauer der Nutzungsdaten in unserem Google-Analytics-Konto ist auf
> 14 Monate eingestellt; danach werden ereignisbezogene Daten automatisch
> gelöscht. Aggregierte Berichtsdaten bleiben erhalten.
>
> **Drittlandübermittlung.** Eine Verarbeitung in den USA kann nicht
> ausgeschlossen werden. Google LLC ist unter dem EU-US Data Privacy Framework
> zertifiziert; die Europäische Kommission hat für dieses mit Beschluss vom
> 10. Juli 2023 ein angemessenes Schutzniveau festgestellt. Ergänzend gelten die
> Standardvertragsklauseln der EU-Kommission nach Art. 46 Abs. 2 lit. c DSGVO.
> Wir weisen darauf hin, dass US-Behörden unter bestimmten Voraussetzungen auf
> die Daten zugreifen können.
>
> **Widerruf.** Sie können Ihre Einwilligung jederzeit mit Wirkung für die
> Zukunft über den Link „Datenschutz-Einstellungen" im Fußbereich dieser Website
> widerrufen. Wir entfernen den Google-Tag dann sofort aus der Seite und löschen
> die oben genannten Cookies.
>
> **Weitere Informationen.** Datenschutzerklärung von Google:
> <https://policies.google.com/privacy> · Nutzungsbedingungen von Google
> Analytics: <https://marketingplatform.google.com/about/analytics/terms/de/>

> ⚠️ **Vor Veröffentlichung prüfen:** Die genannten 14 Monate Aufbewahrungsdauer
> müssen in GA4 unter *Verwaltung → Datenaufbewahrung* tatsächlich eingestellt
> sein. Der Standard ist 2 Monate. Siehe offener Punkt O-6.

### Baustein D — Google Consent Mode v2
> ✅ **Eingebaut als Ziffer 6.**

> **Google Consent Mode v2**
>
> Wir setzen den Google Consent Mode v2 im Basis-Modus ein. Damit übermitteln wir
> Google Ihre Einwilligungsentscheidung in Form technischer Signale, damit Google
> die Daten entsprechend behandelt.
>
> **Vor Ihrer Einwilligung wird kein Skript von Google geladen und es findet
> keine Verbindung zu Servern von Google statt.** Es werden weder Cookies gesetzt
> noch personenbezogene Daten übertragen — auch keine sogenannten cookielosen
> Messimpulse, wie sie im erweiterten Betriebsmodus des Consent Mode üblich sind.
> Diesen erweiterten Modus setzen wir bewusst nicht ein.
>
> Erst wenn Sie der Kategorie „Statistik" zustimmen, wird der Google-Tag geladen
> und Ihre Einwilligung an Google übermittelt. Lehnen Sie ab oder widerrufen Sie
> später, übermitteln wir Google das Signal, dass keine Einwilligung vorliegt,
> und entfernen den Tag.
>
> Die gesetzten Signale betreffen die Speicherung für Analysezwecke
> (`analytics_storage`) sowie für Werbezwecke (`ad_storage`, `ad_user_data`,
> `ad_personalization`). Alle vier sind standardmäßig abgelehnt. Technisch
> notwendige Signale für Funktion und Sicherheit (`functionality_storage`,
> `security_storage`) sind dauerhaft aktiv.

### Baustein E — Lokal eingebundene Schriftarten
> ✅ **Eingebaut als Ziffer 9.** Inhaltlich unverändert, nur präzisiert.

> **Schriftarten**
>
> Diese Website nutzt die Schriftarten Urbanist und Hanken Grotesk. Beide sind
> lokal auf unserem eigenen Auslieferungspfad eingebunden und werden nicht von
> Servern Dritter nachgeladen. Es findet insbesondere **keine** Verbindung zu
> Google Fonts statt; es werden keine Daten an Google übermittelt. Eine
> Einwilligung ist hierfür nicht erforderlich.

### Baustein F — Selbst gehosteter Imagefilm
> ✅ **Eingebaut als Ziffer 10.**

> **Videoinhalte**
>
> Der auf der Startseite eingebundene Imagefilm liegt auf unserem eigenen
> Auslieferungspfad. Es werden keine Videoplattformen wie YouTube oder Vimeo
> eingebunden, es entsteht keine Verbindung zu Drittanbietern und es werden
> hierfür keine Cookies gesetzt.

### Baustein G — E-Mail-Versand über Resend
> ✅ **Bereits umgesetzt.** Ziffer 6 in `src/pages/datenschutz.astro` enthält
> diese Angaben jetzt; der interne Hinweiskasten wurde entfernt. Der Baustein
> bleibt hier als Referenz stehen.
>
> **Recherchierter Stand (Quelle: Resend-Doku, Stand 08/2026):**
> - Aufbewahrung: **30 Tage** für alle Tarife bis Scale, danach automatische
>   Löschung. Enterprise hat flexible Fristen. Nach Vertragsende Löschung
>   innerhalb von 90 Tagen.
> - Regionswahl (`eu-west-1` = Irland) steuert **nur, von wo aus gesendet wird**.
>   Kontodaten, E-Mail-Metadaten, Logs und API-Aufzeichnungen liegen laut
>   Resends eigener Dokumentation **unabhängig von der Sendregion in den USA**.
> - Resend, Inc. ist unter dem EU-US Data Privacy Framework zertifiziert, der
>   DPA enthält zusätzlich die Standardvertragsklauseln.

> **E-Mail-Versand über Resend**
>
> Die über das Anfrageformular übermittelten Angaben werden zur Zustellung an
> unser Postfach technisch über den E-Mail-Versanddienstleister Resend
> weitergeleitet. Anbieter ist die Resend, Inc., 2261 Market Street #5039,
> San Francisco, CA 94114, USA.
>
> **Verarbeitete Datenkategorien.** Sämtliche von Ihnen im Formular gemachten
> Angaben einschließlich Name, Unternehmen, E-Mail-Adresse und Telefonnummer
> sowie technische Metadaten des Versands (z. B. Zustellstatus, Zeitstempel).
>
> **Rechtsgrundlage.** Art. 6 Abs. 1 lit. b DSGVO, da der E-Mail-Versand ein
> technisches Hilfsmittel zur Bearbeitung Ihrer Anfrage ist.
>
> **Auftragsverarbeitung.** Mit Resend besteht ein Vertrag zur
> Auftragsverarbeitung nach Art. 28 DSGVO. Resend verarbeitet die Daten
> ausschließlich weisungsgebunden und nicht zu eigenen Zwecken.
>
> **Speicherdauer.** 30 Tage, danach automatische Löschung. Nach Beendigung des
> Vertrags Löschung innerhalb von 90 Tagen.
>
> **Drittlandübermittlung.** Der Versand erfolgt über die europäische
> Sendeinfrastruktur (Region Irland). Kontodaten, Protokolle und Metadaten
> werden in den USA verarbeitet; insoweit findet eine Drittlandübermittlung
> statt. Resend, Inc. ist unter dem EU-US Data Privacy Framework zertifiziert
> (Angemessenheitsbeschluss der EU-Kommission vom 10. Juli 2023); ergänzend
> enthält der Auftragsverarbeitungsvertrag die Standardvertragsklauseln nach
> Art. 46 Abs. 2 lit. c DSGVO.
>
> **Weitere Informationen.** <https://resend.com/legal/privacy-policy>

### Alternative zu Baustein G — nur bei schriftlicher EU-only-Zusage

> ⚠️ **Nur einsetzen, wenn Resend euch schriftlich bestätigt hat, dass auch
> Kontodaten, Logs und Metadaten ausschließlich in der EU verarbeitet werden**
> (z. B. über einen Enterprise-Vertrag mit EU-Datenresidenz). Nach der
> öffentlichen Resend-Dokumentation trifft das für die Standardtarife **nicht**
> zu. Ohne diese Zusage wäre der folgende Text eine unrichtige Angabe gegenüber
> den Betroffenen.

> Der Versand und die Speicherung der Versanddaten erfolgen ausschließlich auf
> Servern innerhalb der Europäischen Union. Eine Übermittlung in ein Drittland
> findet nicht statt. Mit Resend haben wir einen Vertrag zur
> Auftragsverarbeitung nach Art. 28 DSGVO geschlossen.

### Baustein H — Anfrageformular und Speicherung in Supabase
> ✅ **Eingebaut als Ziffer 7**, inklusive Supabase als Empfänger. Der interne
> Hinweiskasten wurde entfernt.

> **Anfrageformular**
>
> Über unser vierstufiges Anfrageformular können Interessenten Kontakt zu uns
> aufnehmen.
>
> **Welche Felder erhoben werden**
>
> | Schritt | Feld | Pflicht |
> |---|---|---|
> | 1 | Ist eine Fläche oder ein Grundstück vorhanden? | ja |
> | 2 | Ihre Rolle als Abnehmer | ja |
> | 3 | Geplantes Vorhaben | ja |
> | 3 | Geplante Anzahl an Einheiten | ja |
> | 3 | Gewünschtes Erwerbsmodell (Kauf oder Leasing) | ja |
> | 4 | Vollständiger Name | ja |
> | 4 | Unternehmen oder Organisation | freiwillig |
> | 4 | E-Mail-Adresse | ja |
> | 4 | Telefonnummer | ja |
>
> Das Formular enthält zusätzlich ein für Sie unsichtbares Feld zur
> Spam-Abwehr, das von Menschen nicht ausgefüllt wird.
>
> **Zweck.** Bearbeitung Ihrer Anfrage, Erstellung eines auf Ihr Vorhaben
> zugeschnittenen Angebots und Kontaktaufnahme durch unseren Vertrieb.
>
> **Rechtsgrundlage.** Die Verarbeitung erfolgt zur Durchführung
> vorvertraglicher Maßnahmen auf Ihre Anfrage hin nach Art. 6 Abs. 1 lit. b
> DSGVO.
>
> **Empfänger.** Ihre Angaben werden in einer Datenbank des Anbieters Supabase
> gespeichert und stehen unserem Vertrieb in einem passwortgeschützten internen
> Bereich zur Bearbeitung zur Verfügung. Zusätzlich werden sie uns per E-Mail
> über den Dienstleister Resend zugestellt (siehe vorstehenden Abschnitt). Beide
> Anbieter verarbeiten die Daten ausschließlich weisungsgebunden in unserem
> Auftrag.
>
> **Missbrauchsschutz.** Zur Abwehr automatisierter Massenanfragen begrenzen wir
> die Zahl der Absendevorgänge je IP-Adresse. Ihre IP-Adresse wird dabei
> ausschließlich flüchtig im Arbeitsspeicher verarbeitet und nicht dauerhaft
> gespeichert. Rechtsgrundlage ist unser berechtigtes Interesse an der Abwehr
> missbräuchlicher Nutzung (Art. 6 Abs. 1 lit. f DSGVO).
>
> **Speicherdauer.** Wir löschen Ihre Angaben, sobald sie für die Zweckerreichung
> nicht mehr erforderlich sind, spätestens nach Abschluss der Kundenbeziehung und
> unter Berücksichtigung handels- und steuerrechtlicher Aufbewahrungsfristen.
> Kommt kein Vertrag zustande, löschen wir Ihre Anfrage spätestens nach Ablauf
> von sechs Monaten.

> ⚠️ **Vor Veröffentlichung ergänzen:** Firmierung, Anschrift und
> Verarbeitungsregion von Supabase sowie die tatsächliche Löschfrist. Siehe
> offene Punkte O-3 und O-8. Ob eine gesonderte Einwilligungs-Checkbox nötig
> ist, ist juristisch zu klären.

### Baustein I — Interner Bereich für die Anfragenbearbeitung
> ⏸ **Bewusst NICHT eingebaut.** Der Bereich ist nicht öffentlich und von der
> Indexierung ausgenommen — ob er in die Datenschutzerklärung gehört, ist eine
> Ermessensentscheidung. Auf Zuruf einsetzbar.

> **Interner Bereich**
>
> Unter `/admin` betreiben wir einen passwortgeschützten internen Bereich, in dem
> unser Vertrieb eingegangene Anfragen einsehen und deren Bearbeitungsstand
> pflegen kann. Er richtet sich ausschließlich an unsere Mitarbeiter und ist von
> der Indexierung durch Suchmaschinen ausgenommen. Bei der Anmeldung wird ein
> technisch notwendiges, signiertes Sitzungs-Cookie gesetzt; zur Abwehr von
> Anmeldeversuchen durch Unbefugte wird die IP-Adresse flüchtig verarbeitet.
> Rechtsgrundlage ist unser berechtigtes Interesse an der Sicherheit dieses
> Bereichs (Art. 6 Abs. 1 lit. f DSGVO).

---

## Phase 4 — Cookie-Banner: Ist-Zustand und Bewertung

### Was der Banner jetzt anzeigt

Die Dienstlisten im Einstellungsdialog werden **nicht frei getextet**, sondern
aus `src/lib/consent/registry.ts` erzeugt. Der Satz „Derzeit sind in dieser
Kategorie keine Dienste im Einsatz" ist der Platzhalter für Kategorien ohne
aktiven Dienst und verschwindet automatisch, sobald einer aktiviert wird.

| Kategorie | Ist-Zustand nach diesem Stand |
|---|---|
| **Technisch notwendig** | Hosting & Sicherheit (Cloudflare, inkl. `__cf_bm`/30 Min.), Cloudflare Web Analytics — jetzt zusätzlich mit Anbieter und Speicherinformation |
| **Statistik** | **Google Analytics 4** mit Zweck, Anbieter, Cookies `_ga`/`_ga_<ID>` und 2 Jahren Laufzeit sowie Drittlandhinweis. Platzhalter verschwunden |
| **Marketing** | Weiterhin Platzhalter — **korrekt**, siehe unten |
| **Externe Inhalte** | Weiterhin Platzhalter — **korrekt**, siehe unten |

**Warum Marketing und Externe Inhalte leer bleiben:** Google Ads, Meta-Pixel und
Google Maps stehen mit `enabled: false` in der Registry. Es wird kein Skript
geladen, kein Request gesendet und kein Cookie gesetzt. Sie dort aufzuführen
wäre eine Falschangabe über eine Verarbeitung, die nicht stattfindet. Sobald
einer aktiviert wird, erscheint er automatisch — die fertigen Texte stehen in
Teil „Bei Aktivierung" unten.

**Zusätzlich korrigiert:** Die Kategorie „Statistik" war mit „anonym"
beschrieben. Das war vor GA4 zutreffend, ist es jetzt nicht mehr — GA4 setzt
Cookies und arbeitet mit pseudonymen Kennungen. Banner und Dialog sagen jetzt
„pseudonym".

### 1. Sind Ablehnen und Zustimmen gleichwertig?

**Ja.** Geprüft in `src/components/privacy/PrivacyBanner.astro`:

- Alle drei Aktionen liegen auf **derselben Ebene**, in einer Reihe, ohne
  Zwischenschritt: „Ablehnen", „Auswahl speichern", „Alle akzeptieren".
- „Ablehnen" ist **nicht** hinter „Einstellungen" versteckt — der klassische
  Dark-Pattern-Fall liegt nicht vor.
- Alle Schalter sind standardmäßig **aus**; es gibt keine Vorankreuzung.
- Ein Wegklicken ohne Entscheidung ist nicht möglich; das Banner hat kein
  „X" und keinen Klick-außerhalb-Schließer, der als Zustimmung gewertet würde.

**Ein Punkt zur Abwägung:** „Alle akzeptieren" trägt `btn--primary`
(dunkler Vollton), „Ablehnen" trägt `btn--ghost` (Umrandung). Die Aufsichts­behörden
(DSK-Beschluss zu Einwilligungsbannern) verlangen gleiche **Erreichbarkeit** und
keine irreführende Gestaltung; eine unterschiedliche Farbgebung bei gleicher
Größe, Position und Lesbarkeit wird überwiegend noch als zulässig angesehen, ist
aber der am häufigsten beanstandete Punkt. **Rechtssicherer wäre, beiden
Schaltflächen dieselbe visuelle Gewichtung zu geben.** Da das eine
Designänderung ist, habe ich sie nicht vorgenommen — sag Bescheid, wenn ich sie
umsetzen soll.

### 2. Lädt ohne Zustimmung wirklich kein einwilligungspflichtiges Skript?

**Ja — automatisiert geprüft, 34 von 34 sowie 13 von 13 Prüfungen bestanden.**

So prüfst du es selbst nach:

1. Seite in einem **privaten Fenster** öffnen (leerer Local Storage).
2. DevTools → **Netzwerk** öffnen, „Cache deaktivieren" anhaken, Seite neu laden.
3. Im Filterfeld `google` eingeben → **es darf keine einzige Zeile erscheinen.**
   Dasselbe mit `facebook`, `analytics` und `collect`.
4. Auf der Seite scrollen, FAQ öffnen, Rechner bedienen — der Filter muss leer
   bleiben.
5. In der **Konsole** eingeben:
   ```js
   window.dataLayer.map(a => Array.from(a))
   ```
   Es darf genau **ein** Eintrag erscheinen: `["consent","default",{…denied…}]`.
6. DevTools → **Anwendung → Cookies** → es darf kein `_ga` existieren.
7. Jetzt „Alle akzeptieren" klicken. Erst danach erscheint
   `googletagmanager.com/gtag/js?id=G-ZLHWPYQ9LJ` im Netzwerk-Tab und `_ga`
   unter Cookies.

> **Wichtig:** Auf Vorschau-Deployments (`*.pages.dev`) und lokal lädt Google
> Analytics **nie**, auch nicht nach Zustimmung — die Messung ist auf
> `tectum-modulbau.de` und `www.tectum-modulbau.de` begrenzt, damit Testklicks
> die Zahlen nicht verfälschen. Für den obigen Test also die Produktivdomain
> verwenden.

### 3. Funktioniert der Widerruf und löscht er gesetzte Cookies?

**Ja, beides — automatisiert geprüft.**

- Der Link „Datenschutz-Einstellungen" im Fußbereich und die runde Schaltfläche
  am linken Rand tragen beide `data-privacy-settings-trigger` und öffnen den
  Dialog **unabhängig vom aktuellen Zustand**, also auch nach erteilter
  Zustimmung.
- Banner und Dialog laufen durch dieselbe Funktion `decide()` → `applyConsent()`.
  Eine nachträgliche Änderung schlägt deshalb genauso durch wie die
  Erstentscheidung.
- Beim Widerruf wird `gtag.js` aus dem DOM entfernt, an Google ein
  `consent update` mit `denied` gesendet und alle Cookies mit dem Präfix `_ga`
  werden gelöscht (`deleteCookiesByPrefix` in `src/lib/analytics/gtag.ts`).
  Nachgeprüft mit einem gesetzten Test-Cookie: nach dem Widerruf ist
  `document.cookie` frei von `_ga`.

**So prüfst du es selbst:** Zustimmen → in der Konsole `document.cookie`
eingeben, `_ga` ist da → Fußbereich → „Datenschutz-Einstellungen" → „Nur
notwendige" → `document.cookie` erneut eingeben, `_ga` ist weg.

### Bei Aktivierung von Google Ads oder Meta-Pixel

Diese Texte erscheinen dann automatisch unter „Marketing":

> **Google Ads** — Erfolgsmessung von Werbekampagnen (Conversion-Tracking) und
> Remarketing. Anbieter: Google Ireland Limited. Setzt Cookies zur Zuordnung von
> Conversions und Remarketing-Listen (u. a. `_gcl_*`, Laufzeit bis zu 90 Tage).

> **Meta-Pixel** — Erfolgsmessung von Werbeanzeigen auf Facebook und Instagram
> sowie Bildung von Zielgruppen für Remarketing. Anbieter: Meta Platforms
> Ireland Limited. Setzt das Cookie `_fbp` zur Wiedererkennung von Browsern,
> Laufzeit bis zu 3 Monate.

**Was der Meta-Pixel bei Aktivierung tatsächlich sendet** (Zuordnung in
`src/lib/analytics/manifest.ts`, Feld `metaEvent`; weitergereicht von
`forwardToMeta()` in `src/lib/analytics/tracker.ts`):

| Ereignis auf der Website | Meta-Standardereignis |
|---|---|
| `form_start` | `InitiateCheckout` |
| `generate_lead` | `Lead` |
| `click_phone`, `click_email` | `Contact` |
| `calculator_configured` | `CustomizeProduct` |

Alle übrigen Ereignisse gehen ausschließlich an GA4. An Meta werden **keine
Parameter** übertragen — nur der Name des Standardereignisses.

Zusätzlich setzt `bootMetaPixel()` in `src/lib/analytics/meta.ts` vor dem
`init` die Option `autoConfig: false`. Damit ist Metas „Automatischer
erweiterter Abgleich" abgeschaltet: der Pixel liest keine Button-Beschriftungen
und keine Formularfeld-Inhalte aus. Ohne diese Zeile würde Meta genau die
Kontaktdaten einsammeln, die nach der Linie dieses Projekts nie an einen
Messdienst gehen dürfen. Der Schalter existiert auch im Meta Events Manager und
muss dort ebenfalls aus bleiben — im Zweifel gewinnt die Kontoeinstellung.

Zugehörige Datenschutz-Bausteine:

> **Google Ads Conversion-Tracking und Remarketing**
>
> Nach Ihrer Einwilligung nutzen wir Google Ads, einen Online-Werbedienst der
> Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Damit
> messen wir, ob ein Besuch unserer Website über eine unserer Werbeanzeigen
> zustande kam und ob er zu einer Anfrage geführt hat. Zusätzlich können wir
> Ihnen auf anderen Websites Werbung für unser Angebot anzeigen.
>
> Verarbeitet werden Cookie-Kennungen (u. a. `_gcl_au`, Laufzeit bis zu 90 Tage),
> die aufgerufene Seite sowie die Information, ob eine Anfrage abgesendet wurde.
> Kontaktdaten aus dem Anfrageformular übermitteln wir nicht an Google.
>
> Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und
> § 25 Abs. 1 TDDDG, jederzeit widerruflich über die Datenschutz-Einstellungen.
> Zur Drittlandübermittlung gilt das zu Google Analytics 4 Gesagte entsprechend.
> Weitere Informationen: <https://policies.google.com/privacy>

> **Meta-Pixel**
>
> Nach Ihrer Einwilligung setzen wir den Meta-Pixel der Meta Platforms Ireland
> Limited, Merrion Road, Dublin 4, Irland ein. Damit messen wir den Erfolg
> unserer Werbeanzeigen auf Facebook und Instagram.
>
> Verarbeitet werden Cookie-Kennungen (`_fbp`, Laufzeit bis zu 3 Monate),
> Ihre IP-Adresse, Angaben zu Browser und Endgerät sowie einzelne Interaktionen
> auf dieser Website: der Beginn und der Abschluss einer Anfrage, Klicks auf
> Telefon- und E-Mail-Links sowie die Nutzung des Ertragsrechners. Ihre
> Eingaben aus dem Anfrageformular — Name, Firma, E-Mail-Adresse und
> Telefonnummer — werden nicht an Meta übermittelt; der automatische erweiterte
> Abgleich ist deaktiviert. Sind Sie bei Facebook oder Instagram angemeldet,
> kann Meta die übermittelten Angaben Ihrem Nutzerkonto zuordnen.
>
> Für die Erhebung und Übermittlung der Daten sind wir und Meta gemeinsam
> Verantwortliche nach Art. 26 DSGVO. Die wesentlichen Inhalte der Vereinbarung
> finden Sie unter <https://www.facebook.com/legal/controller_addendum>.
>
> Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und
> § 25 Abs. 1 TDDDG, jederzeit widerruflich über die Datenschutz-Einstellungen.
> Meta verarbeitet Daten auch in den USA; Meta Platforms, Inc. ist unter dem
> EU-US Data Privacy Framework zertifiziert, ergänzend gelten die
> Standardvertragsklauseln. Weitere Informationen:
> <https://www.facebook.com/privacy/policy>

---

## Phase 5 — Offene Punkte

Diese Punkte lassen sich **nicht** aus dem Repository klären. Ich habe sie
bewusst nicht geraten.

### Verträge und Dokumentation

| Nr. | Punkt |
|---|---|
| **O-4** | **Auftragsverarbeitungsvertrag mit Cloudflare — jetzt dringend.** Ziffer 3 der veröffentlichten Datenschutzerklärung behauptet ihn. Cloudflares Standardbedingungen binden das Data Processing Addendum zwar regelmäßig ein, das ist aber zu bestätigen: Dashboard → Manage Account → Configurations → Data Protection Agreement. Trifft es nicht zu, ist der Satz in Ziffer 3 zu streichen. |
| ~~O-5~~ | ✅ **Erledigt.** AVV mit Resend nach Art. 28 DSGVO abgeschlossen (Angabe des Auftraggebers). Ziffer 6 der Datenschutzerklärung nennt ihn. Offen bleibt nur, die Liste der Unterauftragsverarbeiter (<https://resend.com/legal/subprocessors>) zur Kenntnis zu nehmen — sie ist überwiegend US-basiert. |
| **O-3** | **Auftragsverarbeitungsvertrag mit Supabase**, dazu die **Verarbeitungsregion** des Projekts (EU oder außerhalb) sowie die vollständige Firmierung und Anschrift der vertragsschließenden Gesellschaft. Beides steht nicht im Repository. |
| **O-9** | **Google-Verträge:** Data Processing Terms für Google Analytics akzeptieren (GA4 → Verwaltung → Kontoeinstellungen). Bei späterer Ads-Nutzung zusätzlich die Ads-Bedingungen, beim Meta-Pixel die Vereinbarung über gemeinsame Verantwortlichkeit nach Art. 26 DSGVO. |
| **O-10** | **Verzeichnis von Verarbeitungstätigkeiten** nach Art. 30 DSGVO. Aufzunehmen sind mindestens: Websitebetrieb/Logfiles, Reichweitenmessung, Anfrageformular, Lead-Verwaltung im internen Bereich, E-Mail-Versand. |
| **O-11** | **Prüfung, ob ein Datenschutzbeauftragter zu benennen ist** (§ 38 BDSG). |
| **O-12** | **Technisch-organisatorische Maßnahmen** dokumentieren, insbesondere wer Zugriff auf `/admin` und auf die Supabase-Konsole hat. |

### Cloudflare-Einstellungen, die ich nicht auslesen kann

Die Live-Seite ist aus meiner Arbeitsumgebung nicht erreichbar. Bitte im
Dashboard prüfen:

| Nr. | Punkt | So prüfst du es |
|---|---|---|
| **O-1** | **E-Mail-Verschleierung** (Scrape Shield → Email Address Obfuscation). Ist sie an, injiziert Cloudflare bei den `mailto:`-Links in Fußbereich, Impressum und Datenschutz ein Skript unter `/cdn-cgi/scripts/…/email-decode.min.js`. Das ist technisch notwendig und einwilligungsfrei, gehört aber in die Datenschutzerklärung. | Seitenquelltext der Live-Seite nach `email-protection` durchsuchen |
| **O-2** | **Cloudflare Web Analytics.** Ich habe den Dienst im Einstellungsdialog als notwendig gelistet, weil er so vereinbart war — das Skript kommt aber vom Dashboard, nicht aus dem Repository. **Ist er nicht eingeschaltet, beschreibt der Eintrag einen Dienst, den es nicht gibt.** Dann entweder einschalten oder den Registry-Eintrag `cloudflare-web-analytics` entfernen. | Cloudflare → Web Analytics → ist das Pages-Projekt gelistet? |
| **O-13** | **Bot Fight Mode / Managed Challenge.** Beide setzen Cookies (`__cf_bm`, `cf_clearance`). Baustein A nennt `__cf_bm` — das muss zum tatsächlichen Setup passen. | Security → Bots und Security → Settings |
| **O-14** | **Turnstile.** Aktuell nirgends im Code. Falls später als Spam-Schutz für das Formular eingesetzt, ist ein eigener Abschnitt nötig. | – |

### Inhaltliche Angaben, die ich von dir brauche

| Nr. | Frage |
|---|---|
| **O-15** | **Firmierung der Komplementär-GmbH** für die Vertretungsangabe im Impressum (siehe Phase 2). |
| **O-6** | **Aufbewahrungsdauer in GA4 auf 14 Monate stellen — jetzt dringend.** Ziffer 5 der veröffentlichten Datenschutzerklärung nennt 14 Monate. GA4 steht standardmäßig auf 2 Monate. Verwaltung → Datenaufbewahrung. Entweder umstellen oder die Zahl in Ziffer 5 anpassen. |
| **O-8** | **Löschfrist für Anfragen ohne Vertragsschluss.** Ziffer 7 nennt jetzt sechs Monate. Das war mein Vorschlag, keine Feststellung — bestätigen und in der Lead-Verwaltung auch tatsächlich einhalten, sonst steht eine Frist in der Erklärung, die niemand durchsetzt. |
| **O-7** | **Widerspruch zur Annahme „Resend liegt nicht in einem Drittland".** Resends eigene Dokumentation sagt: Die Regionswahl (`eu-west-1`, Irland) steuert nur, **von wo gesendet wird**. Kontodaten, E-Mail-Metadaten und Logs liegen **unabhängig davon in den USA**. Ziffer 6 ist deshalb mit Drittlandhinweis, DPF-Zertifizierung und SCC formuliert. **Nur wenn Resend euch schriftlich EU-only-Verarbeitung bestätigt hat**, kann der Alternativtext aus Phase 3 eingesetzt werden. |
| **O-16** | **Einwilligungs-Checkbox am Formular** — ob eine nötig ist, ist juristisch zu klären. Ziffer 7 stützt sich jetzt eindeutig auf Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen); die frühere Doppelnennung mit lit. f ist entfallen. |
| **O-17** | **Anschrift der Aufsichtsbehörde** (LDI NRW, Kavalleriestraße 2–4, 40213 Düsseldorf) — optional in Ziffer 9 ergänzen. |

### Interne Vermerke auf der Live-Seite

✅ **Erledigt.** Die beiden `<em>`-Kästen „Zur manuellen Prüfung" in Ziffer 5 und
Ziffer 6 von `src/pages/datenschutz.astro` wurden entfernt. Ziffer 6 enthält
stattdessen die belegten Angaben zu Auftragsverarbeitung, Speicherdauer und
Drittlandübermittlung; Ziffer 5 nennt die unmittelbare Zustellung an das eigene
Postfach.

### Stand der Datenschutzerklärung

✅ **Alle Bausteine sind eingebaut.** `src/pages/datenschutz.astro` hat jetzt
14 Ziffern und deckt jeden im Code nachweisbaren Dienst ab:

| Ziffer | Inhalt | Herkunft |
|---|---|---|
| 1–2 | Verantwortlicher, Allgemeines | unverändert |
| 3 | Website, Logfiles, **Cloudflare als CDN inkl. Drittland** | Baustein A |
| 4 | **Cookies, Einwilligungsverwaltung, Local/Session Storage** | Baustein B |
| 5 | **Google Analytics 4** | Baustein C |
| 6 | **Google Consent Mode v2** | Baustein D |
| 7 | Anfrageformular, **Supabase als Empfänger**, Ratenbegrenzung, Löschfristen | Baustein H |
| 8 | Resend inkl. AVV, 30 Tage, Drittland | Baustein G |
| 9 | Schriftarten (lokal) | Baustein E |
| 10 | **Videoinhalte (selbst gehostet)** | Baustein F |
| 11–14 | Betroffenenrechte, Beschwerderecht, SSL, Aktualität | unverändert, nur neu nummeriert |

Der frühere Satz „Diese Website kommt ohne nicht technisch notwendige Cookies
aus" ist ersatzlos entfallen — er war seit dem GA4-Einbau unzutreffend.

**Baustein I (interner Bereich `/admin`) wurde bewusst nicht eingebaut.** Der
Bereich ist nicht öffentlich und von der Indexierung ausgenommen; ob er in der
Datenschutzerklärung erscheinen soll, ist eine Ermessensentscheidung. Der
Baustein steht in Phase 3 bereit.

Zwei Angaben in den neuen Ziffern hängen von Einstellungen ab, die außerhalb des
Repositorys liegen — siehe O-4 und O-6.

---

## Hinweis

Die Texte in diesem Dokument sind sorgfältig am implementierten Verhalten
ausgerichtet und mit Fundstellen belegt. Sie sind **keine Rechtsberatung** und
ersetzen die Prüfung durch eine fachkundige Person nicht. Insbesondere die
Bewertung von Rechtsgrundlagen, Drittlandübermittlungen, Löschfristen und der
Gestaltung des Einwilligungsbanners bleibt der anwaltlichen Prüfung vorbehalten.
