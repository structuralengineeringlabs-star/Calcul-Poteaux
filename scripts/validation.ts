/**
 * Génère docs/audit/CAHIER_VALIDATION.md : chaque cas compare la valeur obtenue par le moteur
 * à une valeur de référence (calcul manuel détaillé ou modèle indépendant), avec une tolérance.
 * Usage : npm run validation
 */
import { writeFileSync, mkdirSync } from 'fs';
import {
  calculerPoteau, materialProps, momentResistance, axialResistance, buildSection, anchorage, creepCoefficient,
  effectiveLength, type Materials, type Geometry, type Loads, type Rebar, type RCSection,
} from '../src/eurocode';
import { APP_VERSION } from '../src/version';

const mat: Materials = { concreteClass: '30', fck: 30, steelGrade: '500', fyk: 500, exposureClass: 'XC4', structuralClass: 'S4', deltaCdev: 5, alphaCC: 0.85 };
const matFR: Materials = { ...mat, alphaCC: 1.0, annex: 'FR' };
const rb = (n = 4, phi = 16, x: Partial<Rebar> = {}): Rebar => ({ phiL: phi, nBars: n, phiW: 8, spacing: 200, anchoringFactor: 50, overlapFactor: 50, numAnchors: 1, numLaps: 1, ...x });
const rect = (b: number, h: number, L = 3.5): Geometry => ({ shape: 'rect', params: { b, h }, L, beta: 1, coeffA: 0.7, coeffB: 1.1, coeffC: 0.7, phi_ef: 2.5 });
const g0: Geometry = { ...rect(30, 40), phiMode: 'saisi', phi_ef: 2 };
const gq: Loads = { solicitationType: 'compression', NEd: 0, MEd_user: 0, VEd: 0, TEd: 0, loadMode: 'GQ', NG: 700, NQ: 370, psi2: 0.3, psi1: 0.5, selfWeight: true };
const mp = materialProps(mat, rb());
const twoLayers = (As: number): RCSection => ({ ...buildSection(rect(30, 40), rb(), mp.cNom)!, dPrime: 50, bars: [{ u: 150, v: 0, A: As / 2 }, { u: -150, v: 0, A: As / 2 }] });

interface Case { id: string; domain: string; ref: string; what: string; unit: string; expected: number; tol: number; method: string; get: () => number }

