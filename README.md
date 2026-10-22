# Tectum Modulbau — Website

Neuaufbau von [tectum-modulbau.de](https://tectum-modulbau.de) als statische
[Astro](https://astro.build)-Site für Cloudflare Pages — als Ablösung der
bisherigen WordPress-Installation.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `src/pages/index.astro` | Landingpage (alle Sektionen) |
| `src/pages/impressum.astro`, `datenschutz.astro` | Rechtsseiten |
| `src/components/` | Sektionen als einzelne Komponenten (Hero, Module, Rechner, LeadForm, …) |
| `src/assets/` | Bilder (werden beim Build automatisch optimiert, inkl. WebP) |
| `functions/api/lead.ts` | Cloudflare Pages Function: nimmt Formular-Anfragen entgegen, speichert sie in D1 und versendet sie per E-Mail |
| `functions/admin/login.ts` | Login-Formular im Tectum-Design (`/admin/login`) |
| `functions/admin/logout.ts` | Löscht das Session-Cookie |
| `functions/admin/leads.ts` | Passwortgeschützte Leads-Übersicht im Tectum-Design (`/admin/leads`), Kartenliste mit Status-Filter |
| `functions/admin/leads/status.ts` | Aktualisiert den Status eines Leads (aufgerufen per fetch() aus dem Dropdown) |
| `functions/admin/_middleware.ts` | Session-Cookie-Schutz für alles unter `/admin/*` (leitet ohne gültige Session zu `/admin/login` um) |
| `functions/admin/_lib/session.ts` | Signierte, zustandslose Session-Cookies (HMAC, kein KV/DB nötig) |
| `functions/admin/_lib/status.ts` | Zentrale Liste der Lead-Status (neu/kontaktiert/warm/abgeschlossen/abgelehnt) |
| `functions/admin/_lib/theme.ts` | Gemeinsame HTML-Hülle (Farben/Fonts/Header) für Login & Leads-Übersicht |
| `public/fonts/` | Selbst gehostete Font-Dateien (Urbanist, Hanken Grotesk) für die Admin-Seiten |
| `d1/schema.sql` | SQL zum Anlegen der `leads`-Tabelle in Cloudflare D1 |

## Lokal entwickeln

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal testen
```

## Deployment auf Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Repository `hennebergwebdesign/tectum-modulbau` auswählen
3. Build-Einstellungen:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deployen — das Verzeichnis `functions/` wird von Cloudflare Pages automatisch
   als Serverless Functions erkannt (`/api/lead`).

### Formular-Versand konfigurieren

Das 4-Schritte-Formular sendet an `/api/lead`. Damit die Anfragen per E-Mail
ankommen, in Cloudflare Pages unter **Settings → Environment variables**
folgende Variablen setzen (Anbieter: [Resend](https://resend.com), Domain dort
verifizieren):

| Variable | Beispiel |
| --- | --- |
| `RESEND_API_KEY` | `re_…` |
| `LEAD_TO_EMAIL` | `stankovic@ecobau-tectum.de` |
| `LEAD_FROM_EMAIL` | `anfrage@tectum-modulbau.de` |

Ohne `RESEND_API_KEY` antwortet der Endpoint mit Erfolg und loggt die Anfrage
nur (praktisch für Previews). Alternativ lässt sich in `functions/api/lead.ts`
jeder andere Mail-Dienst anbinden.

### Leads in D1 speichern + geschützte Leads-Liste

Jede Anfrage wird zusätzlich zur E-Mail in einer Cloudflare-D1-Datenbank
gespeichert und ist unter `/admin/leads` als passwortgeschützte Übersicht
abrufbar.

**1. D1-Datenbank anlegen und verbinden**

- Im Cloudflare-Dashboard unter **Storage & Databases → D1** die Datenbank
  `leads` anlegen (ist bereits geschehen).
- Die Tabelle anlegen: `npx wrangler d1 execute leads --remote --file=d1/schema.sql`
  oder den Inhalt von `d1/schema.sql` in der D1-Konsole ausführen.
- In `wrangler.toml` bei `[[d1_databases]]` die echte `database_id` eintragen
  (Dashboard → D1 → leads → UUID). Das Binding heißt `DB`.

**2. Umgebungsvariablen in Cloudflare Pages setzen**

| Variable | Beispiel | Sichtbarkeit |
| --- | --- | --- |
| `ADMIN_USER` | `admin` (optional, Default: `admin`) | normal |
| `ADMIN_PASSWORD` | ein starkes, einmaliges Passwort | **verschlüsselt/Secret** |

Ohne D1-Binding wird der Insert übersprungen (nur geloggt) — das Formular
funktioniert trotzdem weiter über E-Mail. Ohne `ADMIN_PASSWORD` ist
`/admin/leads` komplett gesperrt (Status 503).

**3. Zugriff auf die Leads-Liste**

`https://tectum-modulbau.de/admin/leads` aufrufen — ohne gültige Sitzung
leitet die Seite zum Login (`/admin/login`) weiter. Danach erscheint jeder Lead
als Karte (Stammdaten und Vorhaben gruppiert) mit Status-Dropdown (Neuer Lead /
Kontaktiert / Warm / Abgeschlossen / Abgelehnt) und Filter nach Status.
Status-Änderungen werden sofort in D1 gespeichert. Die Sitzung läuft nach
12 Stunden ab; „Abmelden" beendet sie sofort. Die Seiten sind
per `robots: noindex` ausgeschlossen und nie im statischen Build enthalten.

Die Anmeldung nutzt ein signiertes, zustandsloses Session-Cookie (HMAC mit
`ADMIN_PASSWORD` als Schlüssel, `HttpOnly`, `Secure`, `SameSite=Lax`) statt
des nativen Basic-Auth-Dialogs des Browsers — kein KV/DB nötig, kein
ungeschützter Zwischenzustand.

**Lokal mit Functions testen** (Login/Leads-Seite laufen nicht unter
`npm run dev`, nur unter Wrangler):

```bash
npm run build
npx wrangler pages dev dist   # benötigt lokale .dev.vars (siehe .gitignore) mit
                               # ADMIN_USER, ADMIN_PASSWORD; D1 lokal mit --d1=DB
```

## Unterschiede zur WordPress-Seite

- **Ein Step-Formular auf einer Seite** statt vier verketteter Unterseiten
  (`/kunde/`, `/zielsetzung/`, `/angaben/`) — gleiche Felder und Optionen,
  mit Fortschrittsbalken, Zurück-Navigation und Zusammenfassung.
- **Doppelte Inhalte entfernt**: Die Modul-Karten waren im Original dreifach
  im Markup, die FAQ-Frage zu Isolierungsstandards doppelt (beide Antworten
  wurden zu einer zusammengeführt).
- **Neue Zwischenabschnitte**: Zahlen-Band (GEG, U-Wert, Lieferzeit,
  Ganzjahresbetrieb), Galerie „Einblicke", Trust-Bar mit Zertifikatslogos im
  Hero.
- **Performance**: keine WordPress/Plugin-Payload, selbst gehostete Fonts,
  beim Build optimierte Bilder, minimales Vanilla-JS (Rechner, Formular,
  Akkordeon, Navigation).
- Der Ertragsrechner übernimmt die Original-Berechnungslogik unverändert.
