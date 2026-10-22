/**
 * Bauteile der 3D-Szenen: Module, Anbauten, Außenanlage.
 * Jede Funktion liefert SVG-Markup; die Szenen setzen sie zusammen.
 */
import { box, plane, poly, segs, proj, TONES, S, type V3, type Tone } from './engine';

export type Variant = 'schlaf' | 'wohn' | 'luxus';

export const SPEC: Record<Variant, { w: number; d: number; h: number }> = {
  schlaf: { w: 6.2, d: 2.6, h: 2.6 },
  wohn: { w: 7.4, d: 2.6, h: 2.6 },
  luxus: { w: 9.2, d: 3.0, h: 2.8 },
};

const PLINTH = 0.35;
const RISE = 0.5;
const OH = 0.3;

const boards = (w: number, h: number, step: number, stroke: string, from = 0) => {
  let d = '';
  for (let u = from + step; u < w - 0.001; u += step) d += `M${u.toFixed(2)} 0V${h}`;
  return `<path d="${d}" stroke="${stroke}" stroke-width="0.012" fill="none"/>`;
};

/** Ein Fenster/Glaselement in Längsseiten-Koordinaten (Meter). */
function glassPane(id: string, u0: number, u1: number, v0: number, v1: number, o: { sliding?: boolean; sofa?: boolean; bed?: boolean; lamp?: boolean } = {}) {
  const w = u1 - u0;
  const h = v1 - v0;
  let s = `<rect x="${u0 - 0.07}" y="${v0 - 0.07}" width="${w + 0.14}" height="${h + 0.14}" fill="#22211e" rx="0.02"/>`;
  s += `<rect x="${u0}" y="${v0}" width="${w}" height="${h}" fill="url(#${id}-glass)"/>`;
  if (o.sofa) {
    s += `<rect x="${u0 + 0.25}" y="${v0 + 0.05}" width="${w * 0.55}" height="0.42" fill="#4a4843" rx="0.05"/>`;
    s += `<rect x="${u0 + 0.25}" y="${v0 + 0.3}" width="${w * 0.55}" height="0.38" fill="#5a5750" rx="0.06"/>`;
    s += `<rect x="${u0 + w * 0.7}" y="${v0 + 0.05}" width="0.04" height="1.3" fill="#3a3834"/>`;
    s += `<circle cx="${u0 + w * 0.7}" cy="${v0 + 1.42}" r="0.16" fill="#fff3d2"/>`;
  }
  if (o.bed) {
    s += `<rect x="${u0 + 0.1}" y="${v0 + 0.05}" width="${w - 0.2}" height="0.38" fill="#f4f0e6"/>`;
    s += `<rect x="${u0 + 0.1}" y="${v0 + 0.43}" width="${(w - 0.2) * 0.3}" height="0.18" fill="#e3dccb" rx="0.04"/>`;
  }
  if (o.lamp) {
    s += `<circle cx="${u0 + w * 0.5}" cy="${v1 - 0.28}" r="0.18" fill="#fff3d2" opacity=".95"/>`;
  }
  // Spiegelung
  s += `<path d="M${u0 + w * 0.12} ${v0} L${u0 + w * 0.42} ${v0} L${u0 + w * 0.12 - h * 0.18} ${v1} L${u0 - h * 0.18 + 0.02} ${v1}Z" fill="#fff" opacity=".16" clip-path="inset(0)"/>`;
  s += `<path d="M${u0 + w * 0.5} ${v0} L${u0 + w * 0.62} ${v0} L${u0 + w * 0.62 - h * 0.18} ${v1} L${u0 + w * 0.5 - h * 0.18} ${v1}Z" fill="#fff" opacity=".09"/>`;
  if (o.sliding) {
    s += `<rect x="${u0 + w / 2 - 0.025}" y="${v0}" width="0.05" height="${h}" fill="#22211e"/>`;
    s += `<rect x="${u0 + w / 2 + 0.1}" y="${v0 + h * 0.45}" width="0.04" height="0.35" fill="#22211e"/>`;
  }
  return s;
}

