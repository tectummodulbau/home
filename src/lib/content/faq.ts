/**
 * FAQ-Inhalte — gemeinsame Datenquelle für Anzeige und strukturierte Daten.
 *
 * Die Komponente Faq.astro rendert daraus die sichtbaren Einträge, die
 * JSON-LD-Erzeugung (src/lib/seo/structured-data.ts) speist daraus das
 * FAQPage-Schema. Beide gehen durch `normalizeText()`, damit im Schema
 * wortgleich derselbe Text steht wie auf der Seite. Wer hier etwas ändert,
 * ändert automatisch beides — es gibt keine zweite Fassung der Antworten.
 *
 * Hinweis: Die Original-Seite enthielt die Isolierungs-Frage doppelt —
 * hier zu einer Antwort zusammengeführt.
 */

export interface FaqEntry {
  /** Frage, wie sie in der Aufklappzeile steht. */
  q: string;
  /** Antwort. Zeilenumbrüche und Einrückung dienen nur der Lesbarkeit im Code. */
  a: string;
}

/**
 * Führt die im Quelltext eingerückten Mehrzeiler auf genau den Text zurück,
 * den der Browser anzeigt: HTML klappt jede Folge von Leerraum zu einem
 * einzelnen Leerzeichen zusammen. Anzeige und Schema nutzen dieselbe
 * Funktion — dadurch können sie nicht auseinanderlaufen.
 */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export const FAQS: FaqEntry[] = [
  {
    q: 'Was ist Tectum Modulbau und was liefern Sie?',
    a: `Tectum ist Hersteller von schlüsselfertigen Modulhäusern und modular kombinierbaren
        Wohneinheiten für Campingplatzbetreiber, Wohnparks, Kommunen, Projektentwickler und
        Händler. Die Einheiten entstehen in serieller Modulbauweise im Werk, sind vollständig
        ausgestattet und nach dem Anschluss sofort einsatzbereit. Wir liefern ab 10 Einheiten
        in Deutschland, Österreich und der Schweiz.`,
  },
  {
    q: 'Was bedeutet schlüsselfertig beim Modulbau?',
    a: `Bad, Küche, Wärmepumpe und Klimaanlage sind ab Werk eingebaut. Das Modul wird komplett
        geliefert und ist nach dem Anschluss an Strom, Wasser und Abwasser nutzbar. Es bleibt
        keine Baustelle im klassischen Sinne: Sie brauchen keine Gewerke für den Innenausbau und
        keinen langen Planungsvorlauf.`,
  },
  {
    q: 'Wie lange dauert die Lieferung eines Modulhauses?',
    a: `Die Fertigung im Werk dauert wenige Wochen statt der 12 bis 24 Monate, die ein
        konventioneller Bau typischerweise braucht. Der genaue Liefertermin hängt von Stückzahl,
        Konfiguration und Standort ab und wird im Angebot festgelegt. Je früher Ihre Einheiten
        stehen, desto früher beginnt der Ertrag.`,
  },
  {
    q: 'Was ist der Unterschied zwischen einem Modulhaus und einem Mobilheim?',
    a: `Ein klassisches Mobilheim ist für die saisonale Nutzung gedacht. Tectum-Modulhäuser sind
        dagegen nach den Anforderungen des Gebäudeenergiegesetzes (GEG) gefertigt, durchgängig
        auf Passivhaus-Niveau gedämmt und mit Wärmepumpe und Klimaanlage ganzjährig nutzbar.
        Sie sind modular erweiterbar und lassen sich als Tiny House, Camping-Chalet oder
        Glamping-Unterkunft einsetzen.`,
  },
  {
    q: 'Für welche Projekte eignen sich Ihre Modulhäuser?',
    a: `Für Camping-Chalets und Glamping-Unterkünfte auf Campingplätzen, für Wohn- und
        Freizeitparks, für Arbeitnehmer- und Kommunalunterkünfte sowie für Messen und
        Ausstellungen. Es stehen drei Grundmodule zur Wahl: Schlafeinheit, Wohnraumeinheit und
        Luxuseinheit. Auf Wunsch ergänzen wir Terrasse, Sauna, Fitness, Pool oder
        Photovoltaik mit Speicher.`,
  },
  {
    q: 'Bieten Sie Leasing an?',
    a: `Ja. Alle Module stehen sowohl im Kauf als auch im Leasing zur Verfügung. Leasing bindet
        weniger Kapital und verkürzt die Zeit bis zum ersten Cashflow — die Einheiten arbeiten
        früher, ohne dass hohe Investitionssummen vorab gebunden werden. Auf Wunsch mit
        Rückkaufoption: Nach Ablauf der Laufzeit übernehmen wir die Einheiten zurück und
        erschließen den Zweitmarkt.`,
  },
  {
    q: 'Sind die Einheiten ganzjährig nutzbar?',
    a: `Ja. Jede Einheit ist mit einer Wärmepumpe und einer Klimaanlage ausgestattet. Damit sind
        die Module vollständig ganzjährig nutzbar: im Winter effizient beheizt, im Sommer
        zuverlässig gekühlt. Ein saisonaler Betrieb ist ebenso möglich wie eine dauerhafte
        Belegung.`,
  },
  {
    q: 'Welche Energie- und Isolierungsstandards erfüllen die Einheiten?',
    a: `Alle Tectum-Moduleinheiten werden nach den aktuellen Anforderungen des
        Gebäudeenergiegesetzes (GEG) gefertigt. Die Dämmung ist mit einem
        Wärmedurchgangskoeffizienten (U-Wert) von unter 0,20 W/(m²·K) durchgängig auf
        Passivhaus-Niveau ausgelegt — zertifiziert durch TÜV und DGNB. Das Ergebnis: ein
        angenehmes Raumklima zu jeder Jahreszeit und hohe Energieeffizienz.`,
  },
  {
    q: 'Brauche ich eine Genehmigung?',
    a: `Das hängt von der geplanten Nutzungsart und dem jeweiligen Bundesland ab. Für eine
        gewerbliche Kurzzeitnutzung (z. B. auf Campingplätzen, Ferienanlagen oder als
        Mitarbeiterunterkunft) ist in den meisten Bundesländern eine Baugenehmigung
        erforderlich, sobald die Einheiten ortsfest aufgestellt und dauerhaft genutzt werden.
        Die Genehmigungspflicht entfällt in der Regel nur bei nachgewiesener temporärer
        Aufstellung ohne feste Erschließung. Für Dauernutzung als Wohnraum gelten die
        baurechtlichen Voraussetzungen des Standorts: Bebauungsplan, Flächennutzungsplan und
        Zulässigkeit der Nutzungsart. Tectum liefert die Einheiten mit allen relevanten
        technischen Nachweisen und Zertifizierungen (TÜV, DGNB, GEG-Nachweis), die als Grundlage für
        Genehmigungsverfahren benötigt werden — die Genehmigung selbst liegt im
        Verantwortungsbereich des Betreibers oder Grundstückseigentümers. Wir empfehlen die
        frühzeitige Abstimmung mit der zuständigen Baubehörde.`,
  },
  {
    q: 'Können Händler und Projektentwickler als Whitelabel-Partner einsteigen?',
    a: `Ja. Die Modulhäuser sind Whitelabel-fähig: Wiederverkäufer, Händler und Projektentwickler
        können sie unter eigener Marke anbieten. Gerne besprechen wir Stückzahlen,
        Konfiguration und Konditionen im persönlichen Gespräch.`,
  },
];
