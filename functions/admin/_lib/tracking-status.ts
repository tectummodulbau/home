/**
 * Auswertung des Messaufbaus für die Analyseübersicht.
 *
 * Verbindet zwei Quellen:
 *   - src/lib/analytics/manifest.ts — was im Code verdrahtet ist (Kanäle,
 *     Freischaltung, Event-Katalog). Importierbar, weil das Manifest keine
 *     Browser-APIs anfasst.
 *   - die Runtime-Umgebung der Pages Function — welche Variablen in
 *     Cloudflare tatsächlich gesetzt sind.
 *
 * WICHTIGE EINSCHRÄNKUNG, die die Seite auch anzeigt: Diese Function liest
 * die Variablen zur LAUFZEIT. Das ausgelieferte JavaScript bekommt sie
 * dagegen zur BUILD-Zeit von Vite eingesetzt. Beides stimmt nur überein,
 * wenn die Variable in Cloudflare Pages → Settings → Environment variables
 * steht (dort gilt sie für Build und Runtime). Eine Variable, die nur in den
 * `[vars]` von wrangler.toml steht, wäre hier sichtbar, käme im Frontend
 * aber nie an — die Übersicht meldete „gesetzt", gemessen würde trotzdem
 * nichts. Zusätzlich gilt: Variablen, die nach dem letzten Deployment
 * geändert wurden, greifen im Frontend erst nach einem neuen Build.
 */
import {
  ANALYTICS_HOSTS_DEFAULT,
  MEASUREMENT_CHANNELS,
  type MeasurementChannel,
} from '../../../src/lib/analytics/manifest';

export type TrackingEnv = Record<string, string | undefined>;

export type ChannelState = 'aktiv' | 'unvollstaendig' | 'vorbereitet';

export const CHANNEL_STATE_LABELS: Record<ChannelState, string> = {
  aktiv: 'Aktiv',
  unvollstaendig: 'Freigeschaltet, aber unvollständig',
  vorbereitet: 'Vorbereitet — abgeschaltet',
};

export interface EnvStatus {
  name: string;
  required: boolean;
  purpose: string;
  present: boolean;
  /** Nur gefüllt, wenn der Wert kein Geheimnis ist (siehe `showValue` im Manifest). */
  value?: string;
}

export interface ChannelStatus {
  channel: MeasurementChannel;
  state: ChannelState;
  stateLabel: string;
  /** Ein Satz, der den Zustand erklärt — nicht nur benennt. */
  summary: string;
  env: EnvStatus[];
  /** ID, mit der der Kanal tatsächlich senden würde. */
  effectiveId?: string;
  /** Was noch zu tun ist, bevor der Kanal produktiv misst. */
  openSteps: string[];
}

function readEnv(env: TrackingEnv, name: string): string | undefined {
  const value = env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function evaluateChannel(channel: MeasurementChannel, env: TrackingEnv): ChannelStatus {
  const envStatus: EnvStatus[] = channel.env.map((requirement) => {
    const value = readEnv(env, requirement.name);
    return {
      name: requirement.name,
      required: requirement.required,
      purpose: requirement.purpose,
      present: value !== undefined,
      value: value !== undefined && requirement.showValue ? value : undefined,
    };
  });

  const missingRequired = envStatus.filter((e) => e.required && !e.present);
  const firstSetValue = envStatus.find((e) => e.present && e.value)?.value;
  const effectiveId = firstSetValue ?? channel.fallbackId;

  let state: ChannelState;
  let summary: string;

  if (!channel.enabled) {
    state = 'vorbereitet';
    summary =
      'Im Code vollständig verdrahtet, aber abgeschaltet. Es wird kein Skript geladen und kein Request abgesetzt — auch dann nicht, wenn eine Zustimmung vorliegt.';
  } else if (missingRequired.length > 0) {
    state = 'unvollstaendig';
    summary = `Freigeschaltet, aber ${
      missingRequired.length === 1 ? 'eine Pflichtvariable fehlt' : 'Pflichtvariablen fehlen'
    }. Der Kanal bricht beim Laden ab und misst nichts.`;
  } else {
    state = 'aktiv';
    summary = channel.hostLocked
      ? 'Misst nach erteilter Zustimmung — beschränkt auf die unten genannten Hosts.'
      : 'Misst nach erteilter Zustimmung.';
  }

  const openSteps = [
    ...missingRequired.map((e) => `${e.name} in Cloudflare Pages setzen — ${e.purpose}`),
    ...(channel.enabled ? [] : channel.activationSteps),
  ];

  return {
    channel,
    state,
    stateLabel: CHANNEL_STATE_LABELS[state],
    summary,
    env: envStatus,
    effectiveId,
    openSteps,
  };
}

export function evaluateChannels(env: TrackingEnv): ChannelStatus[] {
  return MEASUREMENT_CHANNELS.map((channel) => evaluateChannel(channel, env));
}

/**
 * Hosts, auf denen gemessen wird. Spiegelt die Auswertung in
 * src/lib/analytics/config.ts — mit derselben Vorgabe aus dem Manifest.
 */
export function resolveAnalyticsHosts(env: TrackingEnv): string[] {
  const raw = readEnv(env, 'PUBLIC_ANALYTICS_HOSTS');
  const hosts = raw ? raw.split(',') : ANALYTICS_HOSTS_DEFAULT;
  return hosts.map((h) => h.trim().toLowerCase()).filter(Boolean);
}

export function isMeasuredHost(hosts: string[], hostname: string): boolean {
  return hosts.includes(hostname.toLowerCase());
}
