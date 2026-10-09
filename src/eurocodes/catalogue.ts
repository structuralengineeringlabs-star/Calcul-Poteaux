/**
 * @sel/eurocodes — catalogue des profilés laminés européens en I et H (à l'exemple de CATPRO) :
 * IPE (Euronorm 19-57), HEA, HEB, HEM (Euronorm 53-62), dimensions h, b, tw, tf, r (mm) et masse nominale G (kg/m).
 * Les propriétés mécaniques sont recalculées à partir des dimensions (congés compris) ; la masse recalculée
 * (A × 7 850 kg/m³) doit égaler la masse nominale (contrôle de saisie, voir les tests de la bibliothèque).
 */
export interface Lamine { nom: string; famille: 'IPE' | 'HEA' | 'HEB' | 'HEM'; h: number; b: number; tw: number; tf: number; r: number; G: number }

type L = [number, number, number, number, number, number, number]; // désignation, h, b, tw, tf, r, G
const IPE: L[] = [
  [80, 80, 46, 3.8, 5.2, 5, 6.0], [100, 100, 55, 4.1, 5.7, 7, 8.1], [120, 120, 64, 4.4, 6.3, 7, 10.4], [140, 140, 73, 4.7, 6.9, 7, 12.9],
  [160, 160, 82, 5.0, 7.4, 9, 15.8], [180, 180, 91, 5.3, 8.0, 9, 18.8], [200, 200, 100, 5.6, 8.5, 12, 22.4], [220, 220, 110, 5.9, 9.2, 12, 26.2],
  [240, 240, 120, 6.2, 9.8, 15, 30.7], [270, 270, 135, 6.6, 10.2, 15, 36.1], [300, 300, 150, 7.1, 10.7, 15, 42.2], [330, 330, 160, 7.5, 11.5, 18, 49.1],
  [360, 360, 170, 8.0, 12.7, 18, 57.1], [400, 400, 180, 8.6, 13.5, 21, 66.3], [450, 450, 190, 9.4, 14.6, 21, 77.6], [500, 500, 200, 10.2, 16.0, 21, 90.7],
  [550, 550, 210, 11.1, 17.2, 24, 106], [600, 600, 220, 12.0, 19.0, 24, 122],
];
const HEA: L[] = [
  [100, 96, 100, 5, 8, 12, 16.7], [120, 114, 120, 5, 8, 12, 19.9], [140, 133, 140, 5.5, 8.5, 12, 24.7], [160, 152, 160, 6, 9, 15, 30.4],
  [180, 171, 180, 6, 9.5, 15, 35.5], [200, 190, 200, 6.5, 10, 18, 42.3], [220, 210, 220, 7, 11, 18, 50.5], [240, 230, 240, 7.5, 12, 21, 60.3],
  [260, 250, 260, 7.5, 12.5, 24, 68.2], [280, 270, 280, 8, 13, 24, 76.4], [300, 290, 300, 8.5, 14, 27, 88.3], [320, 310, 300, 9, 15.5, 27, 97.6],
  [340, 330, 300, 9.5, 16.5, 27, 105], [360, 350, 300, 10, 17.5, 27, 112], [400, 390, 300, 11, 19, 27, 125], [450, 440, 300, 11.5, 21, 27, 140],
  [500, 490, 300, 12, 23, 27, 155], [550, 540, 300, 12.5, 24, 27, 166], [600, 590, 300, 13, 25, 27, 178], [650, 640, 300, 13.5, 26, 27, 190],
  [700, 690, 300, 14.5, 27, 27, 204], [800, 790, 300, 15, 28, 30, 224], [900, 890, 300, 16, 30, 30, 252], [1000, 990, 300, 16.5, 31, 30, 272],
];
const HEB: L[] = [
  [100, 100, 100, 6, 10, 12, 20.4], [120, 120, 120, 6.5, 11, 12, 26.7], [140, 140, 140, 7, 12, 12, 33.7], [160, 160, 160, 8, 13, 15, 42.6],
  [180, 180, 180, 8.5, 14, 15, 51.2], [200, 200, 200, 9, 15, 18, 61.3], [220, 220, 220, 9.5, 16, 18, 71.5], [240, 240, 240, 10, 17, 21, 83.2],
  [260, 260, 260, 10, 17.5, 24, 93.0], [280, 280, 280, 10.5, 18, 24, 103], [300, 300, 300, 11, 19, 27, 117], [320, 320, 300, 11.5, 20.5, 27, 127],
  [340, 340, 300, 12, 21.5, 27, 134], [360, 360, 300, 12.5, 22.5, 27, 142], [400, 400, 300, 13.5, 24, 27, 155], [450, 450, 300, 14, 26, 27, 171],
  [500, 500, 300, 14.5, 28, 27, 187], [550, 550, 300, 15, 29, 27, 199], [600, 600, 300, 15.5, 30, 27, 212], [650, 650, 300, 16, 31, 27, 225],
  [700, 700, 300, 17, 32, 27, 241], [800, 800, 300, 17.5, 33, 30, 262], [900, 900, 300, 18.5, 35, 30, 291], [1000, 1000, 300, 19, 36, 30, 314],
];
const HEM: L[] = [
  [100, 120, 106, 12, 20, 12, 41.8], [120, 140, 126, 12.5, 21, 12, 52.1], [140, 160, 146, 13, 22, 12, 63.2], [160, 180, 166, 14, 23, 15, 76.2],
  [180, 200, 186, 14.5, 24, 15, 88.9], [200, 220, 206, 15, 25, 18, 103], [220, 240, 226, 15.5, 26, 18, 117], [240, 270, 248, 18, 32, 21, 157],
  [260, 290, 268, 18, 32.5, 24, 172], [280, 310, 288, 18.5, 33, 24, 189], [300, 340, 310, 21, 39, 27, 238], [320, 359, 309, 21, 40, 27, 245],
  [340, 377, 309, 21, 40, 27, 248], [360, 395, 308, 21, 40, 27, 250], [400, 432, 307, 21, 40, 27, 256], [450, 478, 307, 21, 40, 27, 263],
  [500, 524, 306, 21, 40, 27, 270], [550, 572, 306, 21, 40, 27, 278], [600, 620, 305, 21, 40, 27, 285], [650, 668, 305, 21, 40, 27, 293],
  [700, 716, 304, 21, 40, 27, 301], [800, 814, 303, 21, 40, 30, 317], [900, 910, 302, 21, 40, 30, 333], [1000, 1008, 302, 21, 40, 30, 349],
];
const famille = (f: Lamine['famille'], l: L[]): Lamine[] => l.map(([d, h, b, tw, tf, r, G]) => ({ nom: `${f} ${d}`, famille: f, h, b, tw, tf, r, G }));
export const CATALOGUE: Lamine[] = [...famille('IPE', IPE), ...famille('HEA', HEA), ...famille('HEB', HEB), ...famille('HEM', HEM)];
export const profil = (nom: string) => CATALOGUE.find(p => p.nom === nom);

