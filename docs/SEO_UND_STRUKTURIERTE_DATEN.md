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

