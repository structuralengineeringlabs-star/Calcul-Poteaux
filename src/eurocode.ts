/**
 * Moteur de calcul — Poteaux en béton armé selon EN 1992-1-1 (Eurocode 2)
 *
 * Unités internes : mm, N, MPa. Les entrées/sorties publiques utilisent les
 * unités de l'interface (cm, m, kN, kNm) et sont converties ici.
 *
 * Périmètre :
 *  - Toutes formes de section (modèle polygonal, axes principaux) : ELU en compression,
 *    flexion composée et déviée, second ordre (§5.8.7 et §5.8.8), dispositions §9.5.
 *  - Sections rectangulaires et circulaires : en plus, effort tranchant et torsion (§6.2, §6.3),
 *    feu (EN 1992-1-2 méthode A), méthode des Recommandations professionnelles ; fissuration
 *    (§7.3.4) pour les rectangles.
 *  - Paramètres nationaux : valeurs recommandées ou Annexe nationale française.
 *
 * Chaque règle est rattachée à son article dans les commentaires ; la matrice de traçabilité
 * complète est dans docs/audit/MATRICE_NORMATIVE.md.
 */

import { analysisPolygon, insetPolygon, layoutBars, chord, perimeter, type Pt } from './section';

export type Shape = 'rect' | 'circ' | 'quart' | 'demi' | 'hex' | 'L' | 'T' | 'croix';
export type SolicitationType = 'compression' | 'traction' | 'flexion_composee' | 'cisaillement';
export type Verdict = 'OK' | 'KO' | 'NV';

export interface Materials {
  concreteClass: string;
  fck: number;
  steelGrade: string;
  fyk: number;
  exposureClass: string;
  structuralClass: string;
  deltaCdev: number;
  alphaCC?: number;
  gammaC?: number;
  gammaS?: number;
  classMode?: 'saisi' | 'calcule';   // classe structurale saisie ou calculée (tableau 4.3N / 4.3NF)
  designLife?: 25 | 50 | 100;        // durée d'utilisation de projet (ans)
  qualityControl?: boolean;          // EC2 : maîtrise particulière de la qualité du béton
  compactCover?: boolean;            // AN France : enrobage compact
  annex?: 'EC2' | 'FR';              // valeurs recommandées ou Annexe nationale française
}

export interface FireInput {
  R: number;              // durée requise (min), 0 = pas de vérification
  l0fiFactor: number;     // l0,fi / l (0,5 à 1), ou 0 pour l0,fi = l0 à froid
  psiFi?: number;         // ψfi pour ηfi (défaut : ψ2)
  muFi?: number;          // μfi imposé (0 = automatique, μfi = ηfi)
}

export interface Geometry {
  shape: Shape;
  params: Record<string, number>;
  L: number;      // m
  beta: number;
  coeffA: number;
  coeffB: number;
  coeffC: number;          // conservé pour compatibilité (C est désormais calculé)
  phi_ef?: number;         // φef saisi (mode « saisi »)
  braced?: boolean;        // structure contreventée (défaut : oui)
  lengthMode?: 'beta' | 'k';
  k1?: number; k2?: number; // souplesses relatives aux extrémités (§5.8.3.2)
  phiMode?: 'saisi' | 'calcule';
  secondOrderMethod?: 'courbure' | 'rigidite'; // §5.8.8 ou §5.8.7
  RH?: number;             // humidité relative (%)
  t0?: number;             // âge du béton au chargement (jours)
  cement?: 'S' | 'N' | 'R';
  Tmean?: number;          // température moyenne pendant le durcissement (°C), annexe B (B.10)
}

export type Curvature = 'simple' | 'double';

export interface Loads {
  solicitationType: SolicitationType;
  NEd: number;       // kN (compression > 0)
  MEd_user: number;  // kNm — ancien champ : moment constant dans le plan de h
  MEd_z?: number;    // kNm — ancien champ : moment constant dans le plan de b
  VEd: number;       // kN, effort tranchant dans le plan de h
  VEd_b?: number;    // kN, effort tranchant dans le plan de b
  TEd: number;       // kNm
  Nqp?: number;      // kN, effort normal quasi-permanent (ELS, mode direct)
  Ncar?: number;     // kN, effort normal caractéristique (ELS, mode direct)
  loadMode?: 'direct' | 'GQ';
  NG?: number; NQ?: number; psi2?: number; // kN, valeurs caractéristiques
  psi1?: number;                           // ψ1 (valeur fréquente), pour la situation d'incendie en France
  selfWeight?: boolean;                    // ajoute le poids propre (25 kN/m³)
  // Moments du premier ordre aux extrémités (valeurs absolues, kNm) et type de courbure
  Mh_top?: number; Mh_bot?: number; curvH?: Curvature;
  Mb_top?: number; Mb_bot?: number; curvB?: Curvature;
  transverse?: boolean; // moments dus principalement à des charges transversales → rm = 1
  Mqp_h?: number;       // kNm, moment quasi-permanent dans le plan de h (fissuration)
}

export interface MomentSpec { top: number; bot: number; curvature: Curvature } // N·mm

export interface Rebar {
  phiL: number;
  nBars: number;
  phiW: number;
  spacing: number; // mm
  anchoringFactor: number;
  overlapFactor: number;
  numAnchors: number;
  numLaps: number;
  anchorMode?: 'calcule' | 'saisi'; // longueurs d'ancrage et de recouvrement
  bond?: 'bonne' | 'mediocre';      // conditions d'adhérence (§8.4.2)
  lapPercent?: number;              // % de barres recouvertes dans une même section (α6)
}

// ---------------------------------------------------------------------------
// Matériaux
// ---------------------------------------------------------------------------

export const CONCRETE_CLASSES: { fck: number; label: string }[] = [
  { fck: 20, label: 'C20/25' }, { fck: 25, label: 'C25/30' }, { fck: 30, label: 'C30/37' },
  { fck: 35, label: 'C35/45' }, { fck: 40, label: 'C40/50' }, { fck: 45, label: 'C45/55' },
  { fck: 50, label: 'C50/60' }, { fck: 55, label: 'C55/67' }, { fck: 60, label: 'C60/75' },
  { fck: 70, label: 'C70/85' }, { fck: 80, label: 'C80/95' }, { fck: 90, label: 'C90/105' },
];

export const concreteLabel = (fck: number) =>
  CONCRETE_CLASSES.find(c => c.fck === fck)?.label ?? `C${fck}`;

import { ES, proprietesBeton, CMIN_DUR, ligneExposition, wmax as wmaxEC, coefficientFluage, fbd as fbdEC } from './eurocodes';
export { ES };

export interface MaterialProps {
  fcd: number; fctm: number; fyd: number; Ecm: number;
  epsC2: number; epsCu2: number; nPar: number;
  gammaC: number; gammaS: number; alphaCC: number;
  cMinDur: number; cMinB: number; cMin: number; cNom: number;
  coverNote: string | null;
  structuralClass: string; structuralClassNote: string | null;
  minClassFck: number; // classe indicative minimale (annexe E)
}

// Tableau 4.3N — classe de résistance donnant une réduction d'une classe structurale.
// Colonnes de l'EC2 : X0 | XC1 | XC2/XC3 | XC4 | XD1 | XD2/XS1 | XD3/XS2/XS3
const CLASS_REDUCTION_FCK: Record<string, number> = {
  X0: 30, XC1: 30, XC2: 35, XC3: 35, XC4: 40, XD1: 40, XD2: 40, XS1: 40, XD3: 45, XS2: 45, XS3: 45,
};
// Tableau 4.3NF (AN France) — seuils : [minoration de 1, minoration de 2].
// Colonnes : X0 | XC1 | XC2/XC3 | XC4 | XD1/XS1/XA1 | XD2/XS2/XA2 | XD3/XS3/XA3
const CLASS_REDUCTION_FCK_FR: Record<string, [number, number]> = {
  X0: [30, 50], XC1: [30, 50], XC2: [30, 55], XC3: [30, 55], XC4: [35, 60],
  XD1: [40, 60], XS1: [40, 60], XA1: [40, 60], XD2: [40, 60], XS2: [40, 60], XA2: [40, 60],
  XD3: [45, 70], XS3: [45, 70], XA3: [45, 70],
};
/** Classe d'exposition servant de référence pour la modulation lorsqu'elle n'est pas dans le tableau (XF, XA en EC2). */
const refExposure = (e: string) => ({ XF1: 'XC4', XF3: 'XC4', XF2: 'XD1', XF4: 'XD2', XA1: 'XC4', XA2: 'XC4', XA3: 'XC4' } as Record<string, string>)[e] ?? e;

/** Ouverture de fissure admissible (mm) sous combinaison quasi-permanente, béton armé — bibliothèque @sel/eurocodes. */
export const wmax = (exposure: string, annex: 'EC2' | 'FR'): number | null => wmaxEC(exposure, annex);

// Annexe E (informative), tableau E.1N — classes indicatives minimales ; XF4 d'après l'EN 206
const MIN_CLASS_FCK: Record<string, number> = {
  X0: 12, XC1: 20, XC2: 25, XC3: 30, XC4: 30, XD1: 30, XD2: 30, XD3: 35,
  XS1: 30, XS2: 35, XS3: 35, XF1: 30, XF2: 25, XF3: 30, XF4: 30, XA1: 30, XA2: 30, XA3: 35,
};

// Tableau 4.4N et lignes d'exposition : bibliothèque @sel/eurocodes (durabilite.ts)
const exposureRow = ligneExposition;

export function materialProps(m: Materials, rebar: Rebar): MaterialProps {
  const gammaC = m.gammaC && m.gammaC > 0 ? m.gammaC : 1.5;
  const gammaS = m.gammaS && m.gammaS > 0 ? m.gammaS : 1.15;
  const alphaCC = m.alphaCC || 1.0;
  const fck = m.fck;
  const fcd = alphaCC * fck / gammaC;
  const { fctm, Ecm } = proprietesBeton(fck); // tableau 3.1 (@sel/eurocodes)
  const fyd = m.fyk / gammaS;

  // Tableau 3.1 — diagramme parabole-rectangle
  const epsC2 = fck <= 50 ? 0.002 : (2.0 + 0.085 * Math.pow(fck - 50, 0.53)) / 1000;
  const epsCu2 = fck <= 50 ? 0.0035 : (2.6 + 35 * Math.pow((90 - fck) / 100, 4)) / 1000;
  const nPar = fck <= 50 ? 2.0 : 1.4 + 23.4 * Math.pow((90 - fck) / 100, 4);

  // Enrobage §4.4.1 — mesuré au nu des cadres
  const { row, note } = exposureRow(m.exposureClass);
  let sNum = parseInt(m.structuralClass.replace('S', ''), 10);
  let structuralClassNote: string | null = null;
  if (m.classMode === 'calcule') {
    const mods: string[] = ['S4 de base'];
    sNum = 4;
    if (m.designLife === 100) { sNum += 2; mods.push('+2 (100 ans)'); }
    if (m.annex === 'FR') {
      if (m.designLife === 25) { sNum -= 1; mods.push('−1 (25 ans et moins)'); }
      const [t1, t2] = CLASS_REDUCTION_FCK_FR[m.exposureClass] ?? CLASS_REDUCTION_FCK_FR[refExposure(m.exposureClass)] ?? [35, 60];
      if (fck >= t2) { sNum -= 2; mods.push(`−2 (classe ≥ C${t2})`); }
      else if (fck >= t1) { sNum -= 1; mods.push(`−1 (classe ≥ C${t1})`); }
      if (m.compactCover) { sNum -= 1; mods.push('−1 (enrobage compact)'); }
    } else {
      const t = CLASS_REDUCTION_FCK[m.exposureClass] ?? CLASS_REDUCTION_FCK[refExposure(m.exposureClass)] ?? 40;
      if (fck >= t) { sNum -= 1; mods.push(`−1 (classe ≥ C${t})`); }
      if (m.qualityControl) { sNum -= 1; mods.push('−1 (maîtrise de la qualité)'); }
    }
    sNum = Math.min(6, Math.max(1, sNum));
    structuralClassNote = `${m.annex === 'FR' ? 'Tableau 4.3NF' : 'Tableau 4.3N'} : ${mods.join(', ')} → S${sNum}`;
  }
  const sIdx = Number.isFinite(sNum) ? Math.min(5, Math.max(0, sNum - 1)) : 3;
  const cMinDur = CMIN_DUR[row][sIdx];
  // cmin,b : ≥ φ cadre pour le cadre, et ≥ φl pour la barre longitudinale (c + φw ≥ φl)
  const cMinB = Math.max(rebar.phiW, rebar.phiL - rebar.phiW);
  const cMin = Math.max(cMinB, cMinDur, 10);
  const cNom = cMin + m.deltaCdev; // §4.4.1.3 : Δcdev = 10 mm recommandé (AN France : idem)

  return { fcd, fctm, fyd, Ecm, epsC2, epsCu2, nPar, gammaC, gammaS, alphaCC,
    cMinDur, cMinB, cMin, cNom, coverNote: note,
    structuralClass: `S${sIdx + 1}`, structuralClassNote, minClassFck: MIN_CLASS_FCK[m.exposureClass] ?? 12 };
}

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------

