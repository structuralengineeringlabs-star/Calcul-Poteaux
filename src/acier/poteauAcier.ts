/**
 * Poteau métallique en I ou H (profilé laminé du catalogue ou PRS bisymétrique) — NF EN 1993-1-1, EN 1993-1-2.
 * Classification, résistance de section (§6.2.9, critère linéaire 6.2 / contraintes élastiques en classe 3),
 * flambement par flexion selon y et z (§6.3.1, tableau 6.2), flambement par torsion (§6.3.1.4),
 * flexion composée avec déversement (§6.3.3, méthode 2, annexe B ; Mcr par Rayleigh-Ritz), température critique.
 * Unités internes : N, mm, MPa. Moments d'extrémité : valeurs du diagramme (signées) en tête et en pied.
 */
import { profil, proprietesLamine, tube, proprietesTube, tabule, proprietesIPN } from '../eurocodes/catalogue';
import { E_ACIER, G_ACIER, chiLT, classeDebord, limiteElastique, multiplicateurCritique, proprietesI, temperatureCritique, type Nuance } from '../eurocodes/ec3';

export interface DonneesPoteauAcier {
  profil: string;                 // désignation du catalogue ou « PRS »
  bf: number; tf: number; hw: number; tw: number; // PRS bisymétrique (mm)
  nuance: Nuance; gM0: number; gM1: number;
  betaY: number; betaZ: number; betaT: number;    // longueurs de flambement / L (axes y, z ; torsion)
  maintienDeversement: boolean;   // déversement empêché (maintiens latéraux rapprochés de la semelle comprimée)
}
export const ACIER_DEFAUT: DonneesPoteauAcier = { profil: 'HEB 200', bf: 200, tf: 15, hw: 170, tw: 9, nuance: 'S355', gM0: 1.0, gM1: 1.0, betaY: 1.0, betaZ: 1.0, betaT: 1.0, maintienDeversement: false };

export interface EntreePoteauAcier {
  L: number;                      // m, hauteur libre
  NEd: number;                    // kN (compression > 0), poids propre compris
  My: [number, number]; Mz: [number, number]; // kNm, en tête et en pied (valeurs du diagramme, signées)
  etaFi: number;                  // ηfi pour la température critique
  acier: DonneesPoteauAcier;
}

export interface VerifAcier { id: string; titre: string; valeur: string; limite: string; ok: boolean; ref: string }

const ALPHA: Record<string, number> = { a0: 0.13, a: 0.21, b: 0.34, c: 0.49, d: 0.76 };
export const chiFlexion = (lambda: number, alpha: number) => {
  if (lambda <= 0.2) return 1;
  const phi = 0.5 * (1 + alpha * (lambda - 0.2) + lambda * lambda);
  return Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lambda * lambda)));
};

/** Courbes de flambement du tableau 6.2 (sections en I laminées ou soudées). */
export function courbes(lamine: boolean, h: number, b: number, tf: number, nuance: Nuance): { y: string; z: string } {
  const s460 = nuance === 'S460';
  if (!lamine) return tf <= 40 ? { y: 'b', z: 'c' } : { y: 'c', z: 'd' };
  if (h / b > 1.2) return tf <= 40 ? (s460 ? { y: 'a0', z: 'a0' } : { y: 'a', z: 'b' }) : (s460 ? { y: 'a', z: 'a' } : { y: 'b', z: 'c' });
  return tf <= 100 ? (s460 ? { y: 'a', z: 'a' } : { y: 'b', z: 'c' }) : (s460 ? { y: 'c', z: 'c' } : { y: 'd', z: 'd' });
}

