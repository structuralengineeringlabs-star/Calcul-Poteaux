/**
 * Dessins techniques du poteau : modèle neutre → SVG (aperçu, plan) et DXF R12 (AC1009).
 *
 * Conventions :
 *  - Plan A3 paysage (420 × 297 mm, ISO 5457), cadre avec marge de reliure de 20 mm.
 *  - Cartouche selon ISO 7200 (champs obligatoires : propriétaire, titre, numéro, révision, date, type de document).
 *  - Représentation simplifiée des armatures selon ISO 3766 : barres en coupe = cercles pleins,
 *    cadres = trait continu, repères cerclés.
 *  - Cotation selon ISO 129-1 (cotes en mm, traits d'attache, flèches obliques 45°).
 *  - Hauteurs d'écriture ISO 3098 : 2,5 / 3,5 / 5 mm.
 *  - Calques inspirés de l'ISO 13567 : S-COFF-CONTOUR, S-ARMA-LONG, S-ARMA-CADRE, S-COTE, S-TEXTE, S-AXE, S-CADRE-PLAN.
 */
import type { ColumnResult, Geometry, Rebar } from './eurocode';
import type { Pt } from './section';

export type Layer = 'S-LOGO' | 'S-COFF-CONTOUR' | 'S-COFF-HACH' | 'S-ARMA-LONG' | 'S-ARMA-CADRE' | 'S-COTE' | 'S-TEXTE' | 'S-AXE' | 'S-CADRE-PLAN';

export const LAYERS: Record<Layer, { color: number; ltype: 'CONTINUOUS' | 'CENTER' | 'DASHED'; svg: string; w: number }> = {
  'S-LOGO': { color: 5, ltype: 'CONTINUOUS', svg: '#3a9bd5', w: 0.3 },
  'S-COFF-CONTOUR': { color: 7, ltype: 'CONTINUOUS', svg: '#111827', w: 0.5 },
  'S-COFF-HACH': { color: 8, ltype: 'CONTINUOUS', svg: '#9ca3af', w: 0.13 },
  'S-ARMA-LONG': { color: 1, ltype: 'CONTINUOUS', svg: '#c0262d', w: 0.5 },
  'S-ARMA-CADRE': { color: 5, ltype: 'CONTINUOUS', svg: '#1d4ed8', w: 0.35 },
  'S-COTE': { color: 3, ltype: 'CONTINUOUS', svg: '#047857', w: 0.18 },
  'S-TEXTE': { color: 7, ltype: 'CONTINUOUS', svg: '#111827', w: 0.25 },
  'S-AXE': { color: 8, ltype: 'CENTER', svg: '#6b7280', w: 0.18 },
  'S-CADRE-PLAN': { color: 7, ltype: 'CONTINUOUS', svg: '#111827', w: 0.5 },
};

/** block : l'entité appartient au bloc nommé (DXF : section BLOCKS + INSERT) ; attr : texte exporté en attribut modifiable. */
type Common = { block?: string; only?: 'svg' | 'dxf' }; // only : entité propre à un seul format
export type Ent = Common & (
  | { t: 'line'; a: Pt; b: Pt; layer: Layer; dashed?: boolean }
  | { t: 'poly'; pts: Pt[]; closed: boolean; layer: Layer; fill?: string; w?: number }
  | { t: 'circle'; c: Pt; r: number; layer: Layer; fill?: boolean }
  | { t: 'text'; p: Pt; h: number; s: string; layer: Layer; align?: 'left' | 'center' | 'right'; rot?: number; bold?: boolean; attr?: { tag: string; prompt: string }; color?: string; spacing?: number; wf?: number }
  | { t: 'image'; p: Pt; w: number; h: number; href: string; layer: Layer });

export interface Drawing { ents: Ent[]; w: number; h: number }

export interface TitleBlock {
  owner: string; title: string; subtitle: string; number: string; revision: string; date: string;
  author: string; approver: string; project: string; client: string; docType: string;
  logo?: string | null; // image (data URL), reprise dans le SVG et la note ; zone réservée dans le DXF
  logoSEL?: boolean;    // logo S.E.L. intégré : dessiné en vectoriel (SVG et DXF)
}

const rotBack = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const fmt = (v: number, d = 0) => v.toFixed(d).replace('.', ',');
const SCALES = [1, 2, 5, 10, 20, 25, 50, 100, 200];
const pickScale = (real: number, avail: number) => SCALES.find(s => real / s <= avail) ?? 500;

/** Géométrie de la section dans le repère de dessin (mm réels, centrée au centre de gravité). */
export function sectionGeometry(calc: ColumnResult) {
  const sec = calc.section!;
  const a = sec.rotation;
  const outline = sec.outline.map(p => rotBack(p, a));
  const ties = sec.ties.map(t => t.map(p => rotBack(p, a)));
  const bars = sec.bars.map(b => rotBack([b.v, b.u], a));
  const xs = outline.map(p => p[0]), ys = outline.map(p => p[1]);
  return { outline, ties, bars, xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys) };
}

