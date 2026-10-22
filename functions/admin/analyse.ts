/**
 * Cloudflare Pages Function: Analyseübersicht unter /admin/analyse.
 *
 * Die Seite beantwortet zwei Fragen, die vorher nur durch Lesen des
 * Quelltextes zu beantworten waren:
 *
 *   1. Was kommt an?  — Kennzahlen aus der Supabase-Tabelle `leads`:
 *      Verlauf, Bearbeitungsstand und die Qualifizierungsangaben aus den
 *      Formularschritten 1–3.
 *   2. Was wird gemessen? — Zustand jedes Messkanals (GA4, Google Ads,
 *      Meta-Pixel, GTM), welche Umgebungsvariablen gesetzt sind, was zur
 *      Aktivierung noch fehlt, und der vollständige Event-Katalog.
 *
 * Teil 2 liest aus src/lib/analytics/manifest.ts — derselben Datei, aus der
 * auch die Consent-Registry und der Tracker lesen. Die Übersicht kann
 * deshalb nicht veralten, ohne dass der Messaufbau selbst sich ändert.
 *
 * Die beiden Teile sind unabhängig: Fehlt die Supabase-Konfiguration, bleibt
 * der Tracking-Teil trotzdem nutzbar. Genau dann braucht man ihn meistens.
 *
 * Zugriff über functions/admin/_middleware.ts (signiertes Session-Cookie).
 */
import { adminHeader, escapeHtml, pageShell } from './_lib/theme';
import { fetchLeads, type LeadEnv } from './_lib/lead-source';
import { buildLeadStats, HISTORY_WEEKS, type Dimension, type LeadStats } from './_lib/lead-stats';
import {
  evaluateChannels,
  isMeasuredHost,
  resolveAnalyticsHosts,
  type ChannelStatus,
} from './_lib/tracking-status';
import {
  CATEGORY_LABELS,
  EVENT_GROUP_LABELS,
  KEY_EVENT_FUNNEL,
  TRACKED_EVENTS,
  type EventGroup,
} from '../../src/lib/analytics/manifest';

type Env = LeadEnv & Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// Formatierung
// ---------------------------------------------------------------------------

const num = (value: number): string => value.toLocaleString('de-DE');

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('de-DE', { dateStyle: 'medium' });
}

/** Veränderung gegenüber dem Vorzeitraum. Ohne Vergleichswert bewusst leer. */
function deltaBadge(delta: number | null, previous: number): string {
  if (delta === null) {
    return `<span class="delta delta--none" title="Im Vorzeitraum gab es keine Anfrage — eine Prozentangabe wäre irreführend.">kein Vergleich</span>`;
  }
  const tone = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `<span class="delta delta--${tone}">${sign}${Math.abs(delta)} % <span class="delta__ref">ggü. ${num(previous)}</span></span>`;
}

function kpi(label: string, value: string, note: string): string {
  return `
    <div class="kpi">
      <span class="kpi__label">${escapeHtml(label)}</span>
      <strong class="kpi__value">${value}</strong>
      <span class="kpi__note">${note}</span>
    </div>`;
}

/** Waagerechter Anteilsbalken für Status- und Dimensionslisten. */
function barRow(label: string, count: number, share: number, tone = ''): string {
  return `
    <li class="bar-row">
      <span class="bar-row__label">${escapeHtml(label)}</span>
      <span class="bar-row__track"><span class="bar-row__fill${tone}" style="width:${Math.max(share, count > 0 ? 2 : 0)}%"></span></span>
      <span class="bar-row__value">${num(count)}<span class="bar-row__share">${share} %</span></span>
    </li>`;
}

// ---------------------------------------------------------------------------
// Abschnitte: Leads
// ---------------------------------------------------------------------------

