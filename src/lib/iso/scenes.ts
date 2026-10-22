/**
 * Fertige 3D-Szenen. Jede liefert ein komplettes <svg> als String.
 *
 * Animationsmodi (per CSS-Klasse am svg, siehe styles/iso.css):
 *  - enter:  Teile fahren beim Laden ein (Hero, Karten)
 *  - scroll: Teile werden über data-at vom Scroll-Fortschritt gesteuert
 *  - static: keine Bewegung
 */
import { boundsOf, box, item, plane, poly, proj, segs, svg, type V3 } from './engine';
import { bush, deck, fitness, ground, moduleParts, pathTiles, pool, sauna, SPEC, tech, tree, type Variant } from './objects';

type Mode = 'enter' | 'scroll' | 'static';

const bounds = (w: number, d: number, top = 6) =>
  boundsOf(
    [
      [0, d, -0.6],
      [w, 0, -0.6],
      [0, 0, top],
      [w, d, top],
      [w, d, -0.6],
    ] as V3[],
    16,
  );

const cls = (mode: Mode) => `iso iso--${mode}`;

/** Hero: eine kleine Anlage mit Wohneinheit, Terrasse, Sauna, Pool, PV. */
export function heroScene(): string {
  const id = 'hs';
  const m = moduleParts(id, { x: 3.4, y: 2.4, variant: 'wohn', pv: true });
  const parts = [
    item(ground(id, 0, 0, 17, 14), { id: 'ground', from: [0, 0, -4], delay: 0 }),
    item(tree(id, 1.6, 1.8, 1.15) + tree(id, 15.2, 2.2, 1, true), { from: [0, 0, 5], delay: 0.7 }),
    item(m.body + m.glow, { id: 'body', from: [0, 0, 6], delay: 0.2 }),
    item(m.roof, { id: 'roof', from: [0, 0, 9], delay: 0.55 }),
    item(m.pv, { id: 'pv', from: [0, 0, 12], delay: 0.95 }),
    item(tech(11.6, 2.9), { from: [3, 0, 0], delay: 1.05 }),
    item(deck(3.4, 5.0, 7.4, 2.4, { chair: true }), { id: 'deck', from: [0, 5, 0], delay: 0.85 }),
    item(sauna(id, 11.9, 6.9), { id: 'sauna', from: [0, 0, 8], delay: 1.2 }),
    item(pool(id, 1.0, 8.9, 6.0, 3.6), { id: 'pool', from: [0, 6, 0], delay: 1.35 }),
    item(pathTiles(8.4, 8.0, 1.6, 5.4), { delay: 1.4 }),
    item(bush(id, 10.6, 8.5, 1) + bush(id, 15.5, 9.8, 1.3) + tree(id, 14.2, 12.4, 1.2), { from: [0, 0, 4], delay: 1.5 }),
  ];
  return svg(id, bounds(17, 14, 4.6), parts.join(''), 'Isometrische 3D-Darstellung einer Tectum-Anlage mit Wohneinheit, Terrasse, Sauna und Pool', cls('enter'));
}

/** Prinzip: Szene, die über den Scroll-Fortschritt aufgebaut wird. */
export function principleScene(): string {
  const id = 'ps';
  const a = moduleParts(id, { x: 1.2, y: 1.2, variant: 'wohn' });
  const b = moduleParts(id, { x: 1.2, y: 7.9, variant: 'schlaf' });
  const c = moduleParts(id, { x: 10.2, y: 4.2, variant: 'luxus', pv: true });
  const parts = [
    item(ground(id, 0, 0, 21, 16), { at: [0, 0.07], from: [0, 0, -4] }),
    item(tree(id, 20.0, 1.8, 1.2) + tree(id, 9.0, 1.5, 0.9, true), { at: [0.05, 0.14], from: [0, 0, 3] }),
    item(a.body + a.glow, { at: [0.04, 0.17], from: [0, 0, 6] }),
    item(a.roof, { at: [0.13, 0.26], from: [0, 0, 9] }),
    item(c.body + c.glow, { at: [0.42, 0.56], from: [9, 0, 0] }),
    item(c.roof, { at: [0.5, 0.62], from: [0, 0, 9] }),
    item(b.body + b.glow, { at: [0.3, 0.44], from: [0, 8, 0] }),
    item(b.roof, { at: [0.38, 0.5], from: [0, 0, 9] }),
    item(deck(10.2, 7.2, 9.2, 2.6, { chair: true }), { at: [0.62, 0.72], from: [0, 4, 0] }),
    item(sauna(id, 10.4, 11.2), { at: [0.68, 0.78], from: [0, 0, 8] }),
    item(fitness(id, 15.2, 11.2), { at: [0.72, 0.82], from: [0, 0, 8] }),
    item(pool(id, 1.2, 12.2, 6.0, 3.3), { at: [0.64, 0.76], from: [0, 5, 0] }),
    item(c.pv, { at: [0.82, 0.92], from: [0, 0, 12] }),
    item(tech(19.8, 4.0), { at: [0.86, 0.95], from: [3, 0, 0] }),
    item(bush(id, 9.6, 7.0, 1) + bush(id, 8.7, 11.8, 1.2) + tree(id, 19.5, 14.8, 1.1), { at: [0.88, 0.97], from: [0, 0, 3] }),
  ];
  return svg(id, bounds(21, 16, 4.4), parts.join(''), 'Drei Module werden zu einer Anlage kombiniert und mit Terrasse, Pool, Sauna, Fitness und Photovoltaik erweitert', cls('scroll'));
}

