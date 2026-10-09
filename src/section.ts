/**
 * Géométrie générique des sections de poteaux.
 *
 * Toute forme est représentée par un polygone (sens trigonométrique, mm).
 * Repère d'analyse : origine au centre de gravité, axes principaux d'inertie ;
 *   y (= u) : direction « h »  — bras de levier de la flexion dans le plan principal I (fort)
 *   x (= v) : direction « b »  — bras de levier de la flexion dans le plan principal II (faible)
 * Pour un rectangle, on retrouve exactement le repère historique (h vertical, b horizontal).
 */

export type Pt = [number, number]; // [x, y] mm

export interface PolyProps {
  A: number; cx: number; cy: number;
  Ix: number; Iy: number; Ixy: number; // centraux : Ix = ∫y² dA, Iy = ∫x² dA
}

export function polygonProps(p: Pt[]): PolyProps {
  let A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0, Ixy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    const c = x1 * y2 - x2 * y1;
    A += c / 2;
    Sx += (x1 + x2) * c / 6; Sy += (y1 + y2) * c / 6;
    Ixx += (y1 * y1 + y1 * y2 + y2 * y2) * c / 12;
    Iyy += (x1 * x1 + x1 * x2 + x2 * x2) * c / 12;
    Ixy += (x1 * y2 + 2 * x1 * y1 + 2 * x2 * y2 + x2 * y1) * c / 24;
  }
  const cx = Sx / A, cy = Sy / A;
  return { A, cx, cy, Ix: Ixx - A * cy * cy, Iy: Iyy - A * cx * cx, Ixy: Ixy - A * cx * cy };
}

export const perimeter = (p: Pt[]) => p.reduce((s, q, i) => s + Math.hypot(p[(i + 1) % p.length][0] - q[0], p[(i + 1) % p.length][1] - q[1]), 0);

const rot = (p: Pt, a: number): Pt => [p[0] * Math.cos(a) + p[1] * Math.sin(a), -p[0] * Math.sin(a) + p[1] * Math.cos(a)];