// ---- Primitives de cotation (ISO 129-1) ----
function dimH(E: Ent[], x1: number, x2: number, yObj: number, yDim: number, label: string, th = 2.5) {
  const s = Math.sign(yDim - yObj) || 1;
  E.push({ t: 'line', a: [x1, yObj + s * 1], b: [x1, yDim + s * 2], layer: 'S-COTE' });
  E.push({ t: 'line', a: [x2, yObj + s * 1], b: [x2, yDim + s * 2], layer: 'S-COTE' });
  E.push({ t: 'line', a: [x1 - 2, yDim], b: [x2 + 2, yDim], layer: 'S-COTE' });
  for (const x of [x1, x2]) E.push({ t: 'line', a: [x - 1.2, yDim - 1.2], b: [x + 1.2, yDim + 1.2], layer: 'S-COTE' });
  E.push({ t: 'text', p: [(x1 + x2) / 2, yDim + 1], h: th, s: label, layer: 'S-COTE', align: 'center' });
}
function dimV(E: Ent[], y1: number, y2: number, xObj: number, xDim: number, label: string, th = 2.5) {
  const s = Math.sign(xDim - xObj) || 1;
  E.push({ t: 'line', a: [xObj + s * 1, y1], b: [xDim + s * 2, y1], layer: 'S-COTE' });
  E.push({ t: 'line', a: [xObj + s * 1, y2], b: [xDim + s * 2, y2], layer: 'S-COTE' });
  E.push({ t: 'line', a: [xDim, y1 - 2], b: [xDim, y2 + 2], layer: 'S-COTE' });
  for (const y of [y1, y2]) E.push({ t: 'line', a: [xDim - 1.2, y - 1.2], b: [xDim + 1.2, y + 1.2], layer: 'S-COTE' });
  E.push({ t: 'text', p: [xDim - 1, (y1 + y2) / 2], h: th, s: label, layer: 'S-COTE', align: 'center', rot: 90 });
}
function mark(E: Ent[], p: Pt, n: number) {
  E.push({ t: 'circle', c: p, r: 2.6, layer: 'S-TEXTE' });
  E.push({ t: 'text', p: [p[0], p[1] - 1.1], h: 2.5, s: String(n), layer: 'S-TEXTE', align: 'center' });
}

/** Logo S.E.L. en entités vectorielles (hexagone, diagonales, pavé, textes), inscrit dans un cadre x, y, largeur, hauteur (mm). */
export function selLogoEnts(x: number, y: number, w: number, h: number): Ent[] {
  const k = Math.min(h / 48, w / 230); // repère du logo : 230 × 48, y vers le bas
  const ox = x + (w - 230 * k) / 2, oy = y + (h + 48 * k) / 2;
  const P = (px: number, py: number): Pt => [ox + px * k, oy - py * k];
  const hex: Pt[] = [P(24, 4), P(44, 14), P(44, 34), P(24, 44), P(4, 34), P(4, 14)];
  return [
    { t: 'poly', pts: hex, closed: true, layer: 'S-LOGO', fill: 'rgba(58,155,213,0.08)', w: 2.5 * k },
    { t: 'line', a: P(4, 14), b: P(44, 34), layer: 'S-LOGO' },
    { t: 'line', a: P(4, 34), b: P(44, 14), layer: 'S-LOGO' },
    { t: 'line', a: P(24, 4), b: P(24, 44), layer: 'S-LOGO' },
    { t: 'poly', pts: [P(16, 18), P(32, 18), P(32, 30), P(16, 30)], closed: true, layer: 'S-LOGO', fill: '#3a9bd5' },
    { t: 'text', p: P(24, 26.4), h: 6 * k, s: 'S.E.L.', layer: 'S-LOGO', align: 'center', bold: true, color: '#ffffff', wf: 0.62 },
    // SVG : « & » en couleur d'accent ; DXF : texte d'un seul tenant condensé (police de DAO plus large)
    { t: 'text', p: P(56, 24), h: 19 * k, s: 'STRUCTURAL', layer: 'S-TEXTE', bold: true, only: 'svg' },
    { t: 'text', p: P(181, 24), h: 19 * k, s: '&', layer: 'S-LOGO', bold: true, color: '#3a9bd5', only: 'svg' },
    { t: 'text', p: P(56, 24), h: 19 * k, s: 'STRUCTURAL &', layer: 'S-TEXTE', wf: 0.72, only: 'dxf' },
    { t: 'text', p: P(57, 38), h: 9.5 * k, s: 'ENGINEERING LABS', layer: 'S-LOGO', bold: true, color: '#6b8aaa', spacing: 3.6 * k, wf: 1.1 },
  ];
}

/** Hachures à 45° limitées à un polygone (ISO 128-50, béton en coupe). */
function hatch(E: Ent[], poly: Pt[], step = 2.2, angle = Math.PI / 4) {
  const d: Pt = [Math.cos(angle), Math.sin(angle)], nrm: Pt = [-d[1], d[0]];
  const proj = poly.map(p => p[0] * nrm[0] + p[1] * nrm[1]);
  const lo = Math.min(...proj), hi = Math.max(...proj);
  for (let c = lo + step / 2; c < hi; c += step) {
    const ts: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ca = a[0] * nrm[0] + a[1] * nrm[1] - c, cb = b[0] * nrm[0] + b[1] * nrm[1] - c;
      if ((ca <= 0 && cb > 0) || (cb <= 0 && ca > 0)) {
        const t = ca / (ca - cb); const q: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        ts.push(q[0] * d[0] + q[1] * d[1]);
      }
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const P = (s0: number): Pt => [nrm[0] * c + d[0] * s0, nrm[1] * c + d[1] * s0];
      E.push({ t: 'line', a: P(ts[i]), b: P(ts[i + 1]), layer: 'S-COFF-HACH' });
    }
  }
}

/** Cotation en chaîne (ISO 129-1) : positions successives, valeurs réelles en mm. */
function chainH(E: Ent[], xs: number[], real: number[], yObj: number, yDim: number) {
  for (let i = 0; i + 1 < xs.length; i++) {
    const lab = fmt(real[i + 1] - real[i]);
    const narrow = xs[i + 1] - xs[i] < lab.length * 1.6 + 1;
    dimH(E, xs[i], xs[i + 1], yObj, yDim, '', 2);
    E.push({ t: 'text', p: [(xs[i] + xs[i + 1]) / 2, yDim + (narrow && i % 2 ? -3.2 : 1)], h: 2, s: lab, layer: 'S-COTE', align: 'center' });
  }
}
function chainV(E: Ent[], ys: number[], real: number[], xObj: number, xDim: number) {
  for (let i = 0; i + 1 < ys.length; i++) {
    const lab = fmt(real[i + 1] - real[i]);
    const narrow = ys[i + 1] - ys[i] < lab.length * 1.6 + 1;
    dimV(E, ys[i], ys[i + 1], xObj, xDim, '', 2);
    E.push({ t: 'text', p: [xDim - 1 + (narrow && i % 2 ? 3.2 : 0), (ys[i] + ys[i + 1]) / 2], h: 2, s: lab, layer: 'S-COTE', align: 'center', rot: 90 });
  }
}
const uniq = (v: number[], tol = 1) => [...v].sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > tol);

