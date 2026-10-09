import { describe, it, expect } from 'vitest';
import {
  materialProps, geometryProps, momentResistance, type Shape, axialResistance, calculerPoteau,
  concreteLabel, creepCoefficient, buildSection, effectiveLength, alphaH, anchorage, wmax, type RCSection, type Materials, type Geometry, type Rebar, type Loads,
} from './eurocode';

const mat: Materials = { concreteClass: '30', fck: 30, steelGrade: '500', fyk: 500, exposureClass: 'XC4', structuralClass: 'S4', deltaCdev: 5, alphaCC: 0.85 };
const rebar = (nBars = 4, phiL = 16, extra: Partial<Rebar> = {}): Rebar => ({ phiL, nBars, phiW: 8, spacing: 200, anchoringFactor: 50, overlapFactor: 50, numAnchors: 1, numLaps: 1, ...extra });
const rect = (b: number, h: number, L = 3.5): Geometry => ({ shape: 'rect', params: { b, h }, L, beta: 1, coeffA: 0.7, coeffB: 1.1, coeffC: 0.7, phi_ef: 2.5 });
const loads = (NEd: number, MEd_user = 0, MEd_z = 0): Loads => ({ solicitationType: MEd_user || MEd_z ? 'flexion_composee' : 'compression', NEd, MEd_user, MEd_z, VEd: 0, TEd: 0 });

// Section d'essai : 300×400, 2 lits symétriques à d' = 50 mm
const twoLayers = (As: number): RCSection => ({ kind: 'rect', b: 300, h: 400, dPrime: 50, layoutNote: null,
  bars: [{ u: 150, v: 0, A: As / 2 }, { u: -150, v: 0, A: As / 2 }],
  outline: [[-150, -200], [150, -200], [150, 200], [-150, 200]], ties: [], A: 120000, Ih: 300 * 400 ** 3 / 12, Ib: 400 * 300 ** 3 / 12,
  uMin: -200, uMax: 200, vMin: -150, vMax: 150, tMin: 300, keyBars: 4, keyIdx: [], rotation: 0, centroid: [0, 0], label: 'test' });

describe('Matériaux', () => {
  const mp = materialProps(mat, rebar());
  it('fcd, fyd', () => {
    expect(mp.fcd).toBeCloseTo(17.0, 6);
    expect(mp.fyd).toBeCloseTo(434.78, 2);
  });
  it('libellés des classes de béton (tableau 3.1)', () => {
    expect(concreteLabel(30)).toBe('C30/37');
    expect(concreteLabel(35)).toBe('C35/45');
    expect(concreteLabel(90)).toBe('C90/105');
  });
  it('enrobage tableau 4.4N', () => {
    expect(materialProps({ ...mat, exposureClass: 'X0' }, rebar(4, 8, { phiW: 6 })).cMinDur).toBe(10);
    expect(materialProps({ ...mat, exposureClass: 'XC1' }, rebar()).cMinDur).toBe(15);
    expect(materialProps({ ...mat, exposureClass: 'XD1' }, rebar()).cMinDur).toBe(35);
    expect(materialProps({ ...mat, exposureClass: 'XS3' }, rebar()).cMinDur).toBe(45);
    expect(materialProps({ ...mat, exposureClass: 'XC4', structuralClass: 'S1' }, rebar()).cMinDur).toBe(15);
    expect(materialProps({ ...mat, exposureClass: 'XC4', structuralClass: 'S3' }, rebar()).cMinDur).toBe(25);
  });
  it('cmin,b pour gros diamètres', () => {
    const m = materialProps({ ...mat, exposureClass: 'X0' }, rebar(4, 32, { phiW: 8 }));
    expect(m.cMin).toBe(24); // φl − φw
  });
  it('béton HR : paramètres du tableau 3.1 pour C70', () => {
    const m = materialProps({ ...mat, fck: 70 }, rebar());
    expect(m.epsC2 * 1000).toBeCloseTo(2.42, 2);
    expect(m.epsCu2 * 1000).toBeCloseTo(2.66, 2);
    expect(m.nPar).toBeCloseTo(1.44, 2);
  });
});