/** Propriétés d'un profilé laminé en I bisymétrique avec congés de raccordement (rayon r). */
export function proprietesLamine(p: Pick<Lamine, 'h' | 'b' | 'tw' | 'tf' | 'r'>) {
  const { h, b, tw, tf, r } = p;
  const hw = h - 2 * tf;
  const Af = (1 - Math.PI / 4) * r * r;                      // aire d'un congé
  const e = r * (10 - 3 * Math.PI) / (12 - 3 * Math.PI);      // distance du centre du congé à l'angle
  const Ic = r ** 4 * (1 - 5 * Math.PI / 16) - Af * e * e;   // inertie propre d'un congé (I par rapport au bord : r⁴(1 − 5π/16))
  const yc = hw / 2 - e, zc = tw / 2 + e;                     // position des congés
  const A = 2 * b * tf + hw * tw + 4 * Af;
  const Iy = (b * h ** 3 - (b - tw) * hw ** 3) / 12 + 4 * (Ic + Af * yc * yc);
  const Iz = (2 * tf * b ** 3 + hw * tw ** 3) / 12 + 4 * (Ic + Af * zc * zc);
  const Wply = b * tf * (h - tf) + tw * hw * hw / 4 + 4 * Af * yc;
  const Wplz = tf * b * b / 2 + hw * tw * tw / 4 + 4 * Af * zc;
  // Constante de torsion de Saint-Venant avec congés (formule des catalogues de profilés européens)
  const D = ((r + tw / 2) ** 2 + (r + tf) ** 2 - r * r) / (2 * r + tf);
  const It = 2 / 3 * (b - 0.63 * tf) * tf ** 3 + (h - 2 * tf) * tw ** 3 / 3 + 2 * (tw / tf) * (0.145 + 0.1 * r / tf) * D ** 4;
  const Iw = Iz * (h - tf) ** 2 / 4;
  const Avz = Math.max(A - 2 * b * tf + (tw + 2 * r) * tf, 0); // aire de cisaillement (§6.2.6(3) a)
  return { h, A, Iy, Iz, Wely: Iy / (h / 2), Welz: Iz / (b / 2), Wply, Wplz, It, Iw, Avz, iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A), masse: A * 1e-6 * 7850 };
}

