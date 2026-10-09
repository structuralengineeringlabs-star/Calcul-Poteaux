import { describe, expect, it } from 'vitest';
import { calculerPoteauAcier, courbes, chiFlexion, cmLineaire, rapportPsi, ACIER_DEFAUT } from './poteauAcier';

const base = (p: Partial<Parameters<typeof calculerPoteauAcier>[0]> = {}) =>
  calculerPoteauAcier({ L: 4, NEd: 1000, My: [0, 0], Mz: [0, 0], etaFi: 0.65, acier: { ...ACIER_DEFAUT }, ...p });

describe('Poteaux métalliques (EN 1993-1-1)', () => {
  it('flambement : HEB 200, S355, L = 4 m bi-articulé — calcul manuel (courbe c selon z)', () => {
    const r = base();
    const A = 7808, NRk = A * 355, Ncrz = Math.PI ** 2 * 210000 * 2003.4e4 / 4000 ** 2;
    const lam = Math.sqrt(NRk / Ncrz);
    const phi = 0.5 * (1 + 0.49 * (lam - 0.2) + lam * lam), chi = 1 / (phi + Math.sqrt(phi * phi - lam * lam));
    expect(r.lZ).toBeCloseTo(lam, 2);
    expect(r.chiZ).toBeCloseTo(chi, 2);
    expect(r.NbRd / 1e3).toBeCloseTo(chi * NRk / 1e3, -1);
    expect(r.courbes).toEqual({ y: 'b', z: 'c' });
  });
  it('courbes du tableau 6.2', () => {
    expect(courbes(true, 300, 150, 10.7, 'S355')).toEqual({ y: 'a', z: 'b' });   // IPE 300
    expect(courbes(true, 300, 150, 10.7, 'S460')).toEqual({ y: 'a0', z: 'a0' });
    expect(courbes(true, 300, 300, 19, 'S355')).toEqual({ y: 'b', z: 'c' });     // HEB 300
    expect(courbes(false, 400, 300, 50, 'S355')).toEqual({ y: 'c', z: 'd' });    // PRS épais
  });
  it('χ = 1 pour λ ≤ 0,2 ; Cm et ψ', () => {
    expect(chiFlexion(0.15, 0.49)).toBe(1);
    expect(cmLineaire(1)).toBe(1);
    expect(cmLineaire(-1)).toBe(0.4);
    expect(rapportPsi(80, -40)).toBe(-0.5);
  });
  it('flexion composée : le moment augmente les critères 6.61 et 6.62 ; compression seule = NEd/(χ·NRk)', () => {
    const n = base(), m = base({ My: [80, 40] });
    expect(n.eq661).toBeCloseTo(1000e3 / (n.chiY * n.NRk), 6);
    expect(m.eq661).toBeGreaterThan(n.eq661);
    expect(m.eq662).toBeGreaterThan(n.eq662);
    expect(m.chiLt).toBeLessThanOrEqual(1);
  });
  it('maintien contre le déversement : χLT = 1', () => {
    expect(base({ My: [80, 40], acier: { ...ACIER_DEFAUT, maintienDeversement: true } }).chiLt).toBe(1);
  });
  it('surcharge → non conforme ; classe 4 détectée sur un PRS mince', () => {
    expect(base({ NEd: 5000 }).verdict).toBe('non conforme');
    const r = base({ acier: { ...ACIER_DEFAUT, profil: 'PRS', bf: 400, tf: 8, hw: 400, tw: 5 } });
    expect(r.classe).toBe(4);
    expect(r.verdict).toBe('non conforme');
  });
});

describe('Poteaux métalliques — tubes finis à chaud', () => {
  it('SHS 200×200×10, S355 : courbe a, pas de flambement par torsion ni de déversement, interaction tableau B.1', () => {
    const r = base({ My: [50, 25], acier: { ...ACIER_DEFAUT, profil: 'SHS 200×200×10' } });
    expect(r.courbes).toEqual({ y: 'a', z: 'a' });
    expect(r.chiT).toBe(1);
    expect(r.chiLt).toBe(1);
    expect(r.kzy).toBeCloseTo(0.6 * r.kyy, 9);
    expect(r.classe).toBeLessThanOrEqual(2);
  });
  it('CHS 168,3×8 : classe 1 (d/t = 21 ≤ 50ε²) ; flambement contre calcul manuel', () => {
    const r = base({ L: 3, NEd: 500, acier: { ...ACIER_DEFAUT, profil: 'CHS 168,3×8', nuance: 'S235' } });
    expect(r.classe).toBe(1);
    const A = Math.PI / 4 * (168.3 ** 2 - 152.3 ** 2), I = Math.PI / 64 * (168.3 ** 4 - 152.3 ** 4);
    const lam = Math.sqrt(A * 235 / (Math.PI ** 2 * 210000 * I / 3000 ** 2));
    const phi = 0.5 * (1 + 0.21 * (lam - 0.2) + lam * lam);
    expect(r.chiY).toBeCloseTo(1 / (phi + Math.sqrt(phi * phi - lam * lam)), 6);
  });
});