describe('Géométrie', () => {
  it('rectangle', () => {
    const g = geometryProps(rect(30, 40));
    expect(g.A).toBe(1200);
    expect(g.i_min).toBeCloseTo(30 / Math.sqrt(12), 6);
  });
  it('L à ailes égales : Imin = I sur l\'axe de symétrie faible (valeur manuelle)', () => {
    // L 30×30 d'épaisseur 10 : Ix = Iy = 36 166,7 ; Ixy = −18 000 → Imin = 18 166,7 cm⁴
    const g = geometryProps({ ...rect(1, 1), shape: 'L', params: { b1: 10, h1: 30, b2: 30, h2: 10 } });
    expect(g.A).toBeCloseTo(500, 6);
    expect(g.Imin).toBeCloseTo(18166.67, 1);
  });
  it('quart de cercle : axes principaux', () => {
    const g = geometryProps({ ...rect(1, 1), shape: 'quart', params: { r: 30 } });
    expect(g.Imin / 30 ** 4).toBeCloseTo(0.03843, 4);
  });
  it('T : théorème de Huygens (intégration numérique)', () => {
    // âme 20×40 + table 60×10 : Iy (axe vertical) = 40·20³/12 + 10·60³/12 = 206 667 cm⁴
    // Ix (axe horizontal, au centre de gravité y = 30,71) = 325 952 cm⁴ → Imin = Iy
    const g = geometryProps({ ...rect(1, 1), shape: 'T', params: { ba: 20, ha: 40, bs: 60, hs: 10 } });
    expect(g.A).toBeCloseTo(1400, 6);
    expect(g.Imin).toBeCloseTo(206666.67, 1);
  });
});

describe('Diagramme d\'interaction (référence Python indépendante)', () => {
  const mp = materialProps(mat, rebar());
  const ref: [number, number, number][] = [
    [800, 1500e3, 114.18], [1500, 1000e3, 186.45], [2000, 500e3, 203.84], [1000, 0, 71.28], [2500, 2200e3, 128.73],
  ];
  for (const [As, N, M] of ref) {
    it(`As=${As} mm², N=${N / 1000} kN → MRd=${M} kNm`, () => {
      const MRd = momentResistance(twoLayers(As), 'h', N, 1, mp)! / 1e6;
      expect(MRd).toBeCloseTo(M, 0);
    });
  }
  it('compression centrée : Ac·fcd + As·(Es·εc2 − fcd)', () => {
    const N = axialResistance(twoLayers(804), 1, mp) / 1000;
    expect(N).toBeCloseTo((120000 * 17 + 804 * (400 - 17)) / 1000, 0);
  });
  it('NEd hors domaine → null', () => {
    expect(momentResistance(twoLayers(800), 'h', 5000e3, 1, mp)).toBeNull();
  });
});

describe('Calcul complet', () => {
  it('cas par défaut : 30×40, 1500 kN, 4HA16 conforme', () => {
    const r = calculerPoteau(mat, rect(30, 40), loads(1500), rebar());
    expect(r.verdict).toBe('OK');
    expect(r.As_min).toBeCloseTo(3.45, 2);
    expect(r.directions).toHaveLength(2);
  });
  it('le second ordre est calculé autour de l\'axe faible', () => {
    const r = calculerPoteau(mat, rect(25, 50), loads(1500), rebar());
    const dh = r.directions.find(d => d.dir === 'h')!, db = r.directions.find(d => d.dir === 'b')!;
    expect(db.lambda).toBeGreaterThan(dh.lambda);
    expect(db.e2).toBeGreaterThan(dh.e2);
    expect(r.governing!.dir).toBe('b');
  });
  it('régression : forte flexion — l\'ancienne version renvoyait 0 cm²', () => {
    const r = calculerPoteau(mat, rect(30, 40), loads(800, 150), rebar(4, 16));
    expect(r.As_req).toBeGreaterThan(8.35); // ≥ besoin au premier ordre seul
    expect(r.verdict).toBe('KO');
  });
  it('As_req rend la section juste suffisante', () => {
    const r = calculerPoteau(mat, rect(30, 40), loads(1200, 80), rebar(8, 16));
    expect(isFinite(r.As_req)).toBe(true);
    // avec As fourni = As_req (même disposition), le taux de travail doit être ≈ 1
    const phi = Math.sqrt(r.As_req * 400 / (8 * Math.PI));
    const r2 = calculerPoteau(mat, rect(30, 40), loads(1200, 80), { ...rebar(8, 16), phiL: phi });
    expect(r2.util).toBeLessThanOrEqual(1.02);
    expect(r2.util).toBeGreaterThan(0.9);
  });
  it('hexagone : calculé, une barre par angle exigée (§9.5.2(4))', () => {
    const g: Geometry = { ...rect(1, 1), shape: 'hex', params: { a: 25 } };
    expect(calculerPoteau(mat, g, loads(1000), rebar(4)).verdict).toBe('KO');
    expect(calculerPoteau(mat, g, loads(1000), rebar(6)).verdict).toBe('OK');
  });
  it('dispositions constructives : cadres trop espacés', () => {
    const r = calculerPoteau(mat, rect(30, 40), loads(1500), rebar(4, 16, { spacing: 350 }));
    expect(r.checks.find(c => c.label.startsWith('Espacement courant'))!.ok).toBe(false);
    expect(r.verdict).toBe('KO');
  });
  it('ELS : non vérifié sans Nqp, calculé sinon', () => {
    expect(calculerPoteau(mat, rect(30, 40), loads(1500), rebar()).els.computed).toBe(false);
    const r = calculerPoteau(mat, rect(30, 40), { ...loads(1500), Nqp: 900 }, rebar());
    expect(r.els.computed).toBe(true);
    expect(r.els.sigma_c).toBeGreaterThan(5);
    expect(r.els.sigma_c).toBeLessThan(900e3 / 120000);
  });
});

