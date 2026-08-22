/**
 * Schützt alle Routen unter /admin/* (außer /admin/login) über ein
 * signiertes Session-Cookie (siehe _lib/session.ts). Ohne gültige Session
 * wird zur Login-Seite im Tectum-Design weitergeleitet — kein nativer
 * Basic-Auth-Dialog des Browsers mehr.
 *
 * Benötigte Umgebungsvariable (Cloudflare Pages → Settings → Environment variables):
 *   ADMIN_PASSWORD — Passwort für den Admin-Bereich (geheim/verschlüsselt setzen),
 *                    dient zugleich als Signaturschlüssel für das Session-Cookie
 *   ADMIN_USER     — Benutzername (optional, Default: "admin")
 *
 * Ohne gesetztes ADMIN_PASSWORD ist der Bereich komplett gesperrt (503),
 * es gibt also keinen ungeschützten Zustand.
 */
import { hasValidSession } from './_lib/session';

interface Env {
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  if (!env.ADMIN_PASSWORD) {
    return new Response('Admin-Zugang ist nicht konfiguriert (ADMIN_PASSWORD fehlt).', { status: 503 });
  }

  const url = new URL(request.url);
  if (url.pathname === '/admin/login') {
    return next();
  }

  if (await hasValidSession(request, env.ADMIN_PASSWORD)) {
    return next();
  }

  const loginUrl = new URL('/admin/login', url.origin);
  loginUrl.searchParams.set('next', url.pathname);
  return new Response(null, { status: 302, headers: { Location: loginUrl.toString() } });
};