export interface ModuleOpts {
  x: number;
  y: number;
  z?: number;
  variant: Variant;
  /** Photovoltaik auf dem Dach */
  pv?: boolean;
}

export interface ModuleParts {
  body: string;
  roof: string;
  pv: string;
  glow: string;
  footprint: { x0: number; y0: number; x1: number; y1: number; top: number };
}

export function moduleParts(id: string, o: ModuleOpts): ModuleParts {
  const { w, d, h } = SPEC[o.variant];
  const x0 = o.x;
  const y0 = o.y;
  const z0 = o.z ?? 0;
  const x1 = x0 + w;
  const y1 = y0 + d;
  const wallZ = z0 + PLINTH;
  const Hf = wallZ + h;
  const Hb = Hf + RISE;

  // --- Sockel
  let body = box(x0 + 0.15, y0 + 0.15, z0, w - 0.3, d - 0.3, PLINTH + 0.02, { top: '#1b1a18', left: '#1b1a18', right: '#121110' });

  // --- Stirnseite (dunkel, schräge Oberkante)
  body += poly([[x1, y1, wallZ], [x1, y0, wallZ], [x1, y0, Hb], [x1, y1, Hf]], '#2a2927');
  let ys = '';
  const rl: [V3, V3][] = [];
  for (let k = 1; k < d / 0.22; k++) {
    const y = y0 + k * 0.22;
    const top = Hb - ((y - y0) / d) * RISE;
    rl.push([[x1, y, wallZ], [x1, y, top]]);
  }
  ys = segs(rl, 'rgba(255,255,255,.07)', 1);
  body += ys;
  // Stirnseiten-Fenster (schmal) beim Luxusmodul
  if (o.variant === 'luxus') {
    body += plane.R(x1, y0 + 0.7, wallZ + 0.9, `<rect x="0" y="0" width="1.0" height="1.2" fill="#22211e"/><rect x="0.06" y="0.06" width="0.88" height="1.08" fill="url(#${id}-glassN)"/>`);
  }

  // --- Längsseite: Holz + dunkles Endpaneel
  const darkU = 1.35;
  let face = `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#${id}-wood)"/>`;
  face += boards(w - darkU, h, 0.17, 'rgba(110,64,22,.20)');
  face += `<rect x="${w - darkU}" y="0" width="${darkU}" height="${h}" fill="#34332f"/>`;
  face += boards(w, h, 0.17, 'rgba(255,255,255,.06)', w - darkU);
  // Schattenfuge unter Dachkante
  face += `<rect x="0" y="${h - 0.22}" width="${w}" height="0.22" fill="#000" opacity=".13"/>`;

  if (o.variant === 'schlaf') {
    face += `<rect x="0.55" y="0" width="0.95" height="2.15" fill="#2a2926"/><rect x="0.62" y="0.07" width="0.81" height="2.01" fill="#3b3a36"/><rect x="1.2" y="0.95" width="0.04" height="0.3" fill="#b9b4a8"/>`;
    face += glassPane(id, 2.1, 3.3, 0.85, 2.0, { bed: true, lamp: true });
    face += glassPane(id, 3.9, 5.0, 0.85, 2.0, { bed: true });
  } else if (o.variant === 'wohn') {
    face += glassPane(id, 0.55, 1.45, 0.1, 2.25, { lamp: true });
    face += glassPane(id, 2.4, 5.6, 0.1, 2.25, { sliding: true, sofa: true });
  } else {
    face += glassPane(id, 0.6, 4.3, 0.1, 2.45, { sliding: true, sofa: true });
    face += glassPane(id, 4.9, 7.6, 0.1, 2.45, { sliding: true, bed: true, lamp: true });
  }
  // Hausnummer-Schild / Wandleuchten
  face += `<rect x="${w - darkU + 0.35}" y="${h - 0.8}" width="0.6" height="0.14" fill="#c8a96e" rx="0.02"/>`;
  body += plane.L(x0, y1, wallZ, face);

  // --- Dach
  const X0 = x0 - OH;
  const X1 = x1 + OH;
  const Y0 = y0 - OH;
  const Y1 = y1 + OH;
  const zAt = (y: number) => Hb - ((y - Y0) / (Y1 - Y0)) * RISE;
  let roof = poly([[X1, Y1, zAt(Y1) - 0.18], [X1, Y0, zAt(Y0) - 0.18], [X1, Y0, zAt(Y0)], [X1, Y1, zAt(Y1)]], '#17181a');
  roof += poly([[X0, Y1, zAt(Y1) - 0.18], [X1, Y1, zAt(Y1) - 0.18], [X1, Y1, zAt(Y1)], [X0, Y1, zAt(Y1)]], '#25272a');
  roof += poly([[X0, Y0, zAt(Y0)], [X1, Y0, zAt(Y0)], [X1, Y1, zAt(Y1)], [X0, Y1, zAt(Y1)]], '#50555c');
  const seams: [V3, V3][] = [];
  for (let x = X0 + 0.5; x < X1; x += 0.5) seams.push([[x, Y0, zAt(Y0)], [x, Y1, zAt(Y1)]]);
  roof += segs(seams, 'rgba(255,255,255,.12)', 1);
  roof += segs([[[X0, Y0, zAt(Y0)], [X0, Y1, zAt(Y1)]]], 'rgba(255,255,255,.18)', 1.2);

  // --- Photovoltaik auf der Dachfläche
  let pv = '';
  if (o.pv) {
    const cols = Math.floor((X1 - X0 - 0.5) / 1.06);
    const startX = X0 + 0.25 + (X1 - X0 - 0.5 - cols * 1.06) / 2;
    const rows = [0.45, 1.65];
    const lift = 0.03;
    const g: string[] = [];
    for (const r of rows) {
      for (let c = 0; c < cols; c++) {
        const xa = startX + c * 1.06;
        const xb = xa + 1.0;
        const ya = Y0 + r;
        const yb = ya + 1.1;
        g.push(poly([[xa, ya, zAt(ya) + lift], [xb, ya, zAt(ya) + lift], [xb, yb, zAt(yb) + lift], [xa, yb, zAt(yb) + lift]], `url(#${id}-pv)`, 'stroke="#8ea2c4" stroke-width=".6"'));
      }
    }
    pv = g.join('') + `<g class="iso-sun">${g.length ? poly([[X0, Y0, zAt(Y0) + 0.04], [X1, Y0, zAt(Y0) + 0.04], [X1, Y1, zAt(Y1) + 0.04], [X0, Y1, zAt(Y1) + 0.04]], '#fff', 'opacity="0"') : ''}</g>`;
  }

  // --- Fensterglühen (animiert per CSS)
  const [gx, gy] = proj(x0 + w * 0.5, y1, wallZ + 1.1);
  const glow = `<ellipse class="iso-glow" cx="${gx.toFixed(1)}" cy="${(gy + 20).toFixed(1)}" rx="${(w * 20).toFixed(0)}" ry="${(h * 14).toFixed(0)}" fill="url(#${id}-glow)"/>`;

  return { body, roof, pv, glow, footprint: { x0, y0, x1, y1, top: Hb } };
}

