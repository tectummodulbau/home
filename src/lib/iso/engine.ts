/**
 * Isometrische Mini-Engine: erzeugt SVG-Strings für die 3D-Modulhäuser.
 *
 * Koordinaten in Metern. x läuft nach rechts-unten, y nach links-unten,
 * z nach oben. Sichtbar sind Dach/Oberseite, die Fläche bei y = max
 * („Längsseite", links) und die Fläche bei x = max („Stirnseite", rechts).
 *
 * Keine Browser-APIs, keine Abhängigkeiten — läuft beim Build und erzeugt
 * statisches Markup, das per CSS/JS animiert wird.
 */

export const S = 36;
export const KX = Math.cos(Math.PI / 6) * S;
export const KY = S / 2;

export type V3 = [number, number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export const proj = (x: number, y: number, z: number): [number, number] => [
  (x - y) * KX,
  (x + y) * KY - z * S,
];

const P = (v: V3) => {
  const [a, b] = proj(v[0], v[1], v[2]);
  return `${r1(a)},${r1(b)}`;
};

export const poly = (vs: V3[], fill: string, extra = '') =>
  `<polygon points="${vs.map(P).join(' ')}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`;

export const segs = (ls: [V3, V3][], stroke: string, w = 1, extra = '') =>
  `<path d="${ls.map(([a, b]) => `M${P(a)}L${P(b)}`).join('')}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra ? ` ${extra}` : ''}/>`;

/** Zeichnet 2D-Inhalt (Meter) auf eine Fläche im Raum. */
export const plane = {
  /** Längsseite (y = const). u → +x, v → hoch. */
  L: (x: number, y: number, z: number, inner: string) => {
    const [ox, oy] = proj(x, y, z);
    return `<g transform="matrix(${r3(KX)} ${r3(KY)} 0 ${-S} ${r1(ox)} ${r1(oy)})">${inner}</g>`;
  },
  /** Stirnseite (x = const). u → +y, v → hoch. */
  R: (x: number, y: number, z: number, inner: string) => {
    const [ox, oy] = proj(x, y, z);
    return `<g transform="matrix(${-r3(KX)} ${r3(KY)} 0 ${-S} ${r1(ox)} ${r1(oy)})">${inner}</g>`;
  },
  /** Boden/Oberseite (z = const). u → +x, v → +y. */
  T: (x: number, y: number, z: number, inner: string) => {
    const [ox, oy] = proj(x, y, z);
    return `<g transform="matrix(${r3(KX)} ${r3(KY)} ${-r3(KX)} ${r3(KY)} ${r1(ox)} ${r1(oy)})">${inner}</g>`;
  },
};

export interface Tone {
  top: string;
  left: string;
  right: string;
}

export function box(x: number, y: number, z: number, w: number, d: number, h: number, c: Tone, extra = ''): string {
  const left = poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.left, extra);
  const right = poly([[x + w, y + d, z], [x + w, y, z], [x + w, y, z + h], [x + w, y + d, z + h]], c.right, extra);
  const top = poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.top, extra);
  return left + right + top;
}

/** Wrapper für animierbare Teile. Offset (dx,dy,dz) in Metern = Startlage. */
export function item(
  inner: string,
  o: { at?: [number, number]; from?: V3; delay?: number; id?: string; cls?: string } = {},
): string {
  const [tx, ty] = o.from ? proj(o.from[0], o.from[1], o.from[2]) : [0, 0];
  const attrs = [
    `class="iso-item${o.cls ? ` ${o.cls}` : ''}"`,
    o.id ? `data-item="${o.id}"` : '',
    o.at ? `data-at="${o.at[0]},${o.at[1]}"` : '',
    `style="--tx:${r1(tx)}px;--ty:${r1(ty)}px;--d:${o.delay ?? 0}s"`,
  ]
    .filter(Boolean)
    .join(' ');
  return `<g ${attrs}>${inner}</g>`;
}

/** Gradienten & Filter, je SVG eigenständig (ids mit Präfix). */
export function defs(id: string): string {
  return `<defs>
<linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6bb80"/><stop offset="1" stop-color="#d29d5b"/></linearGradient>
<linearGradient id="${id}-woodD" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8703a"/><stop offset="1" stop-color="#8d5a2b"/></linearGradient>
<linearGradient id="${id}-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa9b8"/><stop offset=".55" stop-color="#b9c8cc"/><stop offset="1" stop-color="#f1d6a2"/></linearGradient>
<linearGradient id="${id}-glassN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d7585"/><stop offset="1" stop-color="#f3c675"/></linearGradient>
<linearGradient id="${id}-pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c3d5e"/><stop offset="1" stop-color="#14203a"/></linearGradient>
<linearGradient id="${id}-water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd3e6"/><stop offset="1" stop-color="#3e9cc0"/></linearGradient>
<radialGradient id="${id}-leaf" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#8fb06a"/><stop offset="1" stop-color="#4c7a45"/></radialGradient>
<radialGradient id="${id}-leaf2" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#a5c17a"/><stop offset="1" stop-color="#5f8c4f"/></radialGradient>
<radialGradient id="${id}-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<filter id="${id}-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;
}

export const TONES = {
  wood: (id: string): Tone => ({ top: '#e8c796', left: `url(#${id}-wood)`, right: '#9a6a36' }),
  dark: { top: '#4a4d52', left: '#34332f', right: '#232220' } as Tone,
  stone: { top: '#e4ded0', left: '#c4bba8', right: '#a99f8b' } as Tone,
  white: { top: '#f7f4ec', left: '#e3ded2', right: '#c9c3b5' } as Tone,
  metal: { top: '#d9dcdf', left: '#b8bcc1', right: '#9a9fa5' } as Tone,
  deck: { top: '#6b5d4f', left: '#3e3630', right: '#2f2924' } as Tone,
};

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(vs: V3[], pad = 20): Bounds {
  const ps = vs.map((v) => proj(v[0], v[1], v[2]));
  return {
    minX: Math.min(...ps.map((p) => p[0])) - pad,
    minY: Math.min(...ps.map((p) => p[1])) - pad,
    maxX: Math.max(...ps.map((p) => p[0])) + pad,
    maxY: Math.max(...ps.map((p) => p[1])) + pad,
  };
}

export function svg(id: string, b: Bounds, inner: string, label: string, cls = 'iso'): string {
  const w = Math.round(b.maxX - b.minX);
  const h = Math.round(b.maxY - b.minY);
  return `<svg class="${cls}" viewBox="${Math.round(b.minX)} ${Math.round(b.minY)} ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${defs(id)}${inner}</svg>`;
}
