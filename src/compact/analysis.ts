import { calculerPoteau, type ColumnResult, type Materials, type Geometry, type Loads, type Rebar, type FireInput } from '../eurocode';

export type Status = 'ok' | 'ko' | 'nv' | 'info' | 'warn';

export interface CheckItem {
  id: string;
  group: 'Résistance' | 'Stabilité' | 'Effort tranchant' | 'Durabilité et ELS' | 'Feu' | 'Dispositions constructives' | 'Comparaisons';
  title: string;
  status: Status;
  value: string;
  limit?: string;
  ref: string;
  details: string[];
}

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '∞');

export function buildChecklist(calc: ColumnResult, loads: Loads): CheckItem[] {
  const L: CheckItem[] = [];
  const NEd = calc.loads.NEd;

  if (calc.verdictELU === 'NV' && !calc.directions.length) {
    L.push({ id: 'elu', group: 'Résistance', title: 'Résistance ELU', status: 'nv', value: 'non vérifiée', ref: '§6.1', details: calc.warnings });
  }
  for (const d of calc.directions) {
    L.push({
      id: `elu-${d.dir}`, group: 'Résistance', title: `Résistance N-M — ${d.label}`,
      status: d.util <= 1 ? 'ok' : 'ko', value: `MEd = ${f(d.MEd, 1)} kNm`, limit: `MRd = ${d.MRd === null ? 'N > NRd' : f(d.MRd, 1) + ' kNm'} (taux ${f(d.util)})`,
      ref: '§6.1, §3.1.7',
      details: [
        `NEd = ${f(NEd, 1)} kN ; MRd obtenu sur le diagramme d'interaction parabole-rectangle avec les armatures fournies.`,
        `M01 = ${f(d.M01, 1)} kNm ; M02 = ${f(d.M02, 1)} kNm (imperfection ei = ${f(d.ei, 1)} mm incluse).`,
        d.isSecondOrder
          ? `Second ordre (${d.method === 'rigidite' ? 'rigidité nominale §5.8.7' : 'courbure nominale §5.8.8'}) : M0e = ${f(d.M0e, 1)} kNm, M2 = ${f(d.M2, 1)} kNm, e2 = ${f(d.e2, 1)} mm (c = ${d.c}).`
          : 'Second ordre négligeable (λ ≤ λlim) : MEd = M02.',
        `MEd = max(M02 ; M0e + M2 ; M01 + 0,5 M2 ; N·e0,min) avec e0,min = ${f(d.emin, 0)} mm.`,
      ],
    });
  }
  if (calc.biaxial) {
    const b = calc.biaxial;
    L.push({
      id: 'biax', group: 'Résistance', title: 'Flexion déviée', status: !b.required ? 'info' : b.value <= 1 ? 'ok' : 'ko',
      value: b.required ? f(b.value) : 'non requise', limit: b.required ? '≤ 1' : undefined, ref: '§5.8.9',
      details: [b.reason, b.required ? `(MEdz/MRdz)^a + (MEdy/MRdy)^a avec a = ${f(b.a)} (NEd/NRd, NRd = ${f(b.NRd, 0)} kN).` : ''].filter(Boolean),
    });
  }
  if (calc.governing?.MRd === null) L.push({ id: 'nrd', group: 'Résistance', title: 'Compression centrée', status: 'ko', value: `NEd = ${f(NEd, 0)} kN`, limit: `NRd,max = ${f(calc.NRd_max ?? 0, 0)} kN`, ref: '§6.1', details: ['La section ne peut pas reprendre l\'effort normal de calcul.'] });

  for (const d of calc.directions) {
    L.push({
      id: `lam-${d.dir}`, group: 'Stabilité', title: `Élancement — ${d.label}`, status: 'info',
      value: `λ = ${f(d.lambda, 1)}`, limit: `λlim = ${Number.isFinite(d.lambdaLim) ? f(d.lambdaLim, 1) : '∞'}`, ref: '§5.8.3',
      details: [
        `l0 = ${f(calc.geom.l0)} m (${calc.geom.l0Method}).`,
        `λlim = 20·A·B·C/√n avec A = ${f(d.coefA, 3)}, B = ${f(d.coefB, 3)}, C = ${f(d.coefC, 2)} (rm = ${f(d.rm)}), n = ${f(d.n, 3)}.`,
        `φef = ${f(d.phiEf)}${d.phiEfNote ? ' — ' + d.phiEfNote : ''}.`,
        d.isSecondOrder ? 'Effets du second ordre pris en compte.' : 'Effets du second ordre négligés.',
      ],
    });
  }

  if (calc.shear.computed) {
    for (const d of calc.shear.dirs) L.push({
      id: `v-${d.label}`, group: 'Effort tranchant', title: `Effort tranchant — ${d.label}`, status: d.ok ? 'ok' : 'ko',
      value: `VEd = ${f(d.VEd, 1)} kN`, limit: d.reinforced ? `Asw/s ${f(d.Asw_req, 0)} ≤ ${f(d.Asw_prov, 0)} mm²/m` : `≤ VRd,c = ${f(d.VRd_c, 1)} kN`, ref: '§6.2, §6.3',
      details: [`VRd,c = ${f(d.VRd_c, 1)} kN ; cot θ = ${f(d.cot)} ; VRd,max = ${f(d.VRd_max, 1)} kN ; interaction V/T = ${f(d.interaction)} (≤ 1).`, calc.shear.note],
    });
  } else if (calc.shear.note) L.push({ id: 'v', group: 'Effort tranchant', title: 'Effort tranchant', status: 'nv', value: '—', ref: '§6.2', details: [calc.shear.note] });

  if (calc.els.computed) L.push({
    id: 'els', group: 'Durabilité et ELS', title: 'Contraintes de compression', status: calc.els.ok ? 'ok' : 'ko',
    value: `σc,qp = ${calc.loads.Nqp > 0 ? f(calc.els.sigma_c) : '—'} MPa`, limit: `≤ ${f(calc.els.limit045, 1)} MPa${calc.els.limit06 !== null ? ` ; σc,car ≤ ${f(calc.els.limit06, 1)}` : ''}`, ref: '§7.2',
    details: [calc.els.note, calc.els.sigma_car !== null ? `σc,car = ${f(calc.els.sigma_car)} MPa.` : ''].filter(Boolean),
  });
  else if (loads.solicitationType !== 'traction') L.push({ id: 'els', group: 'Durabilité et ELS', title: 'Contraintes de compression', status: 'nv', value: 'non vérifié', ref: '§7.2', details: [calc.els.note] });
  if (calc.crack.computed) L.push({
    id: 'crack', group: 'Durabilité et ELS', title: 'Ouverture des fissures', status: calc.crack.ok ? 'ok' : calc.crack.required ? 'ko' : 'warn',
    value: calc.crack.compressed ? 'sans objet' : `wk = ${f(calc.crack.wk, 3)} mm`, limit: calc.crack.wmax !== null ? `≤ ${f(calc.crack.wmax)} mm` : 'à fixer', ref: '§7.3.4',
    details: [calc.crack.note, !calc.crack.compressed ? `x = ${f(calc.crack.x, 0)} mm ; σs = ${f(calc.crack.sigma_s, 0)} MPa ; sr,max = ${f(calc.crack.srmax, 0)} mm.` : ''].filter(Boolean),
  });

  if (calc.fire.computed) L.push({
    id: 'fire', group: 'Feu', title: `Résistance au feu R${calc.fire.Rreq}`, status: !calc.fire.valid ? 'nv' : calc.fire.ok ? 'ok' : 'ko',
    value: calc.fire.valid ? `R = ${f(calc.fire.R, 0)} min` : 'hors domaine', limit: `≥ ${calc.fire.Rreq} min`, ref: 'EN 1992-1-2 §5.3.2',
    details: [calc.fire.note, `Rηfi = ${f(calc.fire.parts.Reta, 1)}, Ra = ${f(calc.fire.parts.Ra, 1)}, Rl = ${f(calc.fire.parts.Rl, 1)}, Rb = ${f(calc.fire.parts.Rb, 1)}, Rn = ${calc.fire.parts.Rn}.`],
  });
  else if (calc.fire.note) L.push({ id: 'fire', group: 'Feu', title: 'Résistance au feu', status: 'nv', value: '—', ref: 'EN 1992-1-2', details: [calc.fire.note] });

  calc.checks.forEach((c, i) => L.push({
    id: `chk-${i}`, group: 'Dispositions constructives', title: c.label, status: c.ok ? (c.blocking ? 'ok' : 'info') : (c.blocking ? 'ko' : 'warn'),
    value: c.value, limit: c.limit, ref: c.ref, details: [],
  }));

  if (calc.rp.lambda > 0) L.push({
    id: 'rp', group: 'Comparaisons', title: 'Méthode des Recommandations professionnelles', status: 'info',
    value: `NEd/NRd = ${f(calc.rp.ratio)}`, limit: `NRd = ${f(calc.rp.NRd, 0)} kN`, ref: 'RP France',
    details: [`α = ${f(calc.rp.alpha, 3)}, kh = ${f(calc.rp.kh, 3)}, ks = ${f(calc.rp.ks, 3)}.`, calc.rp.note],
  });
  for (const d of calc.directions) L.push({
    id: `cmp-${d.dir}`, group: 'Comparaisons', title: `Second ordre : courbure / rigidité — ${d.label}`, status: 'info',
    value: `${f(d.MEd_curv, 1)} / ${Number.isFinite(d.MEd_rig) ? f(d.MEd_rig, 1) : 'instable'} kNm`, ref: '§5.8.7, §5.8.8',
    details: [`NB = ${f(d.NB, 0)} kN ; méthode retenue : ${d.method === 'rigidite' ? 'rigidité nominale' : 'courbure nominale'}.`],
  });
  return L;
}