/** Konfigurator: Basis + zuschaltbare Erweiterungen (data-addon). */
export function configScene(variant: Variant = 'wohn', uid = 'w'): string {
  const id = `cs${uid}`;
  const { w } = SPEC[variant];
  const mx = 4.6;
  const my = 2.6;
  const rx = mx + w + 1.2;
  const gw = rx + 4.4;
  const gd = 15;
  const m = moduleParts(id, { x: mx, y: my, variant, pv: true });
  const addon = (name: string, inner: string, from: V3) =>
    `<g class="iso-addon" data-addon="${name}">${item(inner, { from, cls: 'iso-addon__in' })}</g>`;
  const parts = [
    item(ground(id, 0, 0, gw, gd), {}),
    item(tree(id, 1.4, 1.6, 1.2) + tree(id, gw - 1.4, 2.0, 1, true), {}),
    addon('fitness', fitness(id, 0.6, 3.0), [0, 0, 7]),
    item(m.body + m.glow + m.roof, {}),
    addon('pv', m.pv + tech(rx, 3.1), [0, 0, 9]),
    addon('terrasse', deck(mx, my + SPEC[variant].d + 0.1, w, 2.4, { chair: true }), [0, 3, 0]),
    addon('sauna', sauna(id, rx + 0.4, 7.0), [0, 0, 8]),
    addon('pool', pool(id, 2.0, 9.6, 6.4, 3.8), [0, 4, 0]),
    item(bush(id, mx + w - 1.2, 9.4, 1) + bush(id, gw - 2.4, 12.4, 1.3) + tree(id, gw - 3.4, 13.6, 1.1), {}),
  ];
  return svg(id, bounds(gw, gd, 4.8), parts.join(''), 'Konfigurierbare Tectum-Anlage mit zuschaltbaren Erweiterungen', cls('static'));
}

/** Kleine Einzelszene je Modul (Kartenansicht). */
export function variantScene(variant: Variant, uid: string): string {
  const id = `v${uid}`;
  const { w, d } = SPEC[variant];
  const gw = w + 4.4;
  const gd = d + 5;
  const m = moduleParts(id, { x: 2.0, y: 1.2, variant, pv: variant === 'luxus' });
  const parts = [
    item(ground(id, 0, 0, gw, gd), {}),
    item(tree(id, gw - 1.0, 1.4, 1.1) + (variant === 'schlaf' ? '' : tree(id, 0.9, 1.6, 0.9, true)), {}),
    item(m.body + m.glow + m.roof + m.pv, { cls: 'iso-hover' }),
    item(deck(2.0, 1.2 + d, w, 2.2, { chair: variant !== 'schlaf' }), {}),
    item(bush(id, gw - 1.5, gd - 1.0, 1) + bush(id, 1.1, gd - 1.0, 0.9), {}),
  ];
  return svg(id, bounds(gw, gd, 3.8), parts.join(''), `3D-Ansicht der ${variant === 'schlaf' ? 'Schlafeinheit' : variant === 'wohn' ? 'Wohnraumeinheit' : 'Luxuseinheit'}`, cls('static'));
}