/**
 * Tubes de construction finis à chaud (EN 10210-2) : ronds CHS (D × t), carrés SHS et rectangulaires RHS (h × b × t).
 * Rayons d'angle de calcul : extérieur ro = 1,5t, intérieur ri = t. Propriétés exactes des contours polygonaux fins,
 * constante de torsion selon l'annexe B de l'EN 10210-2.
 */
export interface Tube { nom: string; famille: 'CHS' | 'SHS' | 'RHS'; h: number; b: number; t: number }
const CHS: [number, number][] = [[48.3, 3.2], [60.3, 4], [76.1, 4], [88.9, 5], [114.3, 5], [139.7, 6.3], [168.3, 8], [193.7, 8], [219.1, 8], [244.5, 10], [273, 10], [323.9, 10], [355.6, 12.5], [406.4, 12.5]];
const SHS: [number, number][] = [[60, 4], [80, 5], [100, 5], [100, 8], [120, 6.3], [140, 8], [150, 8], [160, 8], [180, 10], [200, 10], [220, 10], [250, 10], [300, 12.5]];
const RHS: [number, number, number][] = [[100, 50, 5], [120, 60, 6.3], [150, 100, 8], [200, 100, 8], [200, 120, 10], [250, 150, 10], [300, 200, 12.5]];
const v = (x: number) => String(x).replace('.', ',');
export const TUBES: Tube[] = [
  ...CHS.map(([D, t]) => ({ nom: `CHS ${v(D)}×${v(t)}`, famille: 'CHS' as const, h: D, b: D, t })),
  ...SHS.map(([a, t]) => ({ nom: `SHS ${a}×${a}×${v(t)}`, famille: 'SHS' as const, h: a, b: a, t })),
  ...RHS.map(([h, b, t]) => ({ nom: `RHS ${h}×${b}×${v(t)}`, famille: 'RHS' as const, h, b, t })),
];
export const tube = (nom: string) => TUBES.find(x => x.nom === nom);

type Poly = [number, number][];
function rectArrondi(b: number, h: number, r: number, n = 90): Poly {
  const pts: Poly = [];
  const coins: [number, number, number][] = [[b / 2 - r, h / 2 - r, 0], [-b / 2 + r, h / 2 - r, 90], [-b / 2 + r, -h / 2 + r, 180], [b / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, a0] of coins) for (let k = 0; k <= n; k++) { const a = (a0 + 90 * k / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}
/** Aire, moment d'inertie et moment statique de la moitié supérieure (y ≥ 0) d'un polygone centré. */
function integrales(p: Poly) {
  let A = 0, I = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; const c = x1 * y2 - x2 * y1; A += c / 2; I += (y1 * y1 + y1 * y2 + y2 * y2) * c / 12; }
  const demi: Poly = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], ia = a[1] >= 0, ib = b[1] >= 0;
    if (ia) demi.push(a);
    if (ia !== ib) { const s = a[1] / (a[1] - b[1]); demi.push([a[0] + s * (b[0] - a[0]), 0]); }
  }
  let S = 0;
  for (let i = 0; i < demi.length; i++) { const [x1, y1] = demi[i], [x2, y2] = demi[(i + 1) % demi.length]; S += (y1 + y2) * (x1 * y2 - x2 * y1) / 6; }
  return { A, I, S };
}
/** Propriétés d'un tube (axe y : flexion dans le plan de h). */
export function proprietesTube(tb: Pick<Tube, 'famille' | 'h' | 'b' | 't'>) {
  const { h, b, t } = tb;
  if (tb.famille === 'CHS') {
    const D = h, d = D - 2 * t;
    const A = Math.PI / 4 * (D * D - d * d), I = Math.PI / 64 * (D ** 4 - d ** 4), Wpl = (D ** 3 - d ** 3) / 6;
    return { A, Iy: I, Iz: I, Wely: I / (D / 2), Welz: I / (D / 2), Wply: Wpl, Wplz: Wpl, It: 2 * I, iy: Math.sqrt(I / A), iz: Math.sqrt(I / A), masse: A * 7850e-6, Av: 2 * A / Math.PI };
  }
  const ro = 1.5 * t, ri = t;
  const sens = (hh: number, bb: number) => {
    const o = integrales(rectArrondi(bb, hh, ro)), i = integrales(rectArrondi(bb - 2 * t, hh - 2 * t, ri));
    return { A: o.A - i.A, I: o.I - i.I, Wpl: 2 * (o.S - i.S) };
  };
  const y = sens(h, b), z = sens(b, h);
  const Rc = (ro + ri) / 2, Ah = (b - t) * (h - t) - Rc * Rc * (4 - Math.PI), p = 2 * ((b - t) + (h - t)) - 2 * Rc * (4 - Math.PI);
  const It = t ** 3 * p / 3 + 2 * (2 * Ah * t / p) * Ah; // EN 10210-2, annexe B
  return { A: y.A, Iy: y.I, Iz: z.I, Wely: y.I / (h / 2), Welz: z.I / (b / 2), Wply: y.Wpl, Wplz: z.Wpl, It, iy: Math.sqrt(y.I / y.A), iz: Math.sqrt(z.I / y.A), masse: y.A * 7850e-6, Av: y.A * h / (b + h) };
}