/** Coupe cotée (unités : mm papier), origine en bas à gauche de la zone réservée. */
function sectionView(E: Ent[], calc: ColumnResult, rebar: Rebar, ox: number, oy: number, availW: number, availH: number) {
  const g = sectionGeometry(calc);
  const W = g.xmax - g.xmin, H = g.ymax - g.ymin;
  const scale = Math.max(pickScale(W, availW - 40), pickScale(H, availH - 40)); // échelle normalisée 1:scale
  const k = 1 / scale;
  const cx = ox + 22 + (availW - 40 - W * k) / 2 - g.xmin * k, cy = oy + 18 + (availH - 40 - H * k) / 2 - g.ymin * k;
  const T = (p: Pt): Pt => [cx + p[0] * k, cy + p[1] * k];
  E.push({ t: 'poly', pts: g.outline.map(T), closed: true, layer: 'S-COFF-CONTOUR' });
  hatch(E, g.outline.map(T)); // après le contour : le fond du contour (SVG) ne masque pas les hachures
  for (const t of g.ties) E.push({ t: 'poly', pts: t.map(T), closed: true, layer: 'S-ARMA-CADRE' });
  for (const b of g.bars) E.push({ t: 'circle', c: T(b), r: Math.max(0.6, rebar.phiL / 2 * k), layer: 'S-ARMA-LONG', fill: true });
  // axes
  const c0 = T([0, 0]);
  E.push({ t: 'line', a: [T([g.xmin, 0])[0] - 4, c0[1]], b: [T([g.xmax, 0])[0] + 4, c0[1]], layer: 'S-AXE' });
  E.push({ t: 'line', a: [c0[0], T([0, g.ymin])[1] - 4], b: [c0[0], T([0, g.ymax])[1] + 4], layer: 'S-AXE' });
  // cotes
  const x1 = T([g.xmin, 0])[0], x2 = T([g.xmax, 0])[0], y1 = T([0, g.ymin])[1], y2 = T([0, g.ymax])[1];
  // cotes de position des barres (chaîne), puis cotes d'ensemble
  const bx = uniq(g.bars.map(b => b[0])), by = uniq(g.bars.map(b => b[1]));
  const chain = calc.section?.kind !== 'circ' && bx.length <= 8 && by.length <= 8 && g.bars.length > 0;
  if (chain) {
    const rx = [g.xmin, ...bx, g.xmax], ry = [g.ymin, ...by, g.ymax];
    chainH(E, rx.map(x => T([x, 0])[0]), rx, y1, y1 - 7);
    chainV(E, ry.map(y => T([0, y])[1]), ry, x1, x1 - 7);
  } else if (calc.section?.kind === 'circ' && g.bars.length) {
    const rs = Math.hypot(g.bars[0][0], g.bars[0][1]);
    E.push({ t: 'circle', c: c0, r: rs * k, layer: 'S-AXE' });
    E.push({ t: 'text', p: [c0[0] + rs * k * 0.72 + 1, c0[1] - rs * k * 0.72 - 3], h: 2, s: `Ø axes ${fmt(2 * rs)}`, layer: 'S-COTE' });
  }
  dimH(E, x1, x2, y1, y1 - (chain ? 15 : 9), fmt(W));
  dimV(E, y1, y2, x1, x1 - (chain ? 15 : 9), fmt(H));
  // repères
  if (g.bars.length) {
    const b0 = T(g.bars[0]);
    const lp: Pt = [x2 + 10, Math.min(y2 + 6, b0[1] + 12)];
    E.push({ t: 'line', a: b0, b: lp, layer: 'S-TEXTE' });
    mark(E, [lp[0] + 3, lp[1]], 1);
    E.push({ t: 'text', p: [lp[0] + 7, lp[1] - 1.2], h: 2.5, s: `${rebar.nBars} HA${rebar.phiL}`, layer: 'S-TEXTE' });
  }
  if (g.ties.length) {
    const tp = T(g.ties[0][0]);
    const lp: Pt = [x2 + 10, y1 + 4];
    E.push({ t: 'line', a: tp, b: lp, layer: 'S-TEXTE' });
    mark(E, [lp[0] + 3, lp[1]], 2);
    E.push({ t: 'text', p: [lp[0] + 7, lp[1] - 1.2], h: 2.5, s: `Cad. HA${rebar.phiW} e=${rebar.spacing}`, layer: 'S-TEXTE' });
  }
  E.push({ t: 'text', p: [ox + availW / 2, oy + availH - 6], h: 3.5, s: `COUPE A-A  (1:${scale})`, layer: 'S-TEXTE', align: 'center', bold: true });
  E.push({ t: 'text', p: [ox + availW / 2, oy + 4], h: 2.5, s: `Enrobage nominal cnom = ${fmt(calc.mat.cNom)} mm (au nu des cadres)`, layer: 'S-TEXTE', align: 'center' });
  return scale;
}

