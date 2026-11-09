-- Tectum Modulbau — Leads-Tabelle für Supabase
--
-- Im Supabase-Dashboard unter "SQL Editor" ausführen (einmalig, bei der
-- Einrichtung eines neuen Projekts). Die Tabelle wird ausschließlich über
-- den Service-Role-Key aus den Cloudflare Pages Functions angesprochen
-- (functions/api/lead.ts zum Schreiben, functions/admin/leads.ts zum
-- Lesen, functions/admin/leads/status.ts zum Status-Update) — daher bleibt
-- Row Level Security aktiv, aber ohne Policies: der anonyme/öffentliche Key
-- kann nichts lesen oder schreiben, nur der Service-Role-Key (der RLS
-- grundsätzlich umgeht) hat Zugriff.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Formular-Angaben (Schritt 1–3)
  flaeche_vorhanden text,
  abnehmer_typ text,
  vorhaben text,
  einheitenanzahl text,
  erwerbsmodell text,

  -- Kontaktdaten (Schritt 4)
  vollname text not null,
  firma text,
  email text not null,
  telefon text not null,

  -- Pflegestatus, editierbar in /admin/leads
  status text not null default 'neu'
    constraint leads_status_check
    check (status in ('neu', 'kontaktiert', 'warm', 'abgeschlossen', 'abgelehnt'))
);

alter table public.leads enable row level security;

-- Bewusst keine Policies: Zugriff ausschließlich über den Service-Role-Key
-- aus den Cloudflare Pages Functions, niemals über den Browser/Anon-Key.

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

-- ---------------------------------------------------------------------
-- Migration für ein bereits bestehendes Projekt (Tabelle existierte schon
-- ohne `status`-Spalte): folgenden Block einmalig im SQL Editor ausführen.
-- ---------------------------------------------------------------------
-- alter table public.leads add column if not exists status text not null default 'neu';
-- alter table public.leads add constraint leads_status_check
--   check (status in ('neu', 'kontaktiert', 'warm', 'abgeschlossen', 'abgelehnt'));
-- create index if not exists leads_status_idx on public.leads (status);