describe('Priorité 1 : second ordre et sollicitations', () => {
  it('fluage annexe B : C30/37, RH 50 %, h0 = 200 mm, t0 = 28 j, ciment N, 20 °C (calcul manuel)', () => {
    // (B.10) à 20 °C : tT = 28 × exp(−(4000/293 − 13,65)) = 27,95 j → φ = 1,7777 × 2,7253 × 1/(0,1 + 27,95^0,2) = 2,367
    expect(creepCoefficient(30, 50, 200, 28, 'N')).toBeCloseTo(2.367, 3);
  });
  it('fluage : climat chaud (25 °C) → âge équivalent plus grand, fluage plus faible (B.10)', () => {
    const tT = 28 * Math.exp(-(4000 / 298 - 13.65));
    expect(tT).toBeCloseTo(35.14, 1);
    expect(creepCoefficient(30, 50, 200, 28, 'N', 25)).toBeLessThan(creepCoefficient(30, 50, 200, 28, 'N', 20));
  });
  it('fluage : ciment rapide < normal < lent', () => {
    const r = creepCoefficient(30, 70, 150, 14, 'R'), n = creepCoefficient(30, 70, 150, 14, 'N'), sl = creepCoefficient(30, 70, 150, 14, 'S');
    expect(r).toBeLessThan(n); expect(n).toBeLessThan(sl);
  });
  it('longueur efficace §5.8.3.2', () => {
    const g = rect(30, 40, 4);
    expect(effectiveLength({ ...g, lengthMode: 'k', k1: 1e6, k2: 1e6 }).l0).toBeCloseTo(4, 2);      // bi-articulé contreventé
    expect(effectiveLength({ ...g, lengthMode: 'k', k1: 0.1, k2: 0.1 }).l0).toBeCloseTo(0.5909 * 4, 3);
    expect(effectiveLength({ ...g, lengthMode: 'k', braced: false, k1: 0.1, k2: 0.1 }).l0).toBeCloseTo(Math.sqrt(1.5) * 4, 3);
    expect(effectiveLength({ ...g, lengthMode: 'k', braced: false, k1: 0.1, k2: 1e6 }).l0).toBeCloseTo((1 + 0.1 / 1.1) * 2 * 4, 2); // console
  });
  it('αh §5.2(5)', () => {
    expect(alphaH(3.5)).toBe(1);
    expect(alphaH(6)).toBeCloseTo(2 / Math.sqrt(6), 6);
    expect(alphaH(12)).toBeCloseTo(2 / 3, 6);
  });
  const flex = (top: number, bot: number, curvH: 'simple' | 'double', extra: Partial<Loads> = {}): Loads =>
    ({ solicitationType: 'flexion_composee', NEd: 1200, MEd_user: 0, Mh_top: top, Mh_bot: bot, curvH, VEd: 0, TEd: 0, ...extra });
  it('moment équivalent M0e et MEd (§5.8.8.2), courbure simple', () => {
    const d = calculerPoteau(mat, rect(30, 40), flex(100, 50, 'simple'), rebar(6, 16)).directions[0];
    // ei = l0/400 = 8,75 mm → N·ei = 10,5 kNm
    expect(d.M02).toBeCloseTo(110.5, 1);
    expect(d.M01).toBeCloseTo(60.5, 1);
    expect(d.M0e).toBeCloseTo(0.6 * 110.5 + 0.4 * 60.5, 1);
    expect(d.MEd).toBeCloseTo(Math.max(110.5, d.M0e + d.M2, 60.5 + 0.5 * d.M2), 3);
    expect(d.coefC).toBeCloseTo(1.7 - 60.5 / 110.5, 3);
  });
  it('double courbure : C > 1,7 et λlim plus élevé', () => {
    const s1 = calculerPoteau(mat, rect(30, 40), flex(100, 50, 'simple'), rebar(6, 16)).directions[0];
    const s2 = calculerPoteau(mat, rect(30, 40), flex(100, 50, 'double'), rebar(6, 16)).directions[0];
    expect(s2.coefC).toBeGreaterThan(1.7);
    expect(s2.lambdaLim).toBeGreaterThan(s1.lambdaLim);
  });
  it('non contreventé ou charges transversales : rm = 1 (C = 0,7)', () => {
    expect(calculerPoteau(mat, { ...rect(30, 40), braced: false }, flex(100, 50, 'double'), rebar(6, 16)).directions[0].coefC).toBeCloseTo(0.7, 6);
    expect(calculerPoteau(mat, rect(30, 40), flex(100, 50, 'double', { transverse: true }), rebar(6, 16)).directions[0].coefC).toBeCloseTo(0.7, 6);
  });
  it('moment constant : c = 8', () => {
    expect(calculerPoteau(mat, rect(30, 40), flex(100, 100, 'simple'), rebar(6, 16)).directions[0].c).toBe(8);
    expect(calculerPoteau(mat, rect(30, 40), flex(100, 40, 'simple'), rebar(6, 16)).directions[0].c).toBe(10);
  });
  it('φef = 0 si les conditions du §5.8.4(4) sont remplies', () => {
    const g: Geometry = { ...rect(30, 40), phiMode: 'calcule', RH: 80, t0: 90, cement: 'N' };
    const r = calculerPoteau(mat, g, flex(250, 250, 'simple', { NEd: 500 }), rebar(8, 20));
    expect(r.geom.phiInf!).toBeLessThanOrEqual(2);
    const dh = r.directions.find(d => d.dir === 'h')!;
    expect(dh.phiEf).toBe(0);
  });
  it('combinaisons G + Q et poids propre', () => {
    const r = calculerPoteau(mat, rect(30, 40, 3), { ...loads(0), loadMode: 'GQ', NG: 800, NQ: 400, psi2: 0.3, selfWeight: true }, rebar());
    const pp = 25 * 0.12 * 3;
    expect(r.loads.NEd).toBeCloseTo(1.35 * (800 + pp) + 1.5 * 400, 6);
    expect(r.loads.Nqp).toBeCloseTo(800 + pp + 120, 6);
    expect(r.loads.Ncar).toBeCloseTo(1200 + pp, 6);
  });
  it('ELS : 0,6 fck sous combinaison caractéristique en XD, 0,45 fck sous quasi-permanente', () => {
    const matXD = { ...mat, exposureClass: 'XD1' };
    const r = calculerPoteau(matXD, rect(30, 40), { ...loads(2500), Nqp: 1200, Ncar: 2300 }, rebar());
    expect(r.els.sigma_car!).toBeGreaterThan(r.els.sigma_c);
    expect(r.els.limit06).toBeCloseTo(18, 6);
    expect(r.els.ok).toBe(r.els.sigma_c <= 13.5 && r.els.sigma_car! <= 18);
  });
});

