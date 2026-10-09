import type { Feuille, Calque } from './base';
import { A3 } from './base';

const COUL: Record<Calque, string> = { CADRE: '#0b111e', BETON: '#374151', AXES: '#b91c1c', ACIER_INF: '#1d4ed8', ACIER_SUP: '#c0392b', CADRES: '#0891b2', COTES: '#166534', TEXTE: '#0b111e', CARTOUCHE: '#0b111e' };

/** Rendu SVG d'une planche (unités : mm de feuille). */
export function PlanSVG({ f, className }: { f: Feuille; className?: string }) {
  return (
    <svg viewBox={`0 0 ${A3.w} ${A3.h}`} className={className} role="img" aria-label={`Planche ${f.numero} : ${f.titre}`} xmlns="http://www.w3.org/2000/svg" style={{ background: '#fff' }}>
      {f.prims.map((q, k) => {
        if (q.t === 'line') return <line key={k} x1={q.x1} y1={q.y1} x2={q.x2} y2={q.y2} stroke={COUL[q.c]} strokeWidth={q.w ?? 0.25} strokeDasharray={q.tirets ? '3 1.5' : undefined} />;
        if (q.t === 'rect') return <rect key={k} x={q.x} y={q.y} width={q.w} height={q.h} fill={q.plein ? COUL[q.c] : 'none'} stroke={COUL[q.c]} strokeWidth={0.3} />;
        if (q.t === 'circle') return <circle key={k} cx={q.x} cy={q.y} r={q.r} fill={q.plein ? COUL[q.c] : 'none'} stroke={COUL[q.c]} strokeWidth={0.25} />;
        return <text key={k} x={q.x} y={q.y} fontSize={q.h} fontFamily="Inter, Arial, sans-serif" fontWeight={q.gras ? 700 : 400} textAnchor={q.ancre ?? 'start'} fill={COUL[q.c]}>{q.s}</text>;
      })}
    </svg>
  );
}

/** Texte SVG autonome d'une planche (téléchargement). */
export function svgTexte(f: Feuille): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = f.prims.map(q => {
    if (q.t === 'line') return `<line x1="${q.x1}" y1="${q.y1}" x2="${q.x2}" y2="${q.y2}" stroke="${COUL[q.c]}" stroke-width="${q.w ?? 0.25}"${q.tirets ? ' stroke-dasharray="3 1.5"' : ''}/>`;
    if (q.t === 'rect') return `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.plein ? COUL[q.c] : 'none'}" stroke="${COUL[q.c]}" stroke-width="0.3"/>`;
    if (q.t === 'circle') return `<circle cx="${q.x}" cy="${q.y}" r="${q.r}" fill="${q.plein ? COUL[q.c] : 'none'}" stroke="${COUL[q.c]}" stroke-width="0.25"/>`;
    return `<text x="${q.x}" y="${q.y}" font-size="${q.h}" font-family="Arial, sans-serif"${q.gras ? ' font-weight="700"' : ''} text-anchor="${q.ancre ?? 'start'}" fill="${COUL[q.c]}">${esc(q.s)}</text>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297"><rect width="420" height="297" fill="#fff"/>\n${body}\n</svg>`;
}