/** Bodenplatte als Diorama. */
export function ground(id: string, x: number, y: number, w: number, d: number, o: { lawn?: boolean } = {}): string {
  const th = 0.55;
  let s = `<g class="iso-shadow" opacity=".22" filter="url(#${id}-blur)">${poly([[x + 0.6, y + 0.6, -th], [x + w + 1.2, y + 0.6, -th], [x + w + 1.2, y + d + 1.2, -th], [x + 0.6, y + d + 1.2, -th]], '#14130f')}</g>`;
  s += poly([[x, y + d, -th], [x + w, y + d, -th], [x + w, y + d, 0], [x, y + d, 0]], '#8f8470');
  s += poly([[x + w, y + d, -th], [x + w, y, -th], [x + w, y, 0], [x + w, y + d, 0]], '#756b59');
  s += poly([[x, y + d, -th], [x + w, y + d, -th], [x + w, y + d, -th * 0.55], [x, y + d, -th * 0.55]], '#6a5d49', 'opacity=".55"');
  s += poly([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]], o.lawn === false ? '#e6e0d1' : '#cfd9b2');
  // Rasenstreifen
  if (o.lawn !== false) {
    let st = '';
    for (let k = 0; k < w; k += 2) st += `<rect x="${k}" y="0" width="1" height="${d}" fill="#c2cf9f"/>`;
    s += plane.T(x, y, 0, st);
  }
  return s;
}

