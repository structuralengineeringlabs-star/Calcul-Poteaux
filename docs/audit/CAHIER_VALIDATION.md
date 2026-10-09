# Cahier de validation du moteur de calcul

Version 4.7.0 — généré automatiquement par `npm run validation` le 08/10/2026.

Chaque cas compare la valeur obtenue à une référence indépendante du code : calcul manuel détaillé
(formule et valeurs dans les tests `src/eurocode.test.ts`) ou modèle numérique indépendant écrit en Python
(intégration par fibres ou par tranches). Les cas issus d'exemples publiés restent à ajouter (voir le registre des écarts, R-01).

| Cas | Domaine | Article | Grandeur | Référence | Obtenu | Écart | Tolérance | Méthode | Statut |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Matériaux | §3.1.6 | fcd, C30/37, αcc = 0,85, γc = 1,5 (MPa) | 17,000 | 17,000 | 0,0000 | ±0,0000 | Manuel : 0,85 × 30 / 1,5 | ✅ |
| M2 | Matériaux | Tab. 3.1 | εc2 pour C70/85 (‰) | 2,420 | 2,416 | -0,0041 | ±0,0050 | Manuel : 2,0 + 0,085 × 20^0,53 | ✅ |
| M3 | Matériaux | Tab. 4.4N | cmin,dur XD1, S4 (mm) | 35,000 | 35,000 | 0,0000 | ±0,0000 | Lecture du tableau | ✅ |
| G1 | Géométrie | — | Hexagone a = 25 cm : I (cm⁴) | 211432,0 | 211432,0 | 0,0000 | ±5,000 | Formule exacte 5√3/16·a⁴ | ✅ |
| G2 | Géométrie | — | L 30×30 ép. 10 : Imin (cm⁴) | 18166,7 | 18166,7 | -0,0033 | ±1,000 | Manuel (Huygens + axes principaux) | ✅ |
| G3 | Flambement | Éq. 5.15 | l0 contreventé, k1 = k2 = 0,1, l = 4 m (m) | 2,364 | 2,364 | 0,0000 | ±0,0010 | Manuel | ✅ |
| G4 | Flambement | Éq. 5.16 | l0 console (k1 = 0,1 ; k2 → ∞), l = 4 m (m) | 8,727 | 8,727 | -0,0000 | ±0,0100 | Manuel | ✅ |
| G5 | Fluage | Annexe B | φ(∞,t0) C30/37, RH 50 %, h0 200 mm, 28 j, 20 °C (—) | 2,367 | 2,367 | 0,0003 | ±0,0020 | Manuel (B.1 à B.10) | ✅ |
| S1 | Section | §3.1.7, §6.1 | NRd,max 30×40, 804 mm², εc2 uniforme (kN) | 2347,9 | 2347,9 | -0,0000 | ±0,5000 | Manuel | ✅ |
| S2 | Section | §6.1 | MRd 30×40, As = 1 500 mm², N = 1 000 kN (kNm) | 186,4 | 186,5 | 0,0003 | ±0,2000 | Modèle Python indépendant (parabole-rectangle) | ✅ |
| S3 | Section | §6.1 | MRd 30×40, As = 1 000 mm², N = 0 (kNm) | 71,280 | 71,280 | 0,0000 | ±0,2000 | Modèle Python indépendant | ✅ |
| S4 | Section | §6.1 | MRd T 25×40 + 60×15, 8 HA16, N = 800 kN, plan I (kNm) | 220,4 | 220,4 | -0,0199 | ±1,000 | Modèle à fibres Python indépendant | ✅ |
| N1 | Second ordre | §5.8.8.2 | M0e, 30×40, 1 200 kN, M = 100/50 kNm simple courbure (kNm) | 90,500 | 90,500 | 0,0000 | ±0,0500 | Manuel (ei = 8,75 mm) | ✅ |
| N2 | Second ordre | §5.8.7.2 | NB (rigidité nominale), 30×40, plan de h (kN) | 4497,1 | 4497,0 | -0,0082 | ±1,000 | Manuel (EI = Kc·Ecd·Ic + Es·Is) | ✅ |
| A1 | Ancrage | §8.4 | lb,rqd Φ16, C30/37, bonne adhérence (mm) | 571,8 | 571,8 | 0,0394 | ±0,2000 | Manuel | ✅ |
| A2 | Recouvrement | §8.7.3 | l0 Φ16, 100 % recouverts (mm) | 857,8 | 857,8 | -0,0009 | ±0,5000 | Manuel (α6 = 1,5) | ✅ |
| V1 | Effort tranchant | §6.2.2 | VRd,c 30×40, N = 1 500 kN (kN) | 103,3 | 103,3 | -0,0036 | ±0,1000 | Manuel | ✅ |
| V2 | Effort tranchant | §6.2.3 | VRd,max (cot θ = 2,5), même cas (kN) | 193,0 | 193,0 | 0,0090 | ±0,5000 | Manuel (αcw = 0,662) | ✅ |
| F1 | Feu | EN 1992-1-2 (5.7) | R, 30×40, R60, l0,fi = 0,7 l, valeurs recommandées (min) | 120,2 | 120,2 | 0,0207 | ±0,2000 | Manuel | ✅ |
| P1 | Méthode RP | RP France | NRd 30×40, 4 HA16, λ = 40,4 (kN) | 1483,4 | 1483,4 | -0,0039 | ±0,5000 | Manuel (α = 0,6035 ; kh = 0,8938) | ✅ |
| C1 | Fissuration | §7.3.4 | σs, flexion simple 60 kNm (MPa) | 477,7 | 477,6 | -0,1301 | ±0,5000 | Manuel (section fissurée, αe = 18,3) | ✅ |
| C2 | Fissuration | §7.3.4 + AN | sr,max AN France (k3 = 3,4·(25/c)^(2/3)) (mm) | 305,2 | 305,2 | 0,0268 | ±0,5000 | Manuel (c = 43 mm) | ✅ |

**Bilan : 22 / 22 cas conformes.**