/**
 * Familles en valeurs tabulées (document de référence fourni par le maître d'ouvrage, 2026, contrôlé : masse = A × 0,785
 * et aire proche de la somme des plaques — voir docs/audit/COMPARAISON_CATALOGUE.md) :
 * IPN (ailes inclinées), UPN (ailes inclinées), UAP (ailes parallèles) et cornières à ailes égales.
 * Unités du tableau : mm ; A en cm² ; G en kg/m ; I en cm⁴ ; Wel en cm³ ; i en cm.
 */
type TabI = [number, number, number, number, number, number, number, number, number, number, number]; // d, h, b, tw, tf, A, G, Iy, Wel,y, Iz, Wel,z
type TabL = [number, number, number, number, number, number, number]; // a, t, A, G, I, Wel, i
const T_IPN: TabI[] = [[80, 80, 42, 3.9, 5.9, 7.57, 5.94, 77.8, 19.5, 6.29, 3], [100, 100, 50, 4.5, 6.8, 10.6, 8.32, 171, 34.2, 12.2, 4.88], [120, 120, 58, 5.1, 7.7, 14.2, 11.1, 328, 54.7, 21.5, 7.41], [140, 140, 66, 5.7, 8.6, 18.2, 14.3, 573, 81.9, 35.2, 10.7], [160, 160, 74, 6.3, 9.5, 22.8, 17.9, 935, 117, 54.7, 14.8], [180, 180, 82, 6.9, 10.4, 27.9, 21.9, 1450, 161, 81.3, 19.8], [200, 200, 90, 7.5, 11.3, 33.4, 26.2, 2140, 214, 117, 26], [220, 220, 98, 8.1, 12.2, 39.5, 31.1, 3060, 278, 162, 33.1], [240, 240, 106, 8.7, 13.1, 46.1, 36.2, 4250, 354, 221, 41.7], [260, 260, 113, 9.4, 14.1, 53.3, 41.9, 5740, 442, 288, 51], [300, 300, 125, 10.8, 16.2, 69, 54.2, 9800, 653, 451, 72.2], [340, 340, 137, 12.2, 18.3, 86.7, 68, 15700, 924, 703, 103], [400, 400, 155, 14.4, 21.6, 118, 92.4, 29210, 1460, 1250, 161], [450, 450, 170, 16.2, 24.3, 147, 115, 45850, 2040, 1880, 221], [500, 500, 185, 18, 27, 179, 141, 68740, 2750, 2680, 290], [550, 550, 200, 19, 30, 213, 167, 99180, 3610, 3680, 368], [600, 600, 215, 21.6, 32.4, 254, 199, 139000, 4630, 4900, 456]];
const T_UPN: TabI[] = [[80, 80, 45, 6, 8, 11, 8.64, 106, 26.5, 19.4, 6.36], [100, 100, 50, 6, 8.5, 13.5, 10.6, 206, 41.2, 29.3, 8.49], [120, 120, 55, 7, 9, 17, 13.4, 364, 60.7, 43.2, 11.1], [140, 140, 60, 7, 10, 20.4, 16, 605, 86.4, 62.7, 14.8], [160, 160, 65, 7.5, 10.5, 24, 18.8, 925, 116, 85.3, 18.3], [180, 180, 70, 8, 11, 28, 22, 1350, 150, 114, 22.4], [200, 200, 75, 8.5, 11.5, 32.2, 25.3, 1910, 191, 148, 27], [220, 220, 80, 9, 12.5, 37.4, 29.4, 2690, 245, 197, 33.6], [240, 240, 85, 9.5, 13, 42.3, 33.2, 3600, 300, 248, 39.6], [260, 260, 90, 10, 14, 48.3, 37.9, 4820, 371, 317, 47.7], [280, 280, 95, 10, 15, 53.3, 41.8, 6280, 448, 399, 57.2], [300, 300, 100, 10, 16, 58.8, 46.2, 8030, 535, 495, 67.8], [320, 320, 100, 14, 17.5, 75.8, 59.5, 10870, 679, 597, 80.6], [350, 350, 100, 14, 16, 77.3, 60.6, 12840, 734, 570, 75], [400, 400, 110, 14, 18, 91.5, 71.8, 20350, 1020, 847, 102]];
const T_UAP: TabI[] = [[80, 80, 45, 5, 8, 10.5, 8.25, 105, 26.2, 19.9, 6.52], [100, 100, 50, 5.5, 8.5, 13.3, 10.5, 209, 41.8, 30.8, 8.98], [130, 130, 55, 6, 9.5, 17.5, 13.7, 461, 70.9, 48.2, 12.2], [150, 150, 65, 6.5, 10, 22.2, 17.4, 804, 107, 85.8, 18.8], [175, 175, 70, 7, 10.5, 26.4, 20.7, 1290, 147, 118, 23.4], [200, 200, 75, 8, 11.5, 32, 25.1, 1910, 191, 160, 29.2], [220, 220, 80, 8, 12.5, 36.8, 28.9, 2680, 244, 205, 34.8], [250, 250, 85, 9, 13.5, 44, 34.5, 4220, 338, 283, 45], [300, 300, 100, 9.5, 15, 58.4, 45.9, 8220, 548, 520, 72.4]];
const T_L: TabL[] = [[35, 4, 2.67, 2.1, 2.87, 1.13, 1.04], [40, 4, 3.08, 2.42, 4.47, 1.55, 1.21], [50, 5, 4.8, 3.77, 11, 3.05, 1.51], [60, 6, 6.91, 5.42, 22.8, 5.29, 1.82], [70, 7, 9.4, 7.38, 42.3, 8.41, 2.12], [80, 8, 12.3, 9.66, 72.2, 12.6, 2.42], [100, 10, 19.2, 15.1, 177, 24.7, 3.04], [120, 12, 27.5, 21.6, 367, 42.7, 3.65], [150, 15, 43, 33.8, 898, 83.6, 4.57], [200, 20, 76, 59.7, 2850, 198, 6.12]];
export interface ProfilTabule { nom: string; famille: 'IPN' | 'UPN' | 'UAP'; h: number; b: number; tw: number; tf: number; A: number; G: number; Iy: number; Wely: number; Iz: number; Welz: number }
export interface Corniere { nom: string; famille: 'L'; a: number; t: number; A: number; G: number; I: number; Wel: number; i: number }
const tab = (famille: ProfilTabule['famille'], l: TabI[]): ProfilTabule[] => l.map(([d, h, b, tw, tf, A, G, Iy, Wely, Iz, Welz]) =>
  ({ nom: `${famille} ${d}`, famille, h, b, tw, tf, A: A * 100, G, Iy: Iy * 1e4, Wely: Wely * 1e3, Iz: Iz * 1e4, Welz: Welz * 1e3 }));
