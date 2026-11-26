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

Wegweiser: Eingesetzte Dienste, Mess ID, Consent Architektur und Registry stehen in docs/TRACKING_UND_CONSENT.md. Lesen vor Änderungen an Tracking, Diensten oder Consent.

## Tracking-Hilfsfunktion

Wegweiser: Tracking Hilfsfunktion, Meta Pixel und die komplette Event Liste stehen in docs/TRACKING_EVENTS.md. Lesen bei neuen oder geänderten Events.

## Admin-Bereich

Wegweiser: Der Admin Bereich und die Analyseübersicht stehen in docs/ADMIN_BEREICH.md. Lesen bei Arbeit an /admin.

## Suchmaschinen-Metadaten

Wegweiser: Suchmaschinen Metadaten und strukturierte Daten stehen in docs/SEO_UND_STRUKTURIERTE_DATEN.md. Lesen bei Metadaten, FAQ oder Schema.

## Verifikation

Wegweiser: Die Verifikation des Trackings steht in docs/VERIFIKATION.md. Lesen vor dem Livegang und nach Tracking Änderungen.

## Datenschutz und Consent

Wegweiser: Dienstetabelle, Pflichten bei neuen Diensten und der Aufbau der Datenschutzerklärung stehen in docs/DATENSCHUTZ.md. Lesen bei jedem neuen Dienst und bei Textänderungen.

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
