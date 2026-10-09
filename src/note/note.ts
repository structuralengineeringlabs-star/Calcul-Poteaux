/**
 * Note de calcul structurée — HTML paginé par Paged.js (CSS Paged Media).
 *
 * Contenu : page de garde et tableau des révisions, sommaire, listes des figures, tableaux et
 * équations, références normatives et hypothèses, un chapitre par poteau (données, calculs
 * numérotés avec article, valeurs substituées et unités, vérifications), synthèse, mentions,
 * plans en annexe. En-têtes, pieds de page et pagination « n / N » sur chaque page.
 */
import {
  interactionDiagram, materialProps, concreteLabel, type ColumnResult, type Materials, type Geometry,
  type Loads, type Rebar, type FireInput, type DirectionResult,
} from '../eurocode';
import { buildSectionPreview, buildSheet, toSVG } from '../drawing';
import type { ProjectInfo } from '../store';
import { selLogoSVG, estLogoSEL } from '../brand/sel';

export interface NoteColumn {
  name: string; materials: Materials; geometry: Geometry; loads: Loads; rebar: Rebar; fire: FireInput;
  calc: ColumnResult;
  nomen: { L_barre: number; L_cadre: number; nb_cadres: number; weightL: number; weightW: number; totalWeight: number; L_ancrage: number; L_recouvrement: number };
}
export interface NoteOptions { includePlans: boolean; title?: string }

// ---------------------------------------------------------------------------
// Outils de mise en forme
// ---------------------------------------------------------------------------

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') : '∞');
const sub = (base: string, s: string) => `${base}<sub>${s}</sub>`;

/** Élément structuré de la note (rendu HTML et PDF à partir du même contenu). Textes en HTML restreint :
 *  <b>, <i>, <sub>, <sup>, <span class="st …">, <span class="eq-note">, entités. */
export type NoteBlock =
  | { k: 'h1' | 'h2'; num: string; title: string; id: string }
  | { k: 'h3'; title: string }
  | { k: 'p'; html: string }
  | { k: 'eq'; no: number; id: string; label: string; sym: string; num: string | null; res: string; ref: string }
  | { k: 'table'; no: number; id: string; caption: string; head: string[]; rows: string[][]; align: ('l' | 'r' | 'c')[] }
  | { k: 'fig'; no: number; id: string; caption: string; svg: string; width: number }
  | { k: 'alert'; kind: 'ok' | 'ko' | 'nv'; html: string; items: string[] }
  | { k: 'list'; items: string[] };

export class Doc {
  blocks: NoteBlock[] = [];
  body: string[] = [];
  heads: { level: 1 | 2; num: string; title: string; id: string }[] = [];
  eqs: { no: number; label: string; id: string }[] = [];
  tabs: { no: number; caption: string; id: string }[] = [];
  figs: { no: number; caption: string; id: string }[] = [];
  private c1 = 0; private c2 = 0;
  h1(title: string) {
    this.c1++; this.c2 = 0;
    const id = `h-${this.c1}`;
    this.heads.push({ level: 1, num: `${this.c1}`, title, id });
    this.blocks.push({ k: 'h1', num: `${this.c1}`, title, id });
    this.body.push(`<h1 id="${id}"><span class="num">${this.c1}</span> ${esc(title)}</h1>`);
  }
  h2(title: string) {
    this.c2++;
    const num = `${this.c1}.${this.c2}`, id = `h-${this.c1}-${this.c2}`;
    this.heads.push({ level: 2, num, title, id });
    this.blocks.push({ k: 'h2', num, title, id });
    this.body.push(`<h2 id="${id}"><span class="num">${num}</span> ${esc(title)}</h2>`);
  }
  p(html: string) { this.blocks.push({ k: 'p', html }); this.body.push(`<p>${html}</p>`); }
  h3(title: string) { this.blocks.push({ k: 'h3', title }); this.body.push(`<h3>${esc(title)}</h3>`); }
  alert(kind: 'ok' | 'ko' | 'nv', html: string, items: string[] = []) {
    this.blocks.push({ k: 'alert', kind, html, items });
    this.body.push(`<div class="alert ${kind}">${html}${items.length ? `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}</div>`);
  }
  list(items: string[]) { this.blocks.push({ k: 'list', items }); this.body.push(`<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`); }
  /** Équation numérotée : forme littérale, application numérique, résultat, référence. */
  eq(label: string, sym: string, num: string | null, res: string, ref: string) {
    const no = this.eqs.length + 1, id = `eq-${no}`;
    this.eqs.push({ no, label, id });
    this.blocks.push({ k: 'eq', no, id, label, sym, num, res, ref });
    this.body.push(`<div class="eq" id="${id}"><div class="eq-body"><span class="eq-sym">${sym}</span>${num ? ` = <span class="eq-num">${num}</span>` : ''} = <b>${res}</b></div><div class="eq-ref">${esc(ref)}</div><div class="eq-no">(${no})</div></div>`);
    return no;
  }
  table(caption: string, head: string[], rows: (string | number)[][], opts: { align?: ('l' | 'r' | 'c')[]; cls?: string } = {}) {
    const no = this.tabs.length + 1, id = `tab-${no}`;
    this.tabs.push({ no, caption, id });
    this.blocks.push({ k: 'table', no, id, caption, head, rows: rows.map(r => r.map(c => String(c))), align: opts.align ?? head.map(() => 'l' as const) });
    const al = (j: number) => (opts.align?.[j] === 'r' ? ' class="r"' : opts.align?.[j] === 'c' ? ' class="c"' : '');
    this.body.push(`<table id="${id}" class="${opts.cls ?? ''}"><caption>Tableau ${no} — ${esc(caption)}</caption><thead><tr>${head.map((h, j) => `<th${al(j)}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, j) => `<td${al(j)}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    return no;
  }
  fig(caption: string, svg: string, width = '70%') {
    const no = this.figs.length + 1, id = `fig-${no}`;
    this.figs.push({ no, caption, id });
    this.blocks.push({ k: 'fig', no, id, caption, svg, width: parseFloat(width) / 100 });
    this.body.push(`<figure id="${id}"><div class="fig" style="width:${width}">${svg}</div><figcaption>Figure ${no} — ${esc(caption)}</figcaption></figure>`);
    return no;
  }
}

/** Diagramme d'interaction N-M en SVG, avec le point de calcul. */
function interactionSVG(pts: { N: number; M: number }[], NEd: number, MEd: number, title: string): string {
  const W = 520, H = 360, ml = 62, mr = 16, mt = 14, mb = 44;
  const Ms = pts.map(p => p.M).concat([MEd, 0]), Ns = pts.map(p => p.N).concat([NEd, 0]);
  const mMin = Math.min(...Ms), mMax = Math.max(...Ms) * 1.08, nMin = Math.min(...Ns), nMax = Math.max(...Ns) * 1.05;
  const X = (m: number) => ml + (m - mMin) / (mMax - mMin || 1) * (W - ml - mr);
  const Y = (v: number) => mt + (nMax - v) / (nMax - nMin || 1) * (H - mt - mb);
  const tick = (a: number, b: number) => { const r = Math.abs(b - a) / 6; const p = Math.pow(10, Math.floor(Math.log10(r))); const s = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= r) ?? r; const out: number[] = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) out.push(v); return out; };
  const g: string[] = [];
  for (const v of tick(nMin, nMax)) g.push(`<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5e7eb"/><text x="${ml - 6}" y="${Y(v) + 3}" text-anchor="end" font-size="10">${n(v, 0)}</text>`);
  for (const v of tick(mMin, mMax)) g.push(`<line y1="${mt}" y2="${H - mb}" x1="${X(v)}" x2="${X(v)}" stroke="#e5e7eb"/><text y="${H - mb + 14}" x="${X(v)}" text-anchor="middle" font-size="10">${n(v, 0)}</text>`);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.M).toFixed(1)},${Y(p.N).toFixed(1)}`).join(' ');
  const inside = MEd <= Math.max(...pts.filter(p => Math.abs(p.N - NEd) < (nMax - nMin) * 0.05).map(p => p.M), 0);
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
    ${g.join('')}
    <line x1="${X(0)}" x2="${X(0)}" y1="${mt}" y2="${H - mb}" stroke="#6b7280"/><line x1="${ml}" x2="${W - mr}" y1="${Y(0)}" y2="${Y(0)}" stroke="#6b7280"/>
    <path d="${path}" fill="rgba(58,155,213,0.10)" stroke="#1d6fa5" stroke-width="2"/>
    <circle cx="${X(MEd)}" cy="${Y(NEd)}" r="5" fill="${inside ? '#15803d' : '#b91c1c'}"/>
    <text x="${X(MEd) + 8}" y="${Y(NEd) - 6}" font-size="11" font-weight="bold">(${n(MEd, 1)} kNm ; ${n(NEd, 0)} kN)</text>
    <text x="${(ml + W - mr) / 2}" y="${H - 8}" text-anchor="middle" font-size="11">M (kNm) — ${esc(title)}</text>
    <text x="14" y="${(mt + H - mb) / 2}" text-anchor="middle" font-size="11" transform="rotate(-90 14 ${(mt + H - mb) / 2})">N (kN, compression +)</text>
  </svg>`;
}