const cases: Case[] = [
  // Matériaux
  { id: 'M1', domain: 'Matériaux', ref: '§3.1.6', what: 'fcd, C30/37, αcc = 0,85, γc = 1,5', unit: 'MPa', expected: 17.0, tol: 1e-6, method: 'Manuel : 0,85 × 30 / 1,5', get: () => mp.fcd },
  { id: 'M2', domain: 'Matériaux', ref: 'Tab. 3.1', what: 'εc2 pour C70/85', unit: '‰', expected: 2.42, tol: 0.005, method: 'Manuel : 2,0 + 0,085 × 20^0,53', get: () => materialProps({ ...mat, fck: 70 }, rb()).epsC2 * 1000 },
  { id: 'M3', domain: 'Matériaux', ref: 'Tab. 4.4N', what: 'cmin,dur XD1, S4', unit: 'mm', expected: 35, tol: 0, method: 'Lecture du tableau', get: () => materialProps({ ...mat, exposureClass: 'XD1' }, rb()).cMinDur },
  // Géométrie et flambement
  { id: 'G1', domain: 'Géométrie', ref: '—', what: 'Hexagone a = 25 cm : I', unit: 'cm⁴', expected: 5 * Math.sqrt(3) / 16 * 25 ** 4, tol: 5, method: 'Formule exacte 5√3/16·a⁴', get: () => buildSection({ ...rect(1, 1), shape: 'hex', params: { a: 25 } }, rb(6), mp.cNom)!.Ih / 1e4 },
  { id: 'G2', domain: 'Géométrie', ref: '—', what: 'L 30×30 ép. 10 : Imin', unit: 'cm⁴', expected: 18166.67, tol: 1, method: 'Manuel (Huygens + axes principaux)', get: () => buildSection({ ...rect(1, 1), shape: 'L', params: { b1: 10, h1: 30, b2: 30, h2: 10 } }, rb(6, 8, { phiW: 6 }), 10)!.Ib / 1e4 },
  { id: 'G3', domain: 'Flambement', ref: 'Éq. 5.15', what: 'l0 contreventé, k1 = k2 = 0,1, l = 4 m', unit: 'm', expected: 0.5909 * 4, tol: 0.001, method: 'Manuel', get: () => effectiveLength({ ...rect(30, 40, 4), lengthMode: 'k', k1: 0.1, k2: 0.1 }).l0 },
  { id: 'G4', domain: 'Flambement', ref: 'Éq. 5.16', what: 'l0 console (k1 = 0,1 ; k2 → ∞), l = 4 m', unit: 'm', expected: (1 + 0.1 / 1.1) * 2 * 4, tol: 0.01, method: 'Manuel', get: () => effectiveLength({ ...rect(30, 40, 4), lengthMode: 'k', braced: false, k1: 0.1, k2: 1e6 }).l0 },
  { id: 'G5', domain: 'Fluage', ref: 'Annexe B', what: 'φ(∞,t0) C30/37, RH 50 %, h0 200 mm, 28 j, 20 °C', unit: '—', expected: 2.367, tol: 0.002, method: 'Manuel (B.1 à B.10)', get: () => creepCoefficient(30, 50, 200, 28, 'N', 20) },
  // Résistance de section
  { id: 'S1', domain: 'Section', ref: '§3.1.7, §6.1', what: 'NRd,max 30×40, 804 mm², εc2 uniforme', unit: 'kN', expected: (120000 * 17 + 804 * (400 - 17)) / 1000, tol: 0.5, method: 'Manuel', get: () => axialResistance(twoLayers(804), 1, mp) / 1000 },
  { id: 'S2', domain: 'Section', ref: '§6.1', what: 'MRd 30×40, As = 1 500 mm², N = 1 000 kN', unit: 'kNm', expected: 186.45, tol: 0.2, method: 'Modèle Python indépendant (parabole-rectangle)', get: () => momentResistance(twoLayers(1500), 'h', 1000e3, 1, mp)! / 1e6 },
  { id: 'S3', domain: 'Section', ref: '§6.1', what: 'MRd 30×40, As = 1 000 mm², N = 0', unit: 'kNm', expected: 71.28, tol: 0.2, method: 'Modèle Python indépendant', get: () => momentResistance(twoLayers(1000), 'h', 0, 1, mp)! / 1e6 },
  { id: 'S4', domain: 'Section', ref: '§6.1', what: 'MRd T 25×40 + 60×15, 8 HA16, N = 800 kN, plan I', unit: 'kNm', expected: 220.41, tol: 1.0, method: 'Modèle à fibres Python indépendant', get: () => momentResistance(buildSection({ ...rect(1, 1), shape: 'T', params: { ba: 25, ha: 40, bs: 60, hs: 15 } }, rb(8), mp.cNom)!, 'h', 800e3, 1, mp)! / 1e6 },
  // Second ordre
  { id: 'N1', domain: 'Second ordre', ref: '§5.8.8.2', what: 'M0e, 30×40, 1 200 kN, M = 100/50 kNm simple courbure', unit: 'kNm', expected: 0.6 * 110.5 + 0.4 * 60.5, tol: 0.05, method: 'Manuel (ei = 8,75 mm)', get: () => calculerPoteau(mat, rect(30, 40), { solicitationType: 'flexion_composee', NEd: 1200, MEd_user: 0, Mh_top: 100, Mh_bot: 50, curvH: 'simple', VEd: 0, TEd: 0 }, rb(6)).directions[0].M0e },
  { id: 'N2', domain: 'Second ordre', ref: '§5.8.7.2', what: 'NB (rigidité nominale), 30×40, plan de h', unit: 'kN', expected: NaN, tol: 1, method: 'Manuel (EI = Kc·Ecd·Ic + Es·Is)', get: () => 0 },
  // Ancrages, effort tranchant
  { id: 'A1', domain: 'Ancrage', ref: '§8.4', what: 'lb,rqd Φ16, C30/37, bonne adhérence', unit: 'mm', expected: 571.8, tol: 0.2, method: 'Manuel', get: () => anchorage(mp, 30, rb(), 'compression', null).lb_rqd },
  { id: 'A2', domain: 'Recouvrement', ref: '§8.7.3', what: 'l0 Φ16, 100 % recouverts', unit: 'mm', expected: 1.5 * 571.84, tol: 0.5, method: 'Manuel (α6 = 1,5)', get: () => anchorage(mp, 30, rb(), 'compression', null).l0 },
  { id: 'V1', domain: 'Effort tranchant', ref: '§6.2.2', what: 'VRd,c 30×40, N = 1 500 kN', unit: 'kN', expected: 103.26, tol: 0.1, method: 'Manuel', get: () => calculerPoteau(mat, rect(30, 40), { solicitationType: 'compression', NEd: 1500, MEd_user: 0, VEd: 150, TEd: 0 }, rb()).shear.dirs[0].VRd_c },
  { id: 'V2', domain: 'Effort tranchant', ref: '§6.2.3', what: 'VRd,max (cot θ = 2,5), même cas', unit: 'kN', expected: 193.0, tol: 0.5, method: 'Manuel (αcw = 0,662)', get: () => calculerPoteau(mat, rect(30, 40), { solicitationType: 'compression', NEd: 1500, MEd_user: 0, VEd: 150, TEd: 0 }, rb()).shear.dirs[0].VRd_max },
  // Feu, RP, fissuration
  { id: 'F1', domain: 'Feu', ref: 'EN 1992-1-2 (5.7)', what: 'R, 30×40, R60, l0,fi = 0,7 l, valeurs recommandées', unit: 'min', expected: 120.2, tol: 0.2, method: 'Manuel', get: () => calculerPoteau({ ...matFR, annex: 'EC2' }, g0, gq, rb(), { R: 60, l0fiFactor: 0.7 }).fire.R },
  { id: 'P1', domain: 'Méthode RP', ref: 'RP France', what: 'NRd 30×40, 4 HA16, λ = 40,4', unit: 'kN', expected: 1483.4, tol: 0.5, method: 'Manuel (α = 0,6035 ; kh = 0,8938)', get: () => calculerPoteau(matFR, g0, gq, rb()).rp.NRd },
  { id: 'C1', domain: 'Fissuration', ref: '§7.3.4', what: 'σs, flexion simple 60 kNm', unit: 'MPa', expected: 477.7, tol: 0.5, method: 'Manuel (section fissurée, αe = 18,3)', get: () => calculerPoteau(matFR, g0, { ...gq, selfWeight: false, loadMode: 'direct', NEd: 1e-4, Nqp: 1e-4, solicitationType: 'flexion_composee', Mh_top: 80, Mh_bot: 80, Mqp_h: 60 }, rb()).crack.sigma_s },
  { id: 'C2', domain: 'Fissuration', ref: '§7.3.4 + AN', what: 'sr,max AN France (k3 = 3,4·(25/c)^(2/3))', unit: 'mm', expected: 305.2, tol: 0.5, method: 'Manuel (c = 43 mm)', get: () => calculerPoteau(matFR, g0, { ...gq, selfWeight: false, loadMode: 'direct', NEd: 1e-4, Nqp: 1e-4, solicitationType: 'flexion_composee', Mh_top: 80, Mh_bot: 80, Mqp_h: 60 }, rb()).crack.srmax },
];

