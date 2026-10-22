/**
 * Consent-Runtime. Wird einmal pro Seite geladen (siehe PrivacyRoot.astro)
 * und steuert Banner, Einstellungsdialog sowie das Laden/Entfernen der in
 * registry.ts eingetragenen Dienste. Enthält keine dienstspezifische Logik —
 * die liegt ausschließlich in registry.ts.
 */
import { getRuntimeServices, type ConsentCategory } from './registry';
import {
  OPTIONAL_CATEGORIES,
  getGrantedCategories,
  isConsentValid,
  notifyConsentChange,
  readConsent,
  writeConsent,
} from './state';

const mockEnabled = import.meta.env.DEV && import.meta.env.PUBLIC_CONSENT_MOCK === '1';
const SERVICES = getRuntimeServices(mockEnabled);

function applyConsent(acceptedCategories: ConsentCategory[]) {
  // Reihenfolge ist wichtig: Erst werden alle Konsumenten benachrichtigt
  // (u. a. Google Consent Mode v2 und die Tracking-Sperre), erst danach
  // werden Dienste geladen. Nur so steht das `consent`-Update im dataLayer
  // bereits vor dem `config`-Aufruf des GA4-Tags.
  notifyConsentChange(acceptedCategories);

  for (const service of SERVICES) {
    if (!service.enabled) continue;
    const granted = service.category === 'necessary' || acceptedCategories.includes(service.category);
    if (granted) service.load();
    else service.cleanup();
  }
}

function revokeAll() {
  for (const service of SERVICES) {
    if (service.category !== 'necessary') service.cleanup();
  }
}

// ---------- Banner ----------

const banner = document.getElementById('tectum-consent-banner');

function showBanner() {
  banner?.removeAttribute('hidden');
  // Die mobile Sticky-CTA-Leiste weicht dem Banner (siehe global.css).
  document.documentElement.dataset.consentBanner = 'open';
}

function hideBanner() {
  banner?.setAttribute('hidden', '');
  delete document.documentElement.dataset.consentBanner;
}

// ---------- Einstellungsdialog ----------

const dialog = document.getElementById('tectum-privacy-dialog') as HTMLDialogElement | null;
let lastFocusedElement: HTMLElement | null = null;

function openDialog() {
  if (!dialog) return;
  lastFocusedElement = document.activeElement as HTMLElement | null;
  syncDialogToggles();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog() {
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
  lastFocusedElement?.focus();
}

function syncDialogToggles() {
  if (!dialog) return;
  const accepted = new Set(getGrantedCategories());
  dialog.querySelectorAll<HTMLInputElement>('input[data-consent-category]').forEach((input) => {
    const category = input.dataset.consentCategory as ConsentCategory;
    input.checked = accepted.has(category);
  });
}

function readDialogSelection(): ConsentCategory[] {
  if (!dialog) return [];
  return [...dialog.querySelectorAll<HTMLInputElement>('input[data-consent-category]:checked')].map(
    (input) => input.dataset.consentCategory as ConsentCategory
  );
}

// ---------- Entscheidungen ----------

function decide(categories: ConsentCategory[]) {
  writeConsent(categories);
  applyConsent(categories);
  hideBanner();
  closeDialog();
}

function acceptAll() {
  decide(OPTIONAL_CATEGORIES);
}

function rejectAll() {
  revokeAll();
  decide([]);
}

function saveDialogSelection() {
  decide(readDialogSelection());
}

// ---------- Initialisierung ----------

function init() {
  // Öffnen des Dialogs ist unabhängig vom Zustand (A oder B) immer verfügbar.
  document.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest('[data-privacy-settings-trigger]');
    if (trigger) {
      event.preventDefault();
      openDialog();
    }
  });

  dialog?.querySelectorAll<HTMLElement>('[data-privacy-close]').forEach((el) =>
    el.addEventListener('click', () => closeDialog())
  );
  dialog?.addEventListener('cancel', () => {
    // native Esc-Behandlung des <dialog> — Fokus trotzdem sauber zurückgeben
    lastFocusedElement?.focus();
  });

  // "Einstellungen" im Banner trägt [data-privacy-settings-trigger]
  // und wird bereits vom delegierten Klick-Listener oben geöffnet.
  document.getElementById('cb-accept-all')?.addEventListener('click', acceptAll);
  document.getElementById('cb-reject-all')?.addEventListener('click', rejectAll);

  document.getElementById('pd-accept-all')?.addEventListener('click', acceptAll);
  document.getElementById('pd-reject-all')?.addEventListener('click', rejectAll);
  document.getElementById('pd-save')?.addEventListener('click', saveDialogSelection);

  const consent = readConsent();
  if (isConsentValid(consent)) {
    applyConsent(consent.categories);
  } else {
    showBanner();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