describe('Priorité 2 : dispositions, ancrages, effort tranchant', () => {
  const mp = materialProps(mat, rebar());
  it('ancrage §8.4 : C30/37, B500, Φ16, bonne adhérence (calcul manuel)', () => {
    // fctd = 0,7 × 0,30 × 30^(2/3) / 1,5 = 1,3515 ; fbd = 2,25 fctd = 3,041 ; lb,rqd = 16/4 × 434,78 / 3,041 = 571,8 mm
    const a = anchorage(mp, 30, rebar(4, 16), 'compression', null);
    expect(a.fbd).toBeCloseTo(3.041, 3);
    expect(a.lb_rqd).toBeCloseTo(571.8, 1);
    expect(a.lbd).toBeCloseTo(571.8, 1);
    expect(a.l0).toBeCloseTo(1.5 * 571.84, 1); // α6 = 1,5 pour 100 % recouvert
  });
  it('ancrage : adhérence médiocre et α6', () => {
    const a = anchorage(mp, 30, rebar(4, 16, { bond: 'mediocre', lapPercent: 25 }), 'compression', null);
    expect(a.lb_rqd).toBeCloseTo(571.84 / 0.7, 1);
    expect(a.alpha6).toBe(1);
  });
  it('ancrage : α2 en traction selon cd', () => {
    const a = anchorage(mp, 30, rebar(4, 16), 'traction', 43);
    expect(a.alpha2).toBeCloseTo(Math.max(0.7, 1 - 0.15 * (43 - 16) / 16), 6);
  });
  it('fbd limité à C60/75 (§8.4.2(2))', () => {
    const m90 = materialProps({ ...mat, fck: 90 }, rebar());
    expect(anchorage(m90, 90, rebar(), 'compression', null).fbd).toBeCloseTo(anchorage(m90, 60, rebar(), 'compression', null).fbd, 9);
  });
  it('effort tranchant avec compression (calcul manuel)', () => {
    const r = calculerPoteau(mat, rect(30, 40), { ...loads(1500), VEd: 150 }, rebar());
    const d = r.shear.dirs[0];
    // d = 349 mm, ρl = 402/(300×349), σcp = 0,2 fcd = 3,4 MPa → VRd,c = 103,3 kN
    expect(d.VRd_c).toBeCloseTo(103.26, 1);
    // αcw = 2,5(1 − 12,5/17) = 0,662 ; ν1 = 0,528 ; z = 314,1 mm → VRd,max(cot 2,5) = 193,0 kN
    expect(d.VRd_max).toBeCloseTo(193.0, 0);
    expect(d.Asw_req).toBeCloseTo(150000 / (314.1 * 434.78 * 2.5) * 1000, 0);
    expect(r.shear.ok).toBe(true);
  });
  it('cot θ réduit quand la bielle est trop sollicitée', () => {
    const r = calculerPoteau(mat, rect(30, 40), { ...loads(1500), VEd: 150, VEd_b: 60, TEd: 15 }, rebar());
    const dh = r.shear.dirs[0];
    expect(dh.cot).toBeLessThan(2.5);
    expect(dh.interaction).toBeLessThanOrEqual(1);
  });
  it('recouvrements : As ≤ 8 % dans la zone de recouvrement', () => {
    const r = calculerPoteau(mat, rect(30, 30), loads(1500), rebar(12, 25, { spacing: 150 }));
    expect(r.checks.find(c => c.label.startsWith('Section d\'acier dans les recouvrements'))!.ok).toBe(false);
  });
  it('cadres resserrés aux abouts et aux recouvrements (Φl > 14)', () => {
    const r = calculerPoteau(mat, rect(30, 40), loads(1500), rebar(4, 20));
    expect(r.ties!.sEnd).toBeCloseTo(0.6 * 300, 6);
    expect(r.ties!.sLap).toBeLessThanOrEqual(r.anchorage!.l0 / 2);
    expect(r.ties!.AstLapReq).toBeCloseTo(Math.PI * 100, 3); // Φ20
  });
  it('voile : grand côté > 4 × petit côté → non vérifié', () => {
    const r = calculerPoteau(mat, rect(20, 90), loads(1000), rebar(8, 12));
    expect(r.verdict).toBe('NV');
  });
  it('classe minimale annexe E et classe structurale 4.3N', () => {
    const r = calculerPoteau({ ...mat, fck: 25, exposureClass: 'XD1' }, rect(30, 40), loads(1000), rebar());
    expect(r.checks.find(c => c.ref === 'Annexe E')!.ok).toBe(false);
    const m = materialProps({ ...mat, fck: 40, exposureClass: 'XC4', classMode: 'calcule', designLife: 50 }, rebar());
    expect(m.structuralClass).toBe('S3');
    expect(m.cMinDur).toBe(25);
    const m100 = materialProps({ ...mat, fck: 30, exposureClass: 'XC4', classMode: 'calcule', designLife: 100 }, rebar());
    expect(m100.structuralClass).toBe('S6');
  });
});