export const TABULES: ProfilTabule[] = [...tab('IPN', T_IPN), ...tab('UPN', T_UPN), ...tab('UAP', T_UAP)];
export const CORNIERES: Corniere[] = T_L.map(([a, t, A, G, I, Wel, i]) => ({ nom: `L ${a}×${a}×${t}`, famille: 'L', a, t, A: A * 100, G, I: I * 1e4, Wel: Wel * 1e3, i: i * 10 }));
export const tabule = (nom: string) => TABULES.find(x => x.nom === nom);

/**
 * Propriétés de calcul d'un IPN : A, Iy, Iz, Wel tabulés ; Wpl, It, Iw estimés par le modèle à ailes parallèles
 * d'épaisseur moyenne tf (sans congés : Wpl et It sous-estimés, donc sécuritaires).
 */
export function proprietesIPN(p: ProfilTabule) {
  const hw = p.h - 2 * p.tf;
  const Wply = Math.min(p.b * p.tf * (p.h - p.tf) + p.tw * hw * hw / 4, 1.2 * p.Wely);
  const Wplz = p.tf * p.b * p.b / 2 + hw * p.tw * p.tw / 4;
  const It = (2 * p.b * p.tf ** 3 + hw * p.tw ** 3) / 3;
  const Iw = p.Iz * (p.h - p.tf) ** 2 / 4;
  return { h: p.h, A: p.A, Iy: p.Iy, Iz: p.Iz, Wely: p.Wely, Welz: p.Welz, Wply, Wplz, It, Iw, Avz: Math.max(p.A - 2 * p.b * p.tf + p.tw * p.tf, hw * p.tw), iy: Math.sqrt(p.Iy / p.A), iz: Math.sqrt(p.Iz / p.A), masse: p.G };
}