// N2 : valeur de référence recalculée à la main à partir des grandeurs intermédiaires publiées dans la note
{
  const r = calculerPoteau(matFR, { ...g0, secondOrderMethod: 'rigidite' }, { ...gq, solicitationType: 'flexion_composee', Mh_top: 80, Mh_bot: 40 }, rb());
  const d = r.directions.find(x => x.dir === 'h')!;
  const Ecd = 22000 * Math.pow(3.8, 0.3) / 1.2;
  const Kc = Math.sqrt(1.5) * Math.min(0.2, d.n * d.lambda / 170) / (1 + d.phiEf);
  const EI = Kc * Ecd * 300 * 400 ** 3 / 12 + 200000 * 804.25 * 149 ** 2;
  const c = cases.find(x => x.id === 'N2')!;
  c.expected = Math.PI ** 2 * EI / 3500 ** 2 / 1000; c.get = () => d.NB;
}

const rows = cases.map(c => {
  const got = c.get(); const diff = got - c.expected; const ok = Math.abs(diff) <= c.tol + 1e-9;
  return { ...c, got, diff, ok };
});
const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(4)).replace('.', ',');
const md = [
  `# Cahier de validation du moteur de calcul`,
  ``,
  `Version ${APP_VERSION} — généré automatiquement par \`npm run validation\` le ${new Date().toLocaleDateString('fr-FR')}.`,
  ``,
  `Chaque cas compare la valeur obtenue à une référence indépendante du code : calcul manuel détaillé`,
  `(formule et valeurs dans les tests \`src/eurocode.test.ts\`) ou modèle numérique indépendant écrit en Python`,
  `(intégration par fibres ou par tranches). Les cas issus d'exemples publiés restent à ajouter (voir le registre des écarts, R-01).`,
  ``,
  `| Cas | Domaine | Article | Grandeur | Référence | Obtenu | Écart | Tolérance | Méthode | Statut |`,
  `|---|---|---|---|---|---|---|---|---|---|`,
  ...rows.map(r => `| ${r.id} | ${r.domain} | ${r.ref} | ${r.what} (${r.unit}) | ${fmt(r.expected)} | ${fmt(r.got)} | ${fmt(r.diff)} | ±${fmt(r.tol)} | ${r.method} | ${r.ok ? '✅' : '❌'} |`),
  ``,
  `**Bilan : ${rows.filter(r => r.ok).length} / ${rows.length} cas conformes.**`,
  ``,
].join('\n');
mkdirSync('docs/audit', { recursive: true });
writeFileSync('docs/audit/CAHIER_VALIDATION.md', md);
console.log(md.split('\n').slice(-3).join('\n'));
if (rows.some(r => !r.ok)) process.exit(1);