export function geometriePoteau(a: DonneesPoteauAcier) {
  const tb = tube(a.profil);
  if (tb) {
    const q = proprietesTube(tb);
    return { nom: tb.nom, lamine: true, tube: tb.famille, h: tb.h, b: tb.b, tf: tb.t, tw: tb.t, r: 0, A: q.A, Iy: q.Iy, Iz: q.Iz, Wply: q.Wply, Wplz: q.Wplz, Wely: q.Wely, Welz: q.Welz, It: q.It, Iw: 0, G: q.masse };
  }
  const ipn = tabule(a.profil);
  if (ipn && ipn.famille === 'IPN') {
    const q = proprietesIPN(ipn);
    return { nom: ipn.nom, lamine: true, tube: null, h: ipn.h, b: ipn.b, tf: ipn.tf, tw: ipn.tw, r: 0, A: q.A, Iy: q.Iy, Iz: q.Iz, Wply: q.Wply, Wplz: q.Wplz, Wely: q.Wely, Welz: q.Welz, It: q.It, Iw: q.Iw, G: ipn.G };
  }
  const pl = a.profil !== 'PRS' ? profil(a.profil) : undefined;
  if (pl) {
    const q = proprietesLamine(pl);
    return { nom: pl.nom, lamine: true, tube: null, h: pl.h, b: pl.b, tf: pl.tf, tw: pl.tw, r: pl.r, A: q.A, Iy: q.Iy, Iz: q.Iz, Wply: q.Wply, Wplz: q.Wplz, Wely: q.Wely, Welz: q.Welz, It: q.It, Iw: q.Iw, G: pl.G };
  }
  const s = { bfs: a.bf, tfs: a.tf, hw: a.hw, tw: a.tw, bfi: a.bf, tfi: a.tf };
  const p = proprietesI(s);
  const Wplz = a.tf * a.bf * a.bf / 2 + a.hw * a.tw * a.tw / 4;
  return { nom: `PRS ${a.bf}×${a.tf} / ${a.hw}×${a.tw}`, lamine: false, tube: null, h: p.h, b: a.bf, tf: a.tf, tw: a.tw, r: 0, A: p.A, Iy: p.Iy, Iz: p.Iz, Wply: p.Wpl, Wplz, Wely: p.WelSup, Welz: p.Iz / (a.bf / 2), It: p.It, Iw: p.Iw, G: p.A * 1e-6 * 7850 };
}

/** Facteur de moment uniforme équivalent Cm pour un diagramme linéaire (tableau B.3). */
export const cmLineaire = (psi: number) => Math.max(0.4, 0.6 + 0.4 * psi);
/** ψ = rapport du plus petit au plus grand moment d'extrémité (signé). */
export const rapportPsi = (m1: number, m2: number) => {
  const [g, p] = Math.abs(m1) >= Math.abs(m2) ? [m1, m2] : [m2, m1];
  return g === 0 ? 1 : p / g;
};