export interface Proposal { phiL: number; nBars: number; phiW: number; spacing: number; As: number; util: number; mass: number }

const PHI_L = [12, 14, 16, 20, 25, 32];
const PHI_W = [6, 8, 10, 12];

/** Recherche des ferraillages conformes les plus légers (même disposition que le calcul). */
export function proposeRebar(mat: Materials, geom: Geometry, loads: Loads, base: Rebar, fire: FireInput, max = 4): Proposal[] {
  const ref = calculerPoteau(mat, geom, loads, base, fire);
  const nMin = ref.section?.kind === 'poly' ? Math.max(4, ref.section.keyBars) : 4;
  const even = ref.section?.kind === 'rect';
  const target = Math.max(ref.As_min, Number.isFinite(ref.As_req) ? ref.As_req * 0.8 : 0);
  const tMin = ref.section?.tMin ?? 300;
  const cands: { phiL: number; n: number; As: number }[] = [];
  for (const phi of PHI_L) for (let n = nMin; n <= nMin + 16; n += even ? 2 : 1) {
    const As = n * Math.PI * phi * phi / 400;
    if (As >= target && As <= ref.As_max) cands.push({ phiL: phi, n, As });
  }
  cands.sort((a, b) => a.As - b.As);
  const out: Proposal[] = [];
  for (const c of cands) {
    if (out.length >= max) break;
    const phiW = PHI_W.find(w => w >= Math.max(6, c.phiL / 4) && w >= Math.min(base.phiW, 12)) ?? 12;
    const scl = Math.min(20 * c.phiL, tMin, 400);
    const spacing = Math.max(50, Math.floor(Math.min(base.spacing, scl) / 5) * 5);
    const r: Rebar = { ...base, phiL: c.phiL, nBars: c.n, phiW, spacing };
    const res = calculerPoteau(mat, geom, loads, r, fire);
    if (res.verdict === 'OK') {
      const mass = c.As * 100 * 7850 / 1e6; // kg/m d'armatures longitudinales
      out.push({ phiL: c.phiL, nBars: c.n, phiW, spacing, As: c.As, util: res.util, mass });
    }
  }
  return out;
}
