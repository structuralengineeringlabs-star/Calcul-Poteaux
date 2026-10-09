# Registre des formules

Unités internes du moteur : **N, mm, MPa (N/mm²), N·mm**. Conversion aux interfaces : kN, kNm, cm, cm², m.
Convention de signe : compression positive. Les renvois « N.. » pointent vers la matrice normative.

| Formule (notation EC2) | Unités internes | Article | Fonction | Matrice | Contrôle |
|---|---|---|---|---|---|
| fcd = αcc·fck/γc | MPa | §3.1.6 | `materialProps` | N01 | M1 |
| fyd = fyk/γs | MPa | §3.2.7 | `materialProps` | N06 | tests |
| fctm = 0,30·fck^(2/3) (≤ C50) ; 2,12·ln(1 + fcm/10) | MPa | tab. 3.1 | `materialProps` | N02 | tests |
| Ecm = 22 000·(fcm/10)^0,3 | MPa | tab. 3.1 | `materialProps` | N02 | N2 |
| σc = fcd·[1 − (1 − εc/εc2)^n] pour εc < εc2, fcd au-delà | MPa | éq. 3.17, 3.18 | `sigmaC` | N04 | S1 à S4 |
| σs = Es·εs, borné à ±fyd | MPa | §3.2.7 | `sigmaS` | N05 | S1 |
| cnom = max(cmin,b ; cmin,dur ; 10) + Δcdev | mm | §4.4.1 | `materialProps` | N07 à N11 | M3 |
| ei = αh·l0/400, αh = 2/√l ∈ [2/3 ; 1] (l en m) | mm | §5.2 | `analyseDirection` | N14 | test αh |
| l0 = 0,5·l·√[(1 + k1/(0,45 + k1))(1 + k2/(0,45 + k2))] | m | éq. 5.15 | `effectiveLength` | N15 | G3 |
| l0 = l·max{√(1 + 10 k1k2/(k1 + k2)) ; (1 + k1/(1 + k1))(1 + k2/(1 + k2))} | m | éq. 5.16 | `effectiveLength` | N15 | G4 |
| λ = l0/i, i = √(I/A) (axe principal) | — | §5.8.3.2 | `analyseDirection` | N16 | tests |
| λlim = 20·A·B·C/√n ; A = 1/(1 + 0,2 φef) ; B = √(1 + 2ω) ; C = 1,7 − rm | — | éq. 5.13N | `analyseDirection` | N16, N17 | tests |
| φef = φ(∞,t0)·M0Eqp/M0Ed | — | éq. 5.19 | `analyseDirection` | N18 | test φef |
| φ(∞,t0) = φRH·β(fcm)·β(t0) ; tT = t0·exp[−(4000/(273 + T) − 13,65)] | — | annexe B | `creepCoefficient` | N19 | G5 |
| EI = Kc·Ecd·Ic + Es·Is ; Kc = k1·k2/(1 + φef) ; k2 = n·λ/170 ≤ 0,20 | N·mm² | éq. 5.21 à 5.23 | `analyseDirection` | N20 | N2 |
| NB = π²·EI/l0² ; MEd = M0Ed·[1 + β/(NB/NEd − 1)] | N ; N·mm | éq. 5.28 | `analyseDirection` | N20 | N2 |
| 1/r0 = εyd/(0,45 d), d = h/2 + is | 1/m | éq. 5.34, §5.8.8.3(2) | `analyseDirection` | N21 | tests |
| Kr = (nu − n)/(nu − 0,4) ≤ 1 ; Kφ = 1 + β·φef ≥ 1 ; β = 0,35 + fck/200 − λ/150 | — | éq. 5.36, 5.37 | `analyseDirection` | N21 | tests |
| e2 = (1/r)·l0²/c | mm | éq. 5.33 | `analyseDirection` | N21, N24 | tests |
| M01 = ±Mmin + NEd·ei ; M02 = Mmax + NEd·ei | N·mm | §5.8.8.2 | `analyseDirection` | N22 | N1 |
| M0e = max(0,6 M02 + 0,4 M01 ; 0,4 M02) | N·mm | éq. 5.32 | `analyseDirection` | N22 | N1 |
| (MEdz/MRdz)^a + (MEdy/MRdy)^a ≤ 1 ; NRd = Ac·fcd + As·fyd | — | éq. 5.39 | `evaluate` | N25 | tests |
| e0 = max(h/30 ; 20 mm) | mm | §6.1(4) | `analyseDirection` | N26 | tests |
| VRd,c = [CRd,c·k·(100 ρl fck)^(1/3) + k1·σcp]·bw·d ≥ (vmin + k1·σcp)·bw·d | N | éq. 6.2 | `calculerPoteau` | N28 | V1 |
| VRd,max = αcw·bw·z·ν1·fcd/(cot θ + tan θ) | N | éq. 6.9 | `calculerPoteau` | N29 | V2 |
| TRd,max = 2ν·αcw·fcd·Ak·tef·sin θ·cos θ | N·mm | éq. 6.30 | `calculerPoteau` | N30 | tests |
| sr,max = k3·c + k1·k2·k4·Φ/ρp,eff | mm | éq. 7.11 | `calculerPoteau` | N33 | C2 |
| εsm − εcm = max{[σs − kt·fct,eff/ρp,eff·(1 + αe ρp,eff)]/Es ; 0,6 σs/Es} | — | éq. 7.9 | `calculerPoteau` | N33 | C1 |
| fbd = 2,25·η1·η2·fctd ; lb,rqd = (Φ/4)·σsd/fbd | MPa ; mm | éq. 8.2, 8.3 | `anchorage` | N44 | A1 |
| l0 = α1α2α3α5α6·lb,rqd ≥ max(0,3 α6 lb,rqd ; 15Φ ; 200) | mm | éq. 8.10, 8.11 | `anchorage` | N45 | A2 |
| R = 120·[(Rηfi + Ra + Rl + Rb + Rn)/120]^1,8 | min | EN 1992-1-2 éq. 5.7 | `calculerPoteau` | N49 | F1 |
| NRd = kh·ks·α·(Ac·fcd + As·fyd) | N | RP France | `calculerPoteau` | N51 | P1 |
