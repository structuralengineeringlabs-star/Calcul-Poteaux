/**
 * Poteau en bois massif ou lamellé-collé, section rectangulaire b × h — NF EN 1995-1-1, EN 1995-1-2.
 * Compression avec flambement (§6.3.2, kc), flexion composée (éq. 6.23, 6.24), déversement en présence de
 * compression (éq. 6.35), kmod de la combinaison (G seul : permanente ; G + Q : durée de Q), feu par section réduite.
 * Axe y : flexion dans le plan de h (moments Mh) ; axe z : plan de b (moments Mb). Unités : N, mm, MPa.
 */
import { classeBois, kmod, kh, kcFlambement, kcrit, profondeurCarbonisation, kfi, type Duree, type ClasseBois } from '../eurocodes/ec5';

export interface DonneesPoteauBois {
  classe: string; b: number; h: number;     // mm
  classeService: 1 | 2 | 3; gM: number; dureeQ: Duree;
  betaY: number; betaZ: number;             // longueurs de flambement / L
  feuR: number;                             // 0, 30, 60, 90 (4 faces exposées)
}
export const BOIS_DEFAUT: DonneesPoteauBois = { classe: 'GL24h', b: 200, h: 200, classeService: 1, gM: 1.25, dureeQ: 'moyenne', betaY: 1, betaZ: 1, feuR: 0 };

export interface EntreePoteauBois { L: number; NG: number; NQ: number; NEd: number; My: number; Mz: number; MyG: number; MzG: number; psiFi: number; bois: DonneesPoteauBois }
export interface VerifBois { id: string; titre: string; valeur: string; limite: string; ok: boolean; ref: string }

const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');

function analyse(c: ClasseBois, b: number, h: number, L: number, betaY: number, betaZ: number, N: number, My: number, Mz: number, fc0d: number, fmdy: number, fmdz: number, E005: number) {
  const A = b * h, Wy = b * h * h / 6, Wz = h * b * b / 6;
  const iy = h / Math.sqrt(12), iz = b / Math.sqrt(12);
  const relat = (lcr: number, i: number) => lcr / i / Math.PI * Math.sqrt(c.fc0k / E005);
  const lY = relat(betaY * L, iy), lZ = relat(betaZ * L, iz);
  const kcy = kcFlambement(c, lY), kcz = kcFlambement(c, lZ);
  const sc = N / A, smy = My / Wy, smz = Mz / Wz;
  const km = 0.7; // section rectangulaire (§6.1.6(2))
  const e623 = sc / (kcy * fc0d) + smy / fmdy + km * smz / fmdz;
  const e624 = sc / (kcz * fc0d) + km * smy / fmdy + smz / fmdz;
  // Déversement (§6.3.3(6), éq. 6.35) : flexion selon y, ℓef = L (tableau 6.1, moment constant)
  const kc = kcrit({ ...c, E005 }, b, h, L);
  const e635 = kc.lambdaRelM > 0.75 && My > 0 ? (smy / (kc.kcrit * fmdy)) ** 2 + sc / (kcz * fc0d) : 0;
  return { lY, lZ, kcy, kcz, sc, smy, smz, e623, e624, kcrit: kc.kcrit, lamM: kc.lambdaRelM, e635 };
}

