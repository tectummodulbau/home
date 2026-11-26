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

