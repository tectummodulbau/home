/**
 * Cloudflare Pages Function: nimmt Anfragen des Step-Formulars entgegen,
 * speichert sie in Supabase (Tabelle `leads`, siehe supabase/schema.sql)
 * und leitet sie zusätzlich per E-Mail weiter (Resend, https://resend.com).
 *
 * Benötigte Umgebungsvariablen (Cloudflare Pages → Settings → Environment variables):
 *   SUPABASE_URL              — z. B. https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — Service-Role-Key (geheim, nur serverseitig!)
 *   RESEND_API_KEY — API-Key von Resend (nur serverseitig, nie im Client-Bundle)
 *   LEAD_TO_EMAIL  — Empfängeradresse (produktiv: info@tectum-modulbau.de)
 *   LEAD_FROM_EMAIL — Verifizierte Absenderadresse (z. B. anfrage@tectum-modulbau.de)
 *
 * Ohne konfigurierten API-Key antwortet der Endpoint mit 200 und loggt den
 * Lead nur — so bleibt das Formular in Preview-Umgebungen funktionsfähig.
 * Gleiches gilt für Supabase: fehlen die Variablen, wird der Insert übersprungen.
 *
 * Hinweis Rate Limiting: Der In-Memory-Zähler unten ist ein Best-Effort-Schutz
 * innerhalb einer warmen Worker-Instanz und KEIN Ersatz für eine echte,
 * instanzübergreifende Begrenzung. Für einen belastbaren Schutz zusätzlich
 * eine Cloudflare Rate Limiting Rule auf /api/lead im Dashboard einrichten
 * (offener Punkt — siehe Zusammenfassung).
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  LEAD_TO_EMAIL?: string;
  LEAD_FROM_EMAIL?: string;
}

interface Lead {
  flaeche_vorhanden?: string;
  abnehmer_typ?: string;
  vorhaben?: string;
  einheitenanzahl?: string;
  erwerbsmodell?: string;
  vollname?: string;
  firma?: string;
  email?: string;
  telefon?: string;
  website?: string; // Honeypot — muss leer sein
}

const ALLOWED_KEYS: (keyof Lead)[] = [
  'flaeche_vorhanden',
  'abnehmer_typ',
  'vorhaben',
  'einheitenanzahl',
  'erwerbsmodell',
  'vollname',
  'firma',
  'email',
  'telefon',
  'website',
];

const MAX_FIELD_LENGTH = 200;
const MAX_BODY_BYTES = 10_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9 +()/-]{4,40}$/;

// Best-effort In-Memory-Ratenbegrenzung pro Worker-Instanz (siehe Hinweis oben).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Entfernt Steuerzeichen/Zeilenumbrüche, die in Betreff oder Reply-To keinen Sinn ergeben. */
function sanitize(value: string): string {
  return value.replace(/[\r\n\t\0]/g, ' ').trim().slice(0, MAX_FIELD_LENGTH);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface LeadRow {
  flaeche_vorhanden?: string;
  abnehmer_typ?: string;
  vorhaben?: string;
  einheitenanzahl?: string;
  erwerbsmodell?: string;
  vollname: string;
  firma?: string;
  email: string;
  telefon: string;
}

/** Best-effort: schreibt den Lead in die Supabase-Tabelle `leads`. Ein
 * Fehlschlag blockiert nicht den restlichen Versand (E-Mail bleibt der
 * primäre, garantierte Kanal), wird aber geloggt. */
async function saveToSupabase(env: Env, row: LeadRow): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Lead nicht in Supabase gespeichert (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY fehlen).');
    return;
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error('Supabase-Insert fehlgeschlagen, Status', res.status);
    }
  } catch (err) {
    console.error('Supabase-Insert-Fehler', err);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Zu viele Anfragen' }, 429);
  }

  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Anfrage zu groß' }, 413);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  if (!isPlainObject(raw)) {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  // Unbekannte Felder ablehnen statt still zu verwerfen.
  const unknownKeys = Object.keys(raw).filter((key) => !ALLOWED_KEYS.includes(key as keyof Lead));
  if (unknownKeys.length > 0) {
    return json({ error: 'Ungültige Felder' }, 400);
  }

  // Alle Werte müssen Strings innerhalb der Längenbegrenzung sein.
  for (const key of ALLOWED_KEYS) {
    const value = raw[key];
    if (value !== undefined && (typeof value !== 'string' || value.length > MAX_FIELD_LENGTH)) {
      return json({ error: 'Ungültige Felder' }, 400);
    }
  }

  const lead = raw as Lead;

  // Honeypot: Bots füllen das versteckte Feld — still verwerfen, kein Hinweis an den Absender.
  if (lead.website) {
    return json({ ok: true });
  }

  if (!lead.vollname || !lead.email || !lead.telefon) {
    return json({ error: 'Pflichtfelder fehlen' }, 400);
  }

  if (!EMAIL_PATTERN.test(lead.email)) {
    return json({ error: 'Ungültige E-Mail-Adresse' }, 400);
  }

  if (!PHONE_PATTERN.test(lead.telefon)) {
    return json({ error: 'Ungültige Telefonnummer' }, 400);
  }

  const vollname = sanitize(lead.vollname);
  const firma = lead.firma ? sanitize(lead.firma) : undefined;
  const email = sanitize(lead.email);

  const rows: [string, string | undefined][] = [
    ['Fläche vorhanden', lead.flaeche_vorhanden],
    ['Rolle', lead.abnehmer_typ],
    ['Vorhaben', lead.vorhaben],
    ['Anzahl Einheiten', lead.einheitenanzahl],
    ['Erwerbsmodell', lead.erwerbsmodell],
    ['Name', vollname],
    ['Firma', firma],
    ['E-Mail', email],
    ['Telefon', sanitize(lead.telefon)],
  ];

  const text = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const telefon = sanitize(lead.telefon);

  await saveToSupabase(env, {
    flaeche_vorhanden: lead.flaeche_vorhanden,
    abnehmer_typ: lead.abnehmer_typ,
    vorhaben: lead.vorhaben,
    einheitenanzahl: lead.einheitenanzahl,
    erwerbsmodell: lead.erwerbsmodell,
    vollname,
    firma,
    email,
    telefon,
  });

  if (!env.RESEND_API_KEY) {
    // Kein vollständiger Lead-Inhalt im Log — nur Bestätigung für Preview-Umgebungen.
    console.log('Lead erhalten (kein RESEND_API_KEY konfiguriert), Pflichtfelder vollständig.');
    return json({ ok: true, note: 'mail-not-configured' });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.LEAD_FROM_EMAIL ?? 'anfrage@tectum-modulbau.de',
      to: [env.LEAD_TO_EMAIL ?? 'stankovic@ecobau-tectum.de'],
      reply_to: email,
      subject: `Neue Projektanfrage: ${vollname}${firma ? ` (${firma})` : ''}`,
      text,
    }),
  });

  if (!res.ok) {
    // Bewusst kein Antwort-Body im Log (könnte übermittelte Daten enthalten) und
    // keine internen Details in der Client-Antwort.
    console.error('Resend-Fehler, Status', res.status);
    return json({ error: 'Versand fehlgeschlagen' }, 502);
  }

  return json({ ok: true });
};