/** Kiesweg / Platten. */
export function pathTiles(x: number, y: number, w: number, d: number, z = 0.01): string {
  return poly([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], '#e9e3d3') +
    plane.T(x, y, z, `<path d="${Array.from({ length: Math.floor(w / 1.2) }, (_, i) => `M${(i + 1) * 1.2} 0V${d}`).join('')}" stroke="rgba(120,108,86,.35)" stroke-width="0.03" fill="none"/>`);
}

/** Terrasse mit optionaler Lounge. */
export function deck(x: number, y: number, w: number, d: number, o: { chair?: boolean; z?: number } = {}): string {
  const z = o.z ?? 0;
  const h = 0.28;
  let s = box(x, y, z, w, d, h, TONES.deck);
  let pl = '';
  for (let k = 0.18; k < d; k += 0.18) pl += `M0 ${k.toFixed(2)}H${w}`;
  s += plane.T(x, y, z + h, `<path d="${pl}" stroke="rgba(0,0,0,.22)" stroke-width="0.018" fill="none"/>`);
  if (o.chair) {
    const cx = x + w - 2.4;
    const cy = y + d * 0.35;
    s += box(cx, cy, z + h, 0.9, 0.85, 0.12, { top: '#1f1e1c', left: '#1f1e1c', right: '#141311' });
    s += box(cx + 0.1, cy + 0.08, z + h + 0.12, 0.7, 0.7, 0.22, TONES.white);
    s += poly([[cx + 0.1, cy + 0.08, z + h + 0.34], [cx + 0.8, cy + 0.08, z + h + 0.34], [cx + 0.8, cy + 0.08 - 0.1, z + h + 0.78], [cx + 0.1, cy + 0.08 - 0.1, z + h + 0.78]], '#eee9dc');
    s += box(cx + 1.2, cy + 0.25, z + h, 0.45, 0.45, 0.4, { top: '#26241f', left: '#26241f', right: '#171612' });
  }
  return s;
}

export function tree(id: string, x: number, y: number, s = 1, alt = false): string {
  const [sx, sy] = proj(x, y, 0);
  const g = alt ? 'leaf2' : 'leaf';
  const R = 1.05 * s * S;
  return `<ellipse cx="${(sx + 6).toFixed(1)}" cy="${(sy + 4).toFixed(1)}" rx="${(R * 0.85).toFixed(0)}" ry="${(R * 0.36).toFixed(0)}" fill="#14130f" opacity=".16"/>` +
    box(x - 0.12 * s, y - 0.12 * s, 0, 0.24 * s, 0.24 * s, 1.5 * s, { top: '#6b4a2b', left: '#7b5532', right: '#5a3d22' }) +
    `<circle cx="${sx.toFixed(1)}" cy="${(sy - 1.7 * s * S).toFixed(1)}" r="${R.toFixed(1)}" fill="url(#${id}-${g})"/>` +
    `<circle cx="${(sx - R * 0.35).toFixed(1)}" cy="${(sy - 2.35 * s * S).toFixed(1)}" r="${(R * 0.62).toFixed(1)}" fill="url(#${id}-${g})"/>`;
}

