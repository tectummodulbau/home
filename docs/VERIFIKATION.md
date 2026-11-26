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

