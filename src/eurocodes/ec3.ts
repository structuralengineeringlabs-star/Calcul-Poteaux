/**
 * @sel/eurocodes — acier de construction (NF EN 1993-1-1, EN 1993-1-5, EN 1993-1-2), sections en I soudées (PRS).
 * Unités : N, mm, MPa.
 */
export const E_ACIER = 210000, G_ACIER = 81000; // MPa (§3.2.6)
export type Nuance = 'S235' | 'S275' | 'S355' | 'S460';

/** fy et fu selon l'épaisseur (EN 1993-1-1, tableau 3.1 ; EN 10025-2 et -3 pour S460). */
export function limiteElastique(n: Nuance, t: number): { fy: number; fu: number } {
  const T: Record<Nuance, [number, number, number, number]> = { S235: [235, 360, 215, 360], S275: [275, 430, 255, 410], S355: [355, 490, 335, 470], S460: [460, 540, 430, 540] };
  const [fy1, fu1, fy2, fu2] = T[n];
  return t <= 40 ? { fy: fy1, fu: fu1 } : { fy: fy2, fu: fu2 };
}

/** Section en I soudée : semelle supérieure bfs × tfs, âme hw × tw, semelle inférieure bfi × tfi (mm). */
export interface SectionI { bfs: number; tfs: number; hw: number; tw: number; bfi: number; tfi: number }

export function proprietesI(s: SectionI) {
  const h = s.tfs + s.hw + s.tfi;
  const parts = [
    { b: s.bfs, t: s.tfs, y: s.tfs / 2 },
    { b: s.tw, t: s.hw, y: s.tfs + s.hw / 2 },
    { b: s.bfi, t: s.tfi, y: s.tfs + s.hw + s.tfi / 2 },
  ];
  const A = parts.reduce((a, p) => a + p.b * p.t, 0);
  const yG = parts.reduce((a, p) => a + p.b * p.t * p.y, 0) / A; // depuis la fibre supérieure
  const Iy = parts.reduce((a, p) => a + p.b * p.t ** 3 / 12 + p.b * p.t * (p.y - yG) ** 2, 0);
  const Izs = s.tfs * s.bfs ** 3 / 12, Izi = s.tfi * s.bfi ** 3 / 12;
  const Iz = Izs + Izi + s.hw * s.tw ** 3 / 12;
  // Axe neutre plastique (aire égale de part et d'autre)
  const dessus = (y: number) => parts.reduce((a, p) => a + p.b * Math.min(p.t, Math.max(0, y - (p.y - p.t / 2))), 0);
  let lo = 0, hi = h;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (dessus(m) < A / 2) lo = m; else hi = m; }
  const yp = (lo + hi) / 2;
  const Wpl = parts.reduce((a, p) => {
    const y0 = p.y - p.t / 2, a1 = Math.min(p.t, Math.max(0, yp - y0)), a2 = p.t - a1;
    return a + p.b * a1 * (yp - (y0 + a1 / 2)) + p.b * a2 * (y0 + a1 + a2 / 2 - yp);
  }, 0);
  const It = (s.bfs * s.tfs ** 3 + s.hw * s.tw ** 3 + s.bfi * s.tfi ** 3) / 3;
  const hs = h - s.tfs / 2 - s.tfi / 2;               // distance entre centres des semelles
  const Iw = Izs * Izi / (Izs + Izi) * hs * hs;         // gauchissement (section en I mono- ou bisymétrique)
  return { h, A, yG, yp, Iy, Iz, Izs, Izi, WelSup: Iy / yG, WelInf: Iy / (h - yG), Wpl, It, Iw, hs };
}

/** Limites c/t (tableau 5.2). Renvoie la classe 1 à 4 d'une paroi. */
export function classeDebord(c: number, t: number, eps: number): 1 | 2 | 3 | 4 {
  const r = c / t;
  return r <= 9 * eps ? 1 : r <= 10 * eps ? 2 : r <= 14 * eps ? 3 : 4;
}
/** Âme fléchie : α part comprimée en plastique, ψ rapport des contraintes élastiques (tableau 5.2). */
export function classeAme(c: number, t: number, eps: number, alpha: number, psi: number): 1 | 2 | 3 | 4 {
  const r = c / t;
  const l1 = alpha > 0.5 ? 396 * eps / (13 * alpha - 1) : 36 * eps / alpha;
  const l2 = alpha > 0.5 ? 456 * eps / (13 * alpha - 1) : 41.5 * eps / alpha;
  const l3 = psi > -1 ? 42 * eps / (0.67 + 0.33 * psi) : 62 * eps * (1 - psi) * Math.sqrt(-psi);
  return r <= l1 ? 1 : r <= l2 ? 2 : r <= l3 ? 3 : 4;
}

/** Coefficient de réduction de déversement, cas général (§6.3.2.2). */
export function chiLT(lambda: number, alphaLT: number): number {
  if (lambda <= 0.2) return 1;
  const phi = 0.5 * (1 + alphaLT * (lambda - 0.2) + lambda * lambda);
  return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lambda * lambda)));
}

/**
 * Moment critique de déversement (section bisymétrique équivalente, k = kw = 1) :
 * Mcr = C1·π²EIz/L²·[√(Iw/Iz + L²GIt/(π²EIz) + (C2·zg)²) − C2·zg].
 */
export function momentCritique(L: number, Iz: number, Iw: number, It: number, C1: number, C2: number, zg: number): number {
  const a = Math.PI ** 2 * E_ACIER * Iz / (L * L);
  return C1 * a * (Math.sqrt(Iw / Iz + L * L * G_ACIER * It / (Math.PI ** 2 * E_ACIER * Iz) + (C2 * zg) ** 2) - C2 * zg);
}