export function bush(id: string, x: number, y: number, s = 1): string {
  const [sx, sy] = proj(x, y, 0);
  return `<ellipse cx="${(sx + 3).toFixed(1)}" cy="${(sy + 3).toFixed(1)}" rx="${(0.7 * s * S).toFixed(0)}" ry="${(0.25 * s * S).toFixed(0)}" fill="#14130f" opacity=".14"/>` +
    `<circle cx="${sx.toFixed(1)}" cy="${(sy - 0.32 * s * S).toFixed(1)}" r="${(0.5 * s * S).toFixed(1)}" fill="url(#${id}-leaf2)"/>` +
    `<circle cx="${(sx + 0.4 * s * S).toFixed(1)}" cy="${(sy - 0.2 * s * S).toFixed(1)}" r="${(0.36 * s * S).toFixed(1)}" fill="url(#${id}-leaf)"/>`;
}

/** Batteriespeicher + Wärmepumpe als Technikblock. */
export function tech(x: number, y: number): string {
  let s = box(x, y, 0, 0.9, 0.5, 1.15, TONES.white);
  s += plane.L(x, y + 0.5, 0, `<rect x="0.12" y="0.75" width="0.66" height="0.06" fill="#9ad49a"/><rect x="0.12" y="0.9" width="0.4" height="0.04" fill="#cfcac0"/>`);
  s += box(x + 1.15, y, 0, 1.0, 0.55, 0.85, TONES.metal);
  s += plane.L(x + 1.15, y + 0.55, 0, `<circle cx="0.5" cy="0.45" r="0.31" fill="#7a7f85"/><circle cx="0.5" cy="0.45" r="0.24" fill="#d9dcdf"/><path d="M0.5 0.45 L0.5 0.22 M0.5 0.45 L0.7 0.56 M0.5 0.45 L0.3 0.56" stroke="#7a7f85" stroke-width="0.05"/>`);
  return s;
}

export function sauna(id: string, x: number, y: number): string {
  const w = 2.8;
  const d = 2.6;
  const h = 2.5;
  const [cx, cy] = proj(x + w - 0.6, y + 0.7, h + 0.4);
  let s = box(x, y, 0, w, d, h, { top: '#5a3f2a', left: `url(#${id}-woodD)`, right: '#6b4524' });
  s += plane.L(x, y + d, 0, `<path d="${Array.from({ length: 14 }, (_, i) => `M${(i + 1) * 0.2} 0V${h}`).join('')}" stroke="rgba(0,0,0,.18)" stroke-width="0.012"/><rect x="0.35" y="0" width="0.85" height="2.0" fill="#2a2926"/><rect x="0.42" y="0.07" width="0.71" height="1.86" fill="#f0c978"/><rect x="1.6" y="0.85" width="0.8" height="0.9" fill="#2a2926"/><rect x="1.66" y="0.91" width="0.68" height="0.78" fill="#f7c36b"/>`);
  // Ofenrohr
  s += box(x + w - 0.75, y + 0.55, h, 0.3, 0.3, 0.55, { top: '#2a2a2a', left: '#3a3a3a', right: '#1f1f1f' });
  s += `<g class="iso-steam" fill="#fff"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7"/><circle cx="${(+cx + 6).toFixed(1)}" cy="${(cy - 18).toFixed(1)}" r="9"/><circle cx="${(+cx - 2).toFixed(1)}" cy="${(cy - 38).toFixed(1)}" r="11"/></g>`;
  return s;
}

