/** @sel/eurocodes — adhérence et ancrage des barres droites (§8.4). */
export function fbd(fck: number, gammaC: number, phi: number, bonne: boolean): number {
  const f = Math.min(fck, 60); // §8.4.2(2)
  const fctm = f <= 50 ? 0.30 * Math.pow(f, 2 / 3) : 2.12 * Math.log(1 + (f + 8) / 10);
  const fctd = 0.7 * fctm / gammaC; // αct = 1
  return 2.25 * (bonne ? 1.0 : 0.7) * (phi <= 32 ? 1.0 : (132 - phi) / 100) * fctd;
}
/** lb,rqd (éq. 8.3). */
export const lbRqd = (phi: number, sigmaSd: number, fbdVal: number) => phi / 4 * sigmaSd / fbdVal;