function renderKpis(stats: LeadStats): string {
  const [week, month, quarter] = stats.periods;
  return `
    <div class="kpi-grid">
      ${kpi(
        'Anfragen gesamt',
        num(stats.total),
        stats.firstAt ? `seit ${escapeHtml(formatDate(stats.firstAt))}` : 'noch keine Anfrage'
      )}
      ${kpi(week.label, num(week.count), deltaBadge(week.deltaPercent, week.previous))}
      ${kpi(month.label, num(month.count), deltaBadge(month.deltaPercent, month.previous))}
      ${kpi(quarter.label, num(quarter.count), deltaBadge(quarter.deltaPercent, quarter.previous))}
      ${kpi(
        'Ø pro Woche',
        stats.avgPerWeek.toLocaleString('de-DE'),
        `Mittel über ${HISTORY_WEEKS} Wochen`
      )}
      ${kpi(
        'Bearbeitet',
        stats.processedRate === null ? '—' : `${stats.processedRate} %`,
        'Anfragen, die den Status „Neuer Lead" verlassen haben'
      )}
      ${kpi(
        'Abschlussquote',
        stats.winRate === null ? '—' : `${stats.winRate} %`,
        stats.decided === 0
          ? 'noch keine Anfrage entschieden'
          : `${num(stats.won)} von ${num(stats.decided)} entschiedenen`
      )}
    </div>`;
}

function renderHistory(stats: LeadStats): string {
  const max = Math.max(stats.historyMax, 1);
  const columns = stats.history
    .map((bucket) => {
      const height = bucket.count === 0 ? 0 : Math.round((bucket.count / max) * 100);
      return `
        <div class="chart__col" title="${escapeHtml(bucket.label)} — ${num(bucket.count)} Anfragen">
          <span class="chart__count${bucket.count === 0 ? ' is-zero' : ''}">${num(bucket.count)}</span>
          <span class="chart__bar-track">
            <span class="chart__bar" style="height:${height}%"></span>
          </span>
          <span class="chart__label">${escapeHtml(bucket.label)}</span>
        </div>`;
    })
    .join('');

  return `
    <div class="panel">
      <h2>Verlauf</h2>
      <p class="panel__lead">
        ${HISTORY_WEEKS} Fenster à sieben Tage, das rechte endet heute. Bewusst keine Kalenderwochen —
        die laufende Woche wäre angebrochen und sähe im Diagramm nach einem Einbruch aus, der keiner ist.
      </p>
      <div class="chart">${columns}</div>
    </div>`;
}

function renderStatus(stats: LeadStats): string {
  const rows = stats.statusCounts
    .map((s) => barRow(s.label, s.count, s.share, ` bar-fill--${s.status}`))
    .join('');
  return `
    <div class="panel">
      <h2>Bearbeitungsstand</h2>
      <p class="panel__lead">Verteilung über alle Anfragen. Gepflegt wird der Status unter <a href="/admin/leads">Anfragen</a>.</p>
      <ul class="bar-list">${rows}</ul>
    </div>`;
}

function renderDimension(dimension: Dimension, total: number): string {
  if (dimension.entries.length === 0) {
    return `
      <div class="panel panel--sub">
        <h3>${escapeHtml(dimension.label)}</h3>
        <p class="empty-note">Keine Angaben vorhanden.</p>
      </div>`;
  }

  const rows = dimension.entries.map((e) => barRow(e.value, e.count, e.share)).join('');
  const missingNote =
    dimension.missing > 0
      ? `<p class="panel__foot">${num(dimension.missing)} von ${num(total)} Anfragen ohne Angabe — Anteile beziehen sich auf die übrigen.</p>`
      : '';

  return `
    <div class="panel panel--sub">
      <h3>${escapeHtml(dimension.label)}</h3>
      <ul class="bar-list">${rows}</ul>
      ${missingNote}
    </div>`;
}