export function calculerPoteauBois(x: EntreePoteauBois) {
  const w = x.bois, c = classeBois(w.classe) ?? classeBois('GL24h')!;
  const L = x.L * 1000, b = Math.min(w.b, w.h), h = Math.max(w.b, w.h);
  const NQ = x.NEd * 1e3, NG = (x.NG > 0 ? 1.35 * x.NG : x.NEd) * 1e3; // combinaison G seule (si G et Q connus)
  const res = (km: number, N: number, My: number, Mz: number) => {
    const fc0d = km * c.fc0k / w.gM, fmdy = km * kh(c, h) * c.fmk / w.gM, fmdz = km * kh(c, b) * c.fmk / w.gM;
    return { fc0d, fmdy, fmdz, ...analyse(c, b, h, L, w.betaY, w.betaZ, N, My, Mz, fc0d, fmdy, fmdz, c.E005) };
  };
  const kmG = kmod(w.classeService, 'permanente'), kmQ = kmod(w.classeService, w.dureeQ);
  const rQ = res(kmQ, NQ, Math.abs(x.My) * 1e6, Math.abs(x.Mz) * 1e6);
  const rG = x.NG > 0 ? res(kmG, NG, Math.abs(x.MyG) * 1e6, Math.abs(x.MzG) * 1e6) : null;
  const pire = (k: 'e623' | 'e624' | 'e635') => Math.max(rQ[k], rG ? rG[k] : 0);
  // Feu : section réduite sur 4 faces, fd,fi = kfi·fk, E0,05,fi = kfi·E0,05, γM,fi = kmod,fi = 1
  let feu: null | { def: number; bfi: number; hfi: number; e623: number; e624: number; ok: boolean } = null;
  if (w.feuR > 0) {
    const pc = profondeurCarbonisation(c, w.feuR);
    const bfi = b - 2 * pc.def, hfi = h - 2 * pc.def;
    const etaFi = x.NG > 0 ? (x.NG + x.psiFi * x.NQ) / (1.35 * x.NG + 1.5 * x.NQ) : 0.65;
    if (bfi <= 0 || hfi <= 0) feu = { def: pc.def, bfi, hfi, e623: Infinity, e624: Infinity, ok: false };
    else {
      const k = kfi(c);
      const a = analyse(c, bfi, hfi, L, w.betaY, w.betaZ, etaFi * NQ, etaFi * Math.abs(x.My) * 1e6, etaFi * Math.abs(x.Mz) * 1e6, k * c.fc0k, k * c.fmk, k * c.fmk, k * c.E005);
      feu = { def: pc.def, bfi, hfi, e623: a.e623, e624: a.e624, ok: a.e623 <= 1 && a.e624 <= 1 };
    }
  }
  const verifs: VerifBois[] = [
    { id: 'flambement', titre: 'Compression et flambement', valeur: `σc,0,d = ${fr(rQ.sc)} MPa ; λrel,y = ${fr(rQ.lY, 3)}, λrel,z = ${fr(rQ.lZ, 3)} ; kc,y = ${fr(rQ.kcy, 3)}, kc,z = ${fr(rQ.kcz, 3)}`, limite: `≤ kc,min·fc,0,d = ${fr(Math.min(rQ.kcy, rQ.kcz) * rQ.fc0d)} MPa`, ok: rQ.sc <= Math.min(rQ.kcy, rQ.kcz) * rQ.fc0d && (!rG || rG.sc <= Math.min(rG.kcy, rG.kcz) * rG.fc0d), ref: 'EN 1995-1-1 §6.3.2' },
    { id: '623', titre: 'Flexion composée, éq. 6.23 (flambement selon y)', valeur: fr(pire('e623'), 3), limite: '≤ 1', ok: pire('e623') <= 1, ref: '§6.3.2(3)' },
    { id: '624', titre: 'Flexion composée, éq. 6.24 (flambement selon z)', valeur: fr(pire('e624'), 3), limite: '≤ 1', ok: pire('e624') <= 1, ref: '§6.3.2(3)' },
    { id: '635', titre: 'Déversement avec compression, éq. 6.35', valeur: rQ.e635 > 0 ? fr(pire('e635'), 3) : `sans objet (λrel,m = ${fr(rQ.lamM, 2)} ≤ 0,75)`, limite: '≤ 1', ok: pire('e635') <= 1, ref: '§6.3.3(6)' },
    ...(feu ? [{ id: 'feu', titre: `Résistance au feu R${w.feuR} (section ${fr(feu.bfi, 0)} × ${fr(feu.hfi, 0)} mm)`, valeur: `éq. 6.23 : ${fr(feu.e623, 3)} ; éq. 6.24 : ${fr(feu.e624, 3)}`, limite: '≤ 1', ok: feu.ok, ref: 'EN 1995-1-2 §4.2.2' }] : []),
  ];
  return { classe: c, b, h, kmodG: kmG, kmodQ: kmQ, rQ, rG, feu, verifs, verdict: verifs.every(v => v.ok) ? 'conforme' as const : 'non conforme' as const,
    volume: b * h * 1e-6 * x.L, masse: b * h * 1e-6 * x.L * c.rhomean };
}
export type ResultatPoteauBois = ReturnType<typeof calculerPoteauBois>;
