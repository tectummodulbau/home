-- Tectum Modulbau — Leads-Tabelle für Cloudflare D1
--
-- Einmalig gegen die Datenbank `leads` ausführen:
--   npx wrangler d1 execute leads --remote --file=d1/schema.sql
-- (oder im Cloudflare-Dashboard unter Storage & Databases → D1 → leads → Console)
--
-- Zugriff ausschließlich über das D1-Binding `DB` aus den Pages Functions
-- (functions/api/lead.ts schreibt, functions/admin/leads.ts liest,
-- functions/admin/leads/status.ts ändert den Status).

CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

  -- Formular-Angaben (Schritt 1–3)
  flaeche_vorhanden TEXT,
  abnehmer_typ      TEXT,
  vorhaben          TEXT,
  einheitenanzahl   TEXT,
  erwerbsmodell     TEXT,

  -- Kontaktdaten (Schritt 4)
  vollname TEXT NOT NULL,
  firma    TEXT,
  email    TEXT NOT NULL,
  telefon  TEXT NOT NULL,

  -- Pflegestatus, editierbar in /admin/leads
  status TEXT NOT NULL DEFAULT 'neu'
    CHECK (status IN ('neu', 'kontaktiert', 'warm', 'abgeschlossen', 'abgelehnt'))
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
