<?xml version="1.0" encoding="UTF-8"?>
<!--
  Tectum Modulbau — Darstellung der XML-Sitemap im Browser.
  Für Suchmaschinen bleibt die Datei reines XML; dieses Stylesheet wird
  ausschliesslich von Browsern angewendet (siehe xslURL in astro.config.mjs).
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="s">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <!-- ============================ Seitengerüst ============================ -->
  <xsl:template match="/">
    <html lang="de">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex, follow"/>
        <title>XML-Sitemap | Tectum Modulbau</title>
        <link rel="icon" href="/favicon.png" type="image/png"/>
        <style>
          @font-face {
            font-family: 'Urbanist';
            src: url('/fonts/urbanist-latin-600-normal.woff2') format('woff2');
            font-weight: 600; font-style: normal; font-display: swap;
          }
          @font-face {
            font-family: 'Urbanist';
            src: url('/fonts/urbanist-latin-700-normal.woff2') format('woff2');
            font-weight: 700; font-style: normal; font-display: swap;
          }
          @font-face {
            font-family: 'Urbanist';
            src: url('/fonts/urbanist-latin-800-normal.woff2') format('woff2');
            font-weight: 800; font-style: normal; font-display: swap;
          }
          @font-face {
            font-family: 'Hanken Grotesk';
            src: url('/fonts/hanken-grotesk-latin-300-normal.woff2') format('woff2');
            font-weight: 300; font-style: normal; font-display: swap;
          }
          @font-face {
            font-family: 'Hanken Grotesk';
            src: url('/fonts/hanken-grotesk-latin-400-normal.woff2') format('woff2');
            font-weight: 400; font-style: normal; font-display: swap;
          }

          :root {
            --ink: #14130f;
            --ink-soft: #2c2b25;
            --muted: #7a7a72;
            --paper: #ffffff;
            --stone: #f2f4f5;
            --sand: #eeecea;
            --line: #e3e1dd;
            --accent: #c8a96e;
            --radius: 14px;
            --radius-lg: 22px;
            --shadow-sm: 0 2px 10px rgba(20, 19, 15, 0.06);
            --shadow-md: 0 12px 40px rgba(20, 19, 15, 0.10);
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            font-family: 'Hanken Grotesk', system-ui, sans-serif;
            font-weight: 300;
            font-size: 1rem;
            line-height: 1.65;
            color: var(--ink);
            background: var(--paper);
            -webkit-font-smoothing: antialiased;
          }

          h1, h2, h3 {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 700;
            line-height: 1.12;
            letter-spacing: -0.015em;
            margin: 0 0 0.6em;
          }

          a { color: inherit; }

          .wrap {
            width: 100%;
            max-width: 1180px;
            margin-inline: auto;
            padding-inline: clamp(1.25rem, 5vw, 3rem);
          }

          /* ---------------- Kopfzeile ---------------- */
          .topbar {
            background: var(--ink);
            color: var(--paper);
            padding-block: 1.1rem;
          }
          .topbar .wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
          }
          .brand {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 800;
            font-size: 1.1rem;
            letter-spacing: -0.01em;
            text-decoration: none;
            color: var(--paper);
          }
          .brand em {
            font-style: normal;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.55);
          }
          .topbar-link {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.75);
            text-decoration: none;
            border-bottom: 1px solid rgba(200, 169, 110, 0.5);
            padding-bottom: 2px;
          }
          .topbar-link:hover { color: var(--accent); }

          /* ---------------- Titelbereich ---------------- */
          .hero {
            background: var(--sand);
            border-bottom: 1px solid var(--line);
            padding-block: clamp(2.5rem, 6vw, 4rem);
          }
          .kicker {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 600;
            font-size: 0.78rem;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--accent);
            margin: 0 0 0.7rem;
          }
          .hero h1 {
            font-size: clamp(2rem, 4.5vw, 3.1rem);
            font-weight: 800;
            margin-bottom: 0.4em;
          }
          .hero p.lead {
            max-width: 640px;
            color: var(--ink-soft);
            margin: 0;
          }

          .stats {
            display: flex;
            flex-wrap: wrap;
            gap: 0.9rem;
            margin-top: 2rem;
          }
          .stat {
            background: var(--paper);
            border: 1px solid var(--line);
            border-radius: var(--radius);
            padding: 0.9rem 1.3rem;
            box-shadow: var(--shadow-sm);
            min-width: 150px;
          }
          .stat-value {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 800;
            font-size: 1.7rem;
            line-height: 1.1;
            display: block;
          }
          .stat-label {
            font-size: 0.8rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--muted);
          }

          /* ---------------- Tabelle ---------------- */
          .section { padding-block: clamp(2.5rem, 6vw, 4rem); }

          .table-card {
            border: 1px solid var(--line);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-md);
            background: var(--paper);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95rem;
          }
          thead th {
            background: var(--stone);
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 700;
            font-size: 0.76rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--ink-soft);
            text-align: left;
            padding: 1rem 1.2rem;
            border-bottom: 1px solid var(--line);
            white-space: nowrap;
          }
          tbody td {
            padding: 1.05rem 1.2rem;
            border-bottom: 1px solid var(--line);
            vertical-align: middle;
          }
          tbody tr:last-child td { border-bottom: 0; }
          tbody tr:hover { background: #faf9f8; }

          .idx {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 700;
            color: var(--muted);
            font-size: 0.85rem;
            width: 1%;
          }
          .u-path {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 700;
            font-size: 1.02rem;
            text-decoration: none;
            display: inline-block;
          }
          .u-path:hover { color: var(--accent); }
          .u-full {
            display: block;
            font-size: 0.8rem;
            color: var(--muted);
            word-break: break-all;
            margin-top: 2px;
          }

          .badge {
            display: inline-block;
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 600;
            font-size: 0.75rem;
            letter-spacing: 0.04em;
            padding: 0.28rem 0.7rem;
            border-radius: 999px;
            background: var(--sand);
            color: var(--ink-soft);
            white-space: nowrap;
          }

          .prio { display: flex; align-items: center; gap: 0.6rem; }
          .prio-num {
            font-family: 'Urbanist', system-ui, sans-serif;
            font-weight: 700;
            font-size: 0.85rem;
            min-width: 2.1rem;
          }
          .prio-track {
            flex: 1;
            height: 6px;
            min-width: 60px;
            background: var(--sand);
            border-radius: 999px;
            overflow: hidden;
          }
          .prio-fill {
            display: block;
            height: 100%;
            background: var(--accent);
            border-radius: 999px;
          }

          .dim { color: var(--muted); }
          .nowrap { white-space: nowrap; }

          /* ---------------- Hinweisbox ---------------- */
          .note {
            background: var(--stone);
            border-radius: var(--radius-lg);
            padding: clamp(1.4rem, 3vw, 2rem);
            margin-top: 2rem;
            border: 1px solid var(--line);
          }
          .note h2 {
            font-size: 1.15rem;
            margin-bottom: 0.5em;
          }
          .note p { margin: 0 0 0.7em; color: var(--ink-soft); font-size: 0.95rem; }
          .note p:last-child { margin-bottom: 0; }
          .note code {
            background: var(--paper);
            border: 1px solid var(--line);
            border-radius: 6px;
            padding: 0.1rem 0.4rem;
            font-size: 0.88em;
          }

          /* ---------------- Fusszeile ---------------- */
          .foot {
            background: var(--ink);
            color: rgba(255, 255, 255, 0.6);
            padding-block: 2rem;
            font-size: 0.86rem;
            margin-top: clamp(2rem, 5vw, 3.5rem);
          }
          .foot a { color: var(--accent); text-decoration: none; }

          @media (max-width: 720px) {
            thead { display: none; }
            tbody td { display: block; border-bottom: 0; padding: 0.35rem 1.2rem; }
            tbody td.idx { display: none; }
            tbody td:first-child { padding-top: 1.1rem; }
            tbody tr { display: block; border-bottom: 1px solid var(--line); padding-bottom: 0.9rem; }
            tbody tr:last-child { border-bottom: 0; }
          }
        </style>
      </head>
      <body>
        <header class="topbar">
          <div class="wrap">
            <a class="brand" href="/">Tectum <em>Modulbau</em></a>
            <a class="topbar-link" href="/">Zurück zur Website</a>
          </div>
        </header>

        <xsl:apply-templates select="s:sitemapindex"/>
        <xsl:apply-templates select="s:urlset"/>

        <footer class="foot">
          <div class="wrap">
            Diese Datei ist eine XML-Sitemap für Suchmaschinen.
            Sie wird von <a href="https://www.google.com/webmasters/tools/">Google Search Console</a>
            und anderen Crawlern automatisch ausgelesen —
            die hier sichtbare Gestaltung sehen nur Menschen im Browser.
          </div>
        </footer>
      </body>
    </html>
  </xsl:template>

  <!-- ====================== Ansicht: Sitemap-Index ====================== -->
  <xsl:template match="s:sitemapindex">
    <section class="hero">
      <div class="wrap">
        <p class="kicker">Sitemap-Index</p>
        <h1>XML-Sitemap</h1>
        <p class="lead">
          Diese Datei bündelt alle Einzel-Sitemaps der Website. Genau diese Adresse
          wird in der Google Search Console eingereicht — Google folgt den Verweisen
          anschliessend selbstständig.
        </p>
        <div class="stats">
          <div class="stat">
            <span class="stat-value"><xsl:value-of select="count(s:sitemap)"/></span>
            <span class="stat-label">Sitemap-Dateien</span>
          </div>
          <div class="stat">
            <span class="stat-value">Index</span>
            <span class="stat-label">Dateityp</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th class="idx">#</th>
                <th>Sitemap-Datei</th>
                <th>Zuletzt geändert</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:sitemap">
                <tr>
                  <td class="idx"><xsl:value-of select="position()"/></td>
                  <td>
                    <a class="u-path" href="{s:loc}">
                      <xsl:call-template name="pfad">
                        <xsl:with-param name="loc" select="s:loc"/>
                      </xsl:call-template>
                    </a>
                    <span class="u-full"><xsl:value-of select="s:loc"/></span>
                  </td>
                  <td class="nowrap">
                    <xsl:call-template name="datum">
                      <xsl:with-param name="wert" select="s:lastmod"/>
                    </xsl:call-template>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>

        <div class="note">
          <h2>In der Google Search Console einreichen</h2>
          <p>
            Unter <strong>Search Console → Sitemaps</strong> genügt der Eintrag
            <code>sitemap-index.xml</code>. Alle darin verlinkten Dateien werden
            automatisch mitgelesen; einzelne Sitemaps müssen nicht separat
            hinzugefügt werden.
          </p>
          <p>
            Zusätzlich verweist die <a href="/robots.txt">robots.txt</a> auf diese
            Sitemap, damit auch andere Suchmaschinen sie ohne manuelle Anmeldung finden.
          </p>
        </div>
      </div>
    </section>
  </xsl:template>

  <!-- ======================= Ansicht: URL-Liste ======================= -->
  <xsl:template match="s:urlset">
    <section class="hero">
      <div class="wrap">
        <p class="kicker">Seitenverzeichnis</p>
        <h1>XML-Sitemap</h1>
        <p class="lead">
          Alle indexierbaren Seiten dieser Website — mit Priorität, erwarteter
          Änderungsfrequenz und Datum der letzten Änderung.
        </p>
        <div class="stats">
          <div class="stat">
            <span class="stat-value"><xsl:value-of select="count(s:url)"/></span>
            <span class="stat-label">Seiten gesamt</span>
          </div>
          <div class="stat">
            <span class="stat-value">
              <xsl:call-template name="datum">
                <xsl:with-param name="wert" select="s:url/s:lastmod[not(. &lt; ../../s:url/s:lastmod)][1]"/>
              </xsl:call-template>
            </span>
            <span class="stat-label">Letzte Änderung</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th class="idx">#</th>
                <th>Seite</th>
                <th>Priorität</th>
                <th>Frequenz</th>
                <th>Zuletzt geändert</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:url">
                <xsl:sort select="s:priority" data-type="number" order="descending"/>
                <tr>
                  <td class="idx"><xsl:value-of select="position()"/></td>
                  <td>
                    <a class="u-path" href="{s:loc}">
                      <xsl:call-template name="pfad">
                        <xsl:with-param name="loc" select="s:loc"/>
                      </xsl:call-template>
                    </a>
                    <span class="u-full"><xsl:value-of select="s:loc"/></span>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="s:priority">
                        <span class="prio">
                          <span class="prio-num"><xsl:value-of select="format-number(s:priority, '0.0')"/></span>
                          <span class="prio-track">
                            <span class="prio-fill" style="width:{format-number(s:priority * 100, '0')}%"></span>
                          </span>
                        </span>
                      </xsl:when>
                      <xsl:otherwise><span class="dim">—</span></xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td>
                    <xsl:choose>
                      <xsl:when test="s:changefreq">
                        <span class="badge">
                          <xsl:call-template name="frequenz">
                            <xsl:with-param name="wert" select="s:changefreq"/>
                          </xsl:call-template>
                        </span>
                      </xsl:when>
                      <xsl:otherwise><span class="dim">—</span></xsl:otherwise>
                    </xsl:choose>
                  </td>
                  <td class="nowrap">
                    <xsl:call-template name="datum">
                      <xsl:with-param name="wert" select="s:lastmod"/>
                    </xsl:call-template>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>

        <div class="note">
          <h2>Was diese Angaben bedeuten</h2>
          <p>
            <strong>Priorität</strong> und <strong>Frequenz</strong> sind Hinweise an
            Suchmaschinen, keine Anweisungen — Google entscheidet eigenständig, wie oft
            eine Seite besucht wird. Verbindlich ist allein die Liste der URLs.
          </p>
          <p>
            Abschnitte einer Seite (etwa <code>/#module</code>) erscheinen bewusst nicht
            als eigene Einträge: Sprungmarken sind keine eigenständigen Adressen und
            werden von Suchmaschinen in Sitemaps ignoriert.
          </p>
        </div>
      </div>
    </section>
  </xsl:template>

  <!-- ============================ Hilfsroutinen ============================ -->

  <!-- Vollständige URL auf den Pfadanteil reduzieren (domainunabhängig) -->
  <xsl:template name="pfad">
    <xsl:param name="loc"/>
    <xsl:variable name="ohneSchema" select="substring-after($loc, '://')"/>
    <xsl:variable name="pfad" select="concat('/', substring-after($ohneSchema, '/'))"/>
    <xsl:choose>
      <xsl:when test="$pfad = '/'">Startseite</xsl:when>
      <xsl:otherwise><xsl:value-of select="$pfad"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ISO-Datum als TT.MM.JJJJ ausgeben -->
  <xsl:template name="datum">
    <xsl:param name="wert"/>
    <xsl:choose>
      <xsl:when test="string-length($wert) &gt;= 10">
        <xsl:value-of select="substring($wert, 9, 2)"/>
        <xsl:text>.</xsl:text>
        <xsl:value-of select="substring($wert, 6, 2)"/>
        <xsl:text>.</xsl:text>
        <xsl:value-of select="substring($wert, 1, 4)"/>
      </xsl:when>
      <xsl:otherwise><span class="dim">—</span></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Änderungsfrequenz auf Deutsch -->
  <xsl:template name="frequenz">
    <xsl:param name="wert"/>
    <xsl:choose>
      <xsl:when test="$wert = 'always'">Laufend</xsl:when>
      <xsl:when test="$wert = 'hourly'">Stündlich</xsl:when>
      <xsl:when test="$wert = 'daily'">Täglich</xsl:when>
      <xsl:when test="$wert = 'weekly'">Wöchentlich</xsl:when>
      <xsl:when test="$wert = 'monthly'">Monatlich</xsl:when>
      <xsl:when test="$wert = 'yearly'">Jährlich</xsl:when>
      <xsl:when test="$wert = 'never'">Unverändert</xsl:when>
      <xsl:otherwise><xsl:value-of select="$wert"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
