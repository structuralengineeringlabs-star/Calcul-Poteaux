/**
 * @sel/eurocodes — bois de structure (NF EN 1995-1-1, EN 1995-1-2).
 * Classes de résistance : bois massif résineux (EN 338:2016) et lamellé-collé (EN 14080:2013). Unités : MPa, kg/m³.
 */
export interface ClasseBois {
  nom: string; type: 'massif' | 'lamelle';
  fmk: number; ft0k: number; ft90k: number; fc0k: number; fc90k: number; fvk: number;
  E0mean: number; E005: number; Gmean: number; rhok: number; rhomean: number;
}
type R = [string, number, number, number, number, number, number, number, number, number, number, number];
const massif: R[] = [
  ['C14', 14, 7.2, 0.4, 16, 2.0, 3.0, 7000, 4700, 440, 290, 350], ['C16', 16, 8.5, 0.4, 17, 2.2, 3.2, 8000, 5400, 500, 310, 370],
  ['C18', 18, 10, 0.4, 18, 2.2, 3.4, 9000, 6000, 560, 320, 380], ['C20', 20, 11.5, 0.4, 19, 2.3, 3.6, 9500, 6400, 590, 330, 400],
  ['C22', 22, 13, 0.4, 20, 2.4, 3.8, 10000, 6700, 630, 340, 410], ['C24', 24, 14.5, 0.4, 21, 2.5, 4.0, 11000, 7400, 690, 350, 420],
  ['C27', 27, 16.5, 0.4, 22, 2.6, 4.0, 11500, 7700, 720, 360, 430], ['C30', 30, 19, 0.4, 24, 2.7, 4.0, 12000, 8000, 750, 380, 460],
  ['C35', 35, 22.5, 0.4, 25, 2.7, 4.0, 13000, 8700, 810, 390, 470], ['C40', 40, 26, 0.4, 27, 2.8, 4.0, 14000, 9400, 880, 400, 480],
];
const lamelle: R[] = [
  ['GL24h', 24, 19.2, 0.5, 24, 2.5, 3.5, 11500, 9600, 650, 385, 420], ['GL28h', 28, 22.3, 0.5, 28, 2.5, 3.5, 12600, 10500, 650, 425, 460],
  ['GL32h', 32, 25.6, 0.5, 32, 2.5, 3.5, 14200, 11800, 650, 440, 490], ['GL24c', 24, 17, 0.5, 21.5, 2.5, 3.5, 11000, 9100, 650, 365, 400],
  ['GL28c', 28, 19.5, 0.5, 24, 2.5, 3.5, 12500, 10400, 650, 390, 420], ['GL32c', 32, 19.5, 0.5, 24.5, 2.5, 3.5, 13500, 11200, 650, 400, 440],
];
const conv = (type: ClasseBois['type']) => ([nom, fmk, ft0k, ft90k, fc0k, fc90k, fvk, E0mean, E005, Gmean, rhok, rhomean]: R): ClasseBois =>
  ({ nom, type, fmk, ft0k, ft90k, fc0k, fc90k, fvk, E0mean, E005, Gmean, rhok, rhomean });
export const CLASSES_BOIS: ClasseBois[] = [...massif.map(conv('massif')), ...lamelle.map(conv('lamelle'))];
export const classeBois = (nom: string) => CLASSES_BOIS.find(c => c.nom === nom);

export type Duree = 'permanente' | 'longue' | 'moyenne' | 'courte' | 'instantanee';
/** kmod (tableau 3.1), bois massif et lamellé-collé. */
export function kmod(classeService: 1 | 2 | 3, d: Duree): number {
  const t: Record<Duree, [number, number]> = { permanente: [0.6, 0.5], longue: [0.7, 0.55], moyenne: [0.8, 0.65], courte: [0.9, 0.7], instantanee: [1.1, 0.9] };
  return classeService === 3 ? t[d][1] : t[d][0];
}
/** kdef (tableau 3.2), bois massif et lamellé-collé. */
export const kdef = (classeService: 1 | 2 | 3) => (classeService === 1 ? 0.6 : classeService === 2 ? 0.8 : 2.0);
/** γM (tableau 2.3, valeurs recommandées). */
export const gammaMBois = (c: ClasseBois) => (c.type === 'massif' ? 1.3 : 1.25);
/** kh : effet de hauteur en flexion (§3.2(3), §3.3(3)). */
export const kh = (c: ClasseBois, h: number) => (c.type === 'massif' ? (h < 150 ? Math.min(Math.pow(150 / h, 0.2), 1.3) : 1) : (h < 600 ? Math.min(Math.pow(600 / h, 0.1), 1.1) : 1));
/** Déversement d'une section rectangulaire (§6.3.3) : σm,crit = 0,78·b²·E0,05/(h·ℓef) ; kcrit. */
export function kcrit(c: ClasseBois, b: number, h: number, lef: number) {
  const sigmaCrit = 0.78 * b * b * c.E005 / (h * lef);
  const lam = Math.sqrt(c.fmk / sigmaCrit);
  return { sigmaCrit, lambdaRelM: lam, kcrit: lam <= 0.75 ? 1 : lam <= 1.4 ? 1.56 - 0.75 * lam : 1 / (lam * lam) };
}
/** Flambement d'une barre comprimée (§6.3.2) : kc. */
export function kcFlambement(c: ClasseBois, lambdaRel: number) {
  const betaC = c.type === 'massif' ? 0.2 : 0.1;
  const k = 0.5 * (1 + betaC * (lambdaRel - 0.3) + lambdaRel * lambdaRel);
  return lambdaRel <= 0.3 ? 1 : Math.min(1, 1 / (k + Math.sqrt(k * k - lambdaRel * lambdaRel)));
}
/** Méthode de la section réduite (EN 1995-1-2 §4.2.2) : def = βn·t + k0·d0 (d0 = 7 mm, k0 = 1 pour t ≥ 20 min). */
export function profondeurCarbonisation(c: ClasseBois, t: number) {
  const betaN = c.type === 'massif' ? 0.8 : 0.7; // mm/min (tableau 3.1, résineux)
  const k0 = t >= 20 ? 1 : t / 20;
  return { betaN, dchar: betaN * t, def: betaN * t + k0 * 7 };
}
/** kfi (EN 1995-1-2 tableau 2.1). */
export const kfi = (c: ClasseBois) => (c.type === 'massif' ? 1.25 : 1.15);
