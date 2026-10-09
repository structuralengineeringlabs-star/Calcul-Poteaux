/** @sel/eurocodes — propriétés du béton (tab. 3.1, §3.1.7) et de l'acier (§3.2.7, annexe C). */
export const ES = 200000; // MPa

export function proprietesBeton(fck: number) {
  const fcm = fck + 8;
  const fctm = fck <= 50 ? 0.30 * Math.pow(fck, 2 / 3) : 2.12 * Math.log(1 + fcm / 10);
  const Ecm = 22000 * Math.pow(fcm / 10, 0.3);
  const lambda = fck <= 50 ? 0.8 : 0.8 - (fck - 50) / 400;
  const eta = fck <= 50 ? 1.0 : 1.0 - (fck - 50) / 200;
  const epsCu3 = fck <= 50 ? 0.0035 : (2.6 + 35 * Math.pow((90 - fck) / 100, 4)) / 1000;
  return { fcm, fctm, Ecm, lambda, eta, epsCu3, fctk005: 0.7 * fctm };
}

/** Annexe C, tableau C.1 : εuk et k = (ft/fy)k minimaux selon la classe de ductilité. */
export const DUCTILITE = {
  A: { epsUk: 0.025, k: 1.05 },
  B: { epsUk: 0.050, k: 1.08 },
  C: { epsUk: 0.075, k: 1.15 },
} as const;
export type ClasseDuctilite = keyof typeof DUCTILITE;
