import { getImage } from 'astro:assets';

export type LightboxAttrs = Record<string, string>;

/**
 * Attribute für ein Element, das die Lightbox öffnen soll.
 *
 * Die Lightbox (`components/Lightbox.astro`) sammelt beim Laden alle Elemente
 * mit `data-lb` in DOM Reihenfolge und blättert durch diese Liste. Doppelte
 * Quellen (z. B. dasselbe Foto im Werk und in der Galerie) erscheinen dort nur
 * einmal. Das große Bild wird hier beim Build als WebP erzeugt, damit die
 * Lightbox nicht das Originalfoto laden muss.
 */
export async function lightboxImage(src: ImageMetadata, alt: string, caption: string): Promise<LightboxAttrs> {
  const full = await getImage({
    src,
    width: Math.min(1800, src.width),
    format: 'webp',
    quality: 80,
  });
  return {
    'data-lb': 'image',
    'data-lb-src': full.src,
    'data-lb-alt': alt,
    'data-lb-caption': caption,
    role: 'button',
    tabindex: '0',
    'aria-label': `${caption}, Bild vergrößern`,
  };
}

export function lightboxVideo(src: string, poster: string, alt: string, caption: string): LightboxAttrs {
  return {
    'data-lb': 'video',
    'data-lb-src': src,
    'data-lb-poster': poster,
    'data-lb-alt': alt,
    'data-lb-caption': caption,
    role: 'button',
    tabindex: '0',
    'aria-label': `${caption}, Video abspielen`,
  };
}