/** Élévation avec zones de cadres (mm papier). */
function elevationView(E: Ent[], calc: ColumnResult, geom: Geometry, rebar: Rebar, ox: number, oy: number, availW: number, availH: number) {
  const g = sectionGeometry(calc);
  const Wr = g.xmax - g.xmin;
  const Lr = geom.L * 1000;
  const l0 = calc.anchorage?.l0 ?? 0;
  const scale = Math.max(pickScale(Lr + 200, availH - 30), pickScale(Wr, availW - 60));
  const k = 1 / scale;
  const w = Wr * k, L = Lr * k;
  const x0 = ox + (availW - w) / 2 - 8, y0 = oy + 16;
  E.push({ t: 'poly', pts: [[x0, y0], [x0 + w, y0], [x0 + w, y0 + L], [x0, y0 + L]], closed: true, layer: 'S-COFF-CONTOUR' });
  // planchers (traits forts débordants)
  for (const y of [y0, y0 + L]) E.push({ t: 'line', a: [x0 - 10, y], b: [x0 + w + 10, y], layer: 'S-COFF-CONTOUR' });
  const dp = (calc.section?.dPrime ?? 50) * k;
  const xb = [x0 + dp, x0 + w - dp];
  for (const x of xb) E.push({ t: 'line', a: [x, y0], b: [x, y0 + L], layer: 'S-ARMA-LONG' });
  // attentes en pied (recouvrement l0), en tireté
  if (rebar.numLaps > 0 && l0 > 0) for (const x of xb) E.push({ t: 'line', a: [x + 0.8, y0 - 8], b: [x + 0.8, y0 + l0 * k], layer: 'S-ARMA-LONG', dashed: true });
  // cadres par zones
  const ties = calc.ties;
  const s = Math.max(1, rebar.spacing), sEnd = ties?.sEnd ?? s, sLap = ties?.sLap ?? s, zEnd = Math.min(Lr / 2, ties?.endZone ?? 0);
  const zLap = rebar.numLaps > 0 ? Math.min(Lr, l0) : 0;
  const ys: number[] = [];
  let y = 50;
  while (y <= Lr - 50 + 1e-6 && ys.length < 2000) { // borne de sécurité
    ys.push(y);
    const inEnd = y < zEnd || y > Lr - zEnd, inLap = y < zLap;
    y += Math.min(inEnd ? sEnd : s, inLap ? sLap : s);
  }
  for (const yy of ys) E.push({ t: 'line', a: [x0 + dp * 0.6, y0 + yy * k], b: [x0 + w - dp * 0.6, y0 + yy * k], layer: 'S-ARMA-CADRE' });
  // cotes : hauteur totale et zones
  dimV(E, y0, y0 + L, x0, x0 - 12, fmt(Lr));
  const xr = x0 + w + 14;
  const zones: [number, number, string][] = [];
  const zl = Math.max(zEnd, zLap);
  if (zl > 0) zones.push([0, zl, `e=${fmt(Math.min(sEnd, zLap > 0 ? sLap : sEnd))}`]);
  zones.push([zl, Lr - zEnd, `e=${fmt(s)}`]);
  if (zEnd > 0) zones.push([Lr - zEnd, Lr, `e=${fmt(sEnd)}`]);
  for (const [a, b, lab] of zones) if (b - a > 1) {
    dimV(E, y0 + a * k, y0 + b * k, x0 + w, xr, fmt(b - a));
    E.push({ t: 'text', p: [xr + 4, y0 + (a + b) / 2 * k], h: 2.5, s: lab, layer: 'S-TEXTE' });
  }
  if (zLap > 0) {
    dimV(E, y0, y0 + zLap * k, x0 + 2, x0 - 24, fmt(l0), 2);
    E.push({ t: 'text', p: [x0 - 28, y0 + zLap * k / 2], h: 2, s: 'l0 (recouvrement)', layer: 'S-TEXTE', align: 'center', rot: 90 });
  }
  if (ys.length) dimV(E, y0, y0 + ys[0] * k, x0 + w, x0 + w + 6, fmt(ys[0]), 2);
  // repère de coupe A-A à mi-hauteur
  const ym = y0 + L / 2;
  E.push({ t: 'line', a: [x0 - 8, ym], b: [x0 - 2, ym], layer: 'S-COFF-CONTOUR' });
  E.push({ t: 'line', a: [x0 + w + 2, ym], b: [x0 + w + 8, ym], layer: 'S-COFF-CONTOUR' });
  E.push({ t: 'text', p: [x0 - 10, ym + 1.5], h: 3.5, s: 'A', layer: 'S-TEXTE', align: 'right' });
  E.push({ t: 'text', p: [x0 + w + 10, ym + 1.5], h: 3.5, s: 'A', layer: 'S-TEXTE' });
  mark(E, [x0 + w / 2, y0 + L + 6], 1);
  E.push({ t: 'text', p: [ox + availW / 2, oy + availH - 4], h: 3.5, s: `ÉLÉVATION  (1:${scale})`, layer: 'S-TEXTE', align: 'center', bold: true });
  return scale;
}

