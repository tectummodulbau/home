/**
 * Login-Formular für den Admin-Bereich. Ersetzt den nativen Basic-Auth-
 * Dialog des Browsers durch eine Seite im Tectum-Design. Bei Erfolg wird
 * ein signiertes Session-Cookie gesetzt (siehe _lib/session.ts) und zur
 * ursprünglich angefragten Seite weitergeleitet.
 *
 * Benötigte Umgebungsvariablen: siehe functions/admin/_middleware.ts.
 */
import { createSessionCookie, timingSafeEqual } from './_lib/session';
import { ADMIN_PAGES, adminHeader, escapeHtml, pageShell } from './_lib/theme';

interface Env {
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const attemptLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (attemptLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  attemptLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_ATTEMPTS;
}

/** Nur interne, relative /admin/-Pfade als Redirect-Ziel zulassen (kein Open Redirect). */
function safeNext(value: string | null): string {
  if (value && value.startsWith('/admin/') && !value.startsWith('//')) return value;
  // Landeseite des Bereichs. Greift auch für den Aufruf von /admin selbst,
  // der die Prüfung oben absichtlich nicht besteht (kein Schrägstrich danach).
  return ADMIN_PAGES[0].href;
}

function renderLogin(opts: { next: string; error?: string }): string {
  return pageShell({
    title: 'Anmeldung',
    bodyClass: 'admin-login-body',
    content: `
      ${adminHeader({ tag: 'Admin-Bereich' })}
      <main class="login-wrap">
        <form class="login-card" method="post" action="/admin/login">
          <input type="hidden" name="next" value="${escapeHtml(opts.next)}">
          <span class="login-kicker">Geschützter Bereich</span>
          <h1>Anmeldung erforderlich</h1>
          <p class="login-lead">Bitte melden Sie sich an, um Auswertung und Anfragen zu sehen.</p>

          ${opts.error ? `<p class="login-error">${escapeHtml(opts.error)}</p>` : ''}

          <label class="login-field">
            <span>Benutzername</span>
            <input type="text" name="username" autocomplete="username" required autofocus>
          </label>
          <label class="login-field">
            <span>Passwort</span>
            <input type="password" name="password" autocomplete="current-password" required>
          </label>

          <button type="submit" class="btn login-submit">Anmelden</button>
        </form>
      </main>
      <style>
        .login-wrap {
          min-height: calc(100vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          padding: clamp(1.8rem, 4vw, 2.4rem);
          display: flex;
          flex-direction: column;
        }
        .login-kicker {
          font-family: var(--font-head);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 0.6rem;
        }
        .login-card h1 { font-size: 1.4rem; margin-bottom: 0.35rem; }
        .login-lead { color: var(--muted); font-size: 0.94rem; margin: 0 0 1.5rem; }
        .login-error {
          background: rgba(179, 64, 47, 0.08);
          border: 1px solid rgba(179, 64, 47, 0.3);
          color: var(--red);
          border-radius: var(--radius);
          padding: 0.7rem 0.9rem;
          font-size: 0.88rem;
          margin: 0 0 1.2rem;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1.1rem;
        }
        .login-field span {
          font-family: var(--font-head);
          font-weight: 600;
          font-size: 0.9rem;
        }
        .login-field input {
          font-family: var(--font-body);
          font-size: 1rem;
          color: var(--ink);
          background: var(--paper);
          border: 1.5px solid var(--line);
          border-radius: var(--radius);
          padding: 0.8rem 1rem;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .login-field input:focus {
          outline: none;
          border-color: var(--ink);
          box-shadow: 0 0 0 3px rgba(20, 19, 15, 0.08);
        }
        .login-submit { width: 100%; margin-top: 0.4rem; }
      </style>
    `,
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) {
    return new Response('Admin-Zugang ist nicht konfiguriert (ADMIN_PASSWORD fehlt).', { status: 503 });
  }
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));
  const error = url.searchParams.get('error') === '1' ? 'Benutzername oder Passwort ist falsch.' : undefined;

  return new Response(renderLogin({ next, error }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) {
    return new Response('Admin-Zugang ist nicht konfiguriert (ADMIN_PASSWORD fehlt).', { status: 503 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response(renderLogin({ next: '/admin/leads', error: 'Zu viele Versuche. Bitte kurz warten.' }), {
      status: 429,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const form = await request.formData();
  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? ''));

  const expectedUser = env.ADMIN_USER ?? 'admin';
  if (!timingSafeEqual(username, expectedUser) || !timingSafeEqual(password, env.ADMIN_PASSWORD)) {
    return new Response(renderLogin({ next, error: 'Benutzername oder Passwort ist falsch.' }), {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const cookie = await createSessionCookie(env.ADMIN_PASSWORD);
  return new Response(null, {
    status: 302,
    headers: { Location: next, 'Set-Cookie': cookie },
  });
};