export interface GeomProps {
  A: number;     // cm²
  Imin: number;  // cm⁴
  i_min: number; // cm
  supported: boolean; // calcul d'armatures disponible
}

type RectCm = [number, number, number, number]; // x0, y0, x1, y1

/** Propriétés exactes d'une union de rectangles (découpage en sous-rectangles, axes principaux). */
function unionProps(rects: RectCm[]): { A: number; Imin: number } {
  const xs = [...new Set(rects.flatMap(r => [r[0], r[2]]))].sort((a, b) => a - b);
  const ys = [...new Set(rects.flatMap(r => [r[1], r[3]]))].sort((a, b) => a - b);
  let A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0, Ixy = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1];
      const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (!rects.some(r => xm > r[0] && xm < r[2] && ym > r[1] && ym < r[3])) continue;
      const w = x1 - x0, h = y1 - y0, a = w * h;
      A += a; Sx += a * xm; Sy += a * ym;
      Iyy += w ** 3 * h / 12 + a * xm * xm;
      Ixx += w * h ** 3 / 12 + a * ym * ym;
      Ixy += a * xm * ym;
    }
  }
  if (A <= 0) return { A: 0, Imin: 0 };
  const xc = Sx / A, yc = Sy / A;
  const Ix = Ixx - A * yc * yc, Iy = Iyy - A * xc * xc, Ixyc = Ixy - A * xc * yc;
  const Imin = (Ix + Iy) / 2 - Math.sqrt(((Ix - Iy) / 2) ** 2 + Ixyc ** 2);
  return { A, Imin };
}

export function geometryProps(g: Geometry): GeomProps {
  const p = g.params;
  let A = 0, Imin = 0, supported = false;
  switch (g.shape) {
    case 'rect': {
      const b = p.b || 0, h = p.h || 0;
      A = b * h; Imin = Math.min(b * h ** 3, h * b ** 3) / 12; supported = true; break;
    }
    case 'circ': {
      const d = p.d || 0;
      A = Math.PI * d * d / 4; Imin = Math.PI * d ** 4 / 64; supported = true; break;
    }
    case 'quart': { // axes principaux (produit d'inertie non nul)
      const r = p.r || 0;
      A = Math.PI * r * r / 4;
      Imin = (Math.PI / 16 + 1 / 8 - 8 / (9 * Math.PI)) * r ** 4; break;
    }
    case 'demi': {
      const r = p.r || 0;
      A = Math.PI * r * r / 2; Imin = (Math.PI / 8 - 8 / (9 * Math.PI)) * r ** 4; break;
    }
    case 'hex': {
      const a = p.a || 0;
      A = (3 * Math.sqrt(3) / 2) * a * a; Imin = (5 * Math.sqrt(3) / 16) * a ** 4; break;
    }
    case 'L': {
      const b1 = p.b1 || 30, h1 = p.h1 || 30, b2 = p.b2 || 30, h2 = p.h2 || 30;
      ({ A, Imin } = unionProps([[0, 0, b1, h1], [0, 0, b2, h2]])); break;
    }
    case 'T': {
      const ba = p.ba || 20, ha = p.ha || 40, bs = p.bs || 60, hs = p.hs || 10;
      ({ A, Imin } = unionProps([[-ba / 2, 0, ba / 2, ha], [-bs / 2, ha, bs / 2, ha + hs]])); break;
    }
    case 'croix': {
      const b1 = p.b1 || 30, h1 = p.h1 || 30, b2 = p.b2 || 30, h2 = p.h2 || 30;
      ({ A, Imin } = unionProps([[-b1 / 2, -h1 / 2, b1 / 2, h1 / 2], [-b2 / 2, -h2 / 2, b2 / 2, h2 / 2]])); break;
    }
  }
  if (['L', 'T', 'croix'].includes(g.shape) && A > 0) {
    // même contour que le calcul de section (formes dégénérées incluses)
    const poly = analysisPolygon(g.shape, g.params);
    A = poly.A / 100; Imin = Math.min(poly.Ih, poly.Ib) / 1e4;
  }
  const i_min = A > 0 ? Math.sqrt(Imin / A) : 0;
  supported = A > 0; // toutes les formes sont désormais calculées (modèle polygonal)
  return { A, Imin, i_min, supported };
}

// ---------------------------------------------------------------------------
// Fluage (annexe B), longueur efficace (§5.8.3.2), imperfections (§5.2)
// ---------------------------------------------------------------------------

/** Coefficient de fluage φ(∞, t0) selon l'annexe B (h0 en mm, t0 en jours). */
/** Coefficient de fluage φ(∞, t0), annexe B — bibliothèque @sel/eurocodes. */
export function creepCoefficient(fck: number, RH: number, h0: number, t0: number, cement: 'S' | 'N' | 'R' = 'N', Tmean = 20): number {
  return coefficientFluage(fck, RH, h0, t0, cement, Tmean);
}

/** Longueur efficace l0 (m) et description de la méthode. */
export function effectiveLength(g: Geometry): { l0: number; method: string } {
  const braced = g.braced !== false;
  if (g.lengthMode === 'k') {
    const k1 = Math.max(0.1, g.k1 ?? 0.1), k2 = Math.max(0.1, g.k2 ?? 0.1);
    if (braced) {
      const f = 0.5 * Math.sqrt((1 + k1 / (0.45 + k1)) * (1 + k2 / (0.45 + k2)));
      return { l0: f * g.L, method: `Contreventé, éq. 5.15 (k1 = ${k1.toFixed(2)}, k2 = ${k2.toFixed(2)}) : l0 = ${f.toFixed(3)}·l` };
    }
    const f = Math.max(Math.sqrt(1 + 10 * k1 * k2 / (k1 + k2)), (1 + k1 / (1 + k1)) * (1 + k2 / (1 + k2)));
    return { l0: f * g.L, method: `Non contreventé, éq. 5.16 (k1 = ${k1.toFixed(2)}, k2 = ${k2.toFixed(2)}) : l0 = ${f.toFixed(3)}·l` };
  }
  return { l0: g.beta * g.L, method: `l0 = β·l avec β = ${g.beta}` };
}

/** Coefficient de réduction αh (§5.2(5)), l = longueur réelle en m. */
export const alphaH = (L: number) => (L > 0 ? Math.min(1, Math.max(2 / 3, 2 / Math.sqrt(L))) : 1);

// ---------------------------------------------------------------------------
// Section armée et diagramme d'interaction
// ---------------------------------------------------------------------------

export interface Bar { u: number; v: number; A: number } // mm, u // h, v // b, repère au centre

export interface RCSection {
  kind: 'rect' | 'circ' | 'poly';
  b: number; h: number; // mm : étendues selon v (b) et u (h)
  dPrime: number;       // mm, distance parement → axe des barres
  bars: Bar[];          // aire unitaire (échelle 1 = armatures fournies)
  layoutNote: string | null;
  // Géométrie générale (repère d'analyse : centre de gravité, axes principaux ; x = v, y = u)
  outline: Pt[];
  ties: Pt[][];          // axes des cadres
  A: number; Ih: number; Ib: number; // mm², mm⁴
  uMin: number; uMax: number; vMin: number; vMax: number;
  tMin: number;          // plus petite épaisseur (mm), pour scl,tmax
  keyBars: number;       // nombre d'angles devant recevoir une barre (§9.5.2(4))
  keyIdx: number[];      // indices des barres d'angle (tenues par les cadres)
  rotation: number;      // rad, analyse = R(rotation)·dessin
  centroid: Pt;          // centre de gravité (repère de dessin, mm)
  label: string;
}

function extents(p: Pt[]) {
  return { vMin: Math.min(...p.map(q => q[0])), vMax: Math.max(...p.map(q => q[0])), uMin: Math.min(...p.map(q => q[1])), uMax: Math.max(...p.map(q => q[1])) };
}

export function buildSection(g: Geometry, rebar: Rebar, cNom: number): RCSection | null {
  const aBar = Math.PI * rebar.phiL ** 2 / 4;
  const dPrime = cNom + rebar.phiW + rebar.phiL / 2;
  const cTie = cNom + rebar.phiW / 2;
  const poly = analysisPolygon(g.shape, g.params);
  if (!(poly.A > 0)) return null;
  const common = { outline: poly.outline, A: poly.A, Ih: poly.Ih, Ib: poly.Ib, rotation: poly.rotation, centroid: poly.centroid, label: poly.label, ...extents(poly.outline) };
  if (g.shape === 'rect') {
    const b = (g.params.b || 0) * 10, h = (g.params.h || 0) * 10;
    // repère historique : h selon u, b selon v (sans rotation)
    const outline: Pt[] = [[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, h / 2], [-b / 2, h / 2]];
    const base = { ...common, outline, rotation: 0, centroid: [0, 0] as Pt, A: b * h, Ih: b * h ** 3 / 12, Ib: h * b ** 3 / 12,
      uMin: -h / 2, uMax: h / 2, vMin: -b / 2, vMax: b / 2, tMin: Math.min(b, h), keyBars: 4, ties: [insetPolygon(outline, cTie)] };
    let layoutNote: string | null = null;
    let n = Math.floor(rebar.nBars);
    if (n < 4) return { kind: 'rect', b, h, dPrime, bars: [], layoutNote: 'Moins de 4 barres : section non armée au sens de l\'EC2.', keyIdx: [], ...base };
    if (n % 2 === 1) {
      layoutNote = `Nombre de barres impair : le calcul de résistance retient ${n - 1} barres disposées symétriquement.`;
      n -= 1;
    }
    const uc = h / 2 - dPrime, vc = b / 2 - dPrime;
    let kb = 0, kh = 0; // barres intermédiaires par face de longueur b / par face de longueur h
    for (let i = 0; i < (n - 4) / 2; i++) {
      const sb = (2 * vc) / (kb + 1), sh = (2 * uc) / (kh + 1);
      if (sh > sb) kh++; else kb++;
    }
    const bars: Bar[] = [];
    for (const su of [-1, 1]) for (const sv of [-1, 1]) bars.push({ u: su * uc, v: sv * vc, A: aBar });
    for (let k = 1; k <= kb; k++) { // faces de longueur b (u = ±uc)
      const v = -vc + (2 * vc * k) / (kb + 1);
      bars.push({ u: uc, v, A: aBar }, { u: -uc, v, A: aBar });
    }
    for (let k = 1; k <= kh; k++) { // faces de longueur h (v = ±vc)
      const u = -uc + (2 * uc * k) / (kh + 1);
      bars.push({ u, v: vc, A: aBar }, { u, v: -vc, A: aBar });
    }
    return { kind: 'rect', b, h, dPrime, bars, layoutNote, keyIdx: [0, 1, 2, 3], ...base };
  }
  if (g.shape === 'circ') {
    const D = (g.params.d || 0) * 10;
    const n = Math.floor(rebar.nBars);
    const rs = D / 2 - dPrime;
    const bars: Bar[] = [];
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      bars.push({ u: rs * Math.cos(t), v: rs * Math.sin(t), A: aBar });
    }
    const R = D / 2, nt = 96;
    const tie: Pt[] = Array.from({ length: nt }, (_, i) => [(R - cTie) * Math.cos(2 * Math.PI * i / nt), (R - cTie) * Math.sin(2 * Math.PI * i / nt)]);
    return { kind: 'circ', b: D, h: D, dPrime, bars, ...common, rotation: 0, centroid: [0, 0], A: Math.PI * R * R, Ih: Math.PI * D ** 4 / 64, Ib: Math.PI * D ** 4 / 64,
      uMin: -R, uMax: R, vMin: -R, vMax: R, tMin: D, keyBars: 0, keyIdx: [], ties: [tie],
      layoutNote: n < 4 ? 'Moins de 4 barres en section circulaire (EC2 §9.5.2(4)).' : null };
  }
  // Formes polygonales générales
  const ex = extents(poly.outline);
  const inset = insetPolygon(poly.outline, dPrime);
  const n = Math.floor(rebar.nBars);
  const lay = layoutBars(inset, n);
  const bars: Bar[] = lay.pts.map(q => ({ u: q[1], v: q[0], A: aBar }));
  const p = g.params;
  const tMin = g.shape === 'hex' ? Math.sqrt(3) * (p.a || 20) * 10
    : g.shape === 'demi' || g.shape === 'quart' ? (p.r || 30) * 10
    : g.shape === 'T' ? Math.min(p.ba || 20, p.hs || 10) * 10
    : Math.min(...[p.b1 || 30, p.h1 || 30, p.b2 || 30, p.h2 || 30]) * 10;
  // Cadres : un cadre par rectangle composant (L, T, croix), sinon un cadre périphérique
  const ties = (g.shape === 'L' || g.shape === 'T' || g.shape === 'croix') && poly.parts.length > 1
    ? poly.parts.map(pt => insetPolygon(pt, cTie)) : [insetPolygon(poly.outline, cTie)];
  return {
    kind: 'poly', b: ex.vMax - ex.vMin, h: ex.uMax - ex.uMin, dPrime, bars, ...common, ...ex, tMin,
    keyBars: lay.key, keyIdx: lay.keyIdx, ties,
    layoutNote: n < lay.key ? `Moins de barres (${n}) que d'angles (${lay.key}) : une barre est requise dans chaque angle (§9.5.2(4)).` : null,
  };
}

