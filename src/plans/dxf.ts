/**
 * Export DXF R12 (ASCII) des planches : une feuille par bloc de 420 × 297 mm, posées côte à côte en espace objet.
 * Unités : millimètres de feuille (les cotes affichent les valeurs réelles). Calques normalisés et couleurs ACI.
 */
import type { Feuille, Calque } from './base';
import { A3 } from './base';

const COULEURS: Record<Calque, number> = { CADRE: 7, BETON: 8, AXES: 1, ACIER_INF: 5, ACIER_SUP: 1, CADRES: 4, COTES: 3, TEXTE: 7, CARTOUCHE: 7 };
const ASCII = (s: string) => s.replace(/[Φφ]/g, '%%c').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[—–]/g, '-').replace(/·/g, '.').replace(/×/g, 'x').replace(/³/g, '3').replace(/²/g, '2')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E%]/g, '?');

export function exporterDXF(feuilles: Feuille[]): string {
  const o: string[] = [];
  const p = (code: number, v: string | number) => o.push(String(code), typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(4)) : v);
  p(0, 'SECTION'); p(2, 'HEADER'); p(9, '$ACADVER'); p(1, 'AC1009'); p(9, '$INSUNITS'); p(70, 4); p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'TABLES'); p(0, 'TABLE'); p(2, 'LTYPE'); p(70, 2);
  p(0, 'LTYPE'); p(2, 'CONTINUOUS'); p(70, 0); p(3, 'Solid line'); p(72, 65); p(73, 0); p(40, 0);
  p(0, 'LTYPE'); p(2, 'DASHED'); p(70, 0); p(3, '__ __ __'); p(72, 65); p(73, 2); p(40, 4.5); p(49, 3); p(49, -1.5);
  p(0, 'ENDTAB'); p(0, 'TABLE'); p(2, 'LAYER'); p(70, Object.keys(COULEURS).length);
  for (const [nom, coul] of Object.entries(COULEURS)) { p(0, 'LAYER'); p(2, nom); p(70, 0); p(62, coul); p(6, 'CONTINUOUS'); }
  p(0, 'ENDTAB'); p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'ENTITIES');
  feuilles.forEach((f, k) => {
    const dx = k * (A3.w + 30);
    const X = (x: number) => x + dx, Y = (y: number) => A3.h - y;
    for (const q of f.prims) {
      if (q.t === 'line') { p(0, 'LINE'); p(8, q.c); if (q.tirets) p(6, 'DASHED'); p(10, X(q.x1)); p(20, Y(q.y1)); p(30, 0); p(11, X(q.x2)); p(21, Y(q.y2)); p(31, 0); }
      else if (q.t === 'rect') {
        p(0, 'POLYLINE'); p(8, q.c); p(66, 1); p(70, 1);
        for (const [x, y] of [[q.x, q.y], [q.x + q.w, q.y], [q.x + q.w, q.y + q.h], [q.x, q.y + q.h]]) { p(0, 'VERTEX'); p(8, q.c); p(10, X(x)); p(20, Y(y)); p(30, 0); }
        p(0, 'SEQEND'); p(8, q.c);
      } else if (q.t === 'circle') { p(0, 'CIRCLE'); p(8, q.c); p(10, X(q.x)); p(20, Y(q.y)); p(30, 0); p(40, q.r); }
      else if (q.t === 'text') {
        const al = q.ancre === 'middle' ? 1 : q.ancre === 'end' ? 2 : 0;
        p(0, 'TEXT'); p(8, q.c); p(10, X(q.x)); p(20, Y(q.y)); p(30, 0); p(40, q.h * 0.75); p(1, ASCII(q.s));
        if (al) { p(72, al); p(11, X(q.x)); p(21, Y(q.y)); p(31, 0); }
      }
    }
  });
  p(0, 'ENDSEC'); p(0, 'EOF');
  return o.join('\r\n') + '\r\n';
}