/** Facteur de moment équivalent (formule d'interpolation à 4 valeurs, approche courante de C1, plafonnée à 2,5). */
export function facteurC1(Mmax: number, MA: number, MB: number, MC: number): number {
  const c = 12.5 * Mmax / (2.5 * Mmax + 3 * MA + 4 * MB + 3 * MC);
  return Math.max(1, Math.min(2.5, c));
}

/** Résistance de l'âme non raidie aux charges transversales (EN 1993-1-5 §6), types a (intermédiaire) et c (extrémité). */
export function resistanceAme(type: 'a' | 'c', ss: number, c: number, hw: number, tw: number, bf: number, tf: number, fyw: number, fyf: number, gM1: number) {
  const kF = type === 'a' ? 6 : Math.min(6, 2 + 6 * (ss + c) / hw);
  const Fcr = 0.9 * kF * E_ACIER * tw ** 3 / hw;
  const m1 = fyf * bf / (fyw * tw);
  const calc = (m2: number) => {
    let ly: number;
    if (type === 'a') ly = ss + 2 * tf * (1 + Math.sqrt(m1 + m2));
    else {
      const le = Math.min(kF * E_ACIER * tw * tw / (2 * fyw * hw), ss + c);
      ly = Math.min(le + tf * Math.sqrt(m1 / 2 + (le / tf) ** 2 + m2), le + tf * Math.sqrt(m1 + m2), ss + 2 * tf * (1 + Math.sqrt(m1 + m2)));
    }
    const lam = Math.sqrt(ly * tw * fyw / Fcr);
    return { ly, lam };
  };
  let r = calc(0.02 * (hw / tf) ** 2);
  if (r.lam <= 0.5) r = calc(0);
  const chiF = Math.min(1, 0.5 / r.lam);
  return { kF, Fcr, ly: r.ly, lambdaF: r.lam, chiF, FRd: fyw * chiF * r.ly * tw / gM1 };
}

/** Température critique (EN 1993-1-2, éq. 4.22), μ0 ≥ 0,013. */
export const temperatureCritique = (mu0: number) => 39.19 * Math.log(1 / (0.9674 * Math.pow(Math.max(0.013, mu0), 3.833)) - 1) + 482;

/**
 * Moment critique de déversement par la méthode de Rayleigh-Ritz (appuis à fourche, gauchissement libre : k = kw = 1).
 * Déplacement latéral u et rotation φ développés en séries de sinus (n termes) ; énergie de déformation
 * U = ½∫(EIz·u''² + EIw·φ''² + GIt·φ'²)dx ; travail des charges λ·[∫M·u''·φ dx + ½∫q·a·φ² dx]
 * (a > 0 : charge au-dessus du centre de cisaillement, déstabilisante). Problème K·x = 2λ·G·x résolu par
 * symétrisation (K diagonale) et méthode de Jacobi. Renvoie le multiplicateur critique λcr du chargement donné.
 */
export function multiplicateurCritique(L: number, Iz: number, Iw: number, It: number, M: (x: number) => number, q: (x: number) => number = () => 0, a = 0, n = 12): number {
  const N = 400, h = L / N;
  const k = (i: number) => (i * Math.PI) / L;
  const dim = 2 * n;
  const Kd = new Array(dim).fill(0);
  for (let i = 1; i <= n; i++) {
    Kd[i - 1] = E_ACIER * Iz * k(i) ** 4 * L / 2;
    Kd[n + i - 1] = (E_ACIER * Iw * k(i) ** 4 + G_ACIER * It * k(i) ** 2) * L / 2;
  }
  // Intégrales de Simpson
  const simpson = (f: (x: number) => number) => {
    let s = f(0) + f(L);
    for (let j = 1; j < N; j++) s += (j % 2 ? 4 : 2) * f(j * h);
    return s * h / 3;
  };
  const G: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) {
    const c = simpson(x => M(x) * (-k(i) * k(i) * Math.sin(k(i) * x)) * Math.sin(k(j) * x)); // ∫M·u_i''·φ_j
    G[i - 1][n + j - 1] += c / 2; G[n + j - 1][i - 1] += c / 2;
    if (a !== 0) G[n + i - 1][n + j - 1] += simpson(x => q(x) * a * Math.sin(k(i) * x) * Math.sin(k(j) * x)) / 2;
  }
  // Symétrisation S = K^-1/2 · G · K^-1/2, valeurs propres par Jacobi
  const S = G.map((row, i) => row.map((g, j) => g / Math.sqrt(Kd[i] * Kd[j])));
  for (let balayage = 0; balayage < 100; balayage++) {
    let off = 0;
    for (let p = 0; p < dim; p++) for (let r = p + 1; r < dim; r++) off += S[p][r] ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < dim; p++) for (let r = p + 1; r < dim; r++) {
      if (Math.abs(S[p][r]) < 1e-300) continue;
      const th = (S[r][r] - S[p][p]) / (2 * S[p][r]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let m = 0; m < dim; m++) { const smp = S[m][p], smr = S[m][r]; S[m][p] = c * smp - s * smr; S[m][r] = s * smp + c * smr; }
      for (let m = 0; m < dim; m++) { const spm = S[p][m], srm = S[r][m]; S[p][m] = c * spm - s * srm; S[r][m] = s * spm + c * srm; }
    }
  }
  const mu = Math.max(...S.map((row, i) => row[i]));
  return mu > 0 ? 1 / (2 * mu) : Infinity;
}