function renderLeadSection(stats: LeadStats): string {
  if (stats.total === 0) {
    return `
      ${renderKpis(stats)}
      <p class="empty-note empty-note--block">
        Noch keine Anfrage in der Datenbank. Sobald die erste eingeht, füllen sich Verlauf,
        Bearbeitungsstand und Qualifizierung automatisch.
      </p>`;
  }

  return `
    ${renderKpis(stats)}
    ${renderHistory(stats)}
    ${renderStatus(stats)}
    <div class="panel">
      <h2>Qualifizierung</h2>
      <p class="panel__lead">
        Die Angaben aus den Formularschritten 1 bis 3. Dieselben Werte gehen als Parameter an
        <code>generate_lead</code> — die Verteilung hier und der GA4-Bericht müssen deckungsgleich sein.
      </p>
      <div class="panel-grid">
        ${stats.dimensions.map((d) => renderDimension(d, stats.total)).join('')}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Abschnitte: Messaufbau
// ---------------------------------------------------------------------------

function renderChannel(status: ChannelStatus): string {
  const { channel } = status;

  // Als Liste und nicht als Tabelle: Variablennamen wie
  // PUBLIC_GOOGLE_ADS_LEAD_LABEL sprengen in einer dreispaltigen Tabelle jede
  // vertretbare Spaltenbreite und würden mitten im Wort umbrechen.
  const envItems = status.env
    .map(
      (e) => `
      <li class="env-item">
        <div class="env-item__head">
          <code>${escapeHtml(e.name)}</code>
          ${
            e.present
              ? '<span class="pill pill--on">gesetzt</span>'
              : '<span class="pill pill--off">nicht gesetzt</span>'
          }
          ${e.required ? '' : '<span class="tag-optional">optional</span>'}
          ${e.value ? `<code class="env-value">${escapeHtml(e.value)}</code>` : ''}
        </div>
        <p class="env-item__purpose muted">${escapeHtml(e.purpose)}</p>
      </li>`
    )
    .join('');

  const steps = status.openSteps.length
    ? `<div class="steps">
         <h4>Offen im Code und in Cloudflare</h4>
         <ol>${status.openSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
       </div>`
    : `<p class="steps-done">
         Im Code und in Cloudflare nichts offen: Skript, ID und Host-Sperre passen zusammen.
         Ob beim Anbieter tatsächlich Daten ankommen, sagt das noch nicht — siehe unten.
       </p>`;

  // Immer sichtbar, auch bei einem im Code fertigen Kanal: diese Einstellungen
  // liegen außerhalb des Repositorys, und genau dort steckt der Unterschied
  // zwischen „das Tag feuert" und „die Zahlen stimmen".
  const account = `
    <div class="steps steps--account">
      <h4>Nur im Konto beim Anbieter prüfbar</h4>
      <ol>${channel.accountSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    </div>`;

  const privacy = channel.privacyPolicySection
    ? `<span class="pill pill--on">Datenschutzerklärung: ${escapeHtml(channel.privacyPolicySection)}</span>`
    : '<span class="pill pill--warn">Datenschutzerklärung: noch nicht beschrieben</span>';

  return `
    <article class="channel">
      <div class="channel__head">
        <div>
          <h3>${escapeHtml(channel.name)}</h3>
          <span class="channel__provider">${escapeHtml(channel.provider)}</span>
        </div>
        <span class="state state--${status.state}">${escapeHtml(status.stateLabel)}</span>
      </div>

      <p class="channel__summary">${escapeHtml(status.summary)}</p>
      <p class="channel__purpose muted">${escapeHtml(channel.purpose)}</p>

      <div class="channel__meta">
        <span class="pill">Kategorie: ${escapeHtml(CATEGORY_LABELS[channel.category])}</span>
        ${status.effectiveId ? `<span class="pill">Sendet an <code>${escapeHtml(status.effectiveId)}</code></span>` : ''}
        <span class="pill">${channel.hostLocked ? 'Host-Sperre aktiv' : 'Ohne Host-Sperre'}</span>
        ${privacy}
      </div>

      <h4 class="env-head">Umgebungsvariablen</h4>
      <ul class="env-list">${envItems}</ul>

      ${steps}
      ${account}
    </article>`;
}

function renderHostLock(hosts: string[], currentHost: string): string {
  const measured = isMeasuredHost(hosts, currentHost);
  return `
    <div class="panel">
      <h2>Host-Sperre</h2>
      <p class="panel__lead">
        Die Mess-IDs stehen fest im Build. Ohne diese Sperre würde jedes Vorschau-Deployment
        (<code>*.pages.dev</code>) in dieselbe GA4-Property senden und — sobald Google Ads oder der
        Meta-Pixel laufen — echte Conversions in die Werbekonten schreiben.
      </p>
      <ul class="fact-list">
        <li><span>Gemessene Hosts</span><strong>${hosts.map((h) => `<code>${escapeHtml(h)}</code>`).join(', ')}</strong></li>
        <li>
          <span>Dieser Aufruf</span>
          <strong>
            <code>${escapeHtml(currentHost)}</code>
            ${
              measured
                ? '<span class="pill pill--on">wird gemessen</span>'
                : '<span class="pill pill--warn">wird nicht gemessen</span>'
            }
          </strong>
        </li>
      </ul>
      <p class="panel__foot">
        Überschreibbar mit <code>PUBLIC_ANALYTICS_HOSTS</code>, z. B. für einen lokalen Test:
        <code>PUBLIC_ANALYTICS_HOSTS=127.0.0.1 npm run build</code>.
      </p>
    </div>`;
}

/**
 * Beantwortet die Frage, die der Zustand „Aktiv" gerade NICHT beantwortet:
 * wo man nachsieht, ob tatsächlich Daten ankommen.
 */
function renderVerification(origin: string, ga4Id: string | undefined): string {
  return `
    <div class="panel">
      <h2>Wo die Zahlen zu sehen sind</h2>
      <p class="panel__lead">
        Diese Seite zeigt den Messaufbau, nicht die Messwerte. Ob GA4 wirklich etwas empfängt,
        steht in GA4 selbst — hier die drei Wege, vom schnellsten zum genauesten.
      </p>
      <ol class="how-list">
        <li>
          <strong>Echtzeitbericht</strong> — <code>analytics.google.com</code> → Property
          ${ga4Id ? `<code>${escapeHtml(ga4Id)}</code>` : ''} → Berichte → Echtzeit. Zeigt die
          letzten 30 Minuten. Der schnellste Test, ob überhaupt etwas ankommt: Seite in einem
          zweiten Fenster öffnen, „Statistik" zustimmen, im Echtzeitbericht nachsehen.
        </li>
        <li>
          <strong>DebugView</strong> — die Seite mit
          <a href="${escapeHtml(origin)}/?ga_debug=1" target="_blank" rel="noopener">?ga_debug=1</a>
          aufrufen, dann in GA4 unter Verwaltung → DebugView nachsehen. Zeigt jedes einzelne
          Ereignis mit allen Parametern, ohne dass eine Browser-Erweiterung nötig wäre. Das ist
          der Weg, um zu prüfen, ob ein bestimmtes Ereignis aus dem Katalog unten wirklich feuert.
        </li>
        <li>
          <strong>Netzwerk-Tab des Browsers</strong> — nach <code>collect?</code> filtern. Jedes
          Ereignis ist ein eigener Request. Im Query-String steht <code>tid</code> (muss die
          Mess-ID sein), <code>en</code> (der Ereignisname) und <code>ep.*</code> (die Parameter).
          Damit lässt sich auch gegenprüfen, dass keine Kontaktdaten mitgehen.
        </li>
      </ol>
      <div class="notice">
        <strong>Die Sperre, die jede dieser Ansichten schlägt:</strong>
        Ohne Zustimmung zur Kategorie „Statistik" wird kein Google-Skript geladen und kein
        Ereignis gesendet — auch kein cookieloser Ping (Consent Mode läuft im Basic-Modus).
        Wer den Banner wegklickt oder ablehnt, taucht in GA4 überhaupt nicht auf. GA4 zeigt
        deshalb systematisch weniger als die tatsächliche Reichweite; das ist kein Fehler,
        sondern die Bauart. Für die Gesamtreichweite ist Cloudflare Web Analytics zuständig —
        cookiefrei, einwilligungsfrei, und im Cloudflare-Dashboard für das Pages-Projekt
        einzuschalten (nicht aus diesem Repository heraus).
      </div>
    </div>`;
}

function renderEventCatalogue(): string {
  const groups: EventGroup[] = ['formular', 'kontakt', 'rechner', 'engagement'];

  const blocks = groups
    .map((group) => {
      const rows = TRACKED_EVENTS.filter((e) => e.group === group)
        .map(
          (event) => `
          <tr>
            <td>
              <code>${escapeHtml(event.name)}</code>
              ${event.keyEvent ? '<span class="pill pill--key">Schlüsselereignis</span>' : ''}
              ${event.oncePerSession ? '<span class="pill pill--soft">1× pro Sitzung</span>' : ''}
            </td>
            <td>${escapeHtml(event.trigger)}<br><span class="src">${escapeHtml(event.source)}</span></td>
            <td>${
              event.params.length
                ? event.params.map((p) => `<code>${escapeHtml(p)}</code>`).join(' ')
                : '<span class="muted">—</span>'
            }</td>
            <td>${
              event.metaEvent
                ? `<code>${escapeHtml(event.metaEvent)}</code>`
                : '<span class="muted">—</span>'
            }</td>
          </tr>`
        )
        .join('');

      return `
        <h3>${escapeHtml(EVENT_GROUP_LABELS[group])}</h3>
        <div class="table-scroll">
          <table class="event-table">
            <thead>
              <tr><th>Ereignis</th><th>Auslöser</th><th>Parameter (GA4)</th><th>Meta-Standardereignis</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    })
    .join('');

  return `
    <div class="panel">
      <h2>Event-Katalog</h2>
      <p class="panel__lead">
        Genau diese Ereignisse werden gesendet, keine weiteren; <code>page_view</code> kommt zusätzlich
        vom GA4-Tag selbst. Kein Parameter enthält Name, E-Mail, Telefon oder Firma — nur die
        Auswahlwerte aus Radio-Buttons und Dropdowns.
      </p>
      <p class="panel__lead">
        Die Spalte rechts zeigt, welches Meta-Standardereignis der Tracker zusätzlich sendet, sobald der
        Pixel aktiv ist und eine Marketing-Zustimmung vorliegt — ohne Parameter, weil Metas
        Parameter-Semantik sich nicht mit der von GA4 deckt.
      </p>
      ${blocks}
      <div class="steps">
        <h4>In GA4 als Schlüsselereignis markieren, in dieser Reihenfolge</h4>
        <ol>${KEY_EVENT_FUNNEL.map((name) => `<li><code>${escapeHtml(name)}</code></li>`).join('')}</ol>
        <p class="panel__foot">
          <code>cta_click</code> und <code>calculator_configured</code> sind starke Zwischensignale, aber
          bewusst keine Schlüsselereignisse — sonst verwässert die Conversion-Rate.
        </p>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const channels = evaluateChannels(env);
  const hosts = resolveAnalyticsHosts(env);

  const leadResult = await fetchLeads(env);
  const stats = leadResult.ok ? buildLeadStats(leadResult.leads, Date.now()) : null;

  const leadSection = stats
    ? renderLeadSection(stats)
    : `<p class="empty-note empty-note--block">
         Lead-Kennzahlen nicht verfügbar: ${escapeHtml(leadResult.ok ? '' : leadResult.message)}
         Der Messaufbau unten ist davon unabhängig und wird trotzdem ausgewertet.
       </p>`;

  const rangeChip = stats?.lastAt
    ? `<span class="chip">Letzte Anfrage: ${escapeHtml(formatDate(stats.lastAt))}</span>`
    : '';

  const content = `
    ${adminHeader({ tag: 'Analyse', showLogout: true, active: 'analyse' })}
    <main class="admin-main">
      <div class="page-head">
        <div>
          <span class="section-kicker">Auswertung</span>
          <h1>Analyseübersicht</h1>
        </div>
        ${rangeChip}
      </div>

      <section class="block" aria-labelledby="block-anfragen">
        <h2 class="block__title" id="block-anfragen">Anfragen</h2>
        ${leadSection}
      </section>

      <section class="block" aria-labelledby="block-messung">
        <h2 class="block__title" id="block-messung">Messaufbau</h2>
        <p class="block__lead">
          Zustand der vier Messkanäle. Die Angaben stammen aus
          <code>src/lib/analytics/manifest.ts</code> — derselben Datei, aus der auch die Consent-Registry
          und der Tracker lesen. Diese Übersicht kann deshalb nicht veralten, ohne dass sich der
          Messaufbau selbst ändert.
        </p>
        <p class="block__lead">
          <strong>Was „Aktiv" hier heißt:</strong> der Kanal ist im Code freigeschaltet, eine ID liegt
          vor, und der aufgerufene Host steht auf der Messliste. <strong>Nicht</strong> geprüft — und von
          dieser Seite aus auch nicht prüfbar — ist, ob die ID zu einer echten Property gehört, ob
          Besucher überhaupt zustimmen und ob die Einstellungen im Konto des Anbieters stimmen. Genau
          diese drei Punkte entscheiden darüber, ob am Ende Zahlen ankommen; sie stehen je Kanal unter
          „Nur im Konto beim Anbieter prüfbar".
        </p>

        <div class="notice">
          <strong>Zwei Zeitpunkte, ein Stolperstein.</strong>
          Diese Seite liest die Variablen zur <em>Laufzeit</em>. Das ausgelieferte JavaScript bekommt sie
          dagegen zur <em>Build-Zeit</em> von Vite eingesetzt. Beides stimmt nur überein, wenn die Variable
          unter Cloudflare Pages → Settings → Environment variables steht. Eine Variable, die nur in den
          <code>[vars]</code> der <code>wrangler.toml</code> steht, erscheint hier als „gesetzt“, käme im
          Frontend aber nie an. Und Änderungen greifen im Frontend erst nach einem neuen Deployment.
        </div>

        <div class="channel-grid">${channels.map(renderChannel).join('')}</div>

        ${renderHostLock(hosts, url.hostname)}
        ${renderVerification(url.origin, channels.find((c) => c.channel.id === 'google-analytics-4')?.effectiveId)}
        ${renderEventCatalogue()}
      </section>
    </main>
    <style>
      .block { margin-bottom: clamp(2.5rem, 6vw, 4rem); }
      .block__title {
        font-size: clamp(1.15rem, 2.4vw, 1.45rem);
        margin: 0 0 0.5rem;
        padding-bottom: 0.7rem;
        border-bottom: 2px solid var(--ink);
      }
      .block__lead { margin: 0.9rem 0 1.2rem; max-width: 78ch; color: var(--ink-soft); }

      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.86em;
        background: var(--sand);
        border-radius: 5px;
        padding: 0.12em 0.4em;
        overflow-wrap: anywhere;
      }

      /* --- Panels --- */
      .panel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        padding: 1.4rem clamp(1.1rem, 2.5vw, 1.8rem);
        margin-top: 1rem;
      }
      .panel--sub { box-shadow: none; border-radius: var(--radius); margin-top: 0; }
      .panel h2 { font-size: 1.05rem; margin: 0 0 0.4rem; }
      .panel h3 { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 1.6rem 0 0.7rem; }
      .panel--sub h3 { margin-top: 0; }
      .panel__lead { margin: 0 0 1.1rem; font-size: 0.94rem; color: var(--ink-soft); max-width: 78ch; }
      .panel__foot { margin: 0.9rem 0 0; font-size: 0.86rem; color: var(--muted); }
      .panel-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
        gap: 1rem;
      }

      .notice {
        border: 1px solid rgba(200, 169, 110, 0.5);
        background: rgba(200, 169, 110, 0.12);
        border-radius: var(--radius);
        padding: 1rem 1.2rem;
        font-size: 0.92rem;
        line-height: 1.55;
        max-width: 84ch;
      }
      .notice strong { font-family: var(--font-head); }

      .empty-note { color: var(--muted); font-size: 0.92rem; margin: 0; }
      .empty-note--block {
        background: var(--paper);
        border: 1px dashed var(--line);
        border-radius: var(--radius-lg);
        padding: 2rem 1.4rem;
        text-align: center;
        margin-top: 1rem;
      }

      /* --- Kennzahlen --- */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 172px), 1fr));
        gap: 0.8rem;
      }
      .kpi {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        box-shadow: var(--shadow-sm);
        padding: 1rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .kpi__label {
        font-family: var(--font-head);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .kpi__value { font-family: var(--font-head); font-size: 1.9rem; line-height: 1.05; font-weight: 800; }
      .kpi__note { font-size: 0.8rem; color: var(--muted); }

      .delta { font-family: var(--font-head); font-weight: 600; font-size: 0.8rem; }
      .delta--up { color: var(--green); }
      .delta--down { color: var(--red); }
      .delta--flat, .delta--none { color: var(--muted); }
      .delta__ref { font-weight: 400; color: var(--muted); }

      /* --- Verlaufsdiagramm --- */
      .chart {
        display: flex;
        align-items: flex-end;
        gap: clamp(0.25rem, 1.2vw, 0.7rem);
        overflow-x: auto;
        padding-bottom: 0.2rem;
      }
      .chart__col {
        flex: 1 1 0;
        min-width: 38px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
      }
      .chart__count { font-family: var(--font-head); font-size: 0.8rem; font-weight: 700; }
      .chart__count.is-zero { color: var(--muted); font-weight: 400; }
      .chart__bar-track {
        width: 100%;
        height: 150px;
        display: flex;
        align-items: flex-end;
        border-bottom: 1.5px solid var(--line);
      }
      .chart__bar {
        width: 100%;
        min-height: 2px;
        background: var(--ink);
        border-radius: 5px 5px 0 0;
      }
      .chart__label { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }

      /* --- Anteilsbalken --- */
      .bar-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
      .bar-row {
        display: grid;
        grid-template-columns: minmax(7rem, 15rem) 1fr auto;
        align-items: center;
        gap: 0.8rem;
        font-size: 0.9rem;
      }
      .bar-row__label { overflow-wrap: anywhere; }
      .bar-row__track { height: 9px; background: var(--stone); border-radius: 999px; overflow: hidden; }
      .bar-row__fill { display: block; height: 100%; background: var(--ink); border-radius: 999px; }
      .bar-fill--neu { background: var(--accent); }
      .bar-fill--kontaktiert { background: var(--ink-soft); }
      .bar-fill--warm { background: #a67c3d; }
      .bar-fill--abgeschlossen { background: var(--green); }
      .bar-fill--abgelehnt { background: var(--red); }
      .bar-row__value { font-family: var(--font-head); font-weight: 700; font-size: 0.86rem; white-space: nowrap; }
      .bar-row__share { font-weight: 400; color: var(--muted); margin-left: 0.4rem; }
      .panel--sub .bar-row { grid-template-columns: minmax(4rem, 11rem) minmax(70px, 1fr) auto; }
      @media (max-width: 560px) {
        .bar-row, .panel--sub .bar-row { grid-template-columns: 1fr auto; }
        .bar-row__track { grid-column: 1 / -1; order: 3; }
      }

      /* --- Messkanäle --- */
      .channel-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
        align-items: start;
        gap: 1rem;
        margin-top: 1rem;
      }
      .channel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        padding: 1.3rem clamp(1.1rem, 2.5vw, 1.6rem);
      }
      .channel__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.8rem;
      }
      .channel__head h3 { font-size: 1.05rem; margin: 0 0 0.15rem; text-transform: none; letter-spacing: 0; color: var(--ink); }
      .channel__provider { font-size: 0.82rem; color: var(--muted); }
      .channel__summary { margin: 0 0 0.5rem; font-size: 0.93rem; }
      .channel__purpose { margin: 0 0 0.9rem; font-size: 0.88rem; }
      .channel__meta { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }

      .state {
        font-family: var(--font-head);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border-radius: 999px;
        padding: 0.4rem 0.85rem;
        white-space: nowrap;
        border: 1.5px solid transparent;
      }
      .state--aktiv { background: rgba(42, 107, 60, 0.12); border-color: rgba(42, 107, 60, 0.35); color: var(--green); }
      .state--unvollstaendig { background: rgba(179, 64, 47, 0.1); border-color: rgba(179, 64, 47, 0.3); color: var(--red); }
      .state--vorbereitet { background: var(--stone); border-color: var(--line); color: var(--muted); }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.76rem;
        font-family: var(--font-head);
        font-weight: 600;
        border-radius: 999px;
        padding: 0.28rem 0.7rem;
        background: var(--stone);
        border: 1px solid var(--line);
        color: var(--ink-soft);
      }
      .pill code { background: transparent; padding: 0; font-size: 0.95em; }
      .pill--on { background: rgba(42, 107, 60, 0.1); border-color: rgba(42, 107, 60, 0.3); color: var(--green); }
      .pill--off { background: var(--stone); color: var(--muted); }
      .pill--warn { background: rgba(200, 169, 110, 0.22); border-color: rgba(200, 169, 110, 0.5); color: #7a5a20; }
      .pill--key { background: var(--ink); border-color: var(--ink); color: var(--paper); }
      .pill--soft { background: transparent; }
      .tag-optional { font-size: 0.72rem; color: var(--muted); }

      .env-head {
        font-family: var(--font-head);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        margin: 0 0 0.6rem;
      }
      .env-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
      .env-item { padding-bottom: 0.7rem; border-bottom: 1px solid var(--line); }
      .env-item:last-child { padding-bottom: 0; border-bottom: none; }
      .env-item__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
      .env-item__purpose { margin: 0.35rem 0 0; font-size: 0.84rem; }
      .env-value { background: var(--ink); color: var(--paper); }

      .event-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .event-table th {
        text-align: left;
        font-family: var(--font-head);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        padding: 0 0.7rem 0.5rem 0;
        border-bottom: 1px solid var(--line);
      }
      .event-table td {
        padding: 0.6rem 0.7rem 0.6rem 0;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
      }
      .event-table tr:last-child td { border-bottom: none; }
      .event-table td:first-child { white-space: nowrap; }
      .event-table code { display: inline-block; margin: 0 0.2rem 0.2rem 0; }
      .src { font-size: 0.78rem; color: var(--muted); }
      .table-scroll { overflow-x: auto; }

      .steps { margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
      .steps h4 {
        font-family: var(--font-head);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
        margin: 0 0 0.6rem;
      }
      .steps ol { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.88rem; }
      .steps-done {
        margin: 1.1rem 0 0;
        padding-top: 1rem;
        border-top: 1px solid var(--line);
        font-size: 0.88rem;
        color: var(--green);
      }
      .steps--account h4 { color: #7a5a20; }
      .steps--account {
        border-top: none;
        margin-top: 1rem;
        padding: 0.9rem 1rem;
        border-radius: var(--radius);
        background: rgba(200, 169, 110, 0.12);
        border: 1px solid rgba(200, 169, 110, 0.45);
      }

      .how-list {
        margin: 0 0 1.2rem;
        padding-left: 1.3rem;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        font-size: 0.92rem;
        max-width: 84ch;
      }
      .how-list strong { font-family: var(--font-head); }
      .how-list a { color: var(--ink); }

      .fact-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
      .fact-list li {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.6rem;
        font-size: 0.9rem;
      }
      .fact-list span:first-child {
        font-family: var(--font-head);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        min-width: 11rem;
      }
      .fact-list strong { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-weight: 400; }
    </style>
  `;

  return new Response(pageShell({ title: 'Analyse', content }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
