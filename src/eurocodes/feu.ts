/**
 * @sel/eurocodes — résistance au feu des poutres par valeurs tabulées (NF EN 1992-1-2 §5.6).
 * Tableau 5.5 : poutres sur appuis simples ; tableau 5.6 : poutres continues ; épaisseur d'âme minimale classe WA.
 * Couples (bmin ; a) en mm, interpolation linéaire entre les colonnes.
 */
type Couples = [number, number][];
export const TAB_5_5: Record<number, Couples> = {
  30: [[80, 25], [120, 20], [160, 15], [200, 15]],
  60: [[120, 40], [160, 35], [200, 30], [300, 25]],
  90: [[150, 55], [200, 45], [300, 40], [400, 35]],
  120: [[200, 65], [240, 60], [300, 55], [500, 50]],
  180: [[240, 80], [300, 70], [400, 65], [600, 60]],
  240: [[280, 90], [350, 80], [500, 75], [700, 70]],
};
export const TAB_5_6: Record<number, Couples> = {
  30: [[80, 15], [160, 12]],
  60: [[120, 25], [200, 12]],
  90: [[150, 35], [250, 25]],
  120: [[200, 45], [300, 35], [450, 35], [500, 30]],
  180: [[240, 60], [400, 50], [550, 50], [600, 40]],
  240: [[280, 75], [500, 60], [650, 60], [700, 50]],
};
/** Épaisseur d'âme minimale bw, classe WA (tableaux 5.5 et 5.6). */
export const BW_MIN_WA: Record<number, number> = { 30: 80, 60: 100, 90: 110, 120: 130, 180: 150, 240: 170 };
export const DUREES_FEU = [30, 60, 90, 120, 180, 240];

/** Distance a requise pour une largeur b (null si b < bmin de la première colonne). */
export function distanceRequise(couples: Couples, b: number): number | null {
  if (b < couples[0][0]) return null;
  for (let i = 0; i < couples.length - 1; i++) {
    const [b1, a1] = couples[i], [b2, a2] = couples[i + 1];
    if (b <= b2) return a1 + (a2 - a1) * (b - b1) / (b2 - b1);
  }
  return couples[couples.length - 1][1];
}

export interface VerifFeu {
  R: number; tableau: '5.5' | '5.6';
  bmin: number; b: number; aRequis: number | null; aFourni: number;
  aCoinRequis: number | null; aCoinFourni: number | null; // barres d'angle, un seul lit (§5.6.3)
  bwMin: number;
  ok: boolean;
}

/**
 * Vérification d'une travée. continue : tableau 5.6, sinon 5.5. am : distance moyenne à l'axe des armatures (éq. 5.5),
 * aLat : distance de l'axe des barres d'angle au parement latéral, unLit : un seul lit d'armatures.
 */
export function verifierFeuPoutre(R: number, continue_: boolean, b: number, am: number, aLat: number, unLit: boolean): VerifFeu {
  const tab = continue_ ? TAB_5_6[R] : TAB_5_5[R];
  const aRequis = distanceRequise(tab, b);
  // Barres d'angle d'un lit unique : asd = a + 10 mm si b est inférieur à la colonne 4 (5.5) ou 3 (5.6)
  const seuil = continue_ ? tab[1][0] : tab[2][0];
  const aCoinRequis = unLit && aRequis !== null && b < seuil ? aRequis + 10 : null;
  const aCoinFourni = aCoinRequis !== null ? aLat : null;
  const bwMin = BW_MIN_WA[R];
  const ok = aRequis !== null && am >= aRequis - 1e-9 && b >= bwMin && (aCoinRequis === null || (aCoinFourni ?? 0) >= aCoinRequis - 1e-9);
  return { R, tableau: continue_ ? '5.6' : '5.5', bmin: tab[0][0], b, aRequis, aFourni: am, aCoinRequis, aCoinFourni, bwMin, ok };
}
