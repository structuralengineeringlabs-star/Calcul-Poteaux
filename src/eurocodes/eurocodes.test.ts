import { describe, expect, it } from 'vitest';
import { proprietesBeton, cMinDur, wmax, coefficientFluage, retraitFinal, fbd, lbRqd, verifierFeuPoutre, DUCTILITE } from './index';

/** Tests de la bibliothèque commune @sel/eurocodes (identiques dans chaque application qui l'embarque). */
describe('@sel/eurocodes', () => {
  it('béton C30/37 (tableau 3.1)', () => {
    const p = proprietesBeton(30);
    expect(p.fcm).toBe(38);
    expect(p.fctm).toBeCloseTo(2.896, 3);
    expect(p.Ecm).toBeCloseTo(32837, 0);
    expect(proprietesBeton(60).lambda).toBeCloseTo(0.775, 6);
  });
  it('cmin,dur (tableau 4.4N) et wmax (7.1N / 7.1NF)', () => {
    expect(cMinDur('XC4', 'S4').valeur).toBe(30);
    expect(cMinDur('XS3', 'S6').valeur).toBe(55);
    expect(cMinDur('XF1', 'S4').note).toMatch(/XC4/);
    expect(wmax('XD1', 'FR')).toBe(0.2);
    expect(wmax('XA1', 'FR')).toBeNull();
  });
  it('fluage, retrait, adhérence, feu, ductilité', () => {
    expect(coefficientFluage(30, 50, 200, 28)).toBeCloseTo(2.367, 3);
    expect(retraitFinal(25, 70, 200).epsCs * 1e6).toBeCloseTo(364.3, 1);
    expect(lbRqd(16, 500 / 1.15, fbd(25, 1.5, 16, true))).toBeCloseTo(645.8, 0);
    expect(verifierFeuPoutre(90, true, 300, 50, 50, false).aRequis).toBe(25);
    expect(DUCTILITE.B.epsUk).toBe(0.05);
  });
});

describe('@sel/eurocodes — catalogue des profilés laminés', () => {
  it('masse recalculée = masse nominale à 1 % près pour les 90 profilés (contrôle des dimensions saisies)', async () => {
    const { CATALOGUE, proprietesLamine } = await import('./catalogue');
    expect(CATALOGUE).toHaveLength(90);
    for (const p of CATALOGUE) expect(Math.abs(proprietesLamine(p).masse - p.G) / p.G, p.nom).toBeLessThan(0.01);
  });
});

describe('@sel/eurocodes — tubes finis à chaud (EN 10210-2)', () => {
  it('CHS : formules exactes ; SHS sans rayon = formule du carré creux ; aire RHS = formule de l\'EN 10210-2', async () => {
    const { proprietesTube } = await import('./catalogue');
    const c = proprietesTube({ famille: 'CHS', h: 168.3, b: 168.3, t: 8 });
    expect(c.Iy).toBeCloseTo(Math.PI / 64 * (168.3 ** 4 - 152.3 ** 4), 0);
    expect(c.masse).toBeCloseTo(31.6, 1);
    const s = proprietesTube({ famille: 'SHS', h: 100, b: 100, t: 5 });
    expect(s.A).toBeCloseTo(2 * 5 * (200 - 10) - (4 - Math.PI) * (7.5 ** 2 - 5 ** 2), 1);
    expect(s.masse).toBeCloseTo(14.7, 1);
    expect(s.Iy).toBeLessThan((100 ** 4 - 90 ** 4) / 12); // les arrondis réduisent l'inertie du carré vif
    const r = proprietesTube({ famille: 'RHS', h: 200, b: 100, t: 8 });
    expect(r.Iy).toBeGreaterThan(r.Iz);
    expect(r.A).toBeCloseTo(2 * 8 * (300 - 16) - (4 - Math.PI) * (12 ** 2 - 8 ** 2), 1);
  });
});

describe('@sel/eurocodes — familles tabulées (IPN, UPN, UAP, cornières)', () => {
  it('masse = A × 0,785 à 2 % près ; IPN : Wpl estimé entre Wel et 1,2·Wel', async () => {
    const { TABULES, CORNIERES, proprietesIPN } = await import('./catalogue');
    expect(TABULES).toHaveLength(41);
    expect(CORNIERES).toHaveLength(10);
    for (const p of [...TABULES, ...CORNIERES]) expect(Math.abs(p.G - p.A * 7850e-6) / p.G, p.nom).toBeLessThan(0.02);
    for (const p of TABULES.filter(x => x.famille === 'IPN')) { const q = proprietesIPN(p); expect(q.Wply).toBeGreaterThan(q.Wely); expect(q.Wply).toBeLessThanOrEqual(1.2 * q.Wely); }
  });
  it('IPE, HEA, HEB : propriétés recalculées à moins de 2,5 % du document fourni (écarts > 0,5 % : grands HEA/HEB, document arrondi)', async () => {
    const { CATALOGUE, proprietesLamine } = await import('./catalogue');
    const ref = (await import('../../docs/reference/catalogue_utilisateur.json')).default as unknown as Record<string, Record<string, number>[]>;
    for (const fam of ['IPE', 'HEA', 'HEB']) for (const d of ref[fam]) {
      const p = CATALOGUE.find(x => x.nom === `${fam} ${d.d}`)!, q = proprietesLamine(p);
      for (const [doc, app] of [[d.A, q.A / 100], [d.Iy, q.Iy / 1e4], [d.Iz, q.Iz / 1e4], [d.Wely, q.Wely / 1e3]]) expect(Math.abs(doc - app) / app, `${p.nom}`).toBeLessThan(fam === 'IPE' ? 0.005 : 0.025);
    }
  });
});
