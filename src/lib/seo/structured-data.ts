/**
 * Strukturierte Daten (JSON-LD).
 *
 * Erzeugt die Schema-Objekte, die JsonLd.astro im <head> ausgibt. Die
 * Unternehmensdaten stehen hier an genau einer Stelle und entsprechen dem
 * Impressum (src/pages/impressum.astro) sowie dem Footer.
 *
 * Das FAQPage-Schema wird aus src/lib/content/faq.ts erzeugt — derselben
 * Quelle, aus der die sichtbaren FAQ-Einträge gerendert werden. Beide gehen
 * durch `normalizeText()`, der Schema-Text ist dadurch wortgleich mit dem
 * angezeigten.
 */

import { FAQS, normalizeText } from '../content/faq';

export const SITE_URL = 'https://tectum-modulbau.de';

/**
 * Der Name, unter dem die Website in Suchergebnissen erscheinen soll.
 *
 * Google leitet den „Site name“ im Suchergebnis notfalls selbst her — aus dem
 * Domainnamen, aus og:site_name oder aus dem WebSite-Schema. Fehlen die
 * expliziten Signale, ersetzt Google auf der Startseite gern den gesamten
 * Titel durch den hergeleiteten Namen. Genau das ist hier passiert. Deshalb
 * steht der Name jetzt an einer Stelle und wird von og:site_name, vom
 * WebSite-Schema und von der Organisation gleichlautend ausgegeben.
 */
export const SITE_NAME = 'Tectum Modulbau';

/**
 * Vorschaubild für Suchergebnisse und geteilte Links.
 *
 * Bewusst eine Datei aus `public/` und kein Import aus `src/assets`: Astro
 * hasht optimierte Bilder beim Build, og:image braucht aber eine stabile,
 * absolute URL. Breite und Höhe entsprechen der tatsächlichen Datei — falsche
 * Angaben lassen manche Netzwerke die Vorschau verwerfen.
 */
export const OG_IMAGE = {
  path: '/video/hero-film-poster.jpg',
  width: 1280,
  height: 720,
  type: 'image/jpeg',
  alt: 'Schlüsselfertige modulare Wohneinheit von Tectum Modulbau',
} as const;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Unternehmensdaten — Quelle: Impressum. */
const COMPANY = {
  legalName: 'Tectum Ecobau GmbH & Co. KG',
  brand: 'Tectum Modulbau',
  street: 'Hohenzollern Platz 7',
  postalCode: '47167',
  city: 'Duisburg',
  country: 'DE',
  phone: '+4920393565788',
  mobile: '+4915256243044',
  email: 'stankovic@ecobau-tectum.de',
  vatId: 'DE815350234',
} as const;

/**
 * Die drei Grundmodule. Bewusst OHNE Preisangabe: Auf der Seite werden keine
 * Preise ausgewiesen, und ein Product/Offer ohne `price` erzeugt im Rich
 * Results Test Warnungen, ohne ein Rich Result zu ermöglichen. Der
 * OfferCatalog beschreibt das Portfolio maschinenlesbar und bleibt dabei
 * fehlerfrei. Sollten später Preise veröffentlicht werden, gehören sie hier
 * als `offers` ergänzt.
 */
const MODULE_ANGEBOTE = [
  {
    name: 'Schlafeinheit',
    description:
      'Modulare Unterkunft für vier Personen mit zwei Schlafzimmern, Vollbad, Klimaanlage und Wärmepumpe.',
  },
  {
    name: 'Wohnraumeinheit',
    description:
      'Modulare Unterkunft für vier Personen mit Küche, Wohnbereich, Schlafbereich, Vollbad, Klimaanlage und Wärmepumpe.',
  },
  {
    name: 'Luxuseinheit',
    description:
      'Modulare Premium-Unterkunft für vier Personen mit erweiterter Fläche, Premium-Küche, Wohn- und Schlafbereich, Vollbad und Klimaanlage.',
  },
] as const;

export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: COMPANY.legalName,
    legalName: COMPANY.legalName,
    alternateName: COMPANY.brand,
    url: `${SITE_URL}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/favicon.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}${OG_IMAGE.path}`,
    description:
      'Hersteller schlüsselfertiger Modulhäuser, Mobilheime und modularer Wohneinheiten für Campingplatzbetreiber, Wohnparks, Kommunen, Projektentwickler und Händler. DGNB- und TÜV-zertifiziert, Kauf und Leasing.',
    slogan: 'Modulare Wohneinheiten. Geliefert. Zertifiziert. Sofort einsatzbereit.',
    // Themenfelder des Unternehmens. Kein Ranking-Faktor für sich, aber ein
    // Zuordnungssignal: Suchmaschinen verknüpfen die Entität „Tectum Modulbau“
    // damit erst mit den Begriffen, unter denen die Zielgruppe sucht. Ein
    // <meta name="keywords"> leistet das seit 2009 nachweislich nicht mehr.
    knowsAbout: [
      'Modulhaus',
      'Modulbau',
      'Mobilheim',
      'Modulare Wohneinheiten',
      'Tiny House',
      'Glamping-Unterkünfte',
      'Camping-Chalets',
      'Ferienhäuser in Modulbauweise',
      'Arbeitnehmerunterkünfte',
      'Kommunale Unterkünfte',
      'Serielles Bauen',
      'Vorgefertigte Raummodule',
    ],
    areaServed: [
      { '@type': 'Country', name: 'Deutschland' },
      { '@type': 'Country', name: 'Österreich' },
      { '@type': 'Country', name: 'Schweiz' },
    ],
    email: COMPANY.email,
    telephone: COMPANY.phone,
    vatID: COMPANY.vatId,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.street,
      postalCode: COMPANY.postalCode,
      addressLocality: COMPANY.city,
      addressCountry: COMPANY.country,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: COMPANY.phone,
        email: COMPANY.email,
        areaServed: 'DE',
        availableLanguage: ['de'],
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Modulare Wohneinheiten',
      itemListElement: MODULE_ANGEBOTE.map((modul) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: modul.name,
          description: modul.description,
          brand: { '@id': ORGANIZATION_ID },
        },
      })),
    },
  };
}

/**
 * WebSite-Schema — Googles offizielles Signal für den „Site name“ im
 * Suchergebnis. Gehört laut Google ausschließlich auf die Startseite; JsonLd
 * gibt es deshalb nur unter „/“ aus.
 */
export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: [COMPANY.legalName, 'Tectum Ecobau', 'Tectum'],
    url: `${SITE_URL}/`,
    inLanguage: 'de-DE',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function buildFaqSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: normalizeText(faq.q),
      acceptedAnswer: {
        '@type': 'Answer',
        text: normalizeText(faq.a),
      },
    })),
  };
}

/**
 * Serialisiert ein Schema-Objekt für die Ausgabe in einem <script>-Element.
 * `<` wird escaped, damit ein Wert, der zufällig `</script>` enthält, das
 * Element nicht vorzeitig schließen kann.
 */
export function serializeSchema(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