const STATUS = (ok: boolean | null) => (ok === null ? '<span class="st nv">Non vérifié</span>' : ok ? '<span class="st ok">Conforme</span>' : '<span class="st ko">Non conforme</span>');

// ---------------------------------------------------------------------------
// Chapitre d'un poteau
// ---------------------------------------------------------------------------

function columnChapter(D: Doc, c: NoteColumn) {
  const { calc: r, materials: M, geometry: G, loads: L, rebar: R } = c;
  const mp = r.mat;
  D.h1(`Poteau ${c.name}`);

  // ---- Données
  D.h2('Données');
  const sec = r.section;
  const prev = buildSectionPreview(r, R);
  if (prev) D.fig(`Coupe du poteau ${c.name} : ${sec?.label ?? ''}, ${R.nBars} HA${R.phiL}, cadres HA${R.phiW} e = ${R.spacing} mm`, toSVG(prev, { strokeScale: Math.max(prev.w, prev.h) / 160 }), '42%');
  D.table('Géométrie', ['Grandeur', 'Valeur'], [
    ['Section', esc(sec?.label ?? G.shape)],
    [`Aire ${sub('A', 'c')}`, `${n(r.geom.A)} cm²`],
    [`Hauteur libre l`, `${n(G.L)} m`],
    ['Structure', G.braced === false ? 'Non contreventée' : 'Contreventée'],
    [`Longueur efficace ${sub('l', '0')}`, `${n(r.geom.l0)} m — ${esc(r.geom.l0Method)}`],
  ], { align: ['l', 'l'] });
  D.table('Matériaux et durabilité', ['Grandeur', 'Valeur'], [
    ['Béton', `${concreteLabel(M.fck)} — ${sub('f', 'ck')} = ${M.fck} MPa ; α<sub>cc</sub> = ${n(mp.alphaCC)} ; γ<sub>c</sub> = ${n(mp.gammaC)}`],
    ['Acier', `B${M.fyk} — ${sub('f', 'yk')} = ${M.fyk} MPa ; γ<sub>s</sub> = ${n(mp.gammaS)} ; classe B`],
    ["Classe d'exposition", `${esc(M.exposureClass)} ; classe structurale ${mp.structuralClass}${mp.structuralClassNote ? ` (${esc(mp.structuralClassNote)})` : ''}`],
    ['Paramètres nationaux', r.annex === 'FR' ? 'Annexe nationale française' : 'Valeurs recommandées de l\'EN 1992-1-1'],
  ], { align: ['l', 'l'] });
  const act: (string | number)[][] = [];
  if (r.loads.mode === 'GQ') act.push([`Charges permanentes G${r.loads.Npp > 0 ? ' (y compris poids propre)' : ''}`, `${n((L.NG ?? 0) + r.loads.Npp, 1)} kN`], ["Charges d'exploitation Q", `${n(L.NQ ?? 0, 1)} kN`], ['ψ<sub>1</sub> / ψ<sub>2</sub>', `${n(L.psi1 ?? 0.5)} / ${n(L.psi2 ?? 0.3)}`]);
  act.push([`Effort normal ELU ${sub('N', 'Ed')}`, `${n(r.loads.NEd, 1)} kN`]);
  if (r.loads.Ncar > 0) act.push([`Effort normal caractéristique ${sub('N', 'car')}`, `${n(r.loads.Ncar, 1)} kN`]);
  if (r.loads.Nqp > 0) act.push([`Effort normal quasi-permanent ${sub('N', 'qp')}`, `${n(r.loads.Nqp, 1)} kN`]);
  if (L.solicitationType === 'flexion_composee') for (const d of r.directions) act.push([`Moments du 1er ordre — ${esc(d.label)}`, `tête / pied : ${n(d.dir === 'h' ? (L.Mh_top ?? 0) : (L.Mb_top ?? 0), 1)} / ${n(d.dir === 'h' ? (L.Mh_bot ?? 0) : (L.Mb_bot ?? 0), 1)} kNm (${(d.dir === 'h' ? L.curvH : L.curvB) === 'double' ? 'double' : 'simple'} courbure)`]);
  if ((L.VEd ?? 0) > 0 || (L.VEd_b ?? 0) > 0 || (L.TEd ?? 0) > 0) act.push(['Effort tranchant / torsion', `${n(L.VEd ?? 0, 1)} kN (plan de h) ; ${n(L.VEd_b ?? 0, 1)} kN (plan de b) ; ${n(L.TEd ?? 0, 1)} kNm`]);
  D.table('Actions', ['Grandeur', 'Valeur'], act, { align: ['l', 'l'] });
  if (r.loads.mode === 'GQ') {
    const G = n((L.NG ?? 0) + r.loads.Npp, 1), Q = n(L.NQ ?? 0, 1);
    D.eq('Effort normal de calcul (ELU)', `${sub('N', 'Ed')} = 1,35 G + 1,5 Q`, `1,35 × ${G} + 1,5 × ${Q}`, `${n(r.loads.NEd, 1)} kN`, 'EN 1990 éq. 6.10');
    D.eq('Effort normal caractéristique (ELS)', `${sub('N', 'car')} = G + Q`, `${G} + ${Q}`, `${n(r.loads.Ncar, 1)} kN`, 'EN 1990 éq. 6.14b');
    D.eq('Effort normal quasi-permanent (ELS)', `${sub('N', 'qp')} = G + ψ<sub>2</sub>·Q`, `${G} + ${n(L.psi2 ?? 0.3)} × ${Q}`, `${n(r.loads.Nqp, 1)} kN`, 'EN 1990 éq. 6.16b');
  }
  if (r.errors.length) D.alert('ko', '<b>Données invalides :</b>', r.errors.map(e => esc(e)));

  // ---- Matériaux et enrobage
  D.h2('Résistances de calcul et enrobage');
  D.eq('Résistance de calcul du béton', `${sub('f', 'cd')} = α<sub>cc</sub>·${sub('f', 'ck')}/γ<sub>c</sub>`, `${n(mp.alphaCC)} × ${M.fck} / ${n(mp.gammaC)}`, `${n(mp.fcd)} MPa`, 'EC2 §3.1.6 (3.15)');
  D.eq("Limite d'élasticité de calcul", `${sub('f', 'yd')} = ${sub('f', 'yk')}/γ<sub>s</sub>`, `${M.fyk} / ${n(mp.gammaS)}`, `${n(mp.fyd)} MPa`, 'EC2 §3.2.7');
  D.eq('Enrobage minimal', `${sub('c', 'min')} = max(${sub('c', 'min,b')} ; ${sub('c', 'min,dur')} ; 10 mm)`, `max(${n(mp.cMinB, 0)} ; ${n(mp.cMinDur, 0)} ; 10)`, `${n(mp.cMin, 0)} mm`, 'EC2 §4.4.1.2 (4.2), tab. 4.4N');
  D.eq('Enrobage nominal', `${sub('c', 'nom')} = ${sub('c', 'min')} + Δ${sub('c', 'dev')}`, `${n(mp.cMin, 0)} + ${n(M.deltaCdev, 0)}`, `${n(mp.cNom, 0)} mm`, 'EC2 §4.4.1.1 (4.1)');
  if (mp.coverNote) D.p(`<i>${esc(mp.coverNote)}</i>`);

  // ---- Élancement
  D.h2('Élancement et effets du second ordre');
  D.eq('Imperfection géométrique', `${sub('e', 'i')} = α<sub>h</sub>·${sub('l', '0')}/400`, `${n(r.geom.alphaH, 3)} × ${n(r.geom.l0 * 1000, 0)} / 400`, `${n(r.geom.ei, 1)} mm`, 'EC2 §5.2 (5.1), (5.2)');
  if (r.geom.phiInf !== null) D.eq('Coefficient de fluage', `φ(∞,${sub('t', '0')}) <span class="eq-note">[RH = ${G.RH} % ; ${sub('t', '0')} = ${G.t0} j ; ${sub('h', '0')} = ${n(r.geom.h0 ?? 0, 0)} mm ; T = ${G.Tmean ?? 20} °C ; ciment ${G.cement ?? 'N'}]</span>`, null, n(r.geom.phiInf), 'EC2 annexe B');
  for (const d of r.directions) {
    D.h3(d.label);
    D.eq('Élancement', `λ = ${sub('l', '0')}/i`, `${n(r.geom.l0 * 1000, 0)} / ${n(r.geom.l0 * 1000 / d.lambda, 1)}`, n(d.lambda, 1), 'EC2 §5.8.3.2 (5.14)');
    D.eq('Fluage effectif', `φ<sub>ef</sub>`, null, `${n(d.phiEf)}${d.phiEfNote ? ' — ' + esc(d.phiEfNote) : ''}`, 'EC2 §5.8.4 (5.19)');
    D.eq('Élancement limite', `λ<sub>lim</sub> = 20·A·B·C/√n`, `20 × ${n(d.coefA, 3)} × ${n(d.coefB, 3)} × ${n(d.coefC, 3)} / √${n(d.n, 3)}`, Number.isFinite(d.lambdaLim) ? n(d.lambdaLim, 1) : '∞', 'EC2 §5.8.3.1 (5.13N)');
    D.p(`r<sub>m</sub> = ${n(d.rm)} ; λ ${d.lambda > d.lambdaLim ? '>' : '≤'} λ<sub>lim</sub> : ${d.isSecondOrder ? '<b>les effets du second ordre sont pris en compte</b>' : 'les effets du second ordre peuvent être négligés'}.`);
    D.eq('Moment d\'extrémité (grand)', `${sub('M', '02')} = ${sub('M', 'max')} + ${sub('N', 'Ed')}·${sub('e', 'i')}`, `${n(d.M0, 1)} + ${n(r.loads.NEd, 1)} × ${n(d.ei / 1000, 4)}`, `${n(d.M02, 1)} kNm`, 'EC2 §5.8.8.2');
    D.eq('Moment d\'extrémité (petit)', `${sub('M', '01')}`, null, `${n(d.M01, 1)} kNm`, 'EC2 §5.8.8.2');
    if (d.isSecondOrder && d.method === 'courbure') {
      D.eq('Courbure de base', `1/${sub('r', '0')} = ε<sub>yd</sub>/(0,45 d)`, `${n(mp.fyd / 200000 * 1000, 3)}‰ / (0,45 × ${n(d.d, 0)} mm)`, `${n(d.r0_inv, 5)} m⁻¹`, 'EC2 §5.8.8.3 (5.34)');
      D.eq('Coefficient de correction (effort normal)', `${sub('K', 'r')} = (1 + ω − n)/(1 + ω − 0,4)`, `(1 + ${n(d.omega, 3)} − ${n(d.n, 3)}) / (1 + ${n(d.omega, 3)} − 0,4)`, n(d.Kr, 3), 'EC2 (5.36)');
      D.eq('Coefficient de fluage', `${sub('K', 'φ')} = 1 + β·φ<sub>ef</sub> ≥ 1`, null, n(d.Kphi, 3), 'EC2 (5.37)');
      D.eq('Excentricité du second ordre', `${sub('e', '2')} = ${sub('K', 'r')}·${sub('K', 'φ')}·(1/${sub('r', '0')})·${sub('l', '0')}²/c`, `${n(d.Kr, 3)} × ${n(d.Kphi, 3)} × ${n(d.r0_inv, 5)} × ${n(r.geom.l0, 2)}² / ${d.c}`, `${n(d.e2, 1)} mm`, 'EC2 (5.33), (5.34)');
      D.eq('Moment équivalent du 1er ordre', `${sub('M', '0e')} = max(0,6 ${sub('M', '02')} + 0,4 ${sub('M', '01')} ; 0,4 ${sub('M', '02')})`, null, `${n(d.M0e, 1)} kNm`, 'EC2 (5.32)');
    }
    if (d.isSecondOrder && d.method === 'rigidite') {
      D.eq('Rigidité nominale', `EI = ${sub('K', 'c')}·${sub('E', 'cd')}·${sub('I', 'c')} + ${sub('E', 's')}·${sub('I', 's')}`, null, `${n(d.EI, 0)} kN·m²`, 'EC2 (5.21)');
      D.eq('Charge de flambement', `${sub('N', 'B')} = π²·EI/${sub('l', '0')}²`, null, `${n(d.NB, 0)} kN`, 'EC2 §5.8.7.3');
    }
    D.eq('Moment de calcul', `${sub('M', 'Ed')} = max(${sub('M', '02')} ; ${sub('M', '0e')} + ${sub('M', '2')} ; ${sub('M', '01')} + 0,5 ${sub('M', '2')} ; ${sub('N', 'Ed')}·${sub('e', '0')})`, `max(${n(d.M02, 1)} ; ${n(d.M0e + d.M2, 1)} ; ${n(d.M01 + 0.5 * d.M2, 1)} ; ${n(r.loads.NEd * d.emin / 1000, 1)})`, `${n(d.MEd, 1)} kNm`, 'EC2 §5.8.8.2, §6.1(4)');
  }

  // ---- Résistance
  D.h2('Résistance de la section');
  D.p(`La résistance est déterminée sur le diagramme d'interaction de la section armée (diagramme parabole-rectangle du béton, acier élasto-plastique à palier horizontal, béton déplacé déduit), avec ${R.nBars} HA${R.phiL} (${sub('A', 's')} = ${n(r.As_prov)} cm²).`);
  if (sec && sec.bars.length) for (const d of r.directions) {
    const pts = interactionDiagram(sec, d.dir, materialProps(M, R));
    D.fig(`Diagramme d'interaction N-M — ${c.name}, ${d.label}`, interactionSVG(pts, r.loads.NEd, d.MEd, d.label), '78%');
  }
  D.table('Vérification de la résistance', ['Direction', `${sub('M', 'Ed')} (kNm)`, `${sub('M', 'Rd')} (kNm)`, 'Taux', 'Statut'],
    r.directions.map(d => [esc(d.label), n(d.MEd, 1), d.MRd === null ? `N > ${sub('N', 'Rd,max')}` : n(d.MRd, 1), n(d.util), STATUS(d.util <= 1)]), { align: ['l', 'r', 'r', 'r', 'c'] });
  if (r.biaxial) {
    const b = r.biaxial;
    if (b.required) D.eq('Flexion déviée', `(${sub('M', 'Edz')}/${sub('M', 'Rdz')})<sup>a</sup> + (${sub('M', 'Edy')}/${sub('M', 'Rdy')})<sup>a</sup> ≤ 1`, `a = ${n(b.a)} (${sub('N', 'Rd')} = ${n(b.NRd, 0)} kN)`, n(b.value), 'EC2 §5.8.9 (5.39)');
    else D.p(`Flexion déviée : ${esc(b.reason)} (EC2 §5.8.9(3)).`);
  }
  D.eq('Armatures minimales', `${sub('A', 's,min')} = max(0,10 ${sub('N', 'Ed')}/${sub('f', 'yd')} ; 0,002 ${sub('A', 'c')})`, `max(${n(r.As_min_Ned)} ; ${n(r.As_min_Ac)})`, `${n(r.As_min)} cm²`, 'EC2 §9.5.2(2) (9.12N)');
  D.p(`Section d'acier requise par le calcul : ${sub('A', 's,req')} = ${Number.isFinite(r.As_req) ? n(r.As_req) + ' cm²' : '> 8 % A<sub>c</sub>'} ; section retenue ${n(r.As_prov)} cm² (ρ = ${n(r.rho)} %).`);

  // ---- Effort tranchant
  if (r.shear.computed) {
    D.h2('Effort tranchant et torsion');
    for (const s of r.shear.dirs) {
      D.eq(`Résistance sans armatures — ${s.label}`, `${sub('V', 'Rd,c')} = [${sub('C', 'Rd,c')}·k·(100 ρ<sub>l</sub> ${sub('f', 'ck')})<sup>1/3</sup> + ${sub('k', '1')}·σ<sub>cp</sub>]·${sub('b', 'w')}·d`, `b<sub>w</sub> = ${n(s.bw, 0)} mm, d = ${n(s.d, 0)} mm, ρ<sub>l</sub> = ${n(s.rhoL * 100, 3)} %, σ<sub>cp</sub> = ${n(r.shear.sigma_cp)} MPa`, `${n(s.VRd_c, 1)} kN`, 'EC2 §6.2.2 (6.2)');
      D.eq(`Résistance des bielles — ${s.label}`, `${sub('V', 'Rd,max')} = α<sub>cw</sub>·${sub('b', 'w')}·z·ν<sub>1</sub>·${sub('f', 'cd')}/(cot θ + tan θ)`, `cot θ = ${n(s.cot)}`, `${n(s.VRd_max, 1)} kN`, 'EC2 §6.2.3 (6.9)');
    }
    D.table('Vérification à l\'effort tranchant', ['Plan', `${sub('V', 'Ed')} (kN)`, 'Interaction V/T', `${sub('A', 'sw')}/s requis`, 'fourni (mm²/m)', 'Statut'],
      r.shear.dirs.map(s => [esc(s.label), n(s.VEd, 1), n(s.interaction), s.reinforced ? n(s.Asw_req, 0) : 'minimal', n(s.Asw_prov, 0), STATUS(s.ok)]), { align: ['l', 'r', 'r', 'r', 'r', 'c'] });
  }

  // ---- ELS
  D.h2('États limites de service');
  if (r.els.computed) {
    if (r.loads.Nqp > 0) D.eq('Contrainte quasi-permanente', `σ<sub>c,qp</sub> = ${sub('N', 'qp')}/(${sub('A', 'c')} + (α<sub>e</sub> − 1)·${sub('A', 's')})`, null, `${n(r.els.sigma_c)} MPa ≤ 0,45 ${sub('f', 'ck')} = ${n(r.els.limit045, 1)} MPa`, 'EC2 §7.2(3)');
    if (r.els.sigma_car !== null) D.eq('Contrainte caractéristique', `σ<sub>c,car</sub>`, null, `${n(r.els.sigma_car)} MPa${r.els.limit06 !== null ? ` ≤ 0,6 ${sub('f', 'ck')} = ${n(r.els.limit06, 1)} MPa` : ''}`, 'EC2 §7.2(2)');
    D.p(esc(r.els.note));
  } else D.p(`Contraintes non vérifiées : ${esc(r.els.note)}`);
  if (r.crack.computed) {
    if (r.crack.compressed) D.p(`Fissuration : ${esc(r.crack.note)}`);
    else {
      D.eq('Espacement maximal des fissures', `${sub('s', 'r,max')} = ${sub('k', '3')}·c + ${sub('k', '1')}·${sub('k', '2')}·${sub('k', '4')}·Φ/ρ<sub>p,eff</sub>`, null, `${n(r.crack.srmax, 0)} mm`, 'EC2 §7.3.4 (7.11)');
      D.eq('Ouverture des fissures', `${sub('w', 'k')} = ${sub('s', 'r,max')}·(ε<sub>sm</sub> − ε<sub>cm</sub>)`, `${n(r.crack.srmax, 0)} × ${n(r.crack.deltaEps * 1000, 3)}‰`, `${n(r.crack.wk, 3)} mm ${r.crack.wmax !== null ? `${r.crack.ok ? '≤' : '>'} ${n(r.crack.wmax)} mm` : ''}`, 'EC2 §7.3.4 (7.8)');
      D.p(esc(r.crack.note));
    }
  }

  // ---- Feu
  if (r.fire.computed) {
    D.h2('Résistance au feu');
    D.eq('Taux de chargement en situation d\'incendie', `η<sub>fi</sub> = (G + ψ<sub>fi</sub>·Q)/(1,35 G + 1,5 Q)`, null, n(r.fire.etaFi, 3), 'EN 1992-1-2 (2.5)');
    D.eq('Résistance au feu', `R = 120·[(R<sub>ηfi</sub> + R<sub>a</sub> + R<sub>l</sub> + R<sub>b</sub> + R<sub>n</sub>)/120]<sup>1,8</sup>`, `120 × [(${n(r.fire.parts.Reta, 1)} + ${n(r.fire.parts.Ra, 1)} + ${n(r.fire.parts.Rl, 1)} + ${n(r.fire.parts.Rb, 1)} + ${r.fire.parts.Rn})/120]<sup>1,8</sup>`, `${n(r.fire.R, 0)} min`, 'EN 1992-1-2 §5.3.2 (5.7)');
    D.p(`${esc(r.fire.note)} Exigence : R${r.fire.Rreq} — ${STATUS(r.fire.valid ? r.fire.ok : null)}.`);
  }

  // ---- Dispositions
  D.h2('Dispositions constructives');
  D.table('Dispositions constructives', ['Exigence', 'Valeur', 'Limite', 'Article', 'Statut'],
    r.checks.map(k => [esc(k.label), esc(k.value), esc(k.limit), esc(k.ref), k.blocking ? STATUS(k.ok) : '<span class="st info">Information</span>']), { align: ['l', 'r', 'l', 'l', 'c'] });

  // ---- Ancrages et nomenclature
  D.h2('Ancrages, recouvrements et nomenclature');
  if (r.anchorage) {
    const a = r.anchorage;
    D.eq('Contrainte ultime d\'adhérence', `${sub('f', 'bd')} = 2,25·η<sub>1</sub>·η<sub>2</sub>·${sub('f', 'ctd')}`, null, `${n(a.fbd)} MPa`, 'EC2 §8.4.2 (8.2)');
    D.eq("Longueur d'ancrage de référence", `${sub('l', 'b,rqd')} = (Φ/4)·${sub('f', 'yd')}/${sub('f', 'bd')}`, `(${R.phiL}/4) × ${n(mp.fyd)} / ${n(a.fbd)}`, `${n(a.lb_rqd, 0)} mm`, 'EC2 §8.4.3 (8.3)');
    D.eq('Longueur de recouvrement', `${sub('l', '0')} = α<sub>6</sub>·${sub('l', 'b,rqd')} ≥ ${sub('l', '0,min')}`, `α<sub>6</sub> = ${n(a.alpha6)}`, `${n(a.l0, 0)} mm`, 'EC2 §8.7.3 (8.10)');
  }
  D.table('Nomenclature des aciers', ['Repère', 'Désignation', 'Nombre', 'Longueur unitaire (m)', 'Masse (kg)'], [
    ['1', `HA${R.phiL} longitudinales`, R.nBars, n(c.nomen.L_barre), n(c.nomen.weightL, 1)],
    ['2', `Cadres HA${R.phiW}`, c.nomen.nb_cadres, n(c.nomen.L_cadre), n(c.nomen.weightW, 1)],
    ['', '<b>Total</b>', '', '', `<b>${n(c.nomen.totalWeight, 1)}</b>`],
  ], { align: ['c', 'l', 'r', 'r', 'r'] });

  // ---- Conclusion
  D.h2('Conclusion');
  D.alert(r.verdict === 'OK' ? 'ok' : r.verdict === 'KO' ? 'ko' : 'nv', `<b>Poteau ${esc(c.name)} : ${r.verdict === 'OK' ? 'conforme' : r.verdict === 'KO' ? 'non conforme' : 'non vérifié'}.</b> Taux de travail ELU ${n(r.util)} ; armatures ${R.nBars} HA${R.phiL}, cadres HA${R.phiW} e = ${R.spacing} mm.`);
  if (r.warnings.length) D.alert('nv', '<b>Observations :</b>', r.warnings.map(w => esc(w)));
}

