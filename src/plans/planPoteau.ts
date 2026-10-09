/**
 * Planche A3 d'un poteau métallique ou en bois : élévation à l'échelle (niveaux, longueur), coupe de la section
 * (profilé en I, tube, PRS, ou bois avec section résiduelle au feu), liste des éléments, notes, cartouche.
 * Primitives communes @sel/plans (écran, impression, SVG, DXF).
 */
import type { ResultatPoteauAcier } from '../acier/poteauAcier';
import type { ResultatPoteauBois } from '../bois/poteauBois';
import { Dessin, cadreEtCartouche, MARGE, type Feuille, type Cartouche } from './base';

const fr = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

export type PoteauPlan = { type: 'acier'; r: ResultatPoteauAcier; nuance: string; L: number } | { type: 'bois'; r: ResultatPoteauBois; L: number; classeService: number; feuR: number };

export function planchePoteau(p: PoteauPlan, id: Cartouche): Feuille[] {
  const D = new Dessin();
  const Lmm = p.L * 1000;
  const largeur = p.type === 'acier' ? p.r.geo.b : p.r.b, hauteurSection = p.type === 'acier' ? p.r.geo.h : p.r.h;
  // Élévation verticale : échelle pour tenir dans 200 mm de hauteur utile
  const ech = [20, 25, 50, 75, 100].find(s => Lmm / s <= 200) ?? 125;
  const x0 = MARGE + 60, yBas = MARGE + 245, yHaut = yBas - Lmm / ech;
  const w = Math.max(hauteurSection / ech, 3);
  D.text(MARGE + 15, MARGE + 14, `Élévation — éch. 1/${ech}`, 3.2, 'TEXTE', 'start', true);
  D.rect(x0 - w / 2, yHaut, w, Lmm / ech, p.type === 'acier' ? 'ACIER_SUP' : 'BETON');
  if (p.type === 'bois') for (let k = 1; k < 4; k++) D.line(x0 - w / 2 + w * k / 4, yHaut, x0 - w / 2 + w * k / 4, yBas, 'BETON', 0.12); // fil
  // Appuis schématiques (pied et tête) et niveaux
  D.line(x0 - 18, yBas, x0 + 18, yBas, 'BETON', 0.6); D.line(x0 - 18, yHaut, x0 + 18, yHaut, 'BETON', 0.6);
  for (let k = -3; k <= 3; k++) D.line(x0 + k * 5, yBas, x0 + k * 5 - 3, yBas + 3, 'BETON', 0.2);
  D.line(x0, yHaut - 10, x0, yBas + 8, 'AXES', 0.18, true);
  D.text(x0 + 22, yBas + 1, '±0,00 (pied)', 2.4, 'COTES'); D.text(x0 + 22, yHaut + 1, `+${fr(p.L)} (tête)`, 2.4, 'COTES');
  D.line(x0 - 28, yHaut, x0 - 28, yBas, 'COTES', 0.18);
  for (const y of [yHaut, yBas]) { D.line(x0 - 30, y, x0 - 26, y, 'COTES', 0.18); D.line(x0 - 29, y + 1, x0 - 27, y - 1, 'COTES', 0.35); }
  D.text(x0 - 30, (yHaut + yBas) / 2, `L = ${fr(p.L)} m`, 2.4, 'COTES', 'end');

  // Coupe
  const cx = MARGE + 160, yS = MARGE + 40;
  const s = 1 / Math.max(5, Math.ceil(Math.max(largeur, hauteurSection) / 100 / 5) * 5);
  const sc = (v: number) => v * s;
  D.text(cx, yS - 6, `Coupe — éch. 1/${Math.round(1 / s)}`, 3, 'TEXTE', 'middle', true);
  if (p.type === 'acier') {
    const g = p.r.geo;
    if (g.tube === 'CHS') { D.circle(cx, yS + sc(g.h) / 2, sc(g.h) / 2, 'ACIER_SUP'); D.circle(cx, yS + sc(g.h) / 2, sc(g.h) / 2 - sc(g.tf), 'ACIER_SUP'); }
    else if (g.tube) { D.rect(cx - sc(g.b) / 2, yS, sc(g.b), sc(g.h), 'ACIER_SUP'); D.rect(cx - sc(g.b) / 2 + sc(g.tf), yS + sc(g.tf), sc(g.b - 2 * g.tf), sc(g.h - 2 * g.tf), 'ACIER_SUP'); }
    else {
      D.rect(cx - sc(g.b) / 2, yS, sc(g.b), sc(g.tf), 'ACIER_SUP', true);
      D.rect(cx - sc(g.tw) / 2, yS + sc(g.tf), sc(g.tw), sc(g.h - 2 * g.tf), 'ACIER_SUP', true);
      D.rect(cx - sc(g.b) / 2, yS + sc(g.h - g.tf), sc(g.b), sc(g.tf), 'ACIER_SUP', true);
    }
    D.text(cx, yS + sc(g.h) + 14, g.nom, 2.6, 'TEXTE', 'middle', true);
    D.line(cx - sc(g.b) / 2 - 10, yS + sc(g.h) / 2, cx + sc(g.b) / 2 + 10, yS + sc(g.h) / 2, 'AXES', 0.15, true);
    D.text(cx + sc(g.b) / 2 + 11, yS + sc(g.h) / 2 + 1, 'y', 2.4, 'AXES');
  } else {
    const r = p.r;
    D.rect(cx - sc(r.b) / 2, yS, sc(r.b), sc(r.h), 'BETON');
    if (r.feu) { const d = r.feu.def; D.rect(cx - sc(r.b) / 2 + sc(d), yS + sc(d), sc(r.feu.bfi), sc(r.feu.hfi), 'AXES'); D.text(cx, yS + sc(r.h) + 20, `section résiduelle R${p.feuR}`, 2, 'AXES', 'middle'); }
    D.text(cx, yS + sc(r.h) + 14, `${r.classe.nom} ${r.b} × ${r.h}`, 2.6, 'TEXTE', 'middle', true);
  }
  D.cote(cx - sc(largeur) / 2, cx + sc(largeur) / 2, yS + sc(hauteurSection) + 5, `${fr(largeur, 0)}`);

  // Liste des éléments et notes
  const xT = MARGE + 215, yT = MARGE + 40;
  const cols = [xT, xT + 12, xT + 100, xT + 125, xT + 140, xT + 175];
  D.text(xT, yT - 4, 'Liste des éléments', 3.2, 'TEXTE', 'start', true);
  ['Rep.', 'Désignation', 'Longueur (m)', 'Qté', p.type === 'acier' ? 'Masse (kg)' : 'Volume (m³)'].forEach((t, k) => D.text(cols[k] + 1, yT + 4, t, 2.3, 'TEXTE', 'start', true));
  D.rect(cols[0], yT, cols[5] - cols[0], 12.4, 'TEXTE'); D.line(cols[0], yT + 6.2, cols[5], yT + 6.2, 'TEXTE', 0.18);
  cols.slice(1, 5).forEach(x => D.line(x, yT, x, yT + 12.4, 'TEXTE', 0.18));
  const ligne = p.type === 'acier'
    ? ['1', `${p.r.geo.nom} — ${p.nuance}`, fr(p.L), '1', fr(p.r.masse, 0)]
    : ['1', `${p.r.classe.nom} ${p.r.b} × ${p.r.h}`, fr(p.L), '1', fr(p.r.volume, 3)];
  ligne.forEach((t, k) => D.text(cols[k] + 1, yT + 10.6, t, 2.3));
  const notes = p.type === 'acier' ? [
    `Acier ${p.nuance}, fy = ${p.r.fy} MPa ; classe de section ${p.r.classe} ; courbes de flambement ${p.r.courbes.y} / ${p.r.courbes.z}.`,
    `Nb,Rd = ${fr(p.r.NbRd / 1e3, 0)} kN ; flexion composée : éq. 6.61 = ${fr(p.r.eq661, 2)}, éq. 6.62 = ${fr(p.r.eq662, 2)}.`,
    'Platine de pied, assemblage en tête et protection anticorrosion : hors note, à définir.',
    `Température critique ${fr(p.r.thetaCr, 0)} °C (protection au feu à justifier).`,
  ] : [
    `${p.r.classe.nom} (${p.r.classe.type === 'massif' ? 'EN 338' : 'EN 14080'}), classe de service ${p.classeService}.`,
    `Flexion composée : éq. 6.23 = ${fr(Math.max(p.r.rQ.e623, p.r.rG?.e623 ?? 0), 2)}, éq. 6.24 = ${fr(Math.max(p.r.rQ.e624, p.r.rG?.e624 ?? 0), 2)}.`,
    p.r.feu ? `Résistance au feu R${p.feuR} : section réduite ${fr(p.r.feu.bfi, 0)} × ${fr(p.r.feu.hfi, 0)} mm (4 faces).` : 'Résistance au feu : non vérifiée.',
    'Pied de poteau (protection contre l\'humidité), assemblages : hors note, à définir.',
  ];
  D.text(xT, yT + 24, 'Notes', 3, 'TEXTE', 'start', true);
  notes.forEach((t, k) => D.text(xT, yT + 30 + k * 5, `${k + 1}. ${t}`.slice(0, 95), 2.2));

  const ligneMat = p.type === 'acier' ? `Acier ${p.nuance} · ${p.r.geo.nom}` : `Bois ${p.r.classe.nom} · ${p.r.b} × ${p.r.h} mm`;
  cadreEtCartouche(D, ligneMat, id, p.type === 'acier' ? 'Poteau métallique' : 'Poteau en bois', `1/${ech} ; coupe 1/${Math.round(1 / s)}`, 1, 1);
  return [{ titre: p.type === 'acier' ? 'Poteau métallique' : 'Poteau en bois', echelles: `1/${ech}`, prims: D.prims, numero: 1, total: 1 }];
}