/** Contour de la forme (repère de dessin, mm) et rectangles composants (pour les cadres). */
export function shapeOutline(shape: string, params: Record<string, number>): { outline: Pt[]; parts: Pt[][]; label: string } {
  const P = (k: string, d: number) => (params[k] || d) * 10;
  const rectPts = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  switch (shape) {
    case 'rect': {
      const b = P('b', 30), h = P('h', 40);
      const r = rectPts(-b / 2, -h / 2, b / 2, h / 2);
      return { outline: r, parts: [r], label: `Rectangulaire ${b}×${h} mm` };
    }
    case 'circ': {
      const R = P('d', 35) / 2, n = 96;
      const o: Pt[] = Array.from({ length: n }, (_, i) => [R * Math.cos(2 * Math.PI * i / n), R * Math.sin(2 * Math.PI * i / n)]);
      return { outline: o, parts: [o], label: `Circulaire Ø${2 * R} mm` };
    }
    case 'hex': {
      const a = P('a', 20);
      const o: Pt[] = Array.from({ length: 6 }, (_, i) => [a * Math.cos(Math.PI / 3 * i), a * Math.sin(Math.PI / 3 * i)]);
      return { outline: o, parts: [o], label: `Hexagonale côté ${a} mm` };
    }
    case 'demi': {
      const r = P('r', 30), n = 120;
      const o: Pt[] = Array.from({ length: n + 1 }, (_, i) => [r * Math.cos(Math.PI * i / n), r * Math.sin(Math.PI * i / n)]);
      return { outline: o, parts: [o], label: `Demi-cercle R ${r} mm` };
    }
    case 'quart': {
      const r = P('r', 30), n = 90;
      const o: Pt[] = [[0, 0], ...Array.from({ length: n + 1 }, (_, i) => [r * Math.cos(Math.PI / 2 * i / n), r * Math.sin(Math.PI / 2 * i / n)] as Pt)];
      return { outline: o, parts: [o], label: `Quart de cercle R ${r} mm` };
    }
    case 'L': {
      let b1 = P('b1', 30), h1 = P('h1', 30), b2 = P('b2', 30), h2 = P('h2', 30);
      if (b1 > b2 && h2 > h1) { [b1, b2] = [b2, b1]; [h1, h2] = [h2, h1]; }
      if (!(b2 > b1 && h1 > h2)) { const B = Math.max(b1, b2), H = Math.max(h1, h2); const r = rectPts(0, 0, B, H); return { outline: r, parts: [r], label: `Rectangulaire (L dégénéré) ${B}×${H} mm` }; }
      return {
        outline: [[0, 0], [b2, 0], [b2, h2], [b1, h2], [b1, h1], [0, h1]],
        parts: [rectPts(0, 0, b1, h1), rectPts(0, 0, b2, h2)], label: `En L ${b1}×${h1} + ${b2}×${h2} mm`,
      };
    }
    case 'T': {
      const ba = P('ba', 20), ha = P('ha', 40), bs = Math.max(P('bs', 60), P('ba', 20)), hs = P('hs', 10);
      return {
        outline: [[-ba / 2, 0], [ba / 2, 0], [ba / 2, ha], [bs / 2, ha], [bs / 2, ha + hs], [-bs / 2, ha + hs], [-bs / 2, ha], [-ba / 2, ha]],
        parts: [rectPts(-ba / 2, 0, ba / 2, ha + hs), rectPts(-bs / 2, ha, bs / 2, ha + hs)], label: `En T âme ${ba}×${ha}, table ${bs}×${hs} mm`,
      };
    }
    case 'croix': {
      let b1 = P('b1', 30), h1 = P('h1', 30), b2 = P('b2', 30), h2 = P('h2', 30);
      if (b1 > b2 && h2 > h1) { [b1, b2] = [b2, b1]; [h1, h2] = [h2, h1]; }
      if (!(b2 > b1 && h1 > h2)) { const B = Math.max(b1, b2), H = Math.max(h1, h2); const r = rectPts(-B / 2, -H / 2, B / 2, H / 2); return { outline: r, parts: [r], label: `Rectangulaire (croix dégénérée) ${B}×${H} mm` }; }
      const x1 = b1 / 2, y1 = h1 / 2, x2 = b2 / 2, y2 = h2 / 2;
      return {
        outline: [[-x1, -y1], [x1, -y1], [x1, -y2], [x2, -y2], [x2, y2], [x1, y2], [x1, y1], [-x1, y1], [-x1, y2], [-x2, y2], [-x2, -y2], [-x1, -y2]],
        parts: [rectPts(-x1, -y1, x1, y1), rectPts(-x2, -y2, x2, y2)], label: `En croix ${b1}×${h1} + ${b2}×${h2} mm`,
      };
    }
  }
  return { outline: [], parts: [], label: shape };
}

/** Supprime les sommets confondus et alignés. */
export function cleanPolygon(p: Pt[]): Pt[] {
  let q = p.filter((a, i) => { const b = p[(i + 1) % p.length]; return Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6; });
  let changed = true;
  while (changed && q.length > 3) {
    changed = false;
    for (let i = 0; i < q.length; i++) {
      const a = q[(i - 1 + q.length) % q.length], b = q[i], c = q[(i + 1) % q.length];
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      const scale = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (Math.abs(cross) <= 1e-9 * scale) { q = q.filter((_, j) => j !== i); changed = true; break; }
    }
  }
  return q;
}

/** Polygone décalé vers l'intérieur de δ (sommets en onglet). */
export function insetPolygon(p: Pt[], d: number): Pt[] {
  const n = p.length;
  const lines = p.map((q, i) => {
    const r = p[(i + 1) % n];
    const L = Math.hypot(r[0] - q[0], r[1] - q[1]) || 1;
    const dx = (r[0] - q[0]) / L, dy = (r[1] - q[1]) / L;
    return { px: q[0] - dy * d, py: q[1] + dx * d, dx, dy };
  });
  return p.map((_, i) => {
    const a = lines[(i - 1 + n) % n], b = lines[i];
    const den = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(den) < 1e-9) return [b.px, b.py] as Pt;
    const t = ((b.px - a.px) * b.dy - (b.py - a.py) * b.dx) / den;
    return [a.px + a.dx * t, a.py + a.dy * t] as Pt;
  });
}

/** Largeur de la section coupée par la droite y = c (axis 'y') ou x = c (axis 'x'). */
export function chord(p: Pt[], c: number, axis: 'y' | 'x'): number {
  const k = axis === 'y' ? 1 : 0, o = 1 - k;
  const xs: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    if ((a[k] <= c && b[k] > c) || (b[k] <= c && a[k] > c)) xs.push(a[o] + (c - a[k]) * (b[o] - a[o]) / (b[k] - a[k]));
  }
  xs.sort((m, n) => m - n);
  let w = 0;
  for (let i = 0; i + 1 < xs.length; i += 2) w += xs[i + 1] - xs[i];
  return w;
}