/** Nomenclature avec croquis : barres droites et cadres (un type de cadre par contour). */
function barSchedule(E: Ent[], x: number, yTop: number, calc: ColumnResult, rebar: Rebar,
  nomen: { L_barre: number; nb_cadres: number }): number {
  const cols = [9, 28, 8, 9, 46, 17, 18]; // Rep, Forme, Φ, Nb, Dimensions, L dév., Masse
  const W = cols.reduce((a, c) => a + c, 0), hh = 6, rh = 13;
  const xs = cols.reduce<number[]>((acc, c) => [...acc, acc[acc.length - 1] + c], [x]);
  const kgm = (d: number) => Math.PI * d * d / 4 * 7850 / 1e6;
  type Row = { rep: string; phi: number; nb: number; dims: string; L: number; sketch: (cx: number, cy: number) => void };
  const rows: Row[] = [];
  const Lb = nomen.L_barre;
  rows.push({ rep: '1', phi: rebar.phiL, nb: rebar.nBars, dims: `barre droite ; L = ${fmt(Lb * 1000)}`, L: Lb, sketch: (cx, cy) => {
    E.push({ t: 'line', a: [cx - 11, cy], b: [cx + 11, cy], layer: 'S-ARMA-LONG' });
    E.push({ t: 'text', p: [cx, cy + 1.2], h: 1.8, s: `${fmt(Lb * 1000)}`, layer: 'S-COTE', align: 'center' });
  } });
  const sec = calc.section;
  (sec?.ties ?? []).forEach((tie0, i) => {
    const tie = tie0.map(p => rotBack(p, sec!.rotation));
    const xs2 = tie.map(p => p[0]), ys2 = tie.map(p => p[1]);
    const bw = Math.max(...xs2) - Math.min(...xs2), bh = Math.max(...ys2) - Math.min(...ys2);
    const circ = sec?.kind === 'circ';
    const peri = tie.reduce((acc, p, j) => acc + Math.hypot(tie[(j + 1) % tie.length][0] - p[0], tie[(j + 1) % tie.length][1] - p[1]), 0);
    const hook = 10 * rebar.phiW;
    const L = (peri + 2 * hook) / 1000;
    const x0 = Math.min(...xs2), y0 = Math.min(...ys2);
    rows.push({ rep: String(2 + i), phi: rebar.phiW, nb: nomen.nb_cadres, L,
      dims: circ ? `cerce Ø ${fmt(bw)} (axe) ; 2 crochets de ${fmt(hook)}` : tie.length === 4 ? `cadre ${fmt(bw)} × ${fmt(bh)} (axes) ; 2 crochets 135° de ${fmt(hook)}` : `cadre polygonal ${fmt(bw)} × ${fmt(bh)} ; 2 crochets 135° de ${fmt(hook)}`,
      sketch: (cx, cy) => {
        const s = 9 / Math.max(bw, bh, 1);
        const P = (p: Pt): Pt => [cx + (p[0] - x0 - bw / 2) * s, cy + (p[1] - y0 - bh / 2) * s];
        E.push({ t: 'poly', pts: tie.length > 40 ? tie.filter((_, j) => j % 4 === 0).map(P) : tie.map(P), closed: true, layer: 'S-ARMA-CADRE' });
        const c = P(tie.reduce((best, p) => (p[0] + p[1] > best[0] + best[1] ? p : best), tie[0]));
        E.push({ t: 'line', a: c, b: [c[0] - 2.2, c[1] - 2.2], layer: 'S-ARMA-CADRE' });
        E.push({ t: 'line', a: [c[0] - 0.8, c[1]], b: [c[0] - 3, c[1] - 2.2], layer: 'S-ARMA-CADRE' });
      } });
  });
  const head = ['Rep.', 'Forme', 'Φ', 'Nb', 'Dimensions (mm)', 'L dév. (m)', 'Masse (kg)'];
  const Ht = hh + rows.length * rh + hh;
  E.push({ t: 'poly', pts: [[x, yTop], [x + W, yTop], [x + W, yTop - Ht], [x, yTop - Ht]], closed: true, layer: 'S-CADRE-PLAN' });
  for (const xx of xs.slice(1, -1)) E.push({ t: 'line', a: [xx, yTop], b: [xx, yTop - Ht + hh], layer: 'S-CADRE-PLAN' });
  E.push({ t: 'line', a: [x, yTop - hh], b: [x + W, yTop - hh], layer: 'S-CADRE-PLAN' });
  head.forEach((h, j) => E.push({ t: 'text', p: [xs[j] + 1.2, yTop - hh + 1.8], h: 2.1, s: h, layer: 'S-TEXTE', bold: true }));
  let total = 0;
  rows.forEach((r, i) => {
    const yb = yTop - hh - (i + 1) * rh;
    E.push({ t: 'line', a: [x, yb], b: [x + W, yb], layer: 'S-CADRE-PLAN' });
    const mass = r.nb * r.L * kgm(r.phi); total += mass;
    const ym = yb + rh / 2 - 1;
    [r.rep, '', String(r.phi), String(r.nb), '', fmt(r.L, 2), fmt(mass, 1)].forEach((c, j) => c && E.push({ t: 'text', p: [xs[j] + 1.2, ym], h: 2.2, s: c, layer: 'S-TEXTE' }));
    const parts = r.dims.split(' ; ');
    parts.forEach((pp, kk) => E.push({ t: 'text', p: [xs[4] + 1.2, ym + (parts.length > 1 ? 2 - kk * 3.4 : 0)], h: 1.9, s: pp, layer: 'S-TEXTE' }));
    r.sketch(xs[1] + cols[1] / 2, yb + rh / 2);
  });
  const yt = yTop - Ht;
  E.push({ t: 'text', p: [xs[4] + 1.2, yt + 1.8], h: 2.2, s: 'Total', layer: 'S-TEXTE', bold: true });
  E.push({ t: 'text', p: [xs[6] + 1.2, yt + 1.8], h: 2.2, s: fmt(total, 1), layer: 'S-TEXTE', bold: true });
  return yt;
}

function table(E: Ent[], x: number, yTop: number, cols: number[], rows: string[][], head = true) {
  const rh = 6, W = cols.reduce((a, b) => a + b, 0);
  for (let i = 0; i <= rows.length; i++) E.push({ t: 'line', a: [x, yTop - i * rh], b: [x + W, yTop - i * rh], layer: 'S-CADRE-PLAN' });
  let cx = x;
  for (let j = 0; j <= cols.length; j++) { E.push({ t: 'line', a: [cx, yTop], b: [cx, yTop - rows.length * rh], layer: 'S-CADRE-PLAN' }); cx += cols[j] ?? 0; }
  rows.forEach((r, i) => {
    let xx = x;
    r.forEach((cell, j) => { E.push({ t: 'text', p: [xx + 1.5, yTop - (i + 1) * rh + 1.8], h: 2.5, s: cell, layer: 'S-TEXTE', bold: head && i === 0 }); xx += cols[j]; });
  });
  return yTop - rows.length * rh;
}

