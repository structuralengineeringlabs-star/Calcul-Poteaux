/**
 * @sel/plans — base commune des planches A3 des applications S.E.L. : primitives en millimètres de feuille
 * (origine en haut à gauche, y vers le bas), cadre et cartouche ; rendu SVG (PlanSVG.tsx) et DXF R12 (dxf.ts).
 */
import { APP_VERSION } from '../version';

/** Données du cartouche (identification du projet). */
export interface Cartouche { projet: string; client?: string; repere: string; reference: string; indice: string; auteur?: string; verificateur?: string }

export type Calque = 'CADRE' | 'BETON' | 'AXES' | 'ACIER_INF' | 'ACIER_SUP' | 'CADRES' | 'COTES' | 'TEXTE' | 'CARTOUCHE';
export type Prim =
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; c: Calque; w?: number; tirets?: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; c: Calque; plein?: boolean }
  | { t: 'circle'; x: number; y: number; r: number; c: Calque; plein?: boolean }
  | { t: 'text'; x: number; y: number; s: string; h: number; c: Calque; ancre?: 'start' | 'middle' | 'end'; gras?: boolean };
export interface Feuille { titre: string; echelles: string; prims: Prim[]; numero: number; total: number }

export const A3 = { w: 420, h: 297 };
export const MARGE = 10;

export class Dessin {
  prims: Prim[] = [];
  line(x1: number, y1: number, x2: number, y2: number, c: Calque, w = 0.25, tirets = false) { this.prims.push({ t: 'line', x1, y1, x2, y2, c, w, tirets }); }
  rect(x: number, y: number, w: number, h: number, c: Calque, plein = false) { this.prims.push({ t: 'rect', x, y, w, h, c, plein }); }
  circle(x: number, y: number, r: number, c: Calque, plein = false) { this.prims.push({ t: 'circle', x, y, r, c, plein }); }
  text(x: number, y: number, s: string, h: number, c: Calque = 'TEXTE', ancre: 'start' | 'middle' | 'end' = 'start', gras = false) { this.prims.push({ t: 'text', x, y, s, h, c, ancre, gras }); }
  /** Cote horizontale avec traits de rappel. */
  cote(x1: number, x2: number, y: number, s: string) {
    this.line(x1, y, x2, y, 'COTES', 0.18);
    for (const x of [x1, x2]) { this.line(x, y - 1.5, x, y + 1.5, 'COTES', 0.18); this.line(x - 0.8, y + 0.8, x + 0.8, y - 0.8, 'COTES', 0.35); }
    this.text((x1 + x2) / 2, y - 1, s, 2.2, 'COTES', 'middle');
  }
  bulle(x: number, y: number, rep: number) { this.circle(x, y, 2.4, 'TEXTE'); this.text(x, y + 1, String(rep), 2.4, 'TEXTE', 'middle', true); }
}

export function cadreEtCartouche(D: Dessin, ligneMateriau: string, id: Cartouche, titre: string, echelles: string, numero: number, total: number) {
  D.rect(MARGE, MARGE, A3.w - 2 * MARGE, A3.h - 2 * MARGE, 'CADRE');
  const W = 180, H = 36, x = A3.w - MARGE - W, y = A3.h - MARGE - H;
  D.rect(x, y, W, H, 'CARTOUCHE');
  D.line(x + 42, y, x + 42, y + H, 'CARTOUCHE'); D.line(x + 130, y, x + 130, y + H, 'CARTOUCHE');
  for (const yy of [12, 24]) D.line(x + 42, y + yy, x + W, y + yy, 'CARTOUCHE');
  // Logo vectoriel simplifié S.E.L. (hexagone et sigle)
  const cx = x + 10, cy = y + 18;
  for (let k = 0; k < 6; k++) {
    const a1 = Math.PI / 6 + k * Math.PI / 3, a2 = a1 + Math.PI / 3;
    D.line(cx + 7 * Math.cos(a1), cy + 7 * Math.sin(a1), cx + 7 * Math.cos(a2), cy + 7 * Math.sin(a2), 'CARTOUCHE', 0.5);
  }
  D.text(cx, cy + 1.2, 'SEL', 3, 'CARTOUCHE', 'middle', true);
  D.text(x + 19, y + 15, 'STRUCTURAL &', 2.6, 'CARTOUCHE', 'start', true);
  D.text(x + 19, y + 19, 'ENGINEERING LABS', 2, 'CARTOUCHE');
  D.text(x + 44, y + 5, 'Projet', 1.8, 'CARTOUCHE'); D.text(x + 44, y + 10, `${id.projet}${id.client ? ' — ' + id.client : ''}`.slice(0, 48), 2.6, 'CARTOUCHE', 'start', true);
  D.text(x + 44, y + 17, 'Titre', 1.8, 'CARTOUCHE'); D.text(x + 44, y + 22, `${id.repere} — ${titre}`.slice(0, 50), 2.6, 'CARTOUCHE', 'start', true);
  D.text(x + 44, y + 29, `Échelles : ${echelles}`, 2.2, 'CARTOUCHE');
  D.text(x + 44, y + 33.5, ligneMateriau.slice(0, 70), 2, 'CARTOUCHE');
  D.text(x + 132, y + 5, 'Référence', 1.8, 'CARTOUCHE'); D.text(x + 132, y + 10, `${id.reference} — Ind. ${id.indice}`, 2.4, 'CARTOUCHE', 'start', true);
  D.text(x + 132, y + 17, `Dessiné : ${id.auteur || '—'}`, 2.1, 'CARTOUCHE'); D.text(x + 132, y + 22, `Vérifié : ${id.verificateur || '—'}`, 2.1, 'CARTOUCHE');
  D.text(x + 132, y + 29, `A3 · ${new Date().toLocaleDateString('fr-FR')}`, 2.1, 'CARTOUCHE');
  D.text(x + 132, y + 33.5, `Feuille ${numero} / ${total} · v${APP_VERSION}`, 2.1, 'CARTOUCHE', 'start', true);
}

