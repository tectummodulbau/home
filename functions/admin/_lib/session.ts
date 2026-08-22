/**
 * Zustandslose, signierte Session-Cookies für den Admin-Bereich. Kein KV/DB
 * nötig: das Cookie selbst trägt Ablaufzeit + HMAC-Signatur (Schlüssel =
 * ADMIN_PASSWORD), Manipulation fällt sofort bei der Signaturprüfung auf.
 */

export const SESSION_COOKIE_NAME = 'tectum_admin_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 Stunden

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function createSessionCookie(secret: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmac(secret, String(expiresAt));
  const value = `${expiresAt}.${sig}`;
  return `${SESSION_COOKIE_NAME}=${value}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export async function hasValidSession(request: Request, secret: string): Promise<boolean> {
  const cookie = readCookie(request, SESSION_COOKIE_NAME);
  if (!cookie) return false;

  const sepIndex = cookie.indexOf('.');
  if (sepIndex === -1) return false;
  const expiresAtRaw = cookie.slice(0, sepIndex);
  const sig = cookie.slice(sepIndex + 1);

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expectedSig = await hmac(secret, expiresAtRaw);
  return timingSafeEqual(sig, expectedSig);
}
