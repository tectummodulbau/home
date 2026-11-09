/**
 * Aggregation der Lead-Datensätze für die Analyseübersicht.
 *
 * Reine Funktionen ohne Netzwerk- und ohne DOM-Zugriff: Eingabe sind die
 * Datensätze aus lead-source.ts, Ausgabe sind fertige Zahlen. Die Berechnung
 * bleibt dadurch nachvollziehbar und lässt sich isoliert prüfen, ohne dass
 * Supabase oder eine gerenderte Seite im Spiel wären.
 *
 * Bezugszeitpunkt wird immer hereingereicht (`now`), nicht intern gelesen —
 * sonst hinge das Ergebnis davon ab, wann genau die Funktion läuft.
 */
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from './status';
import type { LeadRecord } from './lead-source';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Anzahl der Wochenbalken im Verlauf. */
export const HISTORY_WEEKS = 12;

export interface PeriodComparison {
  label: string;
  days: number;
  count: number;
  previous: number;
  /** Veränderung gegenüber dem gleich langen Zeitraum davor. Null, wenn der Vorzeitraum leer war. */
  deltaPercent: number | null;
}

export interface HistoryBucket {
  /** Startdatum des Sieben-Tage-Fensters, Format „TT.MM.". */
  label: string;
  count: number;
}

export interface DimensionEntry {
  value: string;
  count: number;
  /** Anteil an allen Leads mit Angabe in dieser Dimension, 0–100. */
  share: number;
}

export interface Dimension {
  key: string;
  label: string;
  entries: DimensionEntry[];
  /** Datensätze ohne Angabe in dieser Dimension. */
  missing: number;
}

export interface StatusCount {
  status: LeadStatus;
  label: string;
  count: number;
  share: number;
}

export interface LeadStats {
  total: number;
  periods: PeriodComparison[];
  statusCounts: StatusCount[];
  history: HistoryBucket[];
  historyMax: number;
  dimensions: Dimension[];
  firstAt: number | null;
  lastAt: number | null;
  /** Leads, die weder „neu" noch „kontaktiert" sind — also bereits bewertet. */
  decided: number;
  won: number;
  lost: number;
  /** Abschlussquote unter den entschiedenen Leads, 0–100. Null ohne Entscheidung. */
  winRate: number | null;
  /** Anteil der Leads, die den Status „neu" verlassen haben, 0–100. */
  processedRate: number | null;
  /** Durchschnitt über die Wochen des Verlaufsdiagramms. */
  avgPerWeek: number;
}

/** Zeitstempel eines Datensatzes, oder null bei unbrauchbarem Wert. */
function timestampOf(lead: LeadRecord): number | null {
  const t = new Date(lead.created_at).getTime();
  return Number.isFinite(t) ? t : null;
}

function countInWindow(times: number[], from: number, to: number): number {
  return times.filter((t) => t >= from && t < to).length;
}

function comparePeriod(times: number[], now: number, days: number, label: string): PeriodComparison {
  const span = days * DAY_MS;
  const count = countInWindow(times, now - span, now + 1);
  const previous = countInWindow(times, now - 2 * span, now - span);
  return {
    label,
    days,
    count,
    previous,
    // Ohne Vergleichswert ist jede Prozentangabe irreführend („+100 %" bei
    // 0 → 1 sagt nichts). Dann lieber gar keine Zahl.
    deltaPercent: previous === 0 ? null : Math.round(((count - previous) / previous) * 100),
  };
}

function formatDayMonth(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.`;
}

/**
 * Verlauf als gleich lange Sieben-Tage-Fenster, die auf `now` enden. Bewusst
 * keine Kalenderwochen: die letzte Kalenderwoche wäre angebrochen und damit
 * systematisch niedriger als die davor — im Diagramm sähe das nach einem
 * Einbruch aus, der keiner ist.
 */
function buildHistory(times: number[], now: number, weeks: number): HistoryBucket[] {
  const buckets: HistoryBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * WEEK_MS;
    const start = end - WEEK_MS;
    buckets.push({
      label: formatDayMonth(start),
      count: countInWindow(times, start, i === 0 ? now + 1 : end),
    });
  }
  return buckets;
}

const DIMENSION_FIELDS: { key: keyof LeadRecord; label: string }[] = [
  { key: 'abnehmer_typ', label: 'Rolle des Anfragenden' },
  { key: 'vorhaben', label: 'Vorhaben' },
  { key: 'einheitenanzahl', label: 'Anzahl Einheiten' },
  { key: 'erwerbsmodell', label: 'Erwerbsmodell' },
  { key: 'flaeche_vorhanden', label: 'Fläche vorhanden' },
];

function buildDimension(leads: LeadRecord[], key: keyof LeadRecord, label: string): Dimension {
  const counts = new Map<string, number>();
  let missing = 0;

  for (const lead of leads) {
    const raw = lead[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) {
      missing++;
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const answered = leads.length - missing;
  const entries = [...counts.entries()]
    .map(([value, count]) => ({
      value,
      count,
      share: answered === 0 ? 0 : Math.round((count / answered) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'de'));

  return { key: String(key), label, entries, missing };
}

export function buildLeadStats(leads: LeadRecord[], now: number): LeadStats {
  const times = leads.map(timestampOf).filter((t): t is number => t !== null);
  const total = leads.length;

  const statusCounts: StatusCount[] = LEAD_STATUSES.map((status) => {
    const count = leads.filter((l) => l.status === status).length;
    return {
      status,
      label: STATUS_LABELS[status],
      count,
      share: total === 0 ? 0 : Math.round((count / total) * 100),
    };
  });

  const won = leads.filter((l) => l.status === 'abgeschlossen').length;
  const lost = leads.filter((l) => l.status === 'abgelehnt').length;
  const decided = won + lost;
  const untouched = leads.filter((l) => l.status === 'neu').length;

  const history = buildHistory(times, now, HISTORY_WEEKS);
  const historySum = history.reduce((sum, b) => sum + b.count, 0);

  return {
    total,
    periods: [
      comparePeriod(times, now, 7, 'Letzte 7 Tage'),
      comparePeriod(times, now, 30, 'Letzte 30 Tage'),
      comparePeriod(times, now, 90, 'Letzte 90 Tage'),
    ],
    statusCounts,
    history,
    historyMax: history.reduce((max, b) => Math.max(max, b.count), 0),
    dimensions: DIMENSION_FIELDS.map((f) => buildDimension(leads, f.key, f.label)),
    firstAt: times.length ? Math.min(...times) : null,
    lastAt: times.length ? Math.max(...times) : null,
    decided,
    won,
    lost,
    winRate: decided === 0 ? null : Math.round((won / decided) * 100),
    processedRate: total === 0 ? null : Math.round(((total - untouched) / total) * 100),
    avgPerWeek: Math.round((historySum / HISTORY_WEEKS) * 10) / 10,
  };
}