export function calculerPoteauAcier(x: EntreePoteauAcier) {
  const a = x.acier, g = geometriePoteau(a);
  const { fy } = limiteElastique(a.nuance, Math.max(g.tf, g.tw));
  const eps = Math.sqrt(235 / fy);
  const L = x.L * 1000, N = Math.max(0, x.NEd) * 1e3;
  const My = Math.max(Math.abs(x.My[0]), Math.abs(x.My[1])) * 1e6, Mz = Math.max(Math.abs(x.Mz[0]), Math.abs(x.Mz[1])) * 1e6;
  // Classification : semelle en console comprimée ; âme supposée entièrement comprimée (sécuritaire, tableau 5.2)
  // Tubes (tableau 5.2) : CHS d/t ≤ 50ε², 70ε², 90ε² ; parois de RHS c = h − 3t, c/t ≤ 33ε, 38ε, 42ε
  const paroi = (r: number) => (r <= 33 * eps ? 1 : r <= 38 * eps ? 2 : r <= 42 * eps ? 3 : 4) as 1 | 2 | 3 | 4;
  const cS = g.tube === 'CHS' ? (g.h / g.tf <= 50 * eps * eps ? 1 : g.h / g.tf <= 70 * eps * eps ? 2 : g.h / g.tf <= 90 * eps * eps ? 3 : 4)
    : g.tube ? paroi((g.b - 3 * g.tf) / g.tf) : classeDebord((g.b - g.tw) / 2 - g.r, g.tf, eps);
  const cA = g.tube === 'CHS' ? cS : g.tube ? paroi((g.h - 3 * g.tf) / g.tf) : paroi((g.h - 2 * g.tf - 2 * g.r) / g.tw);
  const classe = Math.max(cS, cA) as 1 | 2 | 3 | 4;
  const plast = classe <= 2;
  const NRk = g.A * fy, MyRk = (plast ? g.Wply : g.Wely) * fy, MzRk = (plast ? g.Wplz : g.Welz) * fy;
  // Section (§6.2.9 : critère linéaire 6.2 en classes 1-2, contraintes élastiques 6.42 en classe 3)
  const section = plast ? N / (NRk / a.gM0) + My / (MyRk / a.gM0) + Mz / (MzRk / a.gM0) : (N / g.A + My / g.Wely + Mz / g.Welz) / (fy / a.gM0);
  // Flambement par flexion
  const c = g.tube ? (a.nuance === 'S460' ? { y: 'a0', z: 'a0' } : { y: 'a', z: 'a' }) : courbes(g.lamine, g.h, g.b, g.tf, a.nuance); // tubes finis à chaud : courbe a (a0 en S460)
  const NcrY = Math.PI ** 2 * E_ACIER * g.Iy / (a.betaY * L) ** 2, NcrZ = Math.PI ** 2 * E_ACIER * g.Iz / (a.betaZ * L) ** 2;
  const lY = Math.sqrt(NRk / NcrY), lZ = Math.sqrt(NRk / NcrZ);
  const chiY = chiFlexion(lY, ALPHA[c.y]), chiZ = chiFlexion(lZ, ALPHA[c.z]);
  // Flambement par torsion (section bisymétrique : flexion-torsion découplée)
  const i0sq = (g.Iy + g.Iz) / g.A;
  const NcrT = g.tube ? Infinity : (G_ACIER * g.It + Math.PI ** 2 * E_ACIER * g.Iw / (a.betaT * L) ** 2) / i0sq; // sections fermées : sans objet
  const lT = Math.sqrt(NRk / NcrT), chiT = g.tube ? 1 : chiFlexion(lT, ALPHA[c.z]);
  const chiMin = Math.min(chiY, chiZ, chiT);
  const NbRd = chiMin * NRk / a.gM1;
  // Déversement (moment selon y), C1 = 1,88 − 1,40ψ + 0,52ψ² ≤ 2,7 pour un diagramme linéaire
  const psiY = rapportPsi(x.My[0], x.My[1]), psiZ = rapportPsi(x.Mz[0], x.Mz[1]);
  let chiLt = 1, Mcr = Infinity, lLT = 0;
  if (!a.maintienDeversement && !g.tube && My > 0) { // sections creuses : déversement négligeable
    // Mcr par Rayleigh-Ritz sur le diagramme linéaire des moments d'extrémité (forme normée, max = 1 N·mm)
    const Mt = x.My[0], Mp = x.My[1], Mm = Math.max(Math.abs(Mt), Math.abs(Mp));
    Mcr = multiplicateurCritique(L, g.Iz, g.Iw, g.It, s => (Mt + (Mp - Mt) * s / L) / Mm);
    lLT = Math.sqrt(MyRk / Mcr);
    const aLT = g.lamine ? (g.h / g.b <= 2 ? 0.21 : 0.34) : (g.h / g.b <= 2 ? 0.49 : 0.76);
    chiLt = My / Mcr <= 0.04 ? 1 : chiLT(lLT, aLT);
  }
  // Flexion composée, méthode 2 (annexe B) — tableau B.2 (éléments sensibles aux déformations de torsion)
  const Cmy = cmLineaire(psiY), Cmz = cmLineaire(psiZ), CmLT = Cmy;
  const ny = N / (chiY * NRk / a.gM1), nz = N / (chiZ * NRk / a.gM1);
  let kyy: number, kzz: number, kyz: number, kzy: number;
  if (plast) {
    kyy = Math.min(Cmy * (1 + (lY - 0.2) * ny), Cmy * (1 + 0.8 * ny));
    kzz = g.tube ? Math.min(Cmz * (1 + (lZ - 0.2) * nz), Cmz * (1 + 0.8 * nz)) : Math.min(Cmz * (1 + (2 * lZ - 0.6) * nz), Cmz * (1 + 1.4 * nz));
    kyz = 0.6 * kzz;
    kzy = a.maintienDeversement || g.tube ? 0.6 * kyy
      : lZ < 0.4 ? Math.min(0.6 + lZ, 1 - 0.1 * lZ * nz / (CmLT - 0.25)) : Math.max(1 - 0.1 * lZ * nz / (CmLT - 0.25), 1 - 0.1 * nz / (CmLT - 0.25));
  } else {
    kyy = Math.min(Cmy * (1 + 0.6 * lY * ny), Cmy * (1 + 0.6 * ny));
    kzz = Math.min(Cmz * (1 + 0.6 * lZ * nz), Cmz * (1 + 0.6 * nz));
    kyz = kzz;
    kzy = a.maintienDeversement || g.tube ? 0.8 * kyy : Math.max(1 - 0.05 * lZ * nz / (CmLT - 0.25), 1 - 0.05 * nz / (CmLT - 0.25));
  }
  const eq661 = N / (chiY * NRk / a.gM1) + kyy * My / (chiLt * MyRk / a.gM1) + kyz * Mz / (MzRk / a.gM1);
  const eq662 = N / (chiZ * NRk / a.gM1) + kzy * My / (chiLt * MyRk / a.gM1) + kzz * Mz / (MzRk / a.gM1);
  // Feu : température critique, μ0 ≈ ηfi × taux de travail (information)
  const taux = Math.max(section, eq661, eq662, N / NbRd);
  const thetaCr = temperatureCritique(x.etaFi * taux);
  const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
  const verifs: VerifAcier[] = [
    { id: 'classe', titre: 'Classe de section (compression)', valeur: `classe ${classe} (semelle ${cS}, âme ${cA})`, limite: 'classes 1 à 3 traitées', ok: classe < 4, ref: 'EN 1993-1-1 tab. 5.2' },
    { id: 'section', titre: 'Résistance de la section (N + My + Mz)', valeur: fr(section, 3), limite: '≤ 1', ok: classe < 4 && section <= 1, ref: plast ? '§6.2.1(7), éq. 6.2' : '§6.2.1(5), éq. 6.1' },
    { id: 'flambement', titre: 'Flambement (flexion y, z ; torsion)', valeur: `NEd = ${fr(N / 1e3, 0)} kN ; χy = ${fr(chiY, 3)}, χz = ${fr(chiZ, 3)}, χT = ${fr(chiT, 3)}`, limite: `≤ Nb,Rd = ${fr(NbRd / 1e3, 0)} kN`, ok: classe < 4 && N <= NbRd, ref: '§6.3.1, tab. 6.2' },
    { id: '661', titre: 'Flexion composée, éq. 6.61 (axe y)', valeur: fr(eq661, 3), limite: '≤ 1', ok: classe < 4 && eq661 <= 1, ref: '§6.3.3, annexe B' },
    { id: '662', titre: 'Flexion composée, éq. 6.62 (axe z)', valeur: fr(eq662, 3), limite: '≤ 1', ok: classe < 4 && eq662 <= 1, ref: '§6.3.3, annexe B' },
    { id: 'feu', titre: 'Température critique (information)', valeur: `θcr = ${fr(thetaCr, 0)} °C (μ0 = ${fr(x.etaFi * taux, 3)})`, limite: 'à comparer à l\'échauffement du profilé', ok: true, ref: 'EN 1993-1-2 §4.2.4' },
  ];
  const ok = verifs.every(v => v.ok);
  return {
    geo: g, fy, eps, classe, cS, cA, courbes: c, NRk, MyRk, MzRk,
    NcrY, NcrZ, NcrT, lY, lZ, lT, chiY, chiZ, chiT, NbRd, Mcr, lLT, chiLt, Cmy, Cmz, kyy, kyz, kzy, kzz,
    section, eq661, eq662, thetaCr, verifs, verdict: ok ? 'conforme' as const : 'non conforme' as const,
    masse: g.G * x.L,
  };
}
export type ResultatPoteauAcier = ReturnType<typeof calculerPoteauAcier>;
