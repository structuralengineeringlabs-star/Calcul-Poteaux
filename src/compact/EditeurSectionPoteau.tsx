/**
 * Éditeur interactif de la section du poteau (lot A, poteaux v4.0).
 * Dessin coté à l'échelle en millimètres ; les dimensions restent stockées en cm dans le projet (format inchangé).
 * - cotes actives : clic ou Entrée pour saisir ; flèches ±1 mm (Maj : ±10 mm) ;
 * - glisser une cote (souris ou doigt) : vers la droite ou vers le bas pour augmenter, pas de 5 mm ;
 * - propriétés en direct (aire, inertie minimale, rayon de giration).
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import type { Geometry, Shape } from '../eurocode';
import { geometryProps } from '../eurocode';

interface Cote { k: string; x1: number; y1: number; x2: number; y2: number; dir: 'h' | 'v'; off: number }
const LIB: Record<string, string> = {
  b: 'Largeur b', h: 'Hauteur h', d: 'Diamètre D', a: 'Côté a', r: 'Rayon R',
  b1: 'Épaisseur de l\'aile verticale', h1: 'Hauteur de l\'aile verticale', b2: 'Longueur de l\'aile horizontale', h2: 'Épaisseur de l\'aile horizontale',
  ba: 'Épaisseur de l\'âme', ha: 'Hauteur de l\'âme', bs: 'Largeur de la table', hs: 'Épaisseur de la table',
};

/** Contour (mm, y vers le bas) et cotes de chaque forme. */
function geometrie(shape: Shape, p: Record<string, number>): { dessin: (X: (x: number) => number, Y: (y: number) => number, s: number) => ReactNode; cotes: Cote[]; bornes: [number, number, number, number] } {
  const v = (k: string) => (p[k] || 0) * 10;
  const poly = (pts: [number, number][]) => (X: (x: number) => number, Y: (y: number) => number) =>
    <polygon points={pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')} fill="#eef2f7" stroke="#0b111e" strokeWidth={1.4} />;
  switch (shape) {
    case 'rect': { const b = v('b'), h = v('h');
      return { dessin: poly([[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, h / 2], [-b / 2, h / 2]]), bornes: [-b / 2, -h / 2, b / 2, h / 2],
        cotes: [{ k: 'b', x1: -b / 2, y1: h / 2, x2: b / 2, y2: h / 2, dir: 'h', off: 24 }, { k: 'h', x1: -b / 2, y1: -h / 2, x2: -b / 2, y2: h / 2, dir: 'v', off: -30 }] }; }
    case 'circ': { const d = v('d');
      return { dessin: (X, Y, s) => <circle cx={X(0)} cy={Y(0)} r={d / 2 * s} fill="#eef2f7" stroke="#0b111e" strokeWidth={1.4} />, bornes: [-d / 2, -d / 2, d / 2, d / 2],
        cotes: [{ k: 'd', x1: -d / 2, y1: d / 2, x2: d / 2, y2: d / 2, dir: 'h', off: 24 }] }; }
    case 'hex': { const a = v('a'), hh = Math.sqrt(3) * a / 2;
      return { dessin: poly([[-a, 0], [-a / 2, -hh], [a / 2, -hh], [a, 0], [a / 2, hh], [-a / 2, hh]]), bornes: [-a, -hh, a, hh],
        cotes: [{ k: 'a', x1: -a / 2, y1: -hh, x2: a / 2, y2: -hh, dir: 'h', off: -24 }] }; }
    case 'demi': { const r = v('r');
      const pts: [number, number][] = Array.from({ length: 33 }, (_, i) => [r * Math.cos(Math.PI * i / 32), -r * Math.sin(Math.PI * i / 32)]);
      return { dessin: poly(pts), bornes: [-r, -r, r, 0], cotes: [{ k: 'r', x1: 0, y1: 0, x2: r, y2: 0, dir: 'h', off: 24 }] }; }
    case 'quart': { const r = v('r');
      const pts: [number, number][] = [[0, 0], ...Array.from({ length: 17 }, (_, i) => [r * Math.cos(Math.PI / 2 * i / 16), -r * Math.sin(Math.PI / 2 * i / 16)] as [number, number])];
      return { dessin: poly(pts), bornes: [0, -r, r, 0], cotes: [{ k: 'r', x1: 0, y1: 0, x2: r, y2: 0, dir: 'h', off: 24 }] }; }
    case 'L': { const b1 = v('b1'), h1 = v('h1'), b2 = v('b2'), h2 = v('h2');
      return { dessin: poly([[0, 0], [b2, 0], [b2, -h2], [b1, -h2], [b1, -h1], [0, -h1]]), bornes: [0, -h1, b2, 0],
        cotes: [{ k: 'h1', x1: 0, y1: -h1, x2: 0, y2: 0, dir: 'v', off: -30 }, { k: 'b2', x1: 0, y1: 0, x2: b2, y2: 0, dir: 'h', off: 24 },
          { k: 'b1', x1: 0, y1: -h1, x2: b1, y2: -h1, dir: 'h', off: -22 }, { k: 'h2', x1: b2, y1: -h2, x2: b2, y2: 0, dir: 'v', off: 30 }] }; }
    case 'T': { const ba = v('ba'), ha = v('ha'), bs = v('bs'), hs = v('hs'), H = ha + hs;
      return { dessin: poly([[-ba / 2, 0], [ba / 2, 0], [ba / 2, -ha], [bs / 2, -ha], [bs / 2, -H], [-bs / 2, -H], [-bs / 2, -ha], [-ba / 2, -ha]]), bornes: [-bs / 2, -H, bs / 2, 0],
        cotes: [{ k: 'bs', x1: -bs / 2, y1: -H, x2: bs / 2, y2: -H, dir: 'h', off: -22 }, { k: 'hs', x1: bs / 2, y1: -H, x2: bs / 2, y2: -ha, dir: 'v', off: 30 },
          { k: 'ha', x1: -ba / 2, y1: -ha, x2: -ba / 2, y2: 0, dir: 'v', off: -30 }, { k: 'ba', x1: -ba / 2, y1: 0, x2: ba / 2, y2: 0, dir: 'h', off: 24 }] }; }
    case 'croix': { const b1 = v('b1'), h1 = v('h1'), b2 = v('b2'), h2 = v('h2');
      return { dessin: (X, Y) => <g>{poly([[-b1 / 2, -h1 / 2], [b1 / 2, -h1 / 2], [b1 / 2, h1 / 2], [-b1 / 2, h1 / 2]])(X, Y)}{poly([[-b2 / 2, -h2 / 2], [b2 / 2, -h2 / 2], [b2 / 2, h2 / 2], [-b2 / 2, h2 / 2]])(X, Y)}</g>,
        bornes: [-Math.max(b1, b2) / 2, -Math.max(h1, h2) / 2, Math.max(b1, b2) / 2, Math.max(h1, h2) / 2],
        cotes: [{ k: 'h1', x1: -b1 / 2, y1: -h1 / 2, x2: -b1 / 2, y2: h1 / 2, dir: 'v', off: -30 }, { k: 'b1', x1: -b1 / 2, y1: -h1 / 2, x2: b1 / 2, y2: -h1 / 2, dir: 'h', off: -22 },
          { k: 'b2', x1: -b2 / 2, y1: h2 / 2, x2: b2 / 2, y2: h2 / 2, dir: 'h', off: 24 }, { k: 'h2', x1: b2 / 2, y1: -h2 / 2, x2: b2 / 2, y2: h2 / 2, dir: 'v', off: 30 }] }; }
  }
}

export default function EditeurSectionPoteau({ G, setParams }: { G: Geometry; setParams: (p: Record<string, number>) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [edition, setEdition] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const glisse = useRef<{ k: string; dir: 'h' | 'v'; x: number; y: number; v0: number; bouge: boolean } | null>(null);
  const aBouge = useRef(false);
  const p = G.params as Record<string, number>;
  const g = geometrie(G.shape, p);
  const W = 420, H = 300, M = 70;
  const [x0, y0, x1, y1] = g.bornes;
  const s = Math.min((W - 2 * M) / Math.max(1, x1 - x0), (H - 2 * M) / Math.max(1, y1 - y0));
  const X = (x: number) => W / 2 + (x - (x0 + x1) / 2) * s, Y = (y: number) => H / 2 + (y - (y0 + y1) / 2) * s;
  const mm = (k: string) => Math.round((p[k] || 0) * 10);
  const fixer = (k: string, vmm: number) => { if (Number.isFinite(vmm)) setParams({ ...p, [k]: Math.min(10000, Math.max(10, Math.round(vmm))) / 10 }); };
  let props: ReturnType<typeof geometryProps> | null = null;
  try { props = geometryProps(G); } catch { props = null; }

  const clavier = (k: string) => (ev: KeyboardEvent) => {
    const pas = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowRight') { ev.preventDefault(); fixer(k, mm(k) + pas); }
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft') { ev.preventDefault(); fixer(k, mm(k) - pas); }
    else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setEdition(k); setTexte(String(mm(k))); }
  };
  const ecran = () => svg.current?.getScreenCTM()?.a ?? 1; // px écran par unité SVG
  const debut = (c: Cote) => (ev: RPointerEvent) => { (ev.target as Element).setPointerCapture(ev.pointerId); glisse.current = { k: c.k, dir: c.dir, x: ev.clientX, y: ev.clientY, v0: mm(c.k), bouge: false }; aBouge.current = false; };
  const deplacer = (ev: RPointerEvent) => {
    const gl = glisse.current; if (!gl) return;
    const px = gl.dir === 'h' ? ev.clientX - gl.x : ev.clientY - gl.y;
    if (Math.abs(px) > 3) { gl.bouge = true; aBouge.current = true; }
    const d = px / ecran() / s;
    fixer(gl.k, Math.round((gl.v0 + d) / 5) * 5);
  };

  const cote = (c: Cote) => {
    const tx = c.dir === 'h' ? (X(c.x1) + X(c.x2)) / 2 : X(c.x1) + c.off, ty = c.dir === 'h' ? Y(c.y1) + c.off : (Y(c.y1) + Y(c.y2)) / 2;
    const lx = c.dir === 'h' ? 0 : c.off * 0.6, ly = c.dir === 'h' ? c.off * 0.6 : 0;
    return (
      <g key={c.k} role="button" tabIndex={0} data-cote={c.k} className="cursor-pointer outline-none"
        aria-label={`${LIB[c.k] ?? c.k} : ${mm(c.k)} mm. Flèches pour modifier, Entrée pour saisir.`}
        onKeyDown={clavier(c.k)} onClick={() => { if (aBouge.current) { aBouge.current = false; return; } setEdition(c.k); setTexte(String(mm(c.k))); }}>
        <line x1={X(c.x1) + lx} y1={Y(c.y1) + ly} x2={X(c.x2) + lx} y2={Y(c.y2) + ly} stroke="#166534" strokeWidth={1} />
        <line x1={X(c.x1)} y1={Y(c.y1)} x2={X(c.x1) + lx * 1.15} y2={Y(c.y1) + ly * 1.15} stroke="#166534" strokeWidth={0.6} />
        <line x1={X(c.x2)} y1={Y(c.y2)} x2={X(c.x2) + lx * 1.15} y2={Y(c.y2) + ly * 1.15} stroke="#166534" strokeWidth={0.6} />
        <rect x={tx - 26} y={ty - 9} width={52} height={17} rx={4} fill="#fff" stroke="#d1d5db" style={{ cursor: c.dir === 'h' ? 'ew-resize' : 'ns-resize', touchAction: 'none' }}
          onPointerDown={debut(c)} data-poignee={c.k} />
        <text x={tx} y={ty + 4} fontSize={11} fontWeight={600} textAnchor="middle" fill="#166534" pointerEvents="none">{mm(c.k)}</text>
      </g>
    );
  };
  const posEd = (k: string): [number, number] => {
    const c = g.cotes.find(x => x.k === k)!;
    return c.dir === 'h' ? [(X(c.x1) + X(c.x2)) / 2, Y(c.y1) + c.off] : [X(c.x1) + c.off, (Y(c.y1) + Y(c.y2)) / 2];
  };
  return (
    <div className="relative mt-2">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white border border-gray-200 rounded-lg select-none" role="group" aria-label="Éditeur de section"
        onPointerMove={deplacer} onPointerUp={() => { glisse.current = null; }} onPointerCancel={() => { glisse.current = null; }}>
        {g.dessin(X, Y, s)}
        <circle cx={X(0)} cy={Y(0)} r={2} fill="#b91c1c" aria-hidden="true" />
        {g.cotes.map(cote)}
      </svg>
      {edition && g.cotes.some(c => c.k === edition) && (
        <input autoFocus aria-label={`${LIB[edition] ?? edition} (mm)`} value={texte} inputMode="numeric" onChange={ev => setTexte(ev.target.value)}
          onKeyDown={ev => { if (ev.key === 'Enter') { fixer(edition, Number(texte.replace(',', '.'))); setEdition(null); } else if (ev.key === 'Escape') setEdition(null); }}
          onBlur={() => { fixer(edition, Number(texte.replace(',', '.'))); setEdition(null); }}
          className="absolute w-20 h-7 -translate-x-1/2 -translate-y-1/2 border-2 border-primary rounded px-1 text-right text-[12.5px] bg-white shadow"
          style={{ left: `${posEd(edition)[0] / W * 100}%`, top: `${posEd(edition)[1] / H * 100}%` }} />
      )}
      {props && <p className="text-[11.5px] text-gray-600 tabular-nums mt-1">Ac = {props.A.toFixed(0).replace('.', ',')} cm² · Imin = {props.Imin.toFixed(0)} cm⁴ · i = {props.i_min.toFixed(2).replace('.', ',')} cm</p>}
      <p className="text-[11px] text-gray-500">Cliquer sur une cote pour la saisir (mm) ; flèches ±1 mm (Maj : ±10 mm) ; glisser une cote vers la droite ou le bas pour l'augmenter.</p>
    </div>
  );
}