/** Plan A3 complet. */
export function buildSheet(calc: ColumnResult, geom: Geometry, rebar: Rebar,
  nomen: { L_barre: number; L_cadre: number; nb_cadres: number; weightL: number; weightW: number; totalWeight: number },
  tb: TitleBlock, concreteLabel: string, steelLabel: string, exposure: string): Drawing {
  const E: Ent[] = [];
  const W = 420, H = 297;
  // cadre ISO 5457 : marge 20 mm à gauche, 10 mm ailleurs
  E.push({ t: 'poly', pts: [[0, 0], [W, 0], [W, H], [0, H]], closed: true, layer: 'S-CADRE-PLAN' });
  E.push({ t: 'poly', pts: [[20, 10], [W - 10, 10], [W - 10, H - 10], [20, H - 10]], closed: true, layer: 'S-CADRE-PLAN' });
  const secScale = calc.section ? sectionView(E, calc, rebar, 22, 120, 150, 165) : 0;
  const elScale = calc.section ? elevationView(E, calc, geom, rebar, 175, 60, 95, 225) : 0;
  // nomenclature façonnée (esprit ISO 4066) : croquis de forme, dimensions, longueur développée, masse
  let y = barSchedule(E, 275, H - 18, calc, rebar, nomen);
  E.push({ t: 'text', p: [275, H - 15], h: 3.5, s: 'NOMENCLATURE DES ACIERS', layer: 'S-TEXTE', bold: true });
  // notes
  y -= 8;
  E.push({ t: 'text', p: [275, y], h: 3.5, s: 'NOTES', layer: 'S-TEXTE', bold: true });
  const notes = [
    `Béton ${concreteLabel} — exposition ${exposure} — classe structurale ${calc.mat.structuralClass}`,
    `Acier ${steelLabel} — enrobage cnom = ${fmt(calc.mat.cNom)} mm`,
    calc.anchorage ? `Ancrage lbd = ${fmt(calc.anchorage.lbd)} mm ; recouvrement l0 = ${fmt(calc.anchorage.l0)} mm` : '',
    calc.ties ? `Cadres : e=${fmt(rebar.spacing)} courant, ${fmt(calc.ties.sEnd)} aux abouts` : '',
    `Calcul : NF EN 1992-1-1${calc.annex === 'FR' ? ' et son Annexe nationale' : ''}`,
    calc.fire.computed && calc.fire.valid ? `Feu : R${calc.fire.Rreq} (EN 1992-1-2, méthode A)` : '',
    'Cotes en millimètres. Ne pas mesurer sur le plan.',
  ].filter(Boolean);
  notes.forEach((n, i) => E.push({ t: 'text', p: [277, y - 6 - i * 5], h: 2.5, s: `${i + 1}. ${n}`, layer: 'S-TEXTE' }));
  // cartouche ISO 7200 (180 × 50 mm) — bloc DXF « CARTOUCHE » à attributs modifiables
  const C: Ent[] = [];
  const bx = W - 10 - 180, by = 10;
  C.push({ t: 'poly', pts: [[bx, by], [bx + 180, by], [bx + 180, by + 50], [bx, by + 50]], closed: true, layer: 'S-CADRE-PLAN' });
  const hl = (yy: number, x1 = bx, x2 = bx + 180) => C.push({ t: 'line', a: [x1, by + yy], b: [x2, by + yy], layer: 'S-CADRE-PLAN' });
  const vl = (xx: number, y1 = 0, y2 = 50) => C.push({ t: 'line', a: [bx + xx, by + y1], b: [bx + xx, by + y2], layer: 'S-CADRE-PLAN' });
  hl(40); hl(26); hl(13); vl(60, 0, 40); vl(120, 0, 26); vl(150, 0, 13); vl(150, 40, 50);
  const lab = (x: number, yy: number, l: string, tag: string, v: string, h = 2.5) => {
    C.push({ t: 'text', p: [bx + x + 1.5, by + yy + 8.5], h: 1.8, s: l, layer: 'S-TEXTE' });
    C.push({ t: 'text', p: [bx + x + 1.5, by + yy + 2.5], h, s: v, layer: 'S-TEXTE', bold: true, attr: { tag, prompt: l } });
  };
  C.push({ t: 'text', p: [bx + 2, by + 43], h: 3.5, s: tb.owner.slice(0, 60), layer: 'S-TEXTE', bold: true, attr: { tag: 'PROPRIETAIRE', prompt: 'Propriétaire légal' } });
  // zone du logo : image dans le SVG ; cadre réservé dans le DXF (le format R12 n'incorpore pas d'image)
  if (tb.logoSEL) C.push(...selLogoEnts(bx + 151, by + 41, 28, 8));
  else if (tb.logo) C.push({ t: 'image', p: [bx + 151, by + 41], w: 28, h: 8, href: tb.logo, layer: 'S-CADRE-PLAN' });
  else C.push({ t: 'text', p: [bx + 165, by + 43.5], h: 1.8, s: 'LOGO', layer: 'S-TEXTE', align: 'center' });
  lab(0, 26, 'Projet / Client', 'PROJET', `${tb.project} — ${tb.client}`.slice(0, 34));
  lab(60, 26, 'Titre', 'TITRE', tb.title.slice(0, 38), 3.5);
  lab(0, 13, 'Type de document', 'TYPE_DOC', tb.docType);
  lab(60, 13, 'Établi par / Approuvé par', 'AUTEURS', `${tb.author} / ${tb.approver}`.slice(0, 44), `${tb.author} / ${tb.approver}`.length > 30 ? 2 : 2.5);
  lab(120, 13, 'Échelles', 'ECHELLES', `1:${secScale} / 1:${elScale}`);
  lab(0, 0, "N° d'identification", 'NUMERO', tb.number);
  lab(60, 0, "Date d'édition", 'DATE', tb.date);
  lab(120, 0, 'Rév.', 'REVISION', tb.revision);
  lab(150, 0, 'Format / Feuille', 'FORMAT', 'A3 · 1/1');
  for (const c of C) E.push({ ...c, block: 'CARTOUCHE' });
  return { ents: E, w: W, h: H };
}