describe('Priorité 3 : annexe, feu, méthodes alternatives, fissuration', () => {
  const matFR: Materials = { ...mat, alphaCC: 1.0, annex: 'FR' };
  const gq: Loads = { solicitationType: 'compression', NEd: 0, MEd_user: 0, VEd: 0, TEd: 0, loadMode: 'GQ', NG: 700, NQ: 370, psi2: 0.3, selfWeight: true };
  const g0: Geometry = { ...rect(30, 40), phiMode: 'saisi', phi_ef: 2 };

  it('tableau 4.3NF (AN France)', () => {
    const cls = (fck: number, exp: string, extra: Partial<Materials> = {}) =>
      materialProps({ ...matFR, fck, exposureClass: exp, classMode: 'calcule', designLife: 50, ...extra }, rebar()).structuralClass;
    expect(cls(30, 'XC4')).toBe('S4');       // seuil XC4 : C35/45
    expect(cls(35, 'XC4')).toBe('S3');
    expect(cls(60, 'XC4')).toBe('S2');       // ≥ C60/75 : minoration de 2
    expect(cls(30, 'XC1')).toBe('S3');
    expect(cls(35, 'XC4', { compactCover: true })).toBe('S2');
    expect(cls(30, 'XC4', { designLife: 25 })).toBe('S3');
    expect(cls(30, 'XC4', { designLife: 100 })).toBe('S6');
  });
  it('wmax : tableau 7.1N et 7.1NF', () => {
    expect(wmax('XC1', 'FR')).toBe(0.4);
    expect(wmax('XC4', 'FR')).toBe(0.3);
    expect(wmax('XD1', 'FR')).toBe(0.2);
    expect(wmax('XD1', 'EC2')).toBe(0.3);
    expect(wmax('XA2', 'FR')).toBeNull();
  });
  it('feu : EN 1992-1-2 méthode A, éq. (5.7) (calcul manuel)', () => {
    // Valeurs recommandées : ψfi = ψ2 = 0,3 → ηfi = (710,5 + 0,3×370)/(1,35×710,5 + 1,5×370) ; a = 51 ; l0,fi = 2,45 ; b' = 342,9
    const r = calculerPoteau({ ...matFR, annex: 'EC2' }, g0, gq, rebar(), { R: 60, l0fiFactor: 0.7 });
    expect(r.fire.etaFi).toBeCloseTo(821.5 / 1514.175, 4);
    expect(r.fire.parts.Ra).toBeCloseTo(33.6, 6);
    expect(r.fire.parts.Rl).toBeCloseTo(24.48, 6);
    expect(r.fire.parts.Rb).toBeCloseTo(30.857, 3);
    expect(r.fire.R).toBeCloseTo(120.2, 1);
    expect(r.fire.ok).toBe(true);
    // AN France : ψfi = ψ1 = 0,5 → ηfi = 895,5/1514,175 = 0,5914 ; Rηfi = 83(1 − 0,5914×1,1457/(0,85+0,1457)) = 26,5
    const rf = calculerPoteau(matFR, g0, { ...gq, psi1: 0.5 }, rebar(), { R: 60, l0fiFactor: 0.7 });
    expect(rf.fire.etaFi).toBeCloseTo(895.5 / 1514.175, 4);
    expect(rf.fire.parts.Reta).toBeCloseTo(83 * (1 - (895.5 / 1514.175) * (1 + rf.fire.omega) / (0.85 + rf.fire.omega)), 6);
    expect(rf.fire.R).toBeLessThan(r.fire.R);
  });
  it('feu : hors domaine si b\' < 200 mm', () => {
    const r = calculerPoteau(matFR, { ...g0, params: { b: 15, h: 22 } }, gq, rebar(4, 12, { phiW: 6 }), { R: 60, l0fiFactor: 0.7 });
    expect(r.fire.valid).toBe(false);
  });
  it('Recommandations professionnelles : rectangle (calcul manuel)', () => {
    const r = calculerPoteau(matFR, g0, gq, rebar());
    // λ = 40,41 ; α = 0,86/(1 + (λ/62)²) = 0,6035 ; kh = 0,9 × (1 − 6 × 0,0067 × 0,17) ; NRd = 1 483 kN
    expect(r.rp.alpha).toBeCloseTo(0.6035, 4);
    expect(r.rp.kh).toBeCloseTo(0.8938, 4);
    expect(r.rp.NRd).toBeCloseTo(1483.4, 0);
    expect(r.rp.applicable).toBe(true);
  });
  it('Recommandations professionnelles : cercle', () => {
    const g: Geometry = { ...g0, shape: 'circ', params: { d: 40 } };
    const r = calculerPoteau(matFR, g, gq, rebar(6, 14));
    const lam = 4 * 3500 / 400;
    expect(r.rp.lambda).toBeCloseTo(lam, 6);
    expect(r.rp.alpha).toBeCloseTo(0.84 / (1 + (lam / 52) ** 2), 6);
  });
  it('rigidité nominale §5.8.7 : EI et NB', () => {
    const r = calculerPoteau(matFR, { ...g0, secondOrderMethod: 'rigidite' }, { ...gq, solicitationType: 'flexion_composee', Mh_top: 80, Mh_bot: 40 }, rebar());
    const d = r.directions.find(x => x.dir === 'h')!;
    const Ecd = 22000 * Math.pow(3.8, 0.3) / 1.2;
    const Kc = Math.sqrt(1.5) * Math.min(0.2, d.n * d.lambda / 170) / (1 + d.phiEf);
    const EI = (Kc * Ecd * 300 * 400 ** 3 / 12 + 200000 * 804.25 * 149 ** 2) / 1e9;
    expect(d.EI).toBeCloseTo(EI, 0);
    expect(d.NB).toBeCloseTo(Math.PI ** 2 * EI * 1e9 / 3500 ** 2 / 1000, 0);
    expect(d.method).toBe('rigidite');
    expect(d.MEd).toBeCloseTo(d.MEd_rig, 6);
  });
  it('fissuration §7.3.4 : flexion simple (calcul manuel)', () => {
    const r = calculerPoteau(matFR, g0, { ...gq, selfWeight: false, loadMode: 'direct', NEd: 1e-4, Nqp: 1e-4, solicitationType: 'flexion_composee', Mh_top: 80, Mh_bot: 80, Mqp_h: 60 }, rebar());
    // AN France, c = 43 mm > 25 : k3 = 3,4 (25/43)^(2/3) = 2,368 → sr,max = 2,368×43 + 0,17×16/0,01337 = 305,2 mm
    expect(r.crack.x).toBeCloseTo(99.36, 0);
    expect(r.crack.sigma_s).toBeCloseTo(477.7, 0);
    expect(r.crack.srmax).toBeCloseTo(305.2, 0);
    expect(r.crack.wk).toBeCloseTo(305.2 * 1.920e-3, 2);
    expect(r.crack.ok).toBe(false);
    // Valeurs recommandées : k3 = 3,4 → sr,max = 349,6 mm ; wk = 0,671 mm
    const re = calculerPoteau({ ...matFR, annex: 'EC2' }, g0, { ...gq, selfWeight: false, loadMode: 'direct', NEd: 1e-4, Nqp: 1e-4, solicitationType: 'flexion_composee', Mh_top: 80, Mh_bot: 80, Mqp_h: 60 }, rebar());
    expect(re.crack.srmax).toBeCloseTo(349.6, 0);
    expect(re.crack.wk).toBeCloseTo(0.671, 2);
  });
  it('fissuration : section comprimée sous faible excentricité', () => {
    const r = calculerPoteau(matFR, g0, { ...gq, loadMode: 'direct', NEd: 1100, Nqp: 800, solicitationType: 'flexion_composee', Mh_top: 40, Mh_bot: 40, Mqp_h: 40 }, rebar());
    expect(r.crack.compressed).toBe(true);
    expect(r.crack.ok).toBe(true);
  });
});