export type Dir = 'h' | 'b';

interface StripModel { H: number; tc: number; width: (t: number) => number; bars: { t: number; A: number }[] }

const WIDTH_CACHE = new WeakMap<RCSection, Map<string, number[]>>();
/** Largeurs de la section échantillonnées (2 000 intervalles) le long de la direction de flexion. */
function widthTable(sec: RCSection, onU: boolean, side: 1 | -1, top: number, H: number): number[] {
  let m = WIDTH_CACHE.get(sec);
  if (!m) { m = new Map(); WIDTH_CACHE.set(sec, m); }
  const key = `${onU ? 'u' : 'v'}${side}`;
  let tab = m.get(key);
  if (!tab) {
    const n = 2000;
    tab = Array.from({ length: n + 1 }, (_, i) => {
      const t = Math.min(H * (1 - 1e-9), Math.max(H * 1e-9, H * i / n));
      return chord(sec.outline, side === 1 ? top - t : top + t, onU ? 'y' : 'x');
    });
    m.set(key, tab);
  }
  return tab;
}

/** Modèle en tranches : t = profondeur depuis la fibre la plus comprimée ; tc = profondeur du centre de gravité.
 *  side = −1 : fibre comprimée du côté opposé (sections non symétriques). */
function stripModel(sec: RCSection, dir: Dir, scale: number, rot = 0, side: 1 | -1 = 1): StripModel {
  if (sec.kind === 'poly') {
    const onU = dir === 'h';
    const lo = onU ? sec.uMin : sec.vMin, hi = onU ? sec.uMax : sec.vMax;
    const top = side === 1 ? hi : lo;
    const coord = (c: number) => side === 1 ? top - c : c - top; // profondeur t
    const H = hi - lo;
    const table = widthTable(sec, onU, side, top, H);
    const nT = table.length - 1;
    return {
      H, tc: side === 1 ? hi : -lo,
      width: t => { // interpolation linéaire dans la table précalculée (largeur linéaire par morceaux)
        const u = Math.min(nT, Math.max(0, t / H * nT)); const i = Math.min(nT - 1, Math.floor(u));
        return table[i] + (table[i + 1] - table[i]) * (u - i);
      },
      bars: sec.bars.map(bar => ({ t: coord(onU ? bar.u : bar.v), A: bar.A * scale })),
    };
  }
  if (sec.kind === 'circ') {
    const R = sec.h / 2;
    return {
      H: sec.h, tc: R,
      width: t => 2 * Math.sqrt(Math.max(0, R * R - (t - R) ** 2)),
      bars: sec.bars.map(bar => {
        const u = bar.u * Math.cos(rot) - bar.v * Math.sin(rot);
        return { t: R - u, A: bar.A * scale };
      }),
    };
  }
  if (dir === 'h') {
    return { H: sec.h, tc: sec.h / 2, width: () => sec.b, bars: sec.bars.map(bar => ({ t: sec.h / 2 - bar.u, A: bar.A * scale })) };
  }
  return { H: sec.b, tc: sec.b / 2, width: () => sec.h, bars: sec.bars.map(bar => ({ t: sec.b / 2 - bar.v, A: bar.A * scale })) };
}

function sigmaC(eps: number, mp: MaterialProps): number {
  if (eps <= 0) return 0;
  if (eps >= mp.epsC2) return mp.fcd;
  return mp.fcd * (1 - Math.pow(1 - eps / mp.epsC2, mp.nPar));
}

function sigmaS(eps: number, mp: MaterialProps): number {
  // Branche supérieure horizontale (EC2 §3.2.7(2) b) — pas de limite εud
  return Math.max(-mp.fyd, Math.min(mp.fyd, ES * eps));
}

/** Efforts résistants (N, M au centre de gravité de la section brute) pour un axe neutre x (mm, x > 0). */
function internalForces(m: StripModel, x: number, mp: MaterialProps): { N: number; M: number } {
  const { H, tc } = m;
  const tC = (1 - mp.epsC2 / mp.epsCu2) * H;
  const strain = x <= H
    ? (t: number) => mp.epsCu2 * (x - t) / x
    : (t: number) => mp.epsC2 * (x - t) / (x - tC);
  const depth = Math.min(x, H);
  const nS = 120;
  const dt = depth / nS;
  let N = 0, M = 0;
  for (let i = 0; i < nS; i++) {
    const t = (i + 0.5) * dt;
    const f = sigmaC(strain(t), mp) * m.width(t) * dt;
    N += f; M += f * (tc - t);
  }
  for (const bar of m.bars) {
    const e = strain(bar.t);
    const s = sigmaS(e, mp) - sigmaC(e, mp); // béton déplacé déduit
    N += s * bar.A; M += s * bar.A * (tc - bar.t);
  }
  return { N, M };
}

/** Moment résistant (N·mm) pour un effort normal NEd (N, compression > 0). null si NEd hors domaine. */
export function momentResistance(sec: RCSection, dir: Dir, NEd: number, scale: number, mp: MaterialProps): number | null {
  const rots = sec.kind === 'circ' && sec.bars.length > 0 ? [0, Math.PI / sec.bars.length] : [0];
  const sides: (1 | -1)[] = sec.kind === 'poly' ? [1, -1] : [1]; // sens du moment inconnu : on retient le plus faible
  let best: number | null = Infinity;
  for (const rot of rots) for (const side of sides) {
    const m = stripModel(sec, dir, scale, rot, side);
    let lo = Math.log(1e-4 * m.H), hi = Math.log(1e4 * m.H);
    const Nlo = internalForces(m, Math.exp(lo), mp).N;
    const Nhi = internalForces(m, Math.exp(hi), mp).N;
    if (NEd < Nlo || NEd > Nhi) return null;
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (internalForces(m, Math.exp(mid), mp).N < NEd) lo = mid; else hi = mid;
    }
    const M = Math.abs(internalForces(m, Math.exp((lo + hi) / 2), mp).M);
    best = Math.min(best as number, M);
  }
  return best;
}

/** Diagramme d'interaction N-M (kN, kNm) : points du domaine résistant, de la traction pure à la compression pure.
 *  Pour une section dissymétrique (poly), les deux sens de moment sont renvoyés (M négatif pour side = −1). */
export function interactionDiagram(sec: RCSection, dir: Dir, mp: MaterialProps, scale = 1): { N: number; M: number }[] {
  const sides: (1 | -1)[] = sec.kind === 'poly' ? [1, -1] : [1];
  const out: { N: number; M: number }[] = [];
  for (const side of sides) {
    const m = stripModel(sec, dir, scale, 0, side);
    const pts: { N: number; M: number }[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = Math.exp(Math.log(1e-4 * m.H) + (Math.log(1e4 * m.H) - Math.log(1e-4 * m.H)) * i / 120);
      const r = internalForces(m, x, mp);
      pts.push({ N: r.N / 1000, M: side * Math.abs(r.M) / 1e6 });
    }
    out.push(...(side === 1 ? pts : pts.reverse()));
  }
  return out;
}

/** Effort normal résistant en compression centrée (N), avec εc2 uniforme. */
export function axialResistance(sec: RCSection, scale: number, mp: MaterialProps): number {
  const m = stripModel(sec, 'h', scale);
  return internalForces(m, 1e6 * m.H, mp).N;
}

// ---------------------------------------------------------------------------
// Analyse d'une direction (second ordre §5.8.8)
// ---------------------------------------------------------------------------

export interface DirectionResult {
  dir: Dir;
  label: string;
  H: number;          // mm, dimension dans le plan de flexion
  lambda: number; lambdaLim: number;
  coefA: number; coefB: number; coefC: number; n: number; omega: number;
  isSecondOrder: boolean;
  d: number;          // mm, d = h/2 + is
  r0_inv: number;     // 1/m
  Kr: number; Kphi: number; curvature: number; // 1/m
  e0: number; ei: number; e2: number; emin: number; etot: number; // mm
  M0: number; M0Ed: number; M2: number; MEd: number; // kNm
  M01: number; M02: number; M0e: number;              // kNm (imperfection incluse)
  rm: number; phiEf: number; phiEfNote: string | null; c: number;
  MEd_curv: number; MEd_rig: number;  // kNm, MEd selon chaque méthode (avant choix)
  EI: number; NB: number;             // kN·m², kN (rigidité nominale)
  method: 'courbure' | 'rigidite';
  MRd: number | null; // kNm
  util: number;
}

interface Ctx {
  sec: RCSection; mp: MaterialProps; mat: Materials; geom: Geometry;
  Ac: number; l0: number; NEd: number; // mm², mm, N
  Mh: MomentSpec; Mb: MomentSpec;       // N·mm
  allowSecondOrder: boolean;
  braced: boolean; transverse: boolean;
  alphaH: number;                       // §5.2(5)
  phiInf: number | null;                // φ(∞,t0) si calculé
  qpRatio: number;                      // M0Eqp / M0Ed
}

function radiusOfGyrationSteel(m: StripModel): number {
  const As = m.bars.reduce((s, b) => s + b.A, 0);
  if (As <= 0) return 0;
  return Math.sqrt(m.bars.reduce((s, b) => s + b.A * (b.t - m.tc) ** 2, 0) / As);
}

function analyseDirection(ctx: Ctx, dir: Dir, scale: number, spec: MomentSpec, withImperfection = true, withEmin = true): DirectionResult {
  const { sec, mp, mat, geom, Ac, l0, NEd } = ctx;
  const m = stripModel(sec, dir, scale);
  const H = m.H;
  const As = m.bars.reduce((s, b) => s + b.A, 0);
  const i = Math.sqrt((dir === 'h' ? sec.Ih : sec.Ib) / sec.A);
  const lambda = l0 / i;
  const n = NEd / (Ac * mp.fcd);
  const omega = As * mp.fyd / (Ac * mp.fcd);
  const Nc = Math.max(0, NEd);

  // Imperfection géométrique : ei = θi·l0/2, θi = αh/200 (αm = 1, élément isolé)
  const eiFull = ctx.alphaH / 200 * l0 / 2;
  const ei = withImperfection ? eiFull : 0;

  // Moments d'extrémité du premier ordre (§5.8.8.2) — l'imperfection s'ajoute dans le sens de M02
  const Mbig = Math.max(Math.abs(spec.top), Math.abs(spec.bot));
  const Msmall = Math.min(Math.abs(spec.top), Math.abs(spec.bot));
  const sgn = spec.curvature === 'double' ? -1 : 1;
  const M02 = Mbig + Nc * ei;
  const M01 = sgn * Msmall + Nc * ei;
  const imperfDominant = Mbig <= Nc * eiFull;
  const rm = (!ctx.braced || ctx.transverse || imperfDominant || M02 <= 0) ? 1 : M01 / M02;
  const coefC = 1.7 - rm;

  // Fluage effectif (§5.8.4)
  let phiEf: number, phiEfNote: string | null = null;
  if (ctx.phiInf !== null) {
    phiEf = ctx.phiInf * ctx.qpRatio;
    if (ctx.phiInf <= 2 && lambda <= 75 && Nc > 0 && M02 / Nc >= H) {
      phiEf = 0; phiEfNote = '§5.8.4(4) : φ(∞,t0) ≤ 2, λ ≤ 75 et M0Ed/NEd ≥ h → φef = 0';
    }
  } else phiEf = geom.phi_ef ?? 0;
  const coefA = 1 / (1 + 0.2 * phiEf);
  const coefB = Math.sqrt(1 + 2 * omega);
  const lambdaLim = n > 0 ? 20 * coefA * coefB * coefC / Math.sqrt(n) : Infinity;
  const isSecondOrder = ctx.allowSecondOrder && NEd > 0 && lambda > lambdaLim;

  const is = radiusOfGyrationSteel(m);
  const d = H / 2 + is;
  const epsYd = mp.fyd / ES;
  const r0_inv = d > 0 ? epsYd / (0.45 * d / 1000) : 0; // 1/m
  const nu = 1 + omega;
  const Kr = Math.min(1, Math.max(0, (nu - n) / (nu - 0.4)));
  const beta = 0.35 + mat.fck / 200 - lambda / 150;
  const Kphi = Math.max(1, 1 + beta * phiEf);
  const curvature = isSecondOrder ? Kr * Kphi * r0_inv : 0;
  // c = 8 si le moment du premier ordre est constant (§5.8.8.2(4)), sinon 10
  const constantMoment = spec.curvature === 'simple' && Mbig > 0 && Msmall >= 0.99 * Mbig && !imperfDominant;
  const c = constantMoment ? 8 : 10;
  const e2 = curvature * (l0 / 1000) ** 2 / c * 1000; // mm

  const M2c = Nc * e2;
  // (5.32) M0e réservé aux éléments sans charge transversale ; sinon le moment maximal (saisi en M02) est retenu
  const M0e = ctx.transverse ? M02 : Math.max(0.6 * M02 + 0.4 * M01, 0.4 * M02);
  const MEdCurv = isSecondOrder ? Math.max(M02, M0e + M2c, M01 + 0.5 * M2c) : M02;

  // Rigidité nominale (§5.8.7)
  const Ecd = mp.Ecm / 1.2;
  const Ic = dir === 'h' ? sec.Ih : sec.Ib;
  const Is = m.bars.reduce((acc, b) => acc + b.A * (b.t - m.tc) ** 2, 0);
  const k1s = Math.sqrt(mat.fck / 20), k2s = Math.min(0.2, Math.max(0, n) * lambda / 170);
  const Kc = k1s * k2s / (1 + phiEf);
  const EI = Kc * Ecd * Ic + ES * Is; // N·mm²
  const NB = Math.PI ** 2 * EI / (l0 * l0);
  const betaEI = (imperfDominant || ctx.transverse) ? 1 : Math.PI ** 2 / 8;
  const MEdRig = !isSecondOrder ? M02 : (Nc >= NB ? Infinity : Math.max(M02, M0e * (1 + betaEI / (NB / Nc - 1))));

  const method = geom.secondOrderMethod === 'rigidite' ? 'rigidite' : 'courbure';
  let MEd = method === 'rigidite' ? MEdRig : MEdCurv;
  const M2 = method === 'rigidite' ? (isSecondOrder && isFinite(MEdRig) ? Math.max(0, MEdRig - Math.max(M02, M0e)) : (isFinite(MEdRig) ? 0 : Infinity)) : M2c;
  const emin = Math.max(H / 30, 20);
  if (withEmin) MEd = Math.max(MEd, Nc * emin);
  const e0 = Nc > 0 ? Mbig / Nc : 0;
  const etot = Nc > 0 ? MEd / Nc : 0;

  const MRd = momentResistance(sec, dir, NEd, scale, mp);
  const util = MRd === null ? Infinity : (MRd > 0 ? MEd / MRd : (MEd > 0 ? Infinity : 0));

  const label = sec.kind === 'circ' ? 'Section circulaire'
    : sec.kind === 'poly' ? (dir === 'h' ? 'Plan principal I (fort)' : 'Plan principal II (faible)')
    : (dir === 'h' ? 'Flexion dans le plan de h' : 'Flexion dans le plan de b');
  return {
    dir, label, H, lambda, lambdaLim, coefA, coefB, coefC, n, omega, isSecondOrder,
    d, r0_inv, Kr, Kphi, curvature, e0, ei, e2, emin, etot,
    M0: Mbig / 1e6, M0Ed: M02 / 1e6, M2: M2 / 1e6, MEd: MEd / 1e6,
    M01: M01 / 1e6, M02: M02 / 1e6, M0e: M0e / 1e6, rm, phiEf, phiEfNote, c,
    MEd_curv: Math.max(MEdCurv, withEmin ? Nc * emin : 0) / 1e6, MEd_rig: Math.max(MEdRig, withEmin ? Nc * emin : 0) / 1e6,
    EI: EI / 1e9, NB: NB / 1000, method,
    MRd: MRd === null ? null : MRd / 1e6, util,
  };
}

