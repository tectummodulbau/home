/**
 * Nur für die lokale Entwicklung: simuliert einen aktivierten optionalen
 * Dienst, ohne echte Daten an einen Drittanbieter zu senden. Wird ausschließlich
 * über `getRuntimeServices()` eingebunden, wenn `import.meta.env.DEV` true ist
 * UND die Umgebungsvariable PUBLIC_CONSENT_MOCK=1 gesetzt wurde. In Produktions-Builds
 * ist `import.meta.env.DEV` statisch `false`, wodurch Bundler diesen Import
 * aus dem ausgelieferten Code entfernen (Tree-Shaking) — der Mock-Dienst
 * gelangt nicht in den Produktivbetrieb.
 */
import type { ConsentService } from './registry';

export const MOCK_SERVICE: ConsentService = {
  id: 'dev-mock-service',
  name: 'Test-Dienst (nur lokale Entwicklung)',
  provider: 'Kein externer Anbieter — läuft ausschließlich lokal im Browser',
  category: 'analytics',
  purpose:
    'Simuliert einen optionalen Dienst, um Banner, Consent-Speicherung und Widerruf zu testen, ohne echte Drittanbieter-Verbindungen.',
  enabled: true,
  requiredEnv: [],
  privacyNotice: 'Nur sichtbar mit PUBLIC_CONSENT_MOCK=1 im Entwicklungsmodus. Nicht Teil des Produktiv-Builds.',
  storageInfo: 'Setzt kein Cookie und keinen Storage-Eintrag, loggt nur in die Browser-Konsole.',
  consentVersion: 1,
  load: () => console.info('[consentMock] Test-Dienst geladen (Zustimmung erteilt).'),
  cleanup: () => console.info('[consentMock] Test-Dienst entfernt (keine/widerrufene Zustimmung).'),
};
