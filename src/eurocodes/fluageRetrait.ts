/** @sel/eurocodes — fluage et retrait (annexe B, §3.1.4). */
/** Coefficient de fluage φ(∞, t0), annexe B (h0 en mm, t0 en jours). */
export function coefficientFluage(fck: number, RH: number, h0: number, t0: number, ciment: 'S' | 'N' | 'R' = 'N', Tmoy = 20): number {
  const fcm = fck + 8;
  const a1 = Math.pow(35 / fcm, 0.7), a2 = Math.pow(35 / fcm, 0.2);
  const base = (1 - RH / 100) / (0.1 * Math.cbrt(h0));
  const phiRH = fcm <= 35 ? 1 + base : (1 + base * a1) * a2;
  const betaFcm = 16.8 / Math.sqrt(fcm);
  const alpha = ciment === 'S' ? -1 : ciment === 'R' ? 1 : 0;
  const tT = t0 * Math.exp(-(4000 / (273 + Tmoy) - 13.65));
  const t0adj = Math.max(0.5, tT * Math.pow(9 / (2 + Math.pow(tT, 1.2)) + 1, alpha));
  const betaT0 = 1 / (0.1 + Math.pow(t0adj, 0.2));
  return phiRH * betaFcm * betaT0;
}

/** Déformation de retrait totale à long terme εcs(∞) = εcd(∞) + εca(∞) (§3.1.4, annexe B, éq. B.11 et 3.12). */
export function retraitFinal(fck: number, RH: number, h0: number, ciment: 'S' | 'N' | 'R' = 'N'): { epsCd: number; epsCa: number; epsCs: number; kh: number } {
  const fcm = fck + 8;
  const [ads1, ads2] = ciment === 'S' ? [3, 0.13] : ciment === 'R' ? [6, 0.11] : [4, 0.12];
  const betaRH = 1.55 * (1 - Math.pow(RH / 100, 3));
  const epsCd0 = 0.85 * ((220 + 110 * ads1) * Math.exp(-ads2 * fcm / 10)) * 1e-6 * betaRH;
  // kh, tableau 3.3 (interpolation linéaire)
  const pts: [number, number][] = [[100, 1.0], [200, 0.85], [300, 0.75], [500, 0.70]];
  let kh = 0.70;
  if (h0 <= 100) kh = 1.0;
  else for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (h0 <= x2) { kh = y1 + (y2 - y1) * (h0 - x1) / (x2 - x1); break; }
  }
  const epsCd = kh * epsCd0;
  const epsCa = 2.5 * (fck - 10) * 1e-6;
  return { epsCd, epsCa, epsCs: epsCd + epsCa, kh };
}