export interface PolySection {
  outline: Pt[];        // repère d'analyse (centré, axes principaux)
  parts: Pt[][];        // rectangles/contours composants, repère d'analyse
  rotation: number;     // rad : analyse = R(rotation)·dessin (centré)
  centroid: Pt;         // centre de gravité dans le repère de dessin
  A: number; Ih: number; Ib: number; // mm², mm⁴ (Ih = ∫y², bras de levier selon y)
  label: string;
}

/** Section centrée et tournée dans ses axes principaux ; la direction « h » est la plus raide. */
export function analysisPolygon(shape: string, params: Record<string, number>): PolySection {
  const raw = shapeOutline(shape, params);
  const outline = cleanPolygon(raw.outline), parts = raw.parts.map(cleanPolygon), label = raw.label;
  const pp = polygonProps(outline);
  const c: Pt = [pp.cx, pp.cy];
  let theta = 0;
  if (Math.abs(pp.Ixy) > 1e-6 * (pp.Ix + pp.Iy)) {
    theta = 0.5 * Math.atan2(-2 * pp.Ixy, pp.Ix - pp.Iy);
    const test = polygonProps(outline.map(q => rot([q[0] - c[0], q[1] - c[1]], theta)));
    if (Math.abs(test.Ixy) > 1e-6 * (test.Ix + test.Iy)) theta = -theta;
  }
  let tr = (q: Pt) => rot([q[0] - c[0], q[1] - c[1]], theta);
  let props = polygonProps(outline.map(tr));
  if (props.Ix < props.Iy - 1e-6 * props.Iy) { // mettre l'inertie forte en direction h (bras de levier y)
    theta += Math.PI / 2;
    tr = (q: Pt) => rot([q[0] - c[0], q[1] - c[1]], theta);
    props = polygonProps(outline.map(tr));
  }
  return { outline: outline.map(tr), parts: parts.map(pt => pt.map(tr)), rotation: theta, centroid: c,
    A: props.A, Ih: props.Ix, Ib: props.Iy, label };
}

/** Position des barres le long du contour intérieur : une par angle, puis dans les plus grands intervalles. */
export function layoutBars(inset: Pt[], n: number, angleDeg = 25): { pts: Pt[]; key: number; keyIdx: number[] } {
  const m = inset.length;
  const cum: number[] = [0];
  for (let i = 0; i < m; i++) cum.push(cum[i] + Math.hypot(inset[(i + 1) % m][0] - inset[i][0], inset[(i + 1) % m][1] - inset[i][1]));
  const P = cum[m];
  const at = (s: number): Pt => {
    s = ((s % P) + P) % P;
    let i = 0; while (i < m - 1 && cum[i + 1] < s) i++;
    const a = inset[i], b = inset[(i + 1) % m], L = cum[i + 1] - cum[i] || 1, t = (s - cum[i]) / L;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const keyS: number[] = [];
  for (let i = 0; i < m; i++) {
    const a = inset[(i - 1 + m) % m], b = inset[i], c = inset[(i + 1) % m];
    const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d;
    if (d * 180 / Math.PI > angleDeg) keyS.push(cum[i]);
  }
  let s = keyS.slice(0, n);
  if (s.length === 0 && n > 0) s = [0];
  while (s.length < n) {
    s.sort((x, y) => x - y);
    let best = 0, gap = -1;
    for (let i = 0; i < s.length; i++) {
      const g = (i + 1 < s.length ? s[i + 1] : s[0] + P) - s[i];
      if (g > gap) { gap = g; best = i; }
    }
    s.push(s[best] + gap / 2);
  }
  const keyCount = Math.min(keyS.length, n);
  const all = s.map(v => ((v % P) + P) % P);
  const keyIdx = all.map((v, i) => (i < keyCount ? i : -1)).filter(i => i >= 0);
  // tri le long du contour pour les contrôles d'espacement
  const order = all.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const pts = order.map(o => at(o.v));
  const sortedKey = order.map((o, j) => (keyIdx.includes(o.i) ? j : -1)).filter(j => j >= 0);
  return { pts, key: keyS.length, keyIdx: sortedKey };
}