// ---------------------------------------------------------------------------
// Document complet
// ---------------------------------------------------------------------------

/** Empreinte FNV-1a (32 bits) des données d'entrée : identifiant de calcul reproductible. */
export function fingerprint(data: unknown): string {
  const s = JSON.stringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).toUpperCase().padStart(8, '0');
}
const inputsOf = (c: NoteColumn) => ({ name: c.name, materials: c.materials, geometry: c.geometry, loads: c.loads, rebar: c.rebar, fire: c.fire });

export interface NoteMeta { title: string; annex: 'EC2' | 'FR'; id: string; ids: { name: string; id: string }[]; generated: string; version: string; plansFile: string }

/** Construit la note (contenu structuré + HTML des blocs). */
export function buildNoteDoc(info: ProjectInfo, cols: NoteColumn[], version: string, opts: NoteOptions): { D: Doc; meta: NoteMeta } {
  const D = new Doc();
  const title = opts.title ?? info.titreNote;
  const annex = cols[0]?.calc.annex ?? 'FR';

  D.h1('Objet de la note');
  D.p(`La présente note justifie ${cols.length > 1 ? `les ${cols.length} poteaux` : 'le poteau'} en béton armé du projet <b>${esc(info.projet)}</b> (${esc(info.client)}) : ${cols.map(c => esc(c.name)).join(', ')}. Elle porte sur la résistance aux états limites ultimes (y compris les effets du second ordre), les états limites de service, la résistance au feu lorsqu'elle est demandée, et les dispositions constructives.`);

  D.h1('Références et hypothèses générales');
  D.h2('Références normatives');
  D.table('Références normatives', ['Référence', 'Édition', 'Objet'], [
    ['NF EN 1990 et son Annexe nationale', 'EN 1990:2002 + A1:2005', 'Bases de calcul, combinaisons d\'actions'],
    ['NF EN 1991-1-1', 'EN 1991-1-1:2002', 'Actions sur les structures — poids propres, charges d\'exploitation'],
    [`NF EN 1992-1-1${annex === 'FR' ? ' et NF EN 1992-1-1/NA' : ''}`, `EN 1992-1-1:2004 + AC:2010 + A1:2014${annex === 'FR' ? ' ; AN : mars 2016' : ''}`, 'Calcul des structures en béton — règles générales'],
    ...(cols.some(c => c.calc.fire.computed) ? [[`NF EN 1992-1-2${annex === 'FR' ? ' et son Annexe nationale' : ''}`, 'EN 1992-1-2:2004 + AC:2008 + A1:2019', 'Calcul du comportement au feu']] : []),
    ['NF EN 206/CN', '—', 'Béton — classes d\'exposition (annexe E de l\'EN 1992-1-1, informative)'],
    ...(cols.some(c => c.calc.rp.lambda > 0) ? [['Recommandations professionnelles (FFB)', '2007', 'Méthode simplifiée pour les poteaux (comparaison)']] : []),
  ], { align: ['l', 'l', 'l'] });
  D.p('Les éditions indiquées sont celles sur lesquelles l\'application a été établie ; le vérificateur s\'assure de leur applicabilité au projet.');
  D.p(`Paramètres déterminés au niveau national : ${annex === 'FR' ? 'valeurs de l\'Annexe nationale française' : 'valeurs recommandées de l\'EN 1992-1-1'}. Logiciel : Dimensionnement des poteaux aux Eurocodes, version ${esc(version)}.`);
  D.h2('Hypothèses de calcul');
  D.list([
    'Diagramme parabole-rectangle du béton (EC2 §3.1.7) ; acier à palier horizontal sans limite de déformation (§3.2.7(2) b).',
    'Imperfections géométriques par inclinaison θ<sub>i</sub> = α<sub>h</sub>/200, élément isolé (α<sub>m</sub> = 1), prises dans la direction la plus défavorable pour la flexion déviée.',
    `Second ordre par la méthode ${cols.some(c => c.geometry.secondOrderMethod === 'rigidite') ? 'de la rigidité nominale (§5.8.7) ou de la courbure nominale (§5.8.8) selon le poteau' : 'de la courbure nominale (§5.8.8)'}.`,
    'Rapport M<sub>0Eqp</sub>/M<sub>0Ed</sub> pris égal à N<sub>qp</sub>/N<sub>Ed</sub> pour le fluage effectif ; même longueur efficace dans les deux directions.',
    "Sections non rectangulaires : calcul dans les axes principaux d'inertie, axe neutre parallèle à l'axe principal.",
    'Ancrages : barres droites, σ<sub>sd</sub> = f<sub>yd</sub> ; barres supposées tendues en flexion composée.',
    "Plus gros granulat d<sub>g</sub> ≤ 32 mm (espacements et enrobage d'adhérence).",
  ]);

  for (const c of cols) columnChapter(D, c);

  if (cols.length > 1) {
    D.h1('Synthèse du projet');
    D.table('Synthèse des poteaux', ['Poteau', 'Section', `${sub('N', 'Ed')} (kN)`, `${sub('M', 'Ed')} (kNm)`, 'Armatures', 'Taux', 'Statut'],
      cols.map(c => [esc(c.name), esc(c.calc.section?.label ?? ''), n(c.calc.loads.NEd, 0), n(c.calc.governing?.MEd ?? 0, 1), `${c.rebar.nBars} HA${c.rebar.phiL} ; HA${c.rebar.phiW} e = ${c.rebar.spacing}`, n(c.calc.util), STATUS(c.calc.verdict === 'NV' ? null : c.calc.verdict === 'OK')]),
      { align: ['l', 'l', 'r', 'r', 'l', 'r', 'c'] });
    const tot = cols.reduce((a, c) => a + c.nomen.totalWeight, 0);
    D.p(`Masse totale d'armatures des poteaux justifiés : <b>${n(tot, 1)} kg</b>.`);
  }

  if (info.mentions) { D.h1('Mentions'); D.p(esc(info.mentions)); }

  // Annexe : données d'entrée (rejouabilité du calcul)
  const ids = cols.map(c => ({ name: c.name, id: fingerprint(inputsOf(c)) }));
  const plansFile = `${info.reference || 'plans'}-plans-A3.pdf`;
  D.h1('Annexe — Données d\'entrée et documents associés');
  D.p(`Chaque poteau est identifié par l'empreinte de ses données d'entrée : deux notes portant le même identifiant proviennent des mêmes données. Les plans de ferraillage font l'objet d'un document séparé au format A3 : <b>${esc(plansFile)}</b>.`);
  for (const c of cols) {
    const M = c.materials, G = c.geometry, L = c.loads, R = c.rebar, F = c.fire;
    D.h2(`Poteau ${c.name} — identifiant ${ids.find(x => x.name === c.name)!.id}`);
    D.table(`Données d'entrée du poteau ${c.name}`, ['Rubrique', 'Données'], [
      ['Géométrie', esc(`forme ${G.shape} ; ${Object.entries(G.params).map(([k, v]) => `${k} = ${Math.round(v * 10)} mm`).join(', ')} ; l = ${G.L} m ; ${G.braced === false ? 'non contreventé' : 'contreventé'} ; ${G.lengthMode === 'k' ? `k1 = ${G.k1}, k2 = ${G.k2}` : `β = ${G.beta}`}`)],
      ['Matériaux', esc(`fck = ${M.fck} MPa ; fyk = ${M.fyk} MPa ; exposition ${M.exposureClass} ; classe structurale ${M.classMode === 'calcule' ? 'calculée' : M.structuralClass} ; Δcdev = ${M.deltaCdev} mm ; αcc = ${M.alphaCC ?? 1} ; γc = ${M.gammaC ?? 1.5} ; γs = ${M.gammaS ?? 1.15} ; annexe ${M.annex ?? 'FR'}`)],
      ['Second ordre', esc(`méthode ${G.secondOrderMethod ?? 'courbure'} ; fluage ${G.phiMode === 'calcule' ? `calculé (RH ${G.RH} %, t0 ${G.t0} j, ${G.Tmean ?? 20} °C, ciment ${G.cement ?? 'N'})` : `saisi φef = ${G.phi_ef}`}`)],
      ['Charges', esc(L.loadMode === 'GQ' ? `G = ${L.NG} kN ; Q = ${L.NQ} kN ; ψ1 = ${L.psi1 ?? 0.5} ; ψ2 = ${L.psi2 ?? 0.3} ; poids propre ${L.selfWeight ? 'inclus' : 'non inclus'}` : `NEd = ${L.NEd} kN ; Ncar = ${L.Ncar ?? 0} kN ; Nqp = ${L.Nqp ?? 0} kN`)],
      ['Moments', esc(L.solicitationType === 'flexion_composee' ? `plan h : ${L.Mh_top ?? 0} / ${L.Mh_bot ?? 0} kNm (${L.curvH ?? 'simple'}) ; plan b : ${L.Mb_top ?? 0} / ${L.Mb_bot ?? 0} kNm (${L.curvB ?? 'simple'}) ; charges transversales : ${L.transverse ? 'oui' : 'non'}` : `${L.solicitationType} (sans moment saisi)`)],
      ['Autres actions', esc(`VEd = ${L.VEd ?? 0} / ${L.VEd_b ?? 0} kN ; TEd = ${L.TEd ?? 0} kNm ; Mqp = ${L.Mqp_h ?? 0} kNm`)],
      ['Armatures', esc(`${R.nBars} HA${R.phiL} ; cadres HA${R.phiW} e = ${R.spacing} mm ; ancrages ${R.anchorMode ?? 'calcule'} (${R.bond ?? 'bonne'} adhérence, ${R.lapPercent ?? 100} % recouverts) ; ${R.numAnchors} ancrage(s), ${R.numLaps} recouvrement(s)`)],
      ['Feu', esc(F.R > 0 ? `R${F.R} ; l0,fi = ${F.l0fiFactor > 0 ? `${F.l0fiFactor} l` : 'l0'} ; μfi ${F.muFi ? `= ${F.muFi}` : 'automatique'}` : 'sans exigence')],
    ], { align: ['l', 'l'] });
  }
  const now = new Date();
  const generated = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  const meta: NoteMeta = { title, annex, id: fingerprint(cols.map(inputsOf)), ids, generated, version, plansFile };
  return { D, meta };
}