/** Aperçu compact de la section seule (unités : mm réels). */
export function buildSectionPreview(calc: ColumnResult, rebar: Rebar): Drawing | null {
  if (!calc.section) return null;
  const g = sectionGeometry(calc);
  const E: Ent[] = [];
  const m = 40;
  const T = (p: Pt): Pt => [p[0] - g.xmin + m, p[1] - g.ymin + m];
  E.push({ t: 'poly', pts: g.outline.map(T), closed: true, layer: 'S-COFF-CONTOUR' });
  for (const t of g.ties) E.push({ t: 'poly', pts: t.map(T), closed: true, layer: 'S-ARMA-CADRE' });
  for (const b of g.bars) E.push({ t: 'circle', c: T(b), r: rebar.phiL / 2, layer: 'S-ARMA-LONG', fill: true });
  return { ents: E, w: g.xmax - g.xmin + 2 * m, h: g.ymax - g.ymin + 2 * m };
}

// ---------------------------------------------------------------------------
// Export DXF R12 (AC1009), code page ANSI_1252
// ---------------------------------------------------------------------------

function dxfText(s: string) {
  return s.replace(/Φ|Ø/g, '%%c').replace(/°/g, '%%d').replace(/±/g, '%%p').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[—–]/g, '-').replace(/·/g, '.').replace(/[’]/g, "'").replace(/[^\x00-\xff]/g, '?');
}

export function toDXF(d: Drawing): Uint8Array {
  const L: string[] = [];
  const g = (code: number, v: string | number) => { L.push(String(code)); L.push(typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : v); };
  const textAlign = (e: Extract<Ent, { t: 'text' }>) => {
    const al = e.align === 'center' ? 1 : e.align === 'right' ? 2 : 0;
    if (e.rot) g(50, e.rot);
    if (al) { g(72, al); g(11, e.p[0]); g(21, e.p[1]); g(31, 0); }
  };
  /** Géométrie commune aux entités ; dans un bloc, les attributs deviennent des ATTDEF. */
  const emit = (e: Ent, inBlock: boolean) => {
    if (e.only === 'svg') return;
    if (e.t === 'image') { // zone réservée : cadre + mention (R12 sans image incorporée)
      g(0, 'POLYLINE'); g(8, e.layer); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, 1);
      for (const p of [[e.p[0], e.p[1]], [e.p[0] + e.w, e.p[1]], [e.p[0] + e.w, e.p[1] + e.h], [e.p[0], e.p[1] + e.h]]) { g(0, 'VERTEX'); g(8, e.layer); g(10, p[0]); g(20, p[1]); g(30, 0); }
      g(0, 'SEQEND'); g(8, e.layer);
      g(0, 'TEXT'); g(8, 'S-TEXTE'); g(10, e.p[0] + e.w / 2); g(20, e.p[1] + e.h / 2 - 0.9); g(30, 0); g(40, 1.8); g(1, 'LOGO'); g(72, 1); g(11, e.p[0] + e.w / 2); g(21, e.p[1] + e.h / 2 - 0.9); g(31, 0);
      return;
    }
    if (e.t === 'line') {
      g(0, 'LINE'); g(8, e.layer); if (e.dashed) g(6, 'DASHED');
      g(10, e.a[0]); g(20, e.a[1]); g(30, 0); g(11, e.b[0]); g(21, e.b[1]); g(31, 0);
    } else if (e.t === 'poly') {
      if (e.fill && e.fill.startsWith('#') && e.pts.length === 4) { // remplissage plein (R12 : SOLID, sommets 1-2-4-3)
        const q = [e.pts[0], e.pts[1], e.pts[3], e.pts[2]];
        g(0, 'SOLID'); g(8, e.layer); q.forEach((p, i) => { g(10 + i, p[0]); g(20 + i, p[1]); g(30 + i, 0); });
      }
      g(0, 'POLYLINE'); g(8, e.layer); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, e.closed ? 1 : 0);
      for (const p of e.pts) { g(0, 'VERTEX'); g(8, e.layer); g(10, p[0]); g(20, p[1]); g(30, 0); }
      g(0, 'SEQEND'); g(8, e.layer);
    } else if (e.t === 'circle') {
      g(0, 'CIRCLE'); g(8, e.layer); g(10, e.c[0]); g(20, e.c[1]); g(30, 0); g(40, e.r);
      if (e.fill) for (let r = e.r * 0.75; r > 0.05; r -= Math.max(0.1, e.r * 0.25)) { g(0, 'CIRCLE'); g(8, e.layer); g(10, e.c[0]); g(20, e.c[1]); g(30, 0); g(40, r); }
    } else if (e.attr && inBlock) {
      g(0, 'ATTDEF'); g(8, e.layer); g(10, e.p[0]); g(20, e.p[1]); g(30, 0); g(40, e.h); g(1, dxfText(e.s)); g(3, dxfText(e.attr.prompt)); g(2, e.attr.tag); g(70, 0);
      textAlign(e);
    } else {
      g(0, 'TEXT'); g(8, e.layer); if (e.color === '#ffffff') g(62, 7); g(10, e.p[0]); g(20, e.p[1]); g(30, 0); g(40, e.h); g(1, dxfText(e.s));
      if (e.wf) g(41, e.wf);
      textAlign(e);
    }
  };

  g(0, 'SECTION'); g(2, 'HEADER');
  g(9, '$ACADVER'); g(1, 'AC1009');
  g(9, '$DWGCODEPAGE'); g(3, 'ANSI_1252');
  g(9, '$INSBASE'); g(10, 0); g(20, 0); g(30, 0);
  g(9, '$EXTMIN'); g(10, 0); g(20, 0); g(30, 0);
  g(9, '$EXTMAX'); g(10, d.w); g(20, d.h); g(30, 0);
  g(9, '$LTSCALE'); g(40, 1);
  g(9, '$ATTMODE'); g(70, 1);
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES');
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 3);
  const lt = (name: string, desc: string, pat: number[]) => {
    g(0, 'LTYPE'); g(2, name); g(70, 0); g(3, desc); g(72, 65); g(73, pat.length);
    g(40, pat.reduce((a2, b2) => a2 + Math.abs(b2), 0)); for (const p of pat) g(49, p);
  };
  lt('CONTINUOUS', 'Solid line', []);
  lt('CENTER', 'Center ____ _ ____ _', [8, -2, 1, -2]);
  lt('DASHED', 'Dashed __ __ __', [3, -1.5]);
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, Object.keys(LAYERS).length);
  for (const [name, p] of Object.entries(LAYERS)) { g(0, 'LAYER'); g(2, name); g(70, 0); g(62, p.color); g(6, p.ltype); }
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'STYLE'); g(70, 1);
  g(0, 'STYLE'); g(2, 'STANDARD'); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, 'txt'); g(4, '');
  g(0, 'ENDTAB');
  g(0, 'ENDSEC');

  // Blocs (le cartouche notamment), insérés au point (0, 0) : coordonnées inchangées
  const blocks = new Map<string, Ent[]>();
  for (const e of d.ents) if (e.block) { if (!blocks.has(e.block)) blocks.set(e.block, []); blocks.get(e.block)!.push(e); }
  g(0, 'SECTION'); g(2, 'BLOCKS');
  for (const [name, ents] of blocks) {
    const hasAttr = ents.some(e => e.t === 'text' && e.attr);
    g(0, 'BLOCK'); g(8, '0'); g(2, name); g(70, hasAttr ? 2 : 0); g(10, 0); g(20, 0); g(30, 0); g(3, name);
    for (const e of ents) emit(e, true);
    g(0, 'ENDBLK'); g(8, '0');
  }
  g(0, 'ENDSEC');

  g(0, 'SECTION'); g(2, 'ENTITIES');
  for (const e of d.ents) if (!e.block) emit(e, false);
  for (const [name, ents] of blocks) {
    const attrs = ents.filter((e): e is Extract<Ent, { t: 'text' }> => e.t === 'text' && !!e.attr);
    g(0, 'INSERT'); g(8, 'S-CADRE-PLAN'); if (attrs.length) g(66, 1); g(2, name); g(10, 0); g(20, 0); g(30, 0);
    if (attrs.length) {
      for (const e of attrs) {
        g(0, 'ATTRIB'); g(8, e.layer); g(10, e.p[0]); g(20, e.p[1]); g(30, 0); g(40, e.h); g(1, dxfText(e.s)); g(2, e.attr!.tag); g(70, 0);
        textAlign(e);
      }
      g(0, 'SEQEND'); g(8, 'S-CADRE-PLAN');
    }
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  const str = L.join('\r\n') + '\r\n';
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff; // Latin-1 ≈ ANSI 1252 pour les caractères utilisés
  return out;
}

