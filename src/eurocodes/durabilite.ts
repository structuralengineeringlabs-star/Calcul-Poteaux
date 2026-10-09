/**
 * @sel/eurocodes — durabilité et enrobage (NF EN 1992-1-1 §4.4.1), ouverture admissible des fissures (tab. 7.1N / 7.1NF).
 * Module commun aux applications S.E.L. (poteaux, poutres) : une seule source vérifiée.
 */
export type Annexe = 'EC2' | 'FR';
export const EXPOSITIONS = ['X0', 'XC1', 'XC2', 'XC3', 'XC4', 'XD1', 'XD2', 'XD3', 'XS1', 'XS2', 'XS3', 'XF1', 'XF2', 'XF3', 'XF4', 'XA1', 'XA2', 'XA3'];

// Tableau 4.4N — cmin,dur (mm), béton armé, classes S1 à S6
export const CMIN_DUR: Record<string, number[]> = {
  X0: [10, 10, 10, 10, 15, 20],
  XC1: [10, 10, 10, 15, 20, 25],
  XC23: [10, 15, 20, 25, 30, 35],
  XC4: [15, 20, 25, 30, 35, 40],
  XDS1: [20, 25, 30, 35, 40, 45],
  XDS2: [25, 30, 35, 40, 45, 50],
  XDS3: [30, 35, 40, 45, 50, 55],
};
export function ligneExposition(e: string): { row: string; note: string | null } {
  switch (e) {
    case 'X0': return { row: 'X0', note: null };
    case 'XC1': return { row: 'XC1', note: null };
    case 'XC2': case 'XC3': return { row: 'XC23', note: null };
    case 'XC4': return { row: 'XC4', note: null };
    case 'XD1': case 'XS1': return { row: 'XDS1', note: null };
    case 'XD2': case 'XS2': return { row: 'XDS2', note: null };
    case 'XD3': case 'XS3': return { row: 'XDS3', note: null };
    case 'XF1': case 'XF3': return { row: 'XC4', note: `${e} : le tableau 4.4N ne donne pas cmin,dur ; valeur de XC4 retenue à titre indicatif (voir Annexe nationale).` };
    case 'XF2': case 'XF4': return { row: e === 'XF2' ? 'XDS1' : 'XDS2', note: `${e} (sels de déverglaçage) : valeur de la classe XD équivalente retenue à titre indicatif (voir Annexe nationale).` };
    default: return { row: 'XC4', note: `${e} : l'attaque chimique se traite par la composition du béton ; cmin,dur de XC4 retenu à titre indicatif.` };
  }
}

/** Ouverture de fissure admissible wmax (mm), combinaison quasi-permanente, béton armé (tab. 7.1N / 7.1NF). */
export function wmax(exposition: string, annexe: Annexe): number | null {
  if (exposition === 'X0' || exposition === 'XC1') return 0.4;
  if (/^XA/.test(exposition)) return annexe === 'FR' ? null : 0.3;
  if (/^X[DS]/.test(exposition)) return annexe === 'FR' ? 0.2 : 0.3;
  return 0.3;
}


/** cmin,dur (tab. 4.4N) pour une exposition et une classe structurale « S1 » à « S6 ». */
export function cMinDur(exposition: string, classeStructurale: string): { valeur: number; note: string | null; classe: string } {
  const { row, note } = ligneExposition(exposition);
  const s = parseInt(String(classeStructurale).replace('S', ''), 10);
  const i = Number.isFinite(s) ? Math.min(5, Math.max(0, s - 1)) : 3;
  return { valeur: CMIN_DUR[row][i], note, classe: `S${i + 1}` };
}
