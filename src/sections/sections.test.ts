import { describe, expect, it } from 'vitest';
import { proprietes, rectangles, contraintesGeometrie, torsionRectangle } from './index';

/** Tests de la bibliothèque commune @sel/sections (identiques dans chaque application qui l'embarque). */
describe('@sel/sections', () => {
  it('rectangle : A, I, Wel, Wpl, It', () => {
    const p = proprietes(rectangles({ type: 'rect', b: 300, h: 600, hf: 0, bt: 0, bti: 0, hti: 0 }));
    expect(p.A).toBe(180000);
    expect(p.Iy).toBeCloseTo(300 * 600 ** 3 / 12, 0);
    expect(p.WelSup).toBeCloseTo(300 * 600 ** 2 / 6, 0);
    expect(p.Wpl).toBeCloseTo(300 * 600 ** 2 / 4, 0);
    expect(p.It).toBeCloseTo(torsionRectangle(300, 600), 6);
  });
  it('contraintes géométriques', () => {
    expect(contraintesGeometrie({ type: 'I', b: 300, h: 600, hf: 300, bt: 1000, bti: 200, hti: 300 }).map(e => e.cote)).toEqual(expect.arrayContaining(['bti', 'hti']));
  });
});
