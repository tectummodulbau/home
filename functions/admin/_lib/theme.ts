/**
 * Gemeinsame HTML-Hülle für die Admin-Seiten (Login, Analyse, Leads). Übernimmt
 * Farben, Fonts und Grundformen 1:1 aus src/styles/global.css, damit der
 * Bereich optisch nicht wie ein separates Tool wirkt. Fonts werden
 * selbst gehostet aus /fonts (siehe public/fonts) — keine externen
 * Requests, exakt wie auf der Hauptseite.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SHARED_STYLE = `
  @font-face {
    font-family: 'Urbanist';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url('/fonts/urbanist-latin-600-normal.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Urbanist';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('/fonts/urbanist-latin-700-normal.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Urbanist';
    font-style: normal;
    font-weight: 800;
    font-display: swap;
    src: url('/fonts/urbanist-latin-800-normal.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Hanken Grotesk';
    font-style: normal;
    font-weight: 300;
    font-display: swap;
    src: url('/fonts/hanken-grotesk-latin-300-normal.woff2') format('woff2');
  }
  @font-face {
    font-family: 'Hanken Grotesk';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('/fonts/hanken-grotesk-latin-400-normal.woff2') format('woff2');
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
    --green: #2a6b3c;
    --red: #b3402f;
    --font-head: 'Urbanist', system-ui, sans-serif;
    --font-body: 'Hanken Grotesk', system-ui, sans-serif;
    --radius: 14px;
    --radius-lg: 22px;
    --shadow-sm: 0 2px 10px rgba(20, 19, 15, 0.06);
    --shadow-md: 0 12px 40px rgba(20, 19, 15, 0.1);
    color-scheme: light;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 300;
    font-size: 1.0625rem;
    line-height: 1.6;
    color: var(--ink);
    background: var(--stone);
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 {
    font-family: var(--font-head);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.01em;
    margin: 0 0 0.4em;
  }

  a { color: inherit; }

  .admin-header {
    padding: clamp(1rem, 3vw, 1.6rem) clamp(1rem, 4vw, 2.5rem) 0;
  }
  .admin-header__inner {
    max-width: 1600px;
    margin-inline: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    padding-inline: 1.4rem;
    border-radius: 999px;
    background: var(--ink);
    box-shadow: var(--shadow-md);
  }
  .admin-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    font-family: var(--font-head);
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: -0.01em;
    color: var(--paper);
  }
  .admin-brand em {
    font-style: normal;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.55);
  }
  .admin-tag {
    font-family: var(--font-head);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
  }
  .admin-header__left {
    display: flex;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 1.8rem);
    min-width: 0;
  }

  .admin-nav {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .admin-nav a {
    font-family: var(--font-head);
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    border-radius: 999px;
    padding: 0.42rem 0.9rem;
    white-space: nowrap;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .admin-nav a:hover { color: var(--paper); background: rgba(255, 255, 255, 0.08); }
  .admin-nav a[aria-current='page'] {
    color: var(--ink);
    background: var(--paper);
  }

  @media (max-width: 680px) {
    .admin-header__inner {
      height: auto;
      min-height: 60px;
      border-radius: var(--radius-lg);
      padding: 0.85rem 1.1rem;
      flex-wrap: wrap;
      gap: 0.7rem;
    }
    .admin-nav { order: 3; width: 100%; }
    .admin-nav a { padding: 0.4rem 0.8rem; }
  }

  .admin-logout {
    font-family: var(--font-head);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--paper);
    text-decoration: none;
    border: 1.5px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
    padding: 0.5rem 1.1rem;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .admin-logout:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .admin-main {
    max-width: 1600px;
    margin-inline: auto;
    padding: clamp(1.5rem, 4vw, 2.8rem) clamp(1rem, 4vw, 2.5rem) clamp(3rem, 6vw, 5rem);
  }

  /* Seitenkopf, Kicker, Chip und .muted stehen hier und nicht in den
     einzelnen Seiten: sie werden von /admin/analyse und /admin/leads
     gleichermaßen benutzt, und zwei Kopien wären genau die Art Duplikat,
     die beim nächsten Feinschliff auseinanderläuft. */
  .page-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.4rem;
  }
  .page-head h1 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0; }

  .section-kicker {
    display: inline-block;
    font-family: var(--font-head);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 0.5rem;
  }

  .chip {
    display: inline-block;
    font-family: var(--font-head);
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.4rem 0.95rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--paper);
    white-space: nowrap;
  }

  .muted { color: var(--muted); }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: var(--font-head);
    font-size: 0.98rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-decoration: none;
    border-radius: 999px;
    padding: 0.9rem 1.7rem;
    border: 1.5px solid transparent;
    cursor: pointer;
    background: var(--ink);
    color: var(--paper);
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .btn:hover { background: #000; }
  .btn:active { transform: scale(0.98); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export function pageShell(opts: { title: string; bodyClass?: string; content: string }): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(opts.title)} — Tectum Modulbau</title>
<link rel="icon" href="/favicon.png" type="image/png">
<style>${SHARED_STYLE}</style>
</head>
<body class="${opts.bodyClass ?? ''}">
${opts.content}
</body>
</html>`;
}

/**
 * Die Seiten des angemeldeten Bereichs, in Reihenfolge. Die Analyseübersicht
 * steht vor den Anfragen und ist zugleich das Ziel von /admin.
 */
export const ADMIN_PAGES = [
  { key: 'analyse', label: 'Analyse', href: '/admin/analyse' },
  { key: 'leads', label: 'Anfragen', href: '/admin/leads' },
] as const;

export type AdminPageKey = (typeof ADMIN_PAGES)[number]['key'];

/**
 * Kopfleiste. Mit `active` erscheint die Navigation des angemeldeten
 * Bereichs, ohne (Login-Seite) nur die Bereichsbezeichnung aus `tag`.
 */
export function adminHeader(opts: { tag: string; showLogout?: boolean; active?: AdminPageKey }): string {
  const nav = opts.active
    ? `<nav class="admin-nav" aria-label="Admin-Bereich">${ADMIN_PAGES.map(
        (page) =>
          `<a href="${page.href}"${page.key === opts.active ? ' aria-current="page"' : ''}>${escapeHtml(
            page.label
          )}</a>`
      ).join('')}</nav>`
    : '';

  return `
  <header class="admin-header">
    <div class="admin-header__inner">
      <div class="admin-header__left">
        <a href="/" class="admin-brand" aria-label="Tectum Modulbau — Startseite">
          <span>Tectum <em>Modulbau</em></span>
        </a>
        ${nav}
      </div>
      ${opts.active ? '' : `<span class="admin-tag">${escapeHtml(opts.tag)}</span>`}
      ${opts.showLogout ? '<a href="/admin/logout" class="admin-logout">Abmelden</a>' : '<span></span>'}
    </div>
  </header>`;
}
