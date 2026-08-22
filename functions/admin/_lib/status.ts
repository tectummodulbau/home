/** Zentrale Definition der Lead-Status — von leads.ts und leads/status.ts genutzt. */

export const LEAD_STATUSES = ['neu', 'kontaktiert', 'warm', 'abgeschlossen', 'abgelehnt'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  neu: 'Neuer Lead',
  kontaktiert: 'Kontaktiert',
  warm: 'Warm',
  abgeschlossen: 'Abgeschlossen',
  abgelehnt: 'Abgelehnt',
};