/** Hotspots im Hero (Prozentwerte relativ zum SVG). */
export function heroSpots(): { x: number; y: number; label: string; side: 'l' | 'r' }[] {
  const b = bounds(17, 14, 4.6);
  const W = b.maxX - b.minX;
  const H = b.maxY - b.minY;
  const at = (x: number, y: number, z: number, label: string, side: 'l' | 'r') => {
    const [px, py] = proj(x, y, z);
    return { x: +(((px - b.minX) / W) * 100).toFixed(1), y: +(((py - b.minY) / H) * 100).toFixed(1), label, side };
  };
  return [
    at(7.1, 3.7, 3.7, 'PV & Speicher optional', 'r'),
    at(12.4, 3.2, 1.0, 'Wärmepumpe & Klima ab Werk', 'r'),
    at(13.3, 8.2, 1.4, 'Sauna & Wellness erweiterbar', 'r'),
    at(4.0, 10.7, 0.4, 'Pool & Außenanlage', 'l'),
  ];
}

/* ------------------------------------------------------------------ */
/* Werk: drei Stationen, die als Endlosschleife laufen                  */
/* ------------------------------------------------------------------ */

const hall = (id: string, w: number, d: number) =>
  ground(id, 0, 0, w, d, { lawn: false }) +
  poly([[0.8, 0.8, 0.01], [w - 0.8, 0.8, 0.01], [w - 0.8, d - 0.8, 0.01], [0.8, d - 0.8, 0.01]], '#ddd6c6');

/** Station 1 — Vorfertigung: Rahmen steht, Wandelemente fahren ein. */
export function werkFrameScene(): string {
  const id = 'wf';
  const w = 8.4;
  const d = 5.6;
  const mx = 1.4;
  const my = 1.4;
  const mw = 6.2;
  const md = 2.6;
  const h = 2.6;
  const z0 = 0.35;
  const loop = (inner: string, from: V3, delay: number) => item(inner, { from, delay, cls: 'iso-loop' });
  const wood = '#d4a066';
  const x1 = mx + mw;
  const y1 = my + md;
  const frame = segs(
    [
      [[mx, y1, z0], [mx, y1, z0 + h]], [[mx + 2.1, y1, z0], [mx + 2.1, y1, z0 + h]], [[mx + 4.1, y1, z0], [mx + 4.1, y1, z0 + h]], [[x1, y1, z0], [x1, y1, z0 + h]],
      [[x1, my, z0], [x1, my, z0 + h]], [[mx, y1, z0 + h], [x1, y1, z0 + h]], [[x1, y1, z0 + h], [x1, my, z0 + h + 0.4]],
      [[mx, y1, z0 + h], [mx, my, z0 + h + 0.4]], [[mx, my, z0 + h + 0.4], [x1, my, z0 + h + 0.4]],
    ],
    wood,
    3,
  );
  const base = box(mx, my, 0, mw, md, z0, { top: '#3a3834', left: '#2b2a27', right: '#1f1e1c' });
  const panels = [0, 1, 2].map((k) => {
    const xa = mx + k * 2.05;
    return loop(
      poly([[xa, y1, z0], [xa + 2.05, y1, z0], [xa + 2.05, y1, z0 + h], [xa, y1, z0 + h]], k === 1 ? '#bcd0d8' : '#dfb277', 'stroke="#8d5a2b" stroke-width="1"'),
      [0, 6, 0],
      0.6 + k * 0.5,
    );
  });
  const end = loop(poly([[x1, y1, z0], [x1, my, z0], [x1, my, z0 + h + 0.4], [x1, y1, z0 + h]], '#2f2e2b'), [5, 0, 0], 2.2);
  const roofP = loop(poly([[mx - 0.3, my - 0.3, z0 + h + 0.4], [x1 + 0.3, my - 0.3, z0 + h + 0.4], [x1 + 0.3, y1 + 0.3, z0 + h], [mx - 0.3, y1 + 0.3, z0 + h]], '#50555c'), [0, 0, 7], 3.0);
  const parts = [item(hall(id, w, d), {}), item(base + frame, {}), ...panels, end, roofP];
  return svg(id, bounds(w, d, 4.6), parts.join(''), 'Vorfertigung: Wandelemente werden zum Modul zusammengesetzt', cls('static'));
}