describe('Sections polygonales (toutes formes)', () => {
  const mp = materialProps(mat, rebar());
  const g = (shape: Shape, params: Record<string, number>): Geometry => ({ ...rect(1, 1), shape, params });
  it('T dégénéré (table = âme) identique au rectangle', () => {
    const sR = buildSection(rect(20, 50), rebar(), mp.cNom)!, sT = buildSection(g('T', { ba: 20, ha: 40, bs: 20, hs: 10 }), rebar(), mp.cNom)!;
    for (const N of [0, 500e3, 1500e3]) for (const d of ['h', 'b'] as const)
      expect(momentResistance(sT, d, N, 1, mp)! / 1e6).toBeCloseTo(momentResistance(sR, d, N, 1, mp)! / 1e6, 2);
  });
  it('T non symétrique : modèle à fibres Python indépendant', () => {
    const T = buildSection(g('T', { ba: 25, ha: 40, bs: 60, hs: 15 }), rebar(8, 16), mp.cNom)!;
    const ref: [number, number, number][] = [[0, 108.01, 163.0], [800e3, 220.41, 229.89], [2000e3, 244.99, 228.57]];
    for (const [N, Mh, Mb] of ref) {
      expect(momentResistance(T, 'h', N, 1, mp)! / 1e6).toBeCloseTo(Mh, -0.5);
      expect(momentResistance(T, 'b', N, 1, mp)! / 1e6).toBeCloseTo(Mb, -0.5);
    }
  });
  it('axes principaux : hexagone isotrope, L tourné, invariant Ih + Ib', () => {
    const H = buildSection(g('hex', { a: 25 }), rebar(6), mp.cNom)!;
    expect(H.Ih).toBeCloseTo(5 * Math.sqrt(3) / 16 * 250 ** 4, -3);
    expect(H.Ib).toBeCloseTo(H.Ih, -3);
    expect(H.keyBars).toBe(6);
    const L = buildSection(g('L', { b1: 20, h1: 60, b2: 40, h2: 20 }), rebar(6), mp.cNom)!;
    expect(Math.abs(L.rotation)).toBeGreaterThan(0.1);
    expect(L.Ih).toBeGreaterThanOrEqual(L.Ib);
    const gp = geometryProps(g('L', { b1: 20, h1: 60, b2: 40, h2: 20 }));
    expect(L.Ib / 1e4).toBeCloseTo(gp.Imin, 0); // Imin = inertie principale faible
  });
  it('quart de cercle : inertie principale faible', () => {
    const Q = buildSection(g('quart', { r: 40 }), rebar(6), mp.cNom)!;
    expect(Q.Ib / 400 ** 4).toBeCloseTo(0.0384, 3);
  });
  it('section circulaire : au moins 4 barres (§9.5.2(4))', () => {
    const r = calculerPoteau(mat, { ...rect(1, 1), shape: 'circ', params: { d: 40 } }, loads(1000), rebar(4, 16));
    expect(r.checks.find(c => c.label.startsWith('Nombre de barres'))!.ok).toBe(true);
  });
  it('épaisseur insuffisante signalée', () => {
    const r = calculerPoteau(mat, g('T', { ba: 20, ha: 40, bs: 60, hs: 10 }), loads(800), rebar(8));
    expect(r.warnings.some(w => w.startsWith('Épaisseur minimale'))).toBe(true);
  });
});