export interface BiaxialResult {
  required: boolean;
  reason: string;
  a: number; NRd: number; // kN
  value: number;          // ≤ 1
}

interface Evaluation { dirs: DirectionResult[]; biaxial: BiaxialResult | null; util: number }

function evaluate(ctx: Ctx, scale: number): Evaluation {
  const { sec, NEd, mp, Ac } = ctx;
  if (sec.kind === 'circ') {
    const spec: MomentSpec = {
      top: Math.hypot(ctx.Mh.top, ctx.Mb.top), bot: Math.hypot(ctx.Mh.bot, ctx.Mb.bot), curvature: ctx.Mh.curvature,
    };
    const r = analyseDirection(ctx, 'h', scale, spec);
    return { dirs: [r], biaxial: null, util: r.util };
  }
  const rh = analyseDirection(ctx, 'h', scale, ctx.Mh);
  const rb = analyseDirection(ctx, 'b', scale, ctx.Mb);
  let util = Math.max(rh.util, rb.util);

  // §5.8.9 — flexion déviée
  let biaxial: BiaxialResult | null = null;
  if (NEd > 0 && rh.MRd && rb.MRd) {
    const lamOk = rh.lambda / rb.lambda <= 2 && rb.lambda / rh.lambda <= 2;
    let worst: BiaxialResult | null = null;
    // Imperfection prise dans une seule direction (la plus défavorable)
    for (const impInH of [true, false]) {
      const Mh = analyseDirection(ctx, 'h', scale, ctx.Mh, impInH, false);
      const Mb = analyseDirection(ctx, 'b', scale, ctx.Mb, !impInH, false);
      const heq = Math.sqrt(12 * sec.Ih / sec.A), beq = Math.sqrt(12 * sec.Ib / sec.A); // §5.8.9(3)
      const eh = Mh.MEd * 1e6 / NEd / heq; // e/heq
      const eb = Mb.MEd * 1e6 / NEd / beq;
      const ratio = eh > 0 ? eb / eh : Infinity;
      const eccOk = ratio <= 0.2 || ratio >= 5;
      const As = sec.bars.reduce((s, b) => s + b.A, 0) * scale;
      const NRd = Ac * mp.fcd + As * mp.fyd;
      const nr = NEd / NRd;
      const a = nr <= 0.1 ? 1.0 : nr <= 0.7 ? 1.0 + (nr - 0.1) / 0.6 * 0.5 : nr <= 1.0 ? 1.5 + (nr - 0.7) / 0.3 * 0.5 : 2.0;
      const value = Math.pow(Mh.MEd / rh.MRd, a) + Math.pow(Mb.MEd / rb.MRd, a);
      const required = !(lamOk && eccOk);
      const reason = required
        ? (!lamOk ? 'Rapport des élancements > 2 (5.38a)' : 'Excentricités relatives comparables (5.38b)')
        : 'Critères (5.38a) et (5.38b) satisfaits : vérifications séparées suffisantes';
      const res: BiaxialResult = { required, reason, a, NRd: NRd / 1000, value: required ? value : 0 };
      if (!worst || (res.required && (!worst.required || res.value > worst.value))) worst = res;
    }
    biaxial = worst;
    if (biaxial && biaxial.required) util = Math.max(util, biaxial.value);
  }
  return { dirs: [rh, rb], biaxial, util };
}

// ---------------------------------------------------------------------------
// Vérifications de dispositions constructives
// ---------------------------------------------------------------------------

export interface Check { label: string; value: string; limit: string; ok: boolean; ref: string; blocking: boolean }

/** Espacement libre minimal entre barres et distance max d'une barre intermédiaire à une barre d'angle (mm). */
function barSpacing(sec: RCSection, phiL: number): { minClear: number; maxFromRestrained: number } {
  let minClear = Infinity, maxFromRestrained = 0;
  if (sec.kind === 'rect' && sec.bars.length >= 4) {
    const byFace = (key: 'u' | 'v', val: number, other: 'u' | 'v') =>
      sec.bars.filter(b => Math.abs(b[key] - val) < 1e-6).map(b => b[other]).sort((a, c) => a - c);
    const uc = sec.h / 2 - sec.dPrime, vc = sec.b / 2 - sec.dPrime;
    for (const face of [byFace('u', uc, 'v'), byFace('u', -uc, 'v'), byFace('v', vc, 'u'), byFace('v', -vc, 'u')]) {
      for (let k = 1; k < face.length; k++) minClear = Math.min(minClear, face[k] - face[k - 1] - phiL);
      const ends = [face[0], face[face.length - 1]];
      for (const x of face.slice(1, -1)) maxFromRestrained = Math.max(maxFromRestrained, Math.min(x - ends[0], ends[1] - x));
    }
  } else if (sec.kind === 'circ' && sec.bars.length >= 2) {
    const rs = sec.h / 2 - sec.dPrime;
    minClear = 2 * rs * Math.sin(Math.PI / sec.bars.length) - phiL;
  } else if (sec.kind === 'poly' && sec.bars.length >= 2) {
    const n = sec.bars.length;
    const dist = (i: number, j: number) => Math.hypot(sec.bars[i].u - sec.bars[j].u, sec.bars[i].v - sec.bars[j].v);
    for (let i = 0; i < n; i++) minClear = Math.min(minClear, dist(i, (i + 1) % n) - phiL);
    // distance (le long du contour) de chaque barre intermédiaire à la barre d'angle la plus proche
    if (sec.keyIdx.length > 0) for (let i = 0; i < n; i++) {
      if (sec.keyIdx.includes(i)) continue;
      let best = Infinity;
      for (const dirn of [1, -1]) {
        let acc = 0, j = i;
        for (let k = 0; k < n; k++) { const nx = (j + dirn + n) % n; acc += dist(j, nx); j = nx; if (sec.keyIdx.includes(j)) break; }
        best = Math.min(best, acc);
      }
      maxFromRestrained = Math.max(maxFromRestrained, best);
    }
  }
  return { minClear, maxFromRestrained };
}

export interface AnchorageResult {
  state: 'compression' | 'traction';
  eta1: number; eta2: number; fbd: number;    // MPa
  lb_rqd: number; lbd: number; lb_min: number; // mm
  alpha2: number; alpha6: number;
  l0: number; l0_min: number;                  // mm
  cd: number | null;                           // mm
}

/** Longueurs d'ancrage (§8.4) et de recouvrement (§8.7.3) pour des barres droites. */
export function anchorage(mp: MaterialProps, fck: number, rebar: Rebar, state: 'compression' | 'traction', cd: number | null): AnchorageResult {
  const phi = rebar.phiL;
  const eta1 = rebar.bond === 'mediocre' ? 0.7 : 1.0;
  const eta2 = phi <= 32 ? 1.0 : (132 - phi) / 100;
  const fbd = fbdEC(fck, mp.gammaC, phi, rebar.bond !== 'mediocre'); // éq. 8.2, fctd limité à C60/75 (@sel/eurocodes)
  const lb_rqd = phi / 4 * mp.fyd / fbd; // σsd = fyd (enveloppe)
  let alpha2 = 1;
  if (state === 'traction' && cd !== null) alpha2 = Math.min(1, Math.max(0.7, 1 - 0.15 * (cd - phi) / phi));
  const prod = Math.max(0.7, alpha2); // α1 = α3 = α5 = 1 (barres droites, sans confinement pris en compte)
  const lb_min = state === 'traction' ? Math.max(0.3 * lb_rqd, 10 * phi, 100) : Math.max(0.6 * lb_rqd, 10 * phi, 100);
  const lbd = Math.max(prod * lb_rqd, lb_min);
  const p = Math.max(0, Math.min(100, rebar.lapPercent ?? 100));
  const alpha6 = Math.min(1.5, Math.max(1, Math.sqrt(p / 25)));
  const l0_min = Math.max(0.3 * alpha6 * lb_rqd, 15 * phi, 200);
  const l0 = Math.max(prod * alpha6 * lb_rqd, l0_min);
  return { state, eta1, eta2, fbd, lb_rqd, lbd, lb_min, alpha2, alpha6, l0, l0_min, cd };
}

export interface TieSpacing {
  sCurrentMax: number; // scl,tmax (mm)
  sEnd: number;        // espacement en zones d'about (mm)
  sLap: number;        // espacement dans les recouvrements (mm)
  endZone: number;     // longueur de chaque zone d'about (mm)
  AstLapReq: number;   // ΣAst requis sur le recouvrement (mm²), 0 si non requis
}

function tieSpacing(sec: RCSection, rebar: Rebar, anch: AnchorageResult | null): TieSpacing {
  const scl = Math.min(20 * rebar.phiL, sec.tMin, 400);
  const s = rebar.spacing > 0 ? rebar.spacing : scl;
  const sEnd = Math.min(s, 0.6 * scl);
  let sLap = s, AstLapReq = 0;
  if (anch) {
    if (rebar.phiL > 14) sLap = Math.min(sLap, 0.6 * scl, anch.l0 / 2); // §9.5.3(4) : ≥ 3 barres sur l0
    if (rebar.phiL >= 20) { // §8.7.4.1(3) : ΣAst ≥ As d'une barre recouverte
      AstLapReq = Math.PI * rebar.phiL ** 2 / 4;
      const aw = Math.PI * rebar.phiW ** 2 / 4;
      const nReq = Math.ceil(AstLapReq / aw);
      if (nReq > 1) sLap = Math.min(sLap, anch.l0 / (nReq - 1));
    }
  }
  return { sCurrentMax: scl, sEnd, sLap, endZone: Math.max(sec.b, sec.h), AstLapReq };
}

