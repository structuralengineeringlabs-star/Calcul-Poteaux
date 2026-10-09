/**
 * @sel/sections — géométrie paramétrique des sections et propriétés mécaniques, commune aux applications S.E.L.
 * Une section est une union de rectangles (repère : y vers le bas depuis la fibre supérieure, z horizontal, mm).
 * Propriétés exactes : aire, centre de gravité, inerties, modules élastique et plastique, constante de torsion.
 */

export interface Rect { z0: number; y0: number; b: number; h: number }

export type TypeSection = 'rect' | 'T' | 'L' | 'I';
/** Paramètres d'une poutre en béton : âme b × h, table (dalle) d'épaisseur hf et de largeur dessinée bt, talon bti × hti (section en I). */
export interface ParamSection { type: TypeSection; b: number; h: number; hf: number; bt: number; bti: number; hti: number }

/** Décomposition en rectangles. L'âme est centrée en z = 0 ; la table d'une section en L déborde d'un seul côté. */
export function rectangles(p: ParamSection): Rect[] {
  const R: Rect[] = [];
  const avecTable = p.type !== 'rect' && p.hf > 0 && p.bt > p.b;
  const avecTalon = p.type === 'I' && p.hti > 0 && p.bti > p.b;
  if (avecTable) {
    const z0 = p.type === 'L' ? -p.b / 2 : -p.bt / 2;
    R.push({ z0, y0: 0, b: p.bt, h: p.hf });
  }
  const yAme0 = avecTable ? p.hf : 0, yAme1 = avecTalon ? p.h - p.hti : p.h;
  R.push({ z0: -p.b / 2, y0: yAme0, b: p.b, h: yAme1 - yAme0 });
  if (avecTalon) R.push({ z0: -p.bti / 2, y0: p.h - p.hti, b: p.bti, h: p.hti });
  return R.filter(r => r.b > 0 && r.h > 0);
}

export interface Proprietes {
  A: number; yG: number; zG: number;   // mm², mm (yG depuis la fibre supérieure)
  Iy: number; Iz: number;              // mm⁴ (Iy : flexion dans le plan vertical)
  WelSup: number; WelInf: number;      // mm³
  Wpl: number;                         // mm³ (axe horizontal, axe neutre plastique à aire égale)
  It: number;                          // mm⁴ (somme des rectangles, formule de Saint-Venant approchée)
  h: number;
}

/** Constante de torsion d'un rectangle b × t (t ≤ b) : b·t³·(1/3 − 0,21·t/b·(1 − t⁴/(12·b⁴))). */
export const torsionRectangle = (a: number, c: number) => {
  const b = Math.max(a, c), t = Math.min(a, c);
  return b * t ** 3 * (1 / 3 - 0.21 * t / b * (1 - t ** 4 / (12 * b ** 4)));
};

export function proprietes(R: Rect[]): Proprietes {
  const A = R.reduce((s, r) => s + r.b * r.h, 0);
  const yG = R.reduce((s, r) => s + r.b * r.h * (r.y0 + r.h / 2), 0) / A;
  const zG = R.reduce((s, r) => s + r.b * r.h * (r.z0 + r.b / 2), 0) / A;
  const Iy = R.reduce((s, r) => s + r.b * r.h ** 3 / 12 + r.b * r.h * (r.y0 + r.h / 2 - yG) ** 2, 0);
  const Iz = R.reduce((s, r) => s + r.h * r.b ** 3 / 12 + r.b * r.h * (r.z0 + r.b / 2 - zG) ** 2, 0);
  const h = Math.max(...R.map(r => r.y0 + r.h));
  // Axe neutre plastique : aire au-dessus = A/2 (dichotomie), puis moments statiques des deux moitiés
  const aireAuDessus = (y: number) => R.reduce((s, r) => s + r.b * Math.min(r.h, Math.max(0, y - r.y0)), 0);
  let lo = 0, hi = h;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (aireAuDessus(m) < A / 2) lo = m; else hi = m; }
  const yp = (lo + hi) / 2;
  const Wpl = R.reduce((s, r) => {
    const a1 = Math.min(r.h, Math.max(0, yp - r.y0)), a2 = r.h - a1; // parties au-dessus et en dessous
    return s + r.b * a1 * (yp - (r.y0 + a1 / 2)) + r.b * a2 * ((r.y0 + a1 + a2 / 2) - yp);
  }, 0);
  const It = R.reduce((s, r) => s + torsionRectangle(r.b, r.h), 0);
  return { A, yG, zG, Iy, Iz, WelSup: Iy / yG, WelInf: Iy / (h - yG), Wpl, It, h };
}

export interface ErreurGeometrie { cote: keyof ParamSection; message: string }

/** Contraintes géométriques (affichées sur les cotes de l'éditeur). */
export function contraintesGeometrie(p: ParamSection): ErreurGeometrie[] {
  const e: ErreurGeometrie[] = [];
  if (p.b <= 0) e.push({ cote: 'b', message: 'Largeur d\'âme positive requise.' });
  if (p.h <= 0) e.push({ cote: 'h', message: 'Hauteur positive requise.' });
  if (p.type !== 'rect') {
    if (p.hf <= 0 || p.hf >= p.h - 50) e.push({ cote: 'hf', message: 'Table : 0 < hf < h − 50 mm.' });
  }
  if (p.type === 'I') {
    if (p.bti < p.b) e.push({ cote: 'bti', message: 'Le talon doit être au moins aussi large que l\'âme.' });
    if (p.hti <= 0) e.push({ cote: 'hti', message: 'Hauteur de talon positive requise.' });
    if (p.hf + p.hti >= p.h - 50) e.push({ cote: 'hti', message: 'Âme trop courte : hf + hti < h − 50 mm.' });
  }
  return e;
}
