/**
 * Seitenweites Tracking: Kontakt-Klicks, CTA-Klicks, Abschnitts-Sichtbarkeit
 * und FAQ-Aufklappen.
 *
 * Wird einmal pro Seite über Layout.astro geladen. Alles läuft über delegierte
 * Listener bzw. einen IntersectionObserver — die Komponenten selbst bleiben
 * unverändert. Ereignisse, die den Zustand einer Komponente brauchen
 * (Formular, Rechner, Video), sind dort direkt umgesetzt und rufen ebenfalls
 * nur den zentralen Tracker auf.
 */

import { track, trackOnce } from '../lib/analytics/tracker';

/**
 * Textliche Einordnung eines Elements: bevorzugt die ID des umgebenden
 * Abschnitts, sonst Kopf- bzw. Fußbereich.
 */
function sectionOf(element: Element): string {
  const section = element.closest<HTMLElement>('section[id]');
  if (section) return section.id;
  if (element.closest('footer')) return 'footer';
  if (element.closest('header')) return 'header';
  return 'unbekannt';
}

/**
 * Alle Links auf den Anfrage-Abschnitt gelten als CTA — das umfasst
 * „Unverbindliches Angebot", „Projekt anfragen", „Angebot anfragen",
 * „Unverbindliche Projektprüfung" und „Jetzt kontaktieren". Die Erkennung
 * läuft bewusst über das Sprungziel und nicht über die Beschriftung, damit
 * eine Textänderung im Marketing das Tracking nicht stillschweigend abhängt.
 * Reine Navigationslinks wie „Unsere Module" (#module) sind dadurch außen vor.
 */
const CTA_SELECTOR = 'a[href$="#anfrage"]';

function initClickTracking() {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      if (!target || typeof target.closest !== 'function') return;

      const phone = target.closest<HTMLAnchorElement>('a[href^="tel:"]');
      if (phone) {
        track('click_phone', { position: sectionOf(phone) });
        return;
      }

      const mail = target.closest<HTMLAnchorElement>('a[href^="mailto:"]');
      if (mail) {
        track('click_email');
        return;
      }

      const cta = target.closest<HTMLAnchorElement>(CTA_SELECTOR);
      if (cta) {
        track('cta_click', {
          cta_label: cta.textContent ?? '',
          section: sectionOf(cta),
        });
      }
    },
    // Capture-Phase: das Event wird auch dann erfasst, wenn ein anderer
    // Listener die Weitergabe unterbindet.
    true
  );
}

function initSectionViews() {
  const sections = document.querySelectorAll<HTMLElement>('main section[id]');
  if (!sections.length || typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        // Zwei Wege gelten als „gesehen": entweder sind 50 % des Abschnitts
        // im Viewport, oder der Abschnitt füllt — weil er höher ist als der
        // Viewport — mindestens dessen halbe Höhe aus. Ohne die zweite
        // Bedingung würden sehr lange Abschnitte auf kleinen Displays nie
        // gezählt.
        const fillsHalfViewport = entry.intersectionRect.height >= window.innerHeight * 0.5;
        if (entry.intersectionRatio < 0.5 && !fillsHalfViewport) continue;

        const id = (entry.target as HTMLElement).id;
        const sent = trackOnce(`section_view:${id}`, 'section_view', { section_id: id });
        // Erst abmelden, wenn das Event auch wirklich gesendet wurde —
        // solange die Consent-Sperre greift, bleibt der Abschnitt beobachtet.
        if (sent) observer.unobserve(entry.target);
      }
    },
    { threshold: [0.25, 0.5, 0.75] }
  );

  sections.forEach((section) => observer.observe(section));
}

function initFaqTracking() {
  document.querySelectorAll<HTMLDetailsElement>('#faq details').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      const frage = item.querySelector('summary span')?.textContent ?? '';
      track('faq_open', { frage });
    });
  });
}

function init() {
  initClickTracking();
  initSectionViews();
  initFaqTracking();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