// ---------------------------------------------------------------------------
// SVG (même modèle) — y vers le haut dans le modèle, inversé à l'affichage
// ---------------------------------------------------------------------------

export function toSVG(d: Drawing, opts: { strokeScale?: number; background?: string } = {}): string {
  const k = opts.strokeScale ?? 1;
  const Y = (y: number) => (d.h - y).toFixed(3);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.w} ${d.h}" width="100%" font-family="Arial, Helvetica, sans-serif">`);
  if (opts.background) parts.push(`<rect width="${d.w}" height="${d.h}" fill="${opts.background}"/>`);
  for (const e of d.ents) {
    if (e.only === 'dxf') continue;
    const L = LAYERS[e.layer];
    const st = `stroke="${L.svg}" stroke-width="${(L.w * k).toFixed(3)}"${L.ltype === 'CENTER' ? ` stroke-dasharray="${8 * k} ${2 * k} ${1 * k} ${2 * k}"` : ''}`;
    if (e.t === 'image') { parts.push(`<image x="${e.p[0].toFixed(3)}" y="${Y(e.p[1] + e.h)}" width="${e.w}" height="${e.h}" href="${e.href}" preserveAspectRatio="xMidYMid meet"/>`); continue; }
    if (e.t === 'line') parts.push(`<line x1="${e.a[0].toFixed(3)}" y1="${Y(e.a[1])}" x2="${e.b[0].toFixed(3)}" y2="${Y(e.b[1])}" ${st}${e.dashed ? ` stroke-dasharray="${3 * k} ${1.5 * k}"` : ''}/>`);
    else if (e.t === 'poly') parts.push(`<${e.closed ? 'polygon' : 'polyline'} points="${e.pts.map(p => `${p[0].toFixed(3)},${Y(p[1])}`).join(' ')}" fill="${e.fill ?? (e.layer === 'S-COFF-CONTOUR' && e.closed ? '#f3f4f6' : 'none')}" ${e.w ? st.replace(/stroke-width="[^"]*"/, `stroke-width="${e.w.toFixed(3)}"`) : st}/>`);
    else if (e.t === 'circle') parts.push(`<circle cx="${e.c[0].toFixed(3)}" cy="${Y(e.c[1])}" r="${e.r.toFixed(3)}" fill="${e.fill ? L.svg : 'none'}" ${st}/>`);
    else {
      const anchor = e.align === 'center' ? 'middle' : e.align === 'right' ? 'end' : 'start';
      const tr = e.rot ? ` transform="rotate(${-e.rot} ${e.p[0].toFixed(3)} ${Y(e.p[1])})"` : '';
      parts.push(`<text x="${e.p[0].toFixed(3)}" y="${Y(e.p[1])}" font-size="${e.h}" text-anchor="${anchor}" fill="${e.color ?? L.svg}"${e.bold ? ' font-weight="bold"' : ''}${e.spacing ? ` letter-spacing="${e.spacing.toFixed(3)}"` : ''}${tr}>${esc(e.s)}</text>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}
