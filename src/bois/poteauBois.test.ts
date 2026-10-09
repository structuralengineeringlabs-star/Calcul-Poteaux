import { describe, expect, it } from 'vitest';
import { calculerPoteauBois, BOIS_DEFAUT } from './poteauBois';

const base = (p: Partial<Parameters<typeof calculerPoteauBois>[0]> = {}) =>
  calculerPoteauBois({ L: 3, NG: 100, NQ: 60, NEd: 225, My: 0, Mz: 0, MyG: 0, MzG: 0, psiFi: 0.3, bois: { ...BOIS_DEFAUT }, ...p });

describe('Poteaux en bois (EN 1995-1-1)', () => {
  it('compression centrée GL24h 200 × 200, L = 3 m — calcul manuel de kc', () => {
    const r = base();
    const lam = 3000 / (200 / Math.sqrt(12)) / Math.PI * Math.sqrt(24 / 9600);
    const k = 0.5 * (1 + 0.1 * (lam - 0.3) + lam * lam), kc = 1 / (k + Math.sqrt(k * k - lam * lam));
    expect(r.rQ.lY).toBeCloseTo(lam, 6);
    expect(r.rQ.kcy).toBeCloseTo(kc, 6);
    expect(r.rQ.e623).toBeCloseTo(225e3 / 40000 / (kc * 0.8 * 24 / 1.25), 6);
    expect(r.verdict).toBe('conforme');
  });
  it('G seul (kmod permanent) peut gouverner ; le moment augmente 6.23', () => {
    const r = base({ NG: 150, NQ: 10, NEd: 217.5 });
    expect(r.rG!.e623).toBeGreaterThan(r.rQ.e623);
    expect(base({ My: 10, MyG: 6 }).rQ.e623).toBeGreaterThan(base().rQ.e623);
  });
  it('feu R60 : section réduite de 2 × 49 mm ; poteau élancé → non conforme', () => {
    const r = base({ bois: { ...BOIS_DEFAUT, feuR: 60 } });
    expect(r.feu?.bfi).toBeCloseTo(200 - 98, 9);
    expect(base({ L: 9, NEd: 600, NG: 250, NQ: 175 }).verdict).toBe('non conforme');
  });
});