describe('Lot 1 : corrections d\'audit', () => {
  it('E1 : Δcdev < 10 mm signalé', () => {
    const r = calculerPoteau({ ...mat, deltaCdev: 5 }, rect(30, 40), loads(1500), rebar());
    expect(r.warnings.some(w => w.startsWith('Δcdev'))).toBe(true);
    expect(calculerPoteau({ ...mat, deltaCdev: 10 }, rect(30, 40), loads(1500), rebar()).warnings.some(w => w.startsWith('Δcdev'))).toBe(false);
  });
  it('E2 : tableau 4.3N, XS2 dans la colonne XD3/XS2/XS3 (seuil C45/55)', () => {
    const cls = (fck: number, exp: string) => materialProps({ ...mat, annex: 'EC2', fck, exposureClass: exp, classMode: 'calcule', designLife: 50 }, rebar()).structuralClass;
    expect(cls(40, 'XS2')).toBe('S4');
    expect(cls(45, 'XS2')).toBe('S3');
    expect(cls(40, 'XS1')).toBe('S3');
    expect(cls(40, 'XD2')).toBe('S3');
  });
  it('E4 : tableau 4.3NF, XA1 dans la colonne XD1/XS1/XA1', () => {
    const cls = (fck: number) => materialProps({ ...mat, annex: 'FR', fck, exposureClass: 'XA1', classMode: 'calcule', designLife: 50 }, rebar()).structuralClass;
    expect(cls(35)).toBe('S4');
    expect(cls(40)).toBe('S3');
  });
  it('E3 : charges transversales → M0e = M02 (5.32 non applicable)', () => {
    const L: Loads = { solicitationType: 'flexion_composee', NEd: 1200, MEd_user: 0, Mh_top: 100, Mh_bot: 20, curvH: 'simple', VEd: 0, TEd: 0, transverse: true };
    const d = calculerPoteau(mat, rect(30, 40), L, rebar(6, 16)).directions[0];
    expect(d.M0e).toBeCloseTo(d.M02, 9);
  });
  it('E9 : propriétés du T identiques entre géométrie et calcul (table plus étroite que l\'âme)', () => {
    const g: Geometry = { ...rect(1, 1), shape: 'T', params: { ba: 30, ha: 40, bs: 20, hs: 10 } };
    const gp = geometryProps(g);
    const sec = buildSection(g, rebar(4), materialProps(mat, rebar()).cNom)!;
    expect(gp.A * 100).toBeCloseTo(sec.A, 3);
  });
  it('E11 : données invalides → verdict « non vérifié »', () => {
    const bad = calculerPoteau(mat, rect(0, 40), loads(1500), rebar());
    expect(bad.verdict).toBe('NV');
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(calculerPoteau(mat, { ...rect(30, 40), L: -1 }, loads(1500), rebar()).verdict).toBe('NV');
    expect(calculerPoteau(mat, rect(30, 40), loads(1500), rebar(4, 16, { spacing: 0 })).verdict).toBe('NV');
    expect(calculerPoteau(mat, rect(30, 40), loads(1500), rebar()).errors).toHaveLength(0);
  });
  it('robustesse : aucun résultat NaN sur une grille de cas', () => {
    const shapes: Geometry[] = [rect(25, 25), rect(30, 60), { ...rect(1, 1), shape: 'circ', params: { d: 40 } }, { ...rect(1, 1), shape: 'hex', params: { a: 25 } },
      { ...rect(1, 1), shape: 'T', params: { ba: 25, ha: 40, bs: 60, hs: 15 } }, { ...rect(1, 1), shape: 'L', params: { b1: 20, h1: 60, b2: 40, h2: 20 } }];
    for (const g of shapes) for (const N of [0, 300, 1500, 4000]) for (const L of [2.5, 6]) {
      const r = calculerPoteau(mat, { ...g, L }, { solicitationType: 'flexion_composee', NEd: N, MEd_user: 0, Mh_top: 50, Mh_bot: 20, curvH: 'double', Mb_top: 10, Mb_bot: 10, curvB: 'simple', VEd: 0, TEd: 0 }, rebar(8, 16));
      expect(Number.isNaN(r.util)).toBe(false);
      expect(Number.isNaN(r.As_req)).toBe(false);
      for (const d of r.directions) { expect(Number.isNaN(d.MEd)).toBe(false); expect(Number.isNaN(d.lambda)).toBe(false); }
    }
  });
  it('cas limite : λ juste sous et juste au-dessus de λlim', () => {
    const base = calculerPoteau(mat, rect(30, 30), loads(1000), rebar());
    const lim = base.directions[0].lambdaLim, i = 300 / Math.sqrt(12);
    const below = calculerPoteau(mat, { ...rect(30, 30), L: (lim - 0.5) * i / 1000 }, loads(1000), rebar());
    const above = calculerPoteau(mat, { ...rect(30, 30), L: (lim + 0.5) * i / 1000 }, loads(1000), rebar());
    expect(below.directions[0].isSecondOrder).toBe(false);
    expect(above.directions[0].isSecondOrder).toBe(true);
  });
  it('cas limite : NEd au-delà de NRd,max → non conforme', () => {
    const r = calculerPoteau(mat, rect(30, 30), loads(3000), rebar());
    expect(r.verdictELU).toBe('KO');
  });
  it('cas limite : traction pure', () => {
    const r = calculerPoteau(mat, rect(30, 30), { ...loads(300), solicitationType: 'traction' }, rebar(4, 16));
    expect(r.As_req).toBeCloseTo(300 / 43.478, 2);
    expect(r.verdictELU).toBe('OK');
  });
});

describe('Anomalie B1 : valeurs démesurées', () => {
  it('le calcul se termine rapidement et le verdict est « non vérifié »', () => {
    const t = Date.now();
    const r = calculerPoteau(mat, { ...rect(30, 40), L: 1e9 }, loads(1500), rebar(4, 16, { spacing: 1e9 }));
    const r2 = calculerPoteau(mat, rect(1e9, 40), loads(1e12), rebar(1e9 as number, 16));
    expect(Date.now() - t).toBeLessThan(3000);
    expect(r.verdict).toBe('NV'); expect(r2.verdict).toBe('NV');
    expect(r2.section!.bars.length).toBeLessThanOrEqual(200);
  });
});
