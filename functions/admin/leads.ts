/**
 * Cloudflare Pages Function: liest alle Leads aus Supabase und rendert sie
 * im Tectum-Design als Kartenliste (volle Breite, Stammdaten + Vorhaben
 * gruppiert, Status pflegbar, nach Status filterbar). Zugriff ist über
 * functions/admin/_middleware.ts per signiertem Session-Cookie geschützt
 * (Login unter /admin/login). Status-Änderungen laufen über
 * functions/admin/leads/status.ts.
 *
 * Datenzugriff und Datensatz-Typ liegen in _lib/lead-source.ts, weil die
 * Analyseübersicht (/admin/analyse) dieselbe Tabelle liest.
 */
import { adminHeader, escapeHtml, pageShell } from './_lib/theme';
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from './_lib/status';
import { fetchLeads, type LeadEnv, type LeadRecord } from './_lib/lead-source';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function field(value: string | null): string {
  return value ? escapeHtml(value) : '<span class="muted">—</span>';
}

export const onRequestGet: PagesFunction<LeadEnv> = async ({ env, request }) => {
  const result = await fetchLeads(env);
  if (!result.ok) return new Response(result.message, { status: result.status });
  const leads: LeadRecord[] = result.leads;

  const requestedStatus = new URL(request.url).searchParams.get('status');
  const activeFilter: LeadStatus | 'alle' =
    requestedStatus && LEAD_STATUSES.includes(requestedStatus as LeadStatus)
      ? (requestedStatus as LeadStatus)
      : 'alle';

  const counts: Record<string, number> = { alle: leads.length };
  for (const status of LEAD_STATUSES) counts[status] = 0;
  for (const l of leads) counts[l.status as LeadStatus]++;

  const visibleLeads = activeFilter === 'alle' ? leads : leads.filter((l) => l.status === activeFilter);

  const filterPills = ['alle', ...LEAD_STATUSES]
    .map((status) => {
      const label = status === 'alle' ? 'Alle' : STATUS_LABELS[status as LeadStatus];
      const href = status === 'alle' ? '/admin/leads' : `/admin/leads?status=${encodeURIComponent(status)}`;
      const isActive = status === activeFilter;
      return `<a href="${href}" class="filter-pill${isActive ? ' is-active' : ''}">${escapeHtml(label)} <span class="filter-pill-count">${counts[status]}</span></a>`;
    })
    .join('');

  const statusOptions = (current: LeadStatus) =>
    LEAD_STATUSES.map(
      (s) => `<option value="${s}"${s === current ? ' selected' : ''}>${escapeHtml(STATUS_LABELS[s])}</option>`
    ).join('');

  const cards = visibleLeads
    .map((l) => {
      const status = l.status as LeadStatus;
      return `
        <article class="lead-card" data-lead-id="${escapeHtml(l.id)}">
          <div class="lead-card__top">
            <span class="lead-card__date">${formatDate(l.created_at)}</span>
            <label class="lead-status status-${status}">
              <span class="lead-status__dot" aria-hidden="true"></span>
              <select class="lead-status__select" data-status-select aria-label="Status ändern">
                ${statusOptions(status)}
              </select>
            </label>
          </div>

          <div class="lead-card__body">
            <div class="lead-group">
              <h3>Stammdaten</h3>
              <dl>
                <div><dt>Name</dt><dd>${field(l.vollname)}</dd></div>
                <div><dt>Firma</dt><dd>${field(l.firma)}</dd></div>
                <div><dt>E-Mail</dt><dd>${l.email ? `<a href="mailto:${escapeHtml(l.email)}">${escapeHtml(l.email)}</a>` : '<span class="muted">—</span>'}</dd></div>
                <div><dt>Telefon</dt><dd>${l.telefon ? `<a href="tel:${escapeHtml(l.telefon)}">${escapeHtml(l.telefon)}</a>` : '<span class="muted">—</span>'}</dd></div>
              </dl>
            </div>

            <div class="lead-group">
              <h3>Vorhaben</h3>
              <dl>
                <div><dt>Rolle</dt><dd>${field(l.abnehmer_typ)}</dd></div>
                <div><dt>Vorhaben</dt><dd>${field(l.vorhaben)}</dd></div>
                <div><dt>Einheiten</dt><dd>${field(l.einheitenanzahl)}</dd></div>
                <div><dt>Erwerb</dt><dd>${field(l.erwerbsmodell)}</dd></div>
              </dl>
            </div>
          </div>
        </article>`;
    })
    .join('');

  const content = `
    ${adminHeader({ tag: 'Anfragen', showLogout: true, active: 'leads' })}
    <main class="admin-main">
      <div class="page-head">
        <div>
          <span class="section-kicker">Anfragen</span>
          <h1>Eingegangene Leads</h1>
        </div>
        <span class="chip">${leads.length} ${leads.length === 1 ? 'Eintrag' : 'Einträge'} gesamt</span>
      </div>

      <nav class="filter-pills" aria-label="Nach Status filtern">${filterPills}</nav>

      <div class="lead-list">
        ${cards || '<p class="leads-empty">Keine Leads für diesen Filter.</p>'}
      </div>
    </main>
    <style>
      .filter-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1.8rem;
      }
      .filter-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-family: var(--font-head);
        font-size: 0.85rem;
        font-weight: 600;
        text-decoration: none;
        color: var(--ink);
        background: var(--paper);
        border: 1.5px solid var(--line);
        border-radius: 999px;
        padding: 0.5rem 1rem;
        transition: border-color 0.15s ease, background 0.15s ease;
      }
      .filter-pill:hover { border-color: var(--ink); }
      .filter-pill.is-active { background: var(--ink); border-color: var(--ink); color: var(--paper); }
      .filter-pill-count {
        font-size: 0.76rem;
        opacity: 0.65;
      }

      .lead-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .lead-card {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        padding: 1.3rem clamp(1.1rem, 2.5vw, 1.8rem);
      }

      .lead-card__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.1rem;
        padding-bottom: 1.1rem;
        border-bottom: 1px solid var(--line);
      }
      .lead-card__date {
        font-family: var(--font-head);
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--muted);
      }

      .lead-status {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border-radius: 999px;
        padding: 0.35rem 0.5rem 0.35rem 0.8rem;
        border: 1.5px solid transparent;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .lead-status__dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        flex-shrink: 0;
      }
      .lead-status__select {
        font-family: var(--font-head);
        font-weight: 700;
        font-size: 0.8rem;
        letter-spacing: 0.02em;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        padding: 0.1rem 0.2rem;
      }
      .lead-status__select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

      .status-neu { background: rgba(200, 169, 110, 0.18); border-color: rgba(200, 169, 110, 0.4); }
      .status-neu .lead-status__dot { background: var(--accent); }
      .status-kontaktiert { background: var(--stone); border-color: var(--line); }
      .status-kontaktiert .lead-status__dot { background: var(--ink-soft); }
      .status-warm { background: rgba(200, 169, 110, 0.35); border-color: rgba(200, 169, 110, 0.6); }
      .status-warm .lead-status__dot { background: #a67c3d; }
      .status-abgeschlossen { background: rgba(42, 107, 60, 0.12); border-color: rgba(42, 107, 60, 0.35); }
      .status-abgeschlossen .lead-status__dot { background: var(--green); }
      .status-abgelehnt { background: rgba(179, 64, 47, 0.1); border-color: rgba(179, 64, 47, 0.3); }
      .status-abgelehnt .lead-status__dot { background: var(--red); }
      .lead-status.is-saving { opacity: 0.6; }

      .lead-card__body {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1.4rem clamp(1.5rem, 4vw, 3rem);
      }
      @media (max-width: 760px) {
        .lead-card__body { grid-template-columns: 1fr; }
      }

      .lead-group h3 {
        font-family: var(--font-head);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
        margin: 0 0 0.7rem;
      }
      .lead-group dl {
        margin: 0;
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: 1rem;
        row-gap: 0.55rem;
      }
      .lead-group dl > div { display: contents; }
      .lead-group dt {
        font-size: 0.82rem;
        color: var(--muted);
        white-space: nowrap;
      }
      .lead-group dd {
        margin: 0;
        font-size: 0.94rem;
      }
      .lead-group a { color: var(--ink); text-decoration: underline; text-decoration-color: var(--line); }
      .lead-group a:hover { text-decoration-color: var(--ink); }

      .leads-empty {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--muted);
        background: var(--paper);
        border: 1px dashed var(--line);
        border-radius: var(--radius-lg);
      }
    </style>
    <script>
      document.querySelectorAll('[data-status-select]').forEach(function (select) {
        select.addEventListener('change', function () {
          var card = select.closest('.lead-card');
          var label = select.closest('.lead-status');
          var id = card.getAttribute('data-lead-id');
          var newStatus = select.value;
          var previousClass = label.className;
          label.classList.add('is-saving');

          fetch('/admin/leads/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, status: newStatus }),
          })
            .then(function (res) {
              if (!res.ok) throw new Error('update failed');
              label.className = 'lead-status status-' + newStatus;
              label.classList.remove('is-saving');
            })
            .catch(function () {
              label.className = previousClass;
              window.alert('Status konnte nicht gespeichert werden. Bitte erneut versuchen.');
            });
        });
      });
    </script>
  `;

  return new Response(pageShell({ title: 'Leads', content }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