function detailingChecks(sec: RCSection | null, g: Geometry, rebar: Rebar, As_prov: number, Ac_cm2: number, As_min: number, As_max: number,
  anch: AnchorageResult | null, ties: TieSpacing | null): Check[] {
  const checks: Check[] = [];
  const rho = Ac_cm2 > 0 ? As_prov / Ac_cm2 * 100 : 0;
  checks.push({ label: 'Section minimale As,min', value: `${As_prov.toFixed(2)} cm²`, limit: `≥ ${As_min.toFixed(2)} cm²`, ok: As_prov >= As_min - 1e-9, ref: '§9.5.2(2)', blocking: true });
  checks.push({ label: 'Section maximale As,max (hors recouvrement)', value: `${rho.toFixed(2)} %`, limit: '≤ 4 %', ok: As_prov <= As_max + 1e-9, ref: '§9.5.2(3)', blocking: true });
  checks.push({ label: 'Diamètre longitudinal', value: `Φ${rebar.phiL}`, limit: '≥ Φ8', ok: rebar.phiL >= 8, ref: '§9.5.2(1)', blocking: true });
  const nMin = sec ? (sec.kind === 'poly' ? Math.max(4, sec.keyBars) : 4) : 4;
  checks.push({ label: sec?.kind === 'poly' ? 'Nombre de barres (une par angle)' : 'Nombre de barres', value: `${rebar.nBars}`, limit: `≥ ${nMin}`, ok: rebar.nBars >= nMin, ref: '§9.5.2(4)', blocking: true });
  const phiWmin = Math.max(6, rebar.phiL / 4);
  checks.push({ label: 'Diamètre des cadres', value: `Φ${rebar.phiW}`, limit: `≥ ${phiWmin.toFixed(0)} mm`, ok: rebar.phiW >= phiWmin, ref: '§9.5.3(1)', blocking: true });
  if (sec) {
    const minDim = sec.tMin;
    const scl = Math.min(20 * rebar.phiL, minDim, 400);
    checks.push({ label: 'Espacement courant des cadres', value: `${rebar.spacing} mm`, limit: `≤ ${scl.toFixed(0)} mm`, ok: rebar.spacing > 0 && rebar.spacing <= scl, ref: '§9.5.3(3)', blocking: true });
    if (ties) checks.push({ label: 'Cadres en zones d\'about', value: `s = ${ties.sEnd.toFixed(0)} mm`, limit: `sur ${ties.endZone.toFixed(0)} mm en tête et en pied`, ok: true, ref: '§9.5.3(4)', blocking: false });
    const { minClear, maxFromRestrained } = barSpacing(sec, rebar.phiL);
    if (isFinite(minClear)) {
      const lim = Math.max(rebar.phiL, 20 + 5, 20);
      checks.push({ label: 'Espacement libre entre barres', value: `${minClear.toFixed(0)} mm`, limit: `≥ ${lim} mm (dg = 20 mm)`, ok: minClear >= lim, ref: '§8.2(2)', blocking: true });
    }
    if (anch && rebar.numLaps > 0) {
      const p = Math.max(0, Math.min(100, rebar.lapPercent ?? 100)) / 100;
      const rhoLap = Ac_cm2 > 0 ? As_prov * (1 + p) / Ac_cm2 * 100 : 0;
      checks.push({ label: 'Section d\'acier dans les recouvrements', value: `${rhoLap.toFixed(2)} %`, limit: '≤ 8 %', ok: rhoLap <= 8 + 1e-9, ref: '§9.5.2(3)', blocking: true });
      if (ties && rebar.phiL > 14) checks.push({ label: 'Cadres dans les recouvrements', value: `s = ${ties.sLap.toFixed(0)} mm`, limit: `≥ 3 cadres sur l0 = ${anch.l0.toFixed(0)} mm`, ok: true, ref: '§9.5.3(4)', blocking: false });
      if (ties && ties.AstLapReq > 0) checks.push({ label: 'Armatures transversales de recouvrement', value: `ΣAst ≥ ${ties.AstLapReq.toFixed(0)} mm²`, limit: `obtenu avec s = ${ties.sLap.toFixed(0)} mm, cadres concentrés aux tiers extrêmes`, ok: true, ref: '§8.7.4.1(3)', blocking: false });
      if (anch.state === 'compression') checks.push({ label: 'Recouvrement de barres comprimées', value: 'un cadre de plus', limit: `au-delà de chaque extrémité, à moins de ${(4 * rebar.phiL).toFixed(0)} mm`, ok: true, ref: '§8.7.4.2(3)', blocking: false });
    }
    if (sec.kind !== 'circ') {
      checks.push({ label: 'Barres intermédiaires tenues', value: maxFromRestrained > 0 ? `${maxFromRestrained.toFixed(0)} mm d'une barre d'angle` : 'aucune', limit: '≤ 150 mm, sinon épingles', ok: maxFromRestrained <= 150, ref: '§9.5.3(6)', blocking: false });
    }
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

export interface ShearDir {
  label: string; VEd: number; bw: number; d: number; rhoL: number; // kN, mm, mm, –
  VRd_c: number; VRd_max: number; TRd_max: number; cot: number;   // kN, kN, kNm
  interaction: number; reinforced: boolean;
  Asw_req: number; Asw_prov: number; ok: boolean;                 // mm²/m (deux brins)
}

export interface ShearResult {
  computed: boolean; note: string;
  VRd_c: number; VRd_max: number; TRd_max: number; TRd_c: number; interactionVT: number;
  Asw_s_req: number; As_l_torsion: number; shearResult: string; torsionResult: string;
  sigma_cp: number; dirs: ShearDir[]; ok: boolean;
}

export interface ELSResult {
  computed: boolean; note: string;
  sigma_c: number;              // sous combinaison quasi-permanente
  sigma_car: number | null;     // sous combinaison caractéristique
  limit045: number; limit06: number | null; ok: boolean;
}

export interface FireResult {
  computed: boolean; valid: boolean; note: string;
  R: number; Rreq: number; ok: boolean;
  etaFi: number; muFi: number; omega: number; a: number; l0fi: number; bprime: number; n: number;
  parts: { Reta: number; Ra: number; Rl: number; Rb: number; Rn: number };
}

export interface RPResult {
  applicable: boolean; note: string;
  lambda: number; alpha: number; kh: number; ks: number; NRd: number; ratio: number;
}

export interface CrackResult {
  computed: boolean; note: string;
  compressed: boolean; x: number; sigma_s: number; srmax: number; deltaEps: number;
  wk: number; wmax: number | null; ok: boolean; required: boolean;
}

export interface LoadSummary {
  NEd: number; Ncar: number; Nqp: number; Npp: number; // kN
  mode: 'direct' | 'GQ';
}

export interface ColumnResult {
  mat: MaterialProps;
  geom: GeomProps & {
    l0: number; l0Method: string; lambda: number; lambdaLim: number; n_ef: number; dynamicA: number; coefB: number;
    alphaH: number; ei: number;            // ei en mm
    phiInf: number | null; h0: number | null; qpRatio: number;
  };
  loads: LoadSummary;
  section: RCSection | null;
  directions: DirectionResult[];
  governing: DirectionResult | null;
  biaxial: BiaxialResult | null;
  NRd_max: number | null; // kN
  util: number;           // taux de travail ELU avec armatures fournies
  As_prov: number; As_min: number; As_min_Ned: number; As_min_Ac: number; As_max: number;
  As_req: number;         // cm², Infinity si section insuffisante même à 8 %
  As_def: number;
  rho: number;
  checks: Check[];
  anchorage: AnchorageResult | null;
  ties: TieSpacing | null;
  shear: ShearResult;
  els: ELSResult;
  fire: FireResult;
  rp: RPResult;
  crack: CrackResult;
  annex: 'EC2' | 'FR';
  warnings: string[];
  errors: string[];       // données invalides : verdict « non vérifié »
  errorFields: string[];  // champs concernés (clé de champ, voir validateInputsDetailed)
  verdictELU: Verdict;
  verdict: Verdict;
}

/** Erreur de saisie rattachée au champ concerné (pour ouvrir le bon panneau de l'interface). */
export interface InputError { field: string; message: string }

/** Champs saisis dans les options avancées de l'interface. */
export const ADVANCED_FIELDS = ['gammaC', 'gammaS', 'alphaCC', 'deltaCdev', 'k1k2', 'RH', 't0', 'Tmean', 'phi_ef', 'lapPercent'];

/** Contrôle de cohérence des données, champ par champ. */
export function validateInputsDetailed(mat: Materials, geom: Geometry, loads: Loads, rebar: Rebar): InputError[] {
  const E: InputError[] = [];
  const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const need = (cond: boolean, field: string, message: string) => { if (!cond) E.push({ field, message }); };
  for (const [k, v] of Object.entries(geom.params)) need(fin(v) && v > 0 && v <= 1000, `param:${k}`, `Dimension ${k} : entre 0 et 10 000 mm.`);
  need(fin(geom.L) && geom.L > 0 && geom.L <= 30, 'L', 'Hauteur du poteau : entre 0 et 30 m.');
  need(fin(geom.beta) && geom.beta > 0 && geom.beta <= 3, 'beta', 'Coefficient β : entre 0 et 3.');
  if (geom.lengthMode === 'k') need(fin(geom.k1) && fin(geom.k2) && (geom.k1 ?? -1) >= 0 && (geom.k2 ?? -1) >= 0, 'k1k2', 'Souplesses k1 et k2 : valeurs positives.');
  need(CONCRETE_CLASSES.some(c => c.fck === mat.fck) || (mat.fck >= 12 && mat.fck <= 90), 'fck', 'Classe de béton : fck entre 12 et 90 MPa (tableau 3.1).');
  need(fin(mat.fyk) && mat.fyk >= 400 && mat.fyk <= 600, 'fyk', 'Acier : fyk entre 400 et 600 MPa (annexe C).');
  need(!mat.gammaC || mat.gammaC >= 1, 'gammaC', 'γc doit être au moins égal à 1.');
  need(!mat.gammaS || mat.gammaS >= 1, 'gammaS', 'γs doit être au moins égal à 1.');
  need(!mat.alphaCC || (mat.alphaCC >= 0.8 && mat.alphaCC <= 1), 'alphaCC', 'αcc : entre 0,8 et 1,0 (§3.1.6).');
  need(fin(mat.deltaCdev) && mat.deltaCdev >= 0 && mat.deltaCdev <= 15, 'deltaCdev', 'Δcdev : entre 0 et 15 mm (§4.4.1.3).');
  need(fin(rebar.nBars) && Number.isInteger(rebar.nBars) && rebar.nBars >= 1 && rebar.nBars <= 200, 'nBars', 'Nombre de barres : entier entre 1 et 200.');
  need(fin(rebar.phiL) && rebar.phiL > 0 && rebar.phiL <= 50, 'phiL', 'Diamètre longitudinal : entre 0 et 50 mm.');
  need(fin(rebar.phiW) && rebar.phiW > 0 && rebar.phiW <= 20, 'phiW', 'Diamètre des cadres : entre 0 et 20 mm.');
  need(fin(rebar.spacing) && rebar.spacing >= 20 && rebar.spacing <= 1000, 'spacing', 'Espacement des cadres : entre 20 et 1 000 mm.');
  need(fin(rebar.numAnchors) && rebar.numAnchors >= 0 && rebar.numAnchors <= 10 && fin(rebar.numLaps) && rebar.numLaps >= 0 && rebar.numLaps <= 10, 'zones', 'Zones d\'ancrage et de recouvrement : entre 0 et 10.');
  if (rebar.lapPercent !== undefined) need(rebar.lapPercent >= 0 && rebar.lapPercent <= 100, 'lapPercent', 'Barres recouvertes : entre 0 et 100 %.');
  if (loads.loadMode === 'GQ') {
    need(fin(loads.NG) && (loads.NG ?? 0) >= 0 && (loads.NG ?? 0) <= 1e6 && fin(loads.NQ) && (loads.NQ ?? 0) >= 0 && (loads.NQ ?? 0) <= 1e6, 'GQ', 'Charges G et Q : entre 0 et 1 000 000 kN.');
    need(!fin(loads.psi2) || ((loads.psi2 ?? 0) >= 0 && (loads.psi2 ?? 0) <= 1), 'psi2', 'ψ2 : entre 0 et 1.');
    need(!fin(loads.psi1) || ((loads.psi1 ?? 0) >= 0 && (loads.psi1 ?? 0) <= 1), 'psi1', 'ψ1 : entre 0 et 1.');
  } else need(fin(loads.NEd) && loads.NEd >= 0 && loads.NEd <= 1e6, 'NEd', 'NEd : entre 0 et 1 000 000 kN (le sens est donné par le type de sollicitation).');
  for (const [k, v] of [['Mh_top', loads.Mh_top], ['Mh_bot', loads.Mh_bot], ['Mb_top', loads.Mb_top], ['Mb_bot', loads.Mb_bot], ['VEd', loads.VEd], ['VEd_b', loads.VEd_b], ['TEd', loads.TEd], ['Mqp_h', loads.Mqp_h]] as const)
    if (v !== undefined) need(fin(v) && Math.abs(v) <= 1e6, k, `${k} : valeur comprise entre −1 000 000 et 1 000 000.`);
  if (geom.phiMode === 'calcule') {
    need(fin(geom.RH) && (geom.RH ?? 0) >= 20 && (geom.RH ?? 0) <= 100, 'RH', 'Humidité relative : entre 20 et 100 % (annexe B).');
    need(fin(geom.t0) && (geom.t0 ?? 0) >= 1, 't0', 'Âge au chargement : au moins 1 jour.');
    if (geom.Tmean !== undefined) need(geom.Tmean >= -20 && geom.Tmean <= 60, 'Tmean', 'Température moyenne : entre −20 et 60 °C.');
  } else need(!fin(geom.phi_ef) || (geom.phi_ef ?? 0) >= 0, 'phi_ef', 'φef : valeur positive ou nulle.');
  return E;
}

/** Contrôle de cohérence des données. Renvoie la liste des erreurs bloquantes. */
export function validateInputs(mat: Materials, geom: Geometry, loads: Loads, rebar: Rebar): string[] {
  return validateInputsDetailed(mat, geom, loads, rebar).map(e => e.message);
}

export function calculerPoteau(mat: Materials, geom: Geometry, loads: Loads, rebar: Rebar, fireIn?: FireInput): ColumnResult {
  const detailed = validateInputsDetailed(mat, geom, loads, rebar);
  const errors = detailed.map(e => e.message);
  if (errors.length) {
    // Données invalides : le calcul se poursuit sur des valeurs ramenées dans des bornes sûres
    // (jamais de blocage de l'interface), et le verdict est « non vérifié ».
    const cl = (v: unknown, lo: number, hi: number, def: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
    geom = { ...geom, L: cl(geom.L, 0.1, 30, 3), beta: cl(geom.beta, 0.1, 3, 1), k1: cl(geom.k1, 0, 1e6, 0.4), k2: cl(geom.k2, 0, 1e6, 0.4),
      RH: cl(geom.RH, 20, 100, 70), t0: cl(geom.t0, 1, 1e5, 28), Tmean: cl(geom.Tmean, -20, 60, 20), phi_ef: cl(geom.phi_ef, 0, 10, 2),
      params: Object.fromEntries(Object.entries(geom.params).map(([k, v]) => [k, cl(v, 1, 1000, 30)])) };
    rebar = { ...rebar, nBars: Math.round(cl(rebar.nBars, 1, 200, 4)), phiL: cl(rebar.phiL, 6, 50, 16), phiW: cl(rebar.phiW, 4, 20, 8),
      spacing: cl(rebar.spacing, 20, 1000, 200), numAnchors: Math.round(cl(rebar.numAnchors, 0, 10, 1)), numLaps: Math.round(cl(rebar.numLaps, 0, 10, 1)),
      lapPercent: cl(rebar.lapPercent, 0, 100, 100) };
    mat = { ...mat, gammaC: cl(mat.gammaC, 1, 3, 1.5), gammaS: cl(mat.gammaS, 1, 3, 1.15), alphaCC: cl(mat.alphaCC, 0.8, 1, 1), deltaCdev: cl(mat.deltaCdev, 0, 15, 10),
      fyk: cl(mat.fyk, 400, 600, 500), fck: CONCRETE_CLASSES.some(c => c.fck === mat.fck) ? mat.fck : 30 };
    const cm = (v: number | undefined) => (v === undefined ? v : cl(v, -1e6, 1e6, 0));
    loads = { ...loads, NEd: cl(loads.NEd, 0, 1e6, 0), NG: cl(loads.NG, 0, 1e6, 0), NQ: cl(loads.NQ, 0, 1e6, 0), psi1: cl(loads.psi1, 0, 1, 0.5), psi2: cl(loads.psi2, 0, 1, 0.3),
      Mh_top: cm(loads.Mh_top), Mh_bot: cm(loads.Mh_bot), Mb_top: cm(loads.Mb_top), Mb_bot: cm(loads.Mb_bot), VEd: cl(loads.VEd, -1e6, 1e6, 0), VEd_b: cm(loads.VEd_b),
      TEd: cl(loads.TEd, -1e6, 1e6, 0), Mqp_h: cm(loads.Mqp_h) };
  }
  const warnings: string[] = [...errors.map(e => `Donnée invalide — ${e}`)];
  const mp = materialProps(mat, rebar);
  if (mat.deltaCdev < 10) warnings.push(`Δcdev = ${mat.deltaCdev} mm < 10 mm : suppose un système d'assurance de la qualité avec mesure de l'enrobage (§4.4.1.3(3)).`);
  if (mp.coverNote) warnings.push(mp.coverNote);
  if (mat.fck > 50) warnings.push('Béton à haute résistance (fck > 50 MPa) : paramètres du diagramme parabole-rectangle adaptés (tableau 3.1). Vérifier les exigences complémentaires de l\'Annexe nationale.');
  const gp = geometryProps(geom);
  const Ac = gp.A * 100; // mm²
  const { l0: l0m, method: l0Method } = effectiveLength(geom);
  const l0 = l0m * 1000; // mm
  const type = loads.solicitationType;

  // Combinaisons (EN 1990, 6.10) et poids propre
  const Npp = loads.selfWeight ? 25 * (gp.A / 1e4) * geom.L : 0; // kN
  let NEdk: number, Ncar: number, Nqp: number;
  const mode = loads.loadMode === 'GQ' ? 'GQ' : 'direct';
  if (mode === 'GQ') {
    const G = (loads.NG ?? 0) + Npp, Q = loads.NQ ?? 0, psi2 = loads.psi2 ?? 0.3;
    NEdk = 1.35 * G + 1.5 * Q; Ncar = G + Q; Nqp = G + psi2 * Q;
  } else {
    NEdk = loads.NEd + 1.35 * Npp; Ncar = (loads.Ncar ?? 0) > 0 ? (loads.Ncar ?? 0) + Npp : 0;
    Nqp = (loads.Nqp ?? 0) > 0 ? (loads.Nqp ?? 0) + Npp : 0;
  }
  const loadSummary: LoadSummary = { NEd: NEdk, Ncar, Nqp, Npp, mode };
  const NEd = type === 'traction' ? -Math.abs(NEdk) * 1000 : Math.max(0, NEdk) * 1000;

  // Moments d'extrémité (kNm → N·mm). Anciens champs = moment constant.
  const flex = type === 'flexion_composee';
  const spec = (top: number | undefined, bot: number | undefined, legacy: number | undefined, curv: Curvature | undefined): MomentSpec => {
    if (!flex) return { top: 0, bot: 0, curvature: 'simple' };
    const t = Math.abs(top ?? legacy ?? 0), b = Math.abs(bot ?? top ?? legacy ?? 0);
    return { top: t * 1e6, bot: b * 1e6, curvature: curv ?? 'simple' };
  };
  const Mh = spec(loads.Mh_top, loads.Mh_bot, loads.MEd_user, loads.curvH);
  const Mb = spec(loads.Mb_top, loads.Mb_bot, loads.MEd_z, loads.curvB);

  // Fluage
  let h0: number | null = null;
  if (geom.shape === 'rect') h0 = 2 * Ac / (2 * ((geom.params.b || 0) + (geom.params.h || 0)) * 10);
  else if (geom.shape === 'circ') h0 = (geom.params.d || 0) * 10 / 2;
  let phiInf: number | null = null;
  if (geom.phiMode === 'calcule') {
    if (h0 && h0 > 0) phiInf = creepCoefficient(mat.fck, geom.RH ?? 70, h0, geom.t0 ?? 28, geom.cement ?? 'N', geom.Tmean ?? 20);
    else warnings.push('Calcul de φ(∞,t0) disponible pour les sections rectangulaires et circulaires : valeur saisie utilisée.');
  }
  const qpRatio = NEdk > 0 && Nqp > 0 ? Math.min(1, Nqp / NEdk) : 1;
  if (phiInf !== null && !(Nqp > 0)) warnings.push('φef calculé avec M0Eqp/M0Ed = 1 faute d\'effort quasi-permanent : renseigner Nqp ou G et Q.');
  const aH = alphaH(geom.L);

  const As_prov = rebar.nBars * Math.PI * rebar.phiL ** 2 / 400; // cm²
  const fyd_kNcm2 = mp.fyd / 10;
  const As_min_Ned = type === 'traction' ? 0 : 0.1 * Math.abs(NEd / 1000) / fyd_kNcm2;
  const As_min_Ac = 0.002 * gp.A;
  const As_min = Math.max(As_min_Ned, As_min_Ac);
  const As_max = 0.04 * gp.A;
  const rho = gp.A > 0 ? As_prov / gp.A * 100 : 0;

  const sec = gp.supported ? buildSection(geom, rebar, mp.cNom) : null;
  if (sec?.layoutNote) warnings.push(sec.layoutNote);
  if (sec?.kind === 'poly') warnings.push(`Section ${sec.label} : calcul par modèle polygonal dans les axes principaux d'inertie${Math.abs(sec.rotation) > 1e-6 ? ` (rotation ${(sec.rotation * 180 / Math.PI).toFixed(1)}°)` : ''}. Axe neutre supposé parallèle à l'axe principal ; la résistance retenue est la plus faible des deux sens de moment. Moments à saisir dans les plans principaux I et II.`);
  if (sec && sec.dPrime * 2 >= sec.tMin) warnings.push(`Épaisseur minimale de la section (${sec.tMin.toFixed(0)} mm) inférieure à 2 × d' = ${(2 * sec.dPrime).toFixed(0)} mm : les armatures ne peuvent pas être placées avec l'enrobage requis.`);
  const isWall = geom.shape === 'rect' && Math.max(geom.params.b || 0, geom.params.h || 0) > 4 * Math.min(geom.params.b || 1, geom.params.h || 1);
  if (isWall) warnings.push('Grand côté > 4 × petit côté : l\'élément est un voile au sens du §9.5.1. Les règles des voiles (§9.6) s\'appliquent et ne sont pas vérifiées ici.');
  if (mat.fck < mp.minClassFck) warnings.push(`Classe ${concreteLabel(mat.fck)} inférieure à la classe indicative ${concreteLabel(mp.minClassFck)} pour l'exposition ${mat.exposureClass} (annexe E informative ; voir aussi l'EN 206 et l'Annexe nationale).`);
  if (mp.structuralClassNote) warnings.push(mp.structuralClassNote);

  // Élancement « géométrique » (direction la plus élancée) pour l'affichage général
  const nRel = Ac > 0 && mp.fcd > 0 ? Math.max(0, NEd) / (Ac * mp.fcd) : 0;
  const phiEfGeo = phiInf !== null ? phiInf * qpRatio : (geom.phi_ef ?? 0);
  const dynamicA = 1 / (1 + 0.2 * phiEfGeo);
  const omegaProv = Ac > 0 ? As_prov * 100 * mp.fyd / (Ac * mp.fcd) : 0;
  const coefB = Math.sqrt(1 + 2 * omegaProv);
  const lambdaGeo = gp.i_min > 0 ? l0 / (gp.i_min * 10) : 0;
  const lambdaLimGeo0 = nRel > 0 ? 20 * dynamicA * coefB * 0.7 / Math.sqrt(nRel) : Infinity;

  let directions: DirectionResult[] = [];
  let biaxial: BiaxialResult | null = null;
  let util = NaN;
  let As_req = 0;
  let NRd_max: number | null = null;

  if (type === 'traction') {
    As_req = Math.abs(NEd) / 1000 / fyd_kNcm2;
    util = As_prov > 0 ? As_req / As_prov : Infinity;
  } else if (sec && sec.bars.length > 0 && Ac > 0) {
    const ctx: Ctx = { sec, mp, mat, geom, Ac, l0, NEd, Mh, Mb, allowSecondOrder: true,
      braced: geom.braced !== false, transverse: !!loads.transverse, alphaH: aH, phiInf, qpRatio };
    const ev = evaluate(ctx, 1);
    directions = ev.dirs; biaxial = ev.biaxial; util = ev.util;
    NRd_max = axialResistance(sec, 1, mp) / 1000;
    // Section d'acier requise : même disposition, aire mise à l'échelle
    const As_layout = sec.bars.reduce((s, b) => s + b.A, 0) / 100; // cm²
    if (evaluate(ctx, 0).util <= 1) As_req = 0;
    else {
      const sMax = 0.08 * gp.A / As_layout;
      if (evaluate(ctx, sMax).util > 1) As_req = Infinity;
      else {
        let lo = 0, hi = sMax;
        for (let k = 0; k < 30; k++) {
          const mid = (lo + hi) / 2;
          if (evaluate(ctx, mid).util <= 1) hi = mid; else lo = mid;
        }
        As_req = hi * As_layout;
      }
    }
  } else if (sec && sec.bars.length === 0) {
    util = Infinity;
  }

  const governing = directions.length ? directions.reduce((a, c) => (c.util > a.util ? c : a)) : null;
  const slenderest = directions.length ? directions.reduce((a, c) => (c.lambda > a.lambda ? c : a)) : null;
  const As_def = Math.max(As_min, As_req);
  // Ancrages et recouvrements
  const barState: 'compression' | 'traction' = (type === 'flexion_composee' || type === 'traction') ? 'traction' : 'compression';
  let anch: AnchorageResult | null = null, ties: TieSpacing | null = null;
  if (sec && sec.bars.length > 0) {
    const sp = barSpacing(sec, rebar.phiL);
    const cBar = mp.cNom + rebar.phiW;
    const cd = isFinite(sp.minClear) ? Math.min(sp.minClear / 2, cBar) : cBar;
    anch = anchorage(mp, mat.fck, rebar, barState, cd);
    ties = tieSpacing(sec, rebar, anch);
  }
  const checks = gp.supported ? detailingChecks(sec, geom, rebar, As_prov, gp.A, As_min, As_max, anch, ties) : [];
  if (gp.supported) checks.push({ label: 'Classe de béton minimale (annexe E)', value: concreteLabel(mat.fck), limit: `≥ ${concreteLabel(mp.minClassFck)} en ${mat.exposureClass}`, ok: mat.fck >= mp.minClassFck, ref: 'Annexe E', blocking: false });

  // ---- Effort tranchant et torsion (§6.2, §6.3) ----
  const shear: ShearResult = { computed: false, note: '', VRd_c: 0, VRd_max: 0, TRd_max: 0, TRd_c: 0, interactionVT: 0,
    Asw_s_req: 0, As_l_torsion: 0, shearResult: '—', torsionResult: '—', sigma_cp: 0, dirs: [], ok: true };
  const VEh = Math.abs(loads.VEd ?? 0) * 1000, VEb = Math.abs(loads.VEd_b ?? 0) * 1000, TEd = Math.abs(loads.TEd ?? 0) * 1e6;
  if (type !== 'traction' && (VEh > 0 || VEb > 0 || TEd > 0)) {
    if (!sec || sec.bars.length === 0 || sec.kind === 'poly') shear.note = 'Effort tranchant non calculé pour cette forme (sections rectangulaires et circulaires uniquement).';
    else {
      shear.computed = true;
      const isRect = sec.kind === 'rect';
      const sigmaCp = Math.min(Math.max(0, NEd) / Ac, 0.2 * mp.fcd);
      shear.sigma_cp = sigmaCp;
      const nu1 = 0.6 * (1 - mat.fck / 250);
      const r = Math.max(0, NEd) / Ac / mp.fcd;
      const alphaCw = r <= 0 ? 1 : r <= 0.25 ? 1 + r : r <= 0.5 ? 1.25 : 2.5 * (1 - r);
      const fctd = 0.7 * mp.fctm / mp.gammaC;
      // Section creuse équivalente (§6.3.2)
      const bT = isRect ? sec.b : Math.sqrt(Ac), hT = isRect ? sec.h : Math.sqrt(Ac);
      const u = 2 * (bT + hT);
      const tef = Math.max(Ac / u, 2 * sec.dPrime);
      const Ak = Math.max(0, (bT - tef) * (hT - tef));
      const uk = 2 * (bT + hT - 2 * tef);
      const TRdc = 2 * Ak * tef * fctd; // moment de fissuration (τt = fctd)
      const TRdmax = (cot: number) => 2 * nu1 * alphaCw * mp.fcd * Ak * tef * cot / (1 + cot * cot);
      const aw = Math.PI * rebar.phiW ** 2 / 4;
      const AswProv = rebar.spacing > 0 ? 2 * aw / rebar.spacing * 1000 : 0; // mm²/m, deux brins
      const cases: { label: string; V: number; dir: Dir; bw: number; H: number }[] = isRect
        ? [{ label: 'Plan de h', V: VEh, dir: 'h', bw: sec.b, H: sec.h }, { label: 'Plan de b', V: VEb, dir: 'b', bw: sec.h, H: sec.b }]
        : [{ label: 'Section circulaire (carré équivalent)', V: Math.hypot(VEh, VEb), dir: 'h', bw: Math.sqrt(Ac), H: Math.sqrt(Ac) }];
      let AslMax = 0;
      for (const c of cases) {
        const d = c.H - sec.dPrime, z = 0.9 * d;
        const m = stripModel(sec, c.dir, 1);
        const AsT = m.bars.filter(b => b.t > m.H / 2 + 1e-6).reduce((acc, b) => acc + b.A, 0);
        const rhoL = Math.min(AsT / (c.bw * d), 0.02);
        const k = Math.min(1 + Math.sqrt(200 / d), 2);
        const vmin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(mat.fck);
        const VRdc = Math.max(0.18 / mp.gammaC * k * Math.pow(100 * rhoL * mat.fck, 1 / 3) + 0.15 * sigmaCp, vmin + 0.15 * sigmaCp) * c.bw * d;
        const VRdmax = (cot: number) => alphaCw * c.bw * z * nu1 * mp.fcd * cot / (1 + cot * cot);
        const reinforced = c.V > VRdc || (TEd > 0 && TEd / TRdc + c.V / VRdc > 1); // (6.31)
        // cot θ le plus grand (1 ≤ cot θ ≤ 2,5) respectant l'interaction (6.29)
        let cot = 2.5, inter = Infinity;
        for (let ct = 2.5; ct >= 1 - 1e-9; ct -= 0.05) {
          inter = c.V / VRdmax(ct) + (TEd > 0 ? TEd / TRdmax(ct) : 0);
          cot = ct;
          if (inter <= 1) break;
        }
        const AswV = reinforced ? c.V / (z * mp.fyd * cot) : 0;
        const AswT = reinforced && Ak > 0 ? TEd / (2 * Ak * mp.fyd * cot) : 0; // par brin
        const Asw_req = (AswV + 2 * AswT) * 1000;
        if (reinforced && Ak > 0) AslMax = Math.max(AslMax, TEd * uk * cot / (2 * Ak * mp.fyd) / 100);
        const ok = inter <= 1 && AswProv >= Asw_req - 1e-9;
        shear.dirs.push({ label: c.label, VEd: c.V / 1000, bw: c.bw, d, rhoL, VRd_c: VRdc / 1000, VRd_max: VRdmax(cot) / 1000,
          TRd_max: TRdmax(cot) / 1e6, cot, interaction: inter, reinforced, Asw_req, Asw_prov: AswProv, ok });
      }
      const g = shear.dirs.reduce((a, c) => (c.interaction + c.Asw_req / Math.max(1, c.Asw_prov) > a.interaction + a.Asw_req / Math.max(1, a.Asw_prov) ? c : a));
      shear.VRd_c = g.VRd_c; shear.VRd_max = g.VRd_max; shear.TRd_max = g.TRd_max; shear.TRd_c = TRdc / 1e6;
      shear.interactionVT = Math.max(...shear.dirs.map(d => d.interaction));
      shear.Asw_s_req = Math.max(...shear.dirs.map(d => d.Asw_req));
      shear.As_l_torsion = AslMax;
      shear.ok = shear.dirs.every(d => d.ok);
      shear.shearResult = shear.dirs.some(d => d.interaction > 1) ? 'KO (bielles)' : shear.dirs.some(d => d.reinforced) ? (shear.ok ? 'OK (armé)' : 'KO (cadres insuffisants)') : 'OK (sans armatures d\'effort tranchant)';
      shear.torsionResult = TEd === 0 ? '—' : shear.interactionVT <= 1 ? 'OK' : 'KO (bielles)';
      shear.note = (isRect ? 'Effort tranchant dans chaque plan ; bw = dimension perpendiculaire.' : 'Section circulaire : carré équivalent de même aire (approximation).')
        + ' cot θ optimisé entre 1 et 2,5. Aciers transversaux fournis : deux brins du cadre périphérique.';
    }
  }

  // ---- ELS : contraintes de compression (§7.2) ----
  const aggressive = /^X[DSF]/.test(mat.exposureClass);
  const els: ELSResult = { computed: false, note: '', sigma_c: 0, sigma_car: null, limit045: 0.45 * mat.fck,
    limit06: aggressive ? 0.6 * mat.fck : null, ok: true };
  if (gp.A > 0 && type !== 'traction' && (Nqp > 0 || Ncar > 0)) {
    const As = As_prov * 100;
    const EcEff = mp.Ecm / (1 + (phiInf !== null ? phiInf : (geom.phi_ef ?? 0)));
    const alphaQp = ES / EcEff, alphaCar = ES / mp.Ecm;
    els.computed = true;
    const notes: string[] = [];
    if (Nqp > 0) {
      els.sigma_c = Nqp * 1000 / (Ac + (alphaQp - 1) * As);
      if (els.sigma_c > els.limit045) els.ok = false;
      notes.push(`σc,qp avec αe = Es/Ec,eff = ${alphaQp.toFixed(1)} (§7.2(3) : ≤ 0,45 fck)`);
    }
    if (Ncar > 0) {
      els.sigma_car = Ncar * 1000 / (Ac + (alphaCar - 1) * As);
      if (els.limit06 !== null && els.sigma_car > els.limit06) els.ok = false;
      notes.push(`σc,car avec αe = Es/Ecm = ${alphaCar.toFixed(1)}` + (els.limit06 !== null ? ' (§7.2(2) : ≤ 0,6 fck en XD/XS/XF)' : ' (limite 0,6 fck non requise pour cette exposition)'));
    }
    els.note = 'Compression centrée, section homogénéisée. ' + notes.join(' ; ') + '.' +
      (flex ? ' Les moments ELS ne sont pas pris en compte.' : '');
  } else {
    els.note = 'Renseigner Nqp et Ncar (ou G et Q) pour effectuer la vérification.';
  }

  const annex: 'EC2' | 'FR' = mat.annex === 'EC2' ? 'EC2' : 'FR';

  // ---- Résistance au feu : EN 1992-1-2, méthode A, éq. (5.7) ----
  const fire: FireResult = { computed: false, valid: false, note: '', R: 0, Rreq: fireIn?.R ?? 0, ok: true,
    etaFi: 0, muFi: 0, omega: 0, a: 0, l0fi: 0, bprime: 0, n: rebar.nBars,
    parts: { Reta: 0, Ra: 0, Rl: 0, Rb: 0, Rn: 0 } };
  if (fireIn && fireIn.R > 0 && sec && sec.kind === 'poly') {
    fire.note = 'Méthode A de l\'EN 1992-1-2 : poteaux rectangulaires ou circulaires uniquement.';
  }
  if (fireIn && fireIn.R > 0 && sec && sec.kind !== 'poly' && sec.bars.length > 0 && type !== 'traction') {
    fire.computed = true;
    const reasons: string[] = [];
    // ηfi = (Gk + ψfi Qk)/(γG Gk + γQ Qk) en mode G+Q, sinon 0,7 (valeur simplifiée)
    let etaFi = 0.7;
    if (loadSummary.mode === 'GQ' && loadSummary.NEd > 0) {
      // EN 1991-1-2 §4.3.1(2) : ψ2,1 recommandé ; l'AN française retient ψ1,1
      const G = (loads.NG ?? 0) + Npp, Q = loads.NQ ?? 0;
      const psi = fireIn.psiFi ?? (mat.annex === 'EC2' ? (loads.psi2 ?? 0.3) : (loads.psi1 ?? 0.5));
      etaFi = (G + psi * Q) / (1.35 * G + 1.5 * Q);
    }
    const muFi = fireIn.muFi && fireIn.muFi > 0 ? fireIn.muFi : etaFi; // μfi = ηfi : NRd pris égal à NEd (sécuritaire)
    const As = As_prov * 100;
    const omega = As * mp.fyd / (Ac * mp.fcd);
    const a = sec.dPrime; // distance de l'axe des barres au parement
    const l0fi = Math.max(2, (fireIn.l0fiFactor > 0 ? fireIn.l0fiFactor * geom.L : l0 / 1000));
    const bprime = sec.kind === 'rect' ? 2 * Ac / (sec.b + sec.h) : sec.h;
    const nb = rebar.nBars;
    if (geom.braced === false) reasons.push('structure non contreventée');
    if (l0fi > 6) reasons.push('l0,fi > 6 m');
    if (a < 25 || a > 80) reasons.push(`a = ${a.toFixed(0)} mm hors de [25 ; 80]`);
    if (bprime < 200 || bprime > 450) reasons.push(`b' = ${bprime.toFixed(0)} mm hors de [200 ; 450]`);
    if (sec.kind === 'rect' && Math.max(sec.b, sec.h) > 1.5 * Math.min(sec.b, sec.h)) reasons.push('h > 1,5 b');
    if (As > 0.04 * Ac) reasons.push('As > 4 % Ac');
    const eRel = directions.length && NEd > 0 ? Math.max(...directions.map(d => (d.M0 * 1e6 / NEd) / d.H)) : 0;
    if (eRel > 0.15) reasons.push(`e/h = ${eRel.toFixed(2)} > 0,15 (emax recommandé)`);
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const Reta = 83 * (1 - muFi * (1 + omega) / (0.85 / mp.alphaCC + omega));
    const Ra = 1.6 * (clamp(a, 25, 80) - 30);
    const Rl = 9.6 * (5 - clamp(l0fi, 2, 6));
    const Rb = 0.09 * clamp(bprime, 200, 450);
    const Rn = nb > 4 ? 12 : 0;
    const sum = Reta + Ra + Rl + Rb + Rn;
    const R = sum > 0 ? 120 * Math.pow(sum / 120, 1.8) : 0;
    Object.assign(fire, { valid: reasons.length === 0, R, etaFi, muFi, omega, a, l0fi, bprime, parts: { Reta, Ra, Rl, Rb, Rn } });
    fire.ok = fire.valid && R >= fireIn.R;
    fire.note = reasons.length
      ? `Méthode A hors domaine de validité : ${reasons.join(', ')}. Utiliser les tableaux 5.2a ou une méthode avancée.`
      : `Méthode A (5.7) : μfi = ${muFi.toFixed(2)}${!(fireIn.muFi && fireIn.muFi > 0) ? ' (pris égal à ηfi, sécuritaire)' : ''}, l0,fi = ${l0fi.toFixed(2)} m.`;
    if (!fire.valid) warnings.push('Résistance au feu : ' + fire.note);
  }

  // ---- Méthode simplifiée des Recommandations professionnelles (France) ----
  const rp: RPResult = { applicable: false, note: '', lambda: 0, alpha: 0, kh: 1, ks: 1, NRd: 0, ratio: 0 };
  if (sec && sec.kind !== 'poly' && sec.bars.length > 0 && (type === 'compression' || type === 'cisaillement')) {
    const reasons: string[] = [];
    const isRect = sec.kind === 'rect';
    const hMin = isRect ? Math.min(sec.b, sec.h) : sec.h; // mm
    const lam = isRect ? l0 * Math.sqrt(12) / hMin : 4 * l0 / sec.h;
    if (lam > 120) reasons.push('λ > 120');
    if (mat.fck < 20 || mat.fck > 50) reasons.push('fck hors de [20 ; 50] MPa');
    if (geom.braced === false) reasons.push('structure non contreventée');
    let alpha: number;
    if (isRect) alpha = lam <= 60 ? 0.86 / (1 + (lam / 62) ** 2) : Math.pow(32 / lam, 1.3);
    else alpha = lam <= 60 ? 0.84 / (1 + (lam / 52) ** 2) : Math.pow(27 / lam, 1.24);
    const As = As_prov * 100;
    const rho = As / Ac, delta = sec.dPrime / hMin, hm = hMin / 1000;
    let kh = 1, ks = 1;
    if (isRect) {
      if (hm < 0.5) kh = (0.75 + 0.5 * hm) * (1 - 6 * rho * delta);
      if (mat.fyk > 500 && lam > 40) ks = 1.6 - 0.6 * mat.fyk / 500;
    } else {
      if (hm < 0.6) kh = (0.7 + 0.5 * hm) * (1 - 8 * rho * delta);
      if (mat.fyk > 500 && lam > 30) ks = 1.6 - 0.65 * mat.fyk / 500;
    }
    const NRd = kh * ks * alpha * (Ac * mp.fcd + As * mp.fyd) / 1000;
    Object.assign(rp, { lambda: lam, alpha, kh, ks, NRd, ratio: NRd > 0 ? loadSummary.NEd / NRd : Infinity });
    rp.applicable = reasons.length === 0 && lam <= 120;
    rp.note = rp.applicable
      ? 'Poteau de bâtiment contreventé sous compression centrée. Méthode propre à la France (Recommandations professionnelles, clause 5.8.5), donnée à titre de comparaison.'
      : `Hors domaine : ${reasons.join(', ')}.`;
  } else {
    rp.note = 'Applicable uniquement en compression centrée, sections rectangulaires ou circulaires.';
  }

  // ---- Fissuration (§7.3.4), plan de h, section rectangulaire ----
  const crack: CrackResult = { computed: false, note: '', compressed: false, x: 0, sigma_s: 0, srmax: 0, deltaEps: 0,
    wk: 0, wmax: wmax(mat.exposureClass, annex), ok: true, required: true };
  crack.required = !(annex === 'FR' && (mat.exposureClass === 'X0' || mat.exposureClass === 'XC1'));
  const Mqp = Math.abs(loads.Mqp_h ?? 0) * 1e6;
  if (sec && sec.kind === 'rect' && sec.bars.length > 0 && Mqp > 0 && type !== 'traction') {
    crack.computed = true;
    const phiC = phiInf !== null ? phiInf : (geom.phi_ef ?? 0);
    const alphaL = ES / (mp.Ecm / (1 + phiC)); // long terme
    const mdl = stripModel(sec, 'h', 1);
    const H = mdl.H;
    const Nq = Nqp * 1000;
    // Section fissurée élastique : contrainte = σtop·(x − t)/x, béton non tendu
    const props = (x: number) => {
      const nS = 200, depth = Math.min(x, H), dt = depth / nS;
      let nf = 0, mf = 0;
      for (let i = 0; i < nS; i++) { const t = (i + 0.5) * dt; const k = (x - t) / x * mdl.width(t) * dt; nf += k; mf += k * (H / 2 - t); }
      for (const b of mdl.bars) { const k = alphaL * (x - b.t) / x * b.A; nf += k; mf += k * (H / 2 - b.t); }
      return { nf, mf };
    };
    // x0 : axe neutre de flexion simple (nf = 0) ; pour x > x0 la section est globalement comprimée
    let lo0 = 1e-4 * H, hi0 = H;
    for (let i = 0; i < 80; i++) { const mid = (lo0 + hi0) / 2; if (props(mid).nf < 0) lo0 = mid; else hi0 = mid; }
    const x0 = hi0;
    let x: number;
    if (Nq <= 0) x = x0;
    else {
      const eT = Mqp / Nq;
      const eAt = (xx: number) => { const p = props(xx); return p.mf / p.nf; };
      if (eT <= eAt(H)) x = Infinity; // excentricité faible : section entièrement comprimée
      else {
        let lo = x0 * (1 + 1e-9), hi = H; // e(x) décroît de +∞ (x0) à e(H)
        for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (eAt(mid) > eT) lo = mid; else hi = mid; }
        x = (lo + hi) / 2;
      }
    }
    if (!isFinite(x)) {
      crack.compressed = true; crack.ok = true;
      crack.note = 'Section entièrement comprimée sous combinaison quasi-permanente : pas de fissuration.';
    } else {
      const p = props(x);
      const sigTop = Nq > 0 ? Nq / p.nf : Mqp / p.mf;
      const tBar = Math.max(...mdl.bars.map(b => b.t));
      const sigmaS = alphaL * sigTop * (tBar - x) / x;
      if (sigmaS <= 0) {
        Object.assign(crack, { compressed: true, x, ok: true,
          note: 'Axe neutre au-delà des aciers : armatures comprimées sous combinaison quasi-permanente, pas de fissure à maîtriser.' });
      } else {
      const tension = mdl.bars.filter(b => Math.abs(b.t - tBar) < 1e-6);
      const AsT = tension.reduce((acc, b) => acc + b.A, 0);
      const dT = tBar;
      const hcef = Math.min(2.5 * (H - dT), (H - x) / 3, H / 2);
      const rhoP = AsT / (sec.b * hcef);
      const c = mp.cNom + rebar.phiW;
      const aE = ES / mp.Ecm;
      // Espacement des barres de la face tendue (§7.3.4(3))
      const uT = H / 2 - tBar;
      const vs = sec.bars.filter(b => Math.abs(b.u - uT) < 1e-6).map(b => b.v).sort((a, b2) => a - b2);
      let spacingAxis = 0;
      for (let k = 1; k < vs.length; k++) spacingAxis = Math.max(spacingAxis, vs[k] - vs[k - 1]);
      // (7.11) ; AN France : k3 = 3,4·(25/c)^(2/3) si c > 25 mm, et (7.14) retenue seulement si plus défavorable
      const k3 = annex === 'FR' && c > 25 ? 3.4 * Math.pow(25 / c, 2 / 3) : 3.4;
      const sr711 = k3 * c + 0.8 * 0.5 * 0.425 * rebar.phiL / rhoP;
      let srmax = sr711;
      if (spacingAxis > 5 * (c + rebar.phiL / 2)) srmax = annex === 'FR' ? Math.max(sr711, 1.3 * (H - x)) : 1.3 * (H - x);
      const de = Math.max((sigmaS - 0.4 * mp.fctm / rhoP * (1 + aE * rhoP)) / ES, 0.6 * sigmaS / ES);
      const wk = srmax * de;
      Object.assign(crack, { x, sigma_s: sigmaS, srmax, deltaEps: de, wk });
      crack.ok = crack.wmax === null ? true : wk <= crack.wmax;
      crack.note = `Section fissurée, αe = ${alphaL.toFixed(1)} (long terme), kt = 0,4, k1 = 0,8, k2 = 0,5, k3 = ${k3.toFixed(2)}, k4 = 0,425.` +
        (crack.required ? '' : ' En X0/XC1, l\'AN française ne requiert ce calcul que sur demande du marché.');
    }
    }
  } else if (Mqp > 0) {
    crack.note = 'Fissuration calculée pour les sections rectangulaires uniquement.';
  } else {
    crack.note = 'Renseigner le moment quasi-permanent Mqp pour calculer wk.';
  }

  // ---- Verdicts ----
  let verdictELU: Verdict;
  if (type === 'traction') verdictELU = util <= 1 ? 'OK' : 'KO';
  else if (!gp.supported || isWall) verdictELU = 'NV';
  else verdictELU = isFinite(util) && util <= 1 ? 'OK' : 'KO';

  let verdict: Verdict = verdictELU;
  if (verdict === 'OK' && checks.some(c => c.blocking && !c.ok)) verdict = 'KO';
  if (verdict === 'OK' && shear.computed && !shear.ok) verdict = 'KO';
  if (verdict === 'OK' && els.computed && !els.ok) verdict = 'KO';
  if (verdict === 'OK' && fire.computed && fire.valid && !fire.ok) verdict = 'KO';
  if (verdict === 'OK' && crack.computed && crack.required && !crack.ok) verdict = 'KO';

  if (governing && governing.MRd === null) warnings.push('NEd dépasse la résistance en compression centrée de la section (NRd,max).');

  return {
    mat: mp,
    geom: { ...gp, l0: l0 / 1000, l0Method, lambda: lambdaGeo,
      lambdaLim: slenderest ? slenderest.lambdaLim : lambdaLimGeo0, n_ef: nRel,
      dynamicA: slenderest ? slenderest.coefA : dynamicA, coefB,
      alphaH: aH, ei: aH / 200 * l0 / 2, phiInf, h0, qpRatio },
    loads: loadSummary,
    section: sec, directions, governing, biaxial, NRd_max, util,
    As_prov, As_min, As_min_Ned, As_min_Ac, As_max, As_req, As_def, rho,
    checks, anchorage: anch, ties, shear, els, fire, rp, crack, annex, warnings, errors, errorFields: detailed.map(e => e.field),
    verdictELU: errors.length ? 'NV' : verdictELU, verdict: errors.length ? 'NV' : verdict,
  };
}

// ---------------------------------------------------------------------------
// Nomenclature
// ---------------------------------------------------------------------------

export function nomenclature(geom: Geometry, rebar: Rebar, cNom: number, A_cm2: number,
  anch: AnchorageResult | null = null, ties: TieSpacing | null = null, sec: RCSection | null = null) {
  const { L, shape, params } = geom;
  const c = cNom / 1000;
  const useCalc = (rebar.anchorMode ?? 'calcule') === 'calcule' && anch !== null;
  const L_ancrage = useCalc ? anch!.lbd / 1000 : rebar.anchoringFactor * rebar.phiL / 1000;
  const L_recouvrement = useCalc ? anch!.l0 / 1000 : rebar.overlapFactor * rebar.phiL / 1000;
  const L_barre = Math.max(0, L - 2 * c) + rebar.numAnchors * L_ancrage + rebar.numLaps * L_recouvrement;
  const masseLin = (d: number) => Math.PI * d * d / 4 * 7850 / 1e6;
  let peri = 0;
  if (sec && sec.ties.length) peri = sec.ties.reduce((acc, t) => acc + perimeter(t), 0) / 1000;
  else if (shape === 'rect') peri = 2 * Math.max(0, (params.b || 0) / 100 - 2 * c) + 2 * Math.max(0, (params.h || 0) / 100 - 2 * c);
  else if (shape === 'circ') peri = Math.PI * Math.max(0, (params.d || 0) / 100 - 2 * c);
  else peri = 4 * Math.max(0, Math.sqrt(Math.max(0, A_cm2)) / 100 - 2 * c);
  const nTies = sec && sec.ties.length ? sec.ties.length : 1;
  const L_cadre = peri + nTies * 2 * 10 * rebar.phiW / 1000; // deux crochets à 135° de 10Φ par cadre
  // Cadres : zones d'about (§9.5.3(4)), zones de recouvrement, partie courante
  const s = Math.max(0.01, rebar.spacing / 1000);
  let nb_cadres: number;
  if (ties) {
    const zEnd = Math.min(L, 2 * ties.endZone / 1000);
    const zLap = Math.min(Math.max(0, L - zEnd), rebar.numLaps * L_recouvrement);
    const zCur = Math.max(0, L - zEnd - zLap);
    nb_cadres = Math.ceil(zEnd / Math.max(0.01, ties.sEnd / 1000)) + Math.ceil(zLap / Math.max(0.01, ties.sLap / 1000)) + Math.ceil(zCur / s) + 1;
  } else nb_cadres = Math.max(2, Math.floor(L / s) + 1);
  const weightL = rebar.nBars * L_barre * masseLin(rebar.phiL);
  const weightW = nb_cadres * L_cadre * masseLin(rebar.phiW);
  return { L_barre, L_cadre, nb_cadres, weightL, weightW, totalWeight: weightL + weightW, L_ancrage, L_recouvrement };
}
