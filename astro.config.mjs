// @ts-check
import { execFileSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://tectum-modulbau.de';

/** Fallback, falls die Git-Historie beim Build nicht verfügbar ist. */
const buildDate = new Date();

/**
 * Datum des letzten Commits, der eine der übergebenen Dateien/Ordner berührt hat.
 * Cloudflare Pages klont das Repository, `git log` steht dort zur Verfügung.
 * Bei flachen Clones ohne Historie greift der Fallback auf das Build-Datum.
 */
function lastCommit(...pfade) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...pfade], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? new Date(out) : buildDate;
  } catch {
    return buildDate;
  }
}

// Die Startseite ist ein One-Pager aus vielen Komponenten — deshalb zählt hier
// jede Änderung an den Komponenten mit, nicht nur an index.astro selbst.
const lastmodStart = lastCommit('src/pages/index.astro', 'src/components');
const lastmodImpressum = lastCommit('src/pages/impressum.astro');
const lastmodDatenschutz = lastCommit('src/pages/datenschutz.astro');

// Statischer Build für Cloudflare Pages (Build-Output: dist/)
export default defineConfig({
  site: SITE,
  output: 'static',
  compressHTML: true,
  integrations: [
    sitemap({
      // Admin-Bereich und API laufen über Cloudflare Functions und gehören nicht in den Index
      filter: (page) => !page.includes('/admin') && !page.includes('/api/'),
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: buildDate,
      // Menschenlesbare Darstellung im Browser; für Crawler bleibt es reines XML
      xslURL: '/sitemap.xsl',
      serialize(item) {
        const pfad = item.url.replace(SITE, '');

        if (pfad === '/') {
          item.changefreq = 'weekly';
          item.priority = 1.0;
          item.lastmod = lastmodStart.toISOString();
        } else if (pfad.startsWith('/impressum')) {
          item.changefreq = 'yearly';
          item.priority = 0.3;
          item.lastmod = lastmodImpressum.toISOString();
        } else if (pfad.startsWith('/datenschutz')) {
          item.changefreq = 'yearly';
          item.priority = 0.3;
          item.lastmod = lastmodDatenschutz.toISOString();
        }

        return item;
      },
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  image: {
    // Bilder liegen lokal in src/assets und werden beim Build optimiert
    remotePatterns: [],
  },
});