/** Station 2 — Qualitätskontrolle: Scan fährt über das fertige Modul. */
export function werkQualityScene(): string {
  const id = 'wq';
  const w = 11;
  const d = 6;
  const m = moduleParts(id, { x: 2.4, y: 1.6, variant: 'wohn' });
  const mw = SPEC.wohn.w;
  const y1 = 1.6 + SPEC.wohn.d;
  const [bx, by] = proj(2.4 + mw * 0.5, 1.6 + 1.3, 5.2);
  const scan = `<g class="iso-scan" style="--sx:${(mw * 0.88 * Math.cos(Math.PI / 6) * 36).toFixed(1)}px;--sy:${(mw * 0.88 * 18).toFixed(1)}px">${poly([[2.4, y1 + 0.06, 0.2], [2.7, y1 + 0.06, 0.2], [2.7, y1 + 0.06, 3.7], [2.4, y1 + 0.06, 3.7]], '#c8a96e', 'opacity=".75"')}${poly([[2.4, y1 + 0.06, 0.2], [2.7, y1 + 0.06, 0.2], [2.7, y1 + 0.06, 3.7], [2.4, y1 + 0.06, 3.7]], '#fff', 'opacity=".25"')}</g>`;
  const badge = `<g class="iso-badge" transform="translate(${bx.toFixed(1)} ${by.toFixed(1)})"><circle r="20" fill="#2a6b3c"/><circle r="20" fill="none" stroke="#fff" stroke-width="3"/><path d="M-9 0L-3 7L10 -7" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const parts = [item(hall(id, w, d), {}), item(m.body + m.glow + m.roof, {}), scan, badge];
  return svg(id, bounds(w, d, 5.4), parts.join(''), 'Qualitätskontrolle: Jede Einheit durchläuft eine geprüfte Endabnahme', cls('static'));
}

/** Station 3 — Lieferung: Sattelzug fährt das fertige Modul vor. */
export function werkTruckScene(): string {
  const id = 'wt';
  const w = 18;
  const d = 6;
  const tx = 2.4;
  const ty = 1.6;
  const tl = 9.6;
  const td = 2.5;
  const m = moduleParts(id, { x: tx + 1.2, y: ty - 0.05, z: 1.0, variant: 'schlaf' });
  const wheel = (x: number) => plane.L(x, ty + td, 0, `<circle cx="0" cy="0.5" r="0.5" fill="#1b1a18"/><circle cx="0" cy="0.5" r="0.22" fill="#8a8e94"/>`);
  const rig =
    box(tx, ty + 0.2, 0.45, tl, td - 0.4, 0.5, { top: '#4a4d52', left: '#2f3033', right: '#232426' }) +
    box(tx, ty, 0.95, tl, td, 0.22, { top: '#7a6a58', left: '#5a4c3d', right: '#46392d' }) +
    wheel(tx + 1.4) + wheel(tx + 2.4) + wheel(tx + 3.4) +
    box(tx + tl, ty + 0.1, 0.45, 2.3, td - 0.2, 2.5, { top: '#f3f0e8', left: '#e7e3d8', right: '#c5c0b2' }) +
    plane.L(tx + tl, ty + td - 0.1, 0.45, `<rect x="0.9" y="1.35" width="1.2" height="0.85" fill="#7d97a6"/><rect x="0.1" y="0.9" width="0.7" height="0.12" fill="#c8a96e"/>`) +
    wheel(tx + tl + 0.8) + wheel(tx + tl + 1.7);
  const rigAll = `<g class="iso-drive" style="--dx:${(-14 * Math.cos(Math.PI / 6) * 36).toFixed(1)}px;--dy:${(-14 * 18).toFixed(1)}px">${rig}${m.body + m.glow + m.roof}</g>`;
  const road = poly([[0.4, 0.8, 0.01], [w - 0.4, 0.8, 0.01], [w - 0.4, d - 0.8, 0.01], [0.4, d - 0.8, 0.01]], '#4a4a48') +
    segs([[[0.8, d / 2, 0.02], [w - 0.8, d / 2, 0.02]]], '#e9e3d3', 2, 'stroke-dasharray="10 9"');
  const parts = [item(ground(id, 0, 0, w, d, { lawn: false }), {}), road, rigAll];
  return svg(id, bounds(w, d, 4.6), parts.join(''), 'Lieferung: Das fertige Modul wird schlüsselfertig zum Standort transportiert', cls('static'));
}

/* ------------------------------------------------------------------ */
/* Einsatzbereiche                                                      */
/* ------------------------------------------------------------------ */

export type ZielKind = 'camping' | 'wohnpark' | 'kommune' | 'messe';

export function zielScene(kind: ZielKind): string {
  const id = `z${kind}`;
  const label: Record<ZielKind, string> = {
    camping: '3D-Ansicht: Glamping-Units auf einem Campingplatz',
    wohnpark: '3D-Ansicht: Reihe modularer Wohneinheiten in einem Wohnpark',
    kommune: '3D-Ansicht: Unterkünfte für Kommunen und Arbeitgeber',
    messe: '3D-Ansicht: Repräsentative Einheit auf einem Messepodest',
  };
  let parts: string[] = [];
  let gw = 14;
  let gd = 10;
  if (kind === 'camping') {
    const a = moduleParts(id, { x: 1.4, y: 1.2, variant: 'schlaf' });
    const b = moduleParts(id, { x: 6.4, y: 5.6, variant: 'wohn', pv: true });
    gw = 15; gd = 10.4;
    parts = [
      ground(id, 0, 0, gw, gd),
      tree(id, 11.6, 1.6, 1.3) + tree(id, 13.4, 3.6, 1) + tree(id, 1.2, 8.4, 1.2, true),
      a.body + a.glow + a.roof,
      deck(1.4, 1.2 + 2.6, 6.2, 1.6, { chair: true }),
      b.body + b.glow + b.roof + b.pv,
      bush(id, 5.2, 9, 1),
    ];
  } else if (kind === 'wohnpark') {
    // Reihenhaus-Anordnung: drei Einheiten hintereinander (entlang y versetzt)
    const rows = [0, 1, 2].map((i) => moduleParts(id, { x: 2.2, y: 0.8 + i * 4.3, variant: 'wohn', pv: i === 1 }));
    gw = 12.5; gd = 14.5;
    parts = [
      ground(id, 0, 0, gw, gd),
      rows[0].body + rows[0].glow + rows[0].roof,
      tree(id, 11.0, 2.0, 1.2),
      rows[1].body + rows[1].glow + rows[1].roof + rows[1].pv,
      rows[2].body + rows[2].glow + rows[2].roof,
      pathTiles(0.8, 13.0, 10.4, 1.0),
      bush(id, 1.6, 13.0, 1) + tree(id, 11.0, 9.8, 1, true),
    ];
  } else if (kind === 'kommune') {
    gw = 18; gd = 12;
    const mm = [
      moduleParts(id, { x: 1.2, y: 1.0, variant: 'schlaf' }),
      moduleParts(id, { x: 9.4, y: 1.0, variant: 'schlaf' }),
      moduleParts(id, { x: 1.2, y: 6.4, variant: 'schlaf' }),
      moduleParts(id, { x: 9.4, y: 6.4, variant: 'schlaf', pv: true }),
    ];
    parts = [
      ground(id, 0, 0, gw, gd),
      pathTiles(0.6, 4.4, 16.8, 1.2),
      mm[0].body + mm[0].glow + mm[0].roof,
      mm[1].body + mm[1].glow + mm[1].roof,
      tree(id, 17, 5.0, 1, true),
      mm[2].body + mm[2].glow + mm[2].roof,
      mm[3].body + mm[3].glow + mm[3].roof + mm[3].pv,
      bush(id, 8.2, 11.0, 1),
    ];
  } else {
    gw = 14; gd = 9;
    const m = moduleParts(id, { x: 2.2, y: 1.6, z: 0.35, variant: 'luxus', pv: false });
    parts = [
      ground(id, 0, 0, gw, gd, { lawn: false }),
      box(1.2, 0.8, 0, 11.2, 4.6, 0.35, { top: '#f1ede2', left: '#d9d3c4', right: '#bdb6a5' }),
      m.body + m.glow + m.roof,
      // Fahnen
      box(0.9, 6.2, 0, 0.12, 0.12, 3.6, { top: '#2b2a27', left: '#2b2a27', right: '#1b1a18' }) + poly([[1.02, 6.3, 3.6], [1.02, 6.3, 2.7], [1.02, 7.3, 2.7], [1.02, 7.3, 3.6]], '#c8a96e'),
      box(12.4, 6.2, 0, 0.12, 0.12, 3.6, { top: '#2b2a27', left: '#2b2a27', right: '#1b1a18' }) + poly([[12.52, 6.3, 3.6], [12.52, 6.3, 2.7], [12.52, 7.3, 2.7], [12.52, 7.3, 3.6]], '#c8a96e'),
    ];
  }
  const inner = parts.map((p) => item(p, {})).join('');
  return svg(id, bounds(gw, gd, kind === 'messe' ? 4.2 : 4.0), inner, label[kind], cls('static'));
}