export function fitness(id: string, x: number, y: number): string {
  const w = 3.4;
  const d = 2.8;
  const h = 2.5;
  let s = box(x, y, 0, w, d, h, { top: '#4a4d52', left: '#3a3935', right: '#262523' });
  s += plane.L(x, y + d, 0, `<rect x="0.25" y="0.05" width="${w - 0.5}" height="2.2" fill="#22211e"/><rect x="0.32" y="0.12" width="${w - 0.64}" height="2.06" fill="url(#${id}-glass)"/>
  <rect x="0.7" y="0.12" width="0.5" height="0.9" fill="#3f3d39"/><rect x="0.6" y="0.95" width="0.7" height="0.1" fill="#2a2926"/>
  <circle cx="1.9" cy="0.6" r="0.4" fill="none" stroke="#3f3d39" stroke-width="0.09"/><path d="M1.9 0.6 L2.3 1.2" stroke="#3f3d39" stroke-width="0.08"/>
  <rect x="2.4" y="0.12" width="0.16" height="1.3" fill="#3f3d39"/><rect x="2.2" y="1.3" width="0.56" height="0.1" fill="#3f3d39"/>
  <path d="M0.5 2.0 L${w - 0.5} 1.0" stroke="#fff" stroke-width="0.35" opacity=".12"/>`);
  s += box(x - 0.2, y - 0.2, h, w + 0.4, d + 0.4, 0.14, { top: '#50555c', left: '#25272a', right: '#17181a' });
  return s;
}

export function pool(id: string, x: number, y: number, w: number, d: number): string {
  const rim = 0.55;
  const ro = 0.32;
  const iw = w - rim * 2;
  const idp = d - rim * 2;
  // Beckenrand (Hohlrahmen) als even-odd-Pfad
  const ring = `<path fill-rule="evenodd" d="M${proj(x, y, ro).map((n) => n.toFixed(1)).join(',')} L${proj(x + w, y, ro).map((n) => n.toFixed(1)).join(',')} L${proj(x + w, y + d, ro).map((n) => n.toFixed(1)).join(',')} L${proj(x, y + d, ro).map((n) => n.toFixed(1)).join(',')}Z M${proj(x + rim, y + rim, ro).map((n) => n.toFixed(1)).join(',')} L${proj(x + rim, y + d - rim, ro).map((n) => n.toFixed(1)).join(',')} L${proj(x + w - rim, y + d - rim, ro).map((n) => n.toFixed(1)).join(',')} L${proj(x + w - rim, y + rim, ro).map((n) => n.toFixed(1)).join(',')}Z" fill="#ebe6d8"/>`;
  let s = poly([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, ro], [x, y + d, ro]], '#bdb4a0');
  s += poly([[x + w, y + d, 0], [x + w, y, 0], [x + w, y, ro], [x + w, y + d, ro]], '#a39a86');
  // Innenwände (hintere)
  s += poly([[x + rim, y + rim, ro], [x + w - rim, y + rim, ro], [x + w - rim, y + rim, 0.05], [x + rim, y + rim, 0.05]], '#2c7f9f');
  s += poly([[x + rim, y + rim, ro], [x + rim, y + d - rim, ro], [x + rim, y + d - rim, 0.05], [x + rim, y + rim, 0.05]], '#256f8c');
  s += poly([[x + rim, y + rim, 0.08], [x + w - rim, y + rim, 0.08], [x + w - rim, y + d - rim, 0.08], [x + rim, y + d - rim, 0.08]], `url(#${id}-water)`);
  // Wasserglitzern
  let gl = '';
  for (let k = 0; k < 6; k++) gl += `<path class="iso-ripple" style="--r:${k}" d="M${0.4 + k * 0.3} ${0.25 + k * 0.22}h0.7" stroke="#fff" stroke-width="0.04" stroke-linecap="round" opacity=".6"/>`;
  s += plane.T(x + rim, y + rim, 0.09, `<g>${gl}</g>`);
  s += ring;
  // Liegen
  s += box(x + w + 0.5, y + 0.3, 0, 0.7, 1.7, 0.28, TONES.white);
  s += box(x + w + 1.4, y + 0.3, 0, 0.7, 1.7, 0.28, TONES.white);
  void iw; void idp;
  return s;
}

export type { Tone };