/** Note de calcul en HTML paginé (aperçu à l'écran, impression par le navigateur). */
export function buildNoteHTML(info: ProjectInfo, cols: NoteColumn[], version: string, opts: NoteOptions, pagedSrc?: string): string {
  const { D, meta } = buildNoteDoc(info, cols, version, opts);
  const title = meta.title, annex = meta.annex;
  const plans: string[] = [];
  // Sommaire et listes
  const toc = D.heads.map(h => `<li class="l${h.level}"><a href="#${h.id}"><span class="t">${h.num} ${esc(h.title)}</span></a></li>`).join('')

  const list = (items: { no: number; label?: string; caption?: string; id: string }[], prefix: string) =>
    items.map(i => `<li><a href="#${i.id}"><span class="t">${prefix} ${i.no} — ${esc(i.caption ?? i.label ?? '')}</span></a></li>`).join('');
  const revs = (info.revisions ?? []).map(r => `<tr><td class="c">${esc(r.indice)}</td><td>${esc(r.date)}</td><td>${esc(r.objet)}</td><td>${esc(r.auteur)}</td></tr>`).join('');
  const logo = info.showLogo && info.customLogo ? `<img class="logo" src="${info.customLogo}" alt="Logo"/>` : '';
  const copyright = info.copyright || `© ${new Date().getFullYear()} ${info.entreprise}`;

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)} — ${esc(info.reference)}</title>
<style>
@page { size: A4; margin: 24mm 16mm 20mm 20mm;
  @top-left { content: string(entreprise); font: 8pt Arial, sans-serif; color: #555; }
  @top-right { content: string(reference); font: 8pt Arial, sans-serif; color: #555; }
  @bottom-left { content: string(copyright); font: 7.5pt Arial, sans-serif; color: #777; }
  @bottom-center { content: string(chapitre); font: 7.5pt Arial, sans-serif; color: #777; }
  @bottom-right { content: "Page " counter(page) " / " counter(pages); font: 8pt Arial, sans-serif; }
}
@page :first { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-center { content: none; } @bottom-right { content: none; } }
@page plan { size: A3 landscape; margin: 10mm; @top-left { content: none; } @top-right { content: none; } @bottom-center { content: none; } }
html { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #111; line-height: 1.4; }
.run-ent { string-set: entreprise content(text); } .run-ref { string-set: reference content(text); } .run-cp { string-set: copyright content(text); }
.cover { break-after: page; height: 245mm; display: flex; flex-direction: column; }
.cart { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 2px solid #000; }
.cart .cc { padding: 3.5mm; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center; font-size: 9pt; }
.cart .cc:last-child { border-right: 0; } .cart .logo-cell { background: #f2f8fd; } .cart .logo-cell svg, .cart .logo-cell img { width: 100%; max-height: 16mm; }
.cart .lab { font-size: 6pt; color: #6b8aaa; text-transform: uppercase; font-weight: bold; letter-spacing: .1em; margin-bottom: 1mm; }
.cart .val { font-size: 11pt; font-weight: bold; text-transform: uppercase; } .cart .ref { color: #3a9bd5; font-family: 'Courier New', monospace; font-size: 10pt; font-weight: bold; }
.cart .row { display: flex; justify-content: space-between; gap: 3mm; margin-bottom: 2.5mm; }
.cart .nt { margin-top: auto; padding-top: 2.5mm; border-top: 1px solid #9aa8b8; text-align: center; }
.cart .nm { font-size: 10pt; font-weight: bold; color: #3a9bd5; letter-spacing: .2em; } .cart .ns { font-size: 8pt; font-weight: bold; color: #6b8aaa; letter-spacing: .1em; }
.cover .addr { font-size: 7.5pt; color: #555; margin-top: 1.5mm; }
.cover .logo { max-height: 22mm; max-width: 60mm; }
.cover .ent { font-size: 13pt; font-weight: bold; } .cover .addr { font-size: 8.5pt; color: #555; }
.cover .mid { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.cover .proj { font-size: 12pt; color: #555; text-transform: uppercase; letter-spacing: .05em; }
.cover .ttl { font-size: 24pt; font-weight: bold; margin: 4mm 0; color: #0f3d5c; }
.cover .sub { font-size: 12pt; }
table.cart { width: 100%; border-collapse: collapse; margin-top: 4mm; }
table.cart td { border: 1px solid #333; padding: 2mm; font-size: 8.5pt; vertical-align: top; } table.cart .k { color: #555; font-size: 7pt; display: block; }
h1 { break-before: page; font-size: 15pt; color: #0f3d5c; border-bottom: 1.5px solid #1d6fa5; padding-bottom: 1.5mm; string-set: chapitre content(text); }
h1 .num, h2 .num { display: inline-block; min-width: 10mm; }
h2 { font-size: 11.5pt; color: #0f3d5c; margin-top: 7mm; break-after: avoid; }
h3 { font-size: 10pt; margin: 4mm 0 1mm; color: #333; break-after: avoid; }
p { margin: 1.5mm 0; text-align: justify; }
.toc-page h2.list { break-before: auto; font-size: 13pt; }
.toc { list-style: none; padding: 0; margin: 0 0 6mm; }
.toc li { margin: 0.8mm 0; } .toc li.l1 { font-weight: bold; margin-top: 2mm; } .toc li.l2 { padding-left: 8mm; }
.toc a { color: inherit; text-decoration: none; display: flex; }
.toc a .t { flex: 1; border-bottom: 1px dotted #aaa; margin-right: 2mm; }
.toc a::after { content: target-counter(attr(href), page); }
.eq { display: grid; grid-template-columns: 1fr auto 12mm; align-items: baseline; gap: 3mm; margin: 1.5mm 0; padding: 1.2mm 2mm; background: #f6f8fa; border-left: 2px solid #1d6fa5; break-inside: avoid; }
.eq-sym { font-family: 'Times New Roman', serif; font-style: italic; font-size: 10.5pt; }
.eq-num { color: #333; } .eq-note { font-style: normal; font-family: Arial, sans-serif; font-size: 8pt; color: #555; } .eq-ref { font-size: 7.5pt; color: #666; white-space: nowrap; } .eq-no { text-align: right; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 8.5pt; break-inside: avoid; }
caption { caption-side: top; text-align: left; font-weight: bold; font-size: 8.5pt; margin-bottom: 1mm; color: #0f3d5c; }
th { background: #e8f1f8; border: 1px solid #b6c9d8; padding: 1.2mm 1.8mm; text-align: left; }
td { border: 1px solid #cfd8e0; padding: 1.2mm 1.8mm; vertical-align: top; }
th.r, td.r { text-align: right; } th.c, td.c { text-align: center; }
figure { margin: 4mm 0; text-align: center; break-inside: avoid; } figure .fig { margin: 0 auto; } figure svg { width: 100%; height: auto; }
figcaption { font-size: 8.5pt; font-weight: bold; color: #0f3d5c; margin-top: 1.5mm; }
.st { font-size: 7.5pt; font-weight: bold; padding: .4mm 1.5mm; border-radius: 1mm; white-space: nowrap; }
.st.ok { background: #dcfce7; color: #166534; } .st.ko { background: #fee2e2; color: #991b1b; } .st.nv { background: #fef3c7; color: #92400e; } .st.info { background: #f3f4f6; color: #4b5563; }
.alert { border-radius: 1.5mm; padding: 2mm 3mm; margin: 3mm 0; font-size: 9pt; break-inside: avoid; } .alert ul { margin: 1mm 0 0 4mm; padding: 0; }
.alert.ok { background: #ecfdf5; border: 1px solid #86efac; } .alert.ko { background: #fef2f2; border: 1px solid #fca5a5; } .alert.nv { background: #fffbeb; border: 1px solid #fcd34d; }
section.plan { page: plan; break-before: page; } section.plan h2 { margin: 0 0 2mm; } section.plan svg { width: 100%; height: auto; max-height: 250mm; }
.visa { margin-top: 6mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.visa div { border: 1px solid #999; height: 24mm; padding: 1.5mm; font-size: 7.5pt; color: #555; }
.toolbar { position: fixed; top: 8px; right: 8px; z-index: 10; display: flex; gap: 6px; font-family: Arial, sans-serif; }
.toolbar button { background: #1d6fa5; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: bold; cursor: pointer; } .toolbar button:disabled { background: #9ca3af; cursor: wait; }
.toolbar span { max-width: 520px; line-height: 1.35; }
.toolbar span { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #555; }
@media screen { .pagedjs_pages { background: #e5e7eb; padding: 12px 0; } .pagedjs_page { background: #fff; margin: 0 auto 12px; box-shadow: 0 1px 6px rgba(0,0,0,.2); } }
@media print { .toolbar { display: none; } }
</style></head><body>


<section class="cover">
  <div class="cart">
    <div class="cc logo-cell">${info.showLogo ? (estLogoSEL(info.customLogo) || !info.customLogo ? selLogoSVG() : logo) : `<b>${esc(info.entreprise)}</b>`}</div>
    <div class="cc"><div class="lab">Projet / Affaire</div><div class="val">${esc(info.projet)}</div><div class="lab" style="margin-top:4mm">Référence dossier</div><div class="ref">${esc(info.reference)}</div></div>
    <div class="cc"><div class="row"><div><div class="lab">Rédacteur</div><div>${esc(info.auteur || info.entreprise)}</div></div><div style="text-align:right"><div class="lab">Date d'édition</div><div>${esc(info.date)}</div></div></div>
      <div class="nt"><div class="nm">NOTE DE CALCUL</div><div class="ns">${esc((info.sousTitre || 'Poteaux béton armé').toUpperCase())}</div></div></div>
  </div>
  <div class="addr"><span class="run-ent">${esc(info.entreprise)}</span> · ${esc(info.adresse)} · ${esc(info.contact)} · ${esc(info.email)}</div>
  <div class="mid">
    <div class="proj">${esc(info.projet)} — ${esc(info.client)}</div>
    <div class="ttl">${esc(title)}</div>
    <div class="sub">Note de calcul — ${cols.length > 1 ? `${cols.length} poteaux (${cols.map(c => esc(c.name)).join(', ')})` : `poteau ${esc(cols[0]?.name ?? '')}`}</div>
  </div>
  <table class="cart">
    <tr><td><span class="k">Référence</span><b class="run-ref">${esc(info.reference)}</b></td><td><span class="k">Indice</span><b>${esc(info.revision || 'A')}</b></td><td><span class="k">Date</span><b>${esc(info.date)}</b></td><td><span class="k">Type de document</span><b>Note de calcul</b></td></tr>
    <tr><td><span class="k">Identifiant de calcul</span><b>${meta.id}</b></td><td colspan="2"><span class="k">Généré le</span>${esc(meta.generated)}</td><td><span class="k">Logiciel</span>Poteaux EC2 v${esc(meta.version)}</td></tr>
    <tr><td><span class="k">Établi par</span>${esc(info.auteur)}</td><td><span class="k">Vérifié par</span>${esc(info.verificateur || '—')}</td><td><span class="k">Approuvé par</span>${esc(info.approbateur || '—')}</td><td><span class="k">Référentiel</span>NF EN 1992-1-1${annex === 'FR' ? ' + AN' : ''}</td></tr>
  </table>
  <table class="cart"><tr><td colspan="4"><b>Tableau des révisions</b></td></tr><tr><td class="c"><span class="k">Indice</span></td><td><span class="k">Date</span></td><td><span class="k">Objet</span></td><td><span class="k">Auteur</span></td></tr>${revs}</table>
  <div class="visa"><div>Établi par</div><div>Vérifié par</div><div>Approuvé par</div></div>
  <div class="run-cp" style="font-size:7pt;color:#777;margin-top:3mm">${esc(copyright)}</div>
</section>

<section class="toc-page">
  <h2 class="list">Sommaire</h2><ul class="toc">${toc}</ul>
  <h2 class="list">Liste des figures</h2><ul class="toc">${list(D.figs, 'Figure')}</ul>
  <h2 class="list">Liste des tableaux</h2><ul class="toc">${list(D.tabs, 'Tableau')}</ul>
  <h2 class="list">Liste des équations</h2><ul class="toc">${list(D.eqs, 'Équation')}</ul>
</section>

${D.body.join('\n')}
${plans.join('\n')}
<script>
// Barre d'outils créée APRÈS la pagination, hors du contenu paginé (sinon Paged.js la recopie sur chaque page)
window.PagedConfig = { after: function () {
  if (document.querySelector('body > .toolbar')) return;
  var t = document.createElement('div'); t.className = 'toolbar';
  var s = document.createElement('span');
  s.textContent = "Aperçu à l'écran. Pour un PDF, préférez « Télécharger la note (PDF) » dans l'application. Impression : destination « Enregistrer au format PDF », cocher « Graphiques d'arrière-plan ».";
  var b = document.createElement('button'); b.id = 'btn-print'; b.textContent = 'Imprimer / PDF'; b.onclick = function () { window.print(); };
  t.appendChild(s); t.appendChild(b); document.body.appendChild(t);
} };
</script>
${pagedSrc ? `<script>${pagedSrc.replace(/<\/script>/gi, '<\\/script>')}</script>` : '<script>window.PagedConfig.after();</script>'}
</body></html>`;
}
