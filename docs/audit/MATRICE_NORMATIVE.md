# Matrice de traçabilité normative

Version 3.6.0. Chaque règle appliquée par le moteur est rattachée à son article, à la fonction
qui la code (`src/eurocode.ts`, sauf mention) et aux cas de validation ou tests qui la contrôlent.

Statut de la source :
- **V** : valeur ou formule vérifiée sur un texte ou une source consultée pendant l'audit ;
- **R** : valeur recommandée de l'EN 1992-1-1 (texte de référence), non modifiée par l'Annexe française
  à notre connaissance — à confirmer sur le texte officiel de l'Annexe (voir registre des écarts, R-02) ;
- **I** : hypothèse ou valeur indicative, signalée à l'utilisateur.

| ID | Domaine | Règle | Article | Paramètre national | Fonction | Contrôle | Statut |
|---|---|---|---|---|---|---|---|
| N01 | Matériaux | fcd = αcc·fck/γc | EN 1992-1-1 §3.1.6(1) | αcc = 1,0 (rec. et AN FR) | `materialProps` | M1 | V |
| N02 | Matériaux | fctm, fcm, Ecm | Tab. 3.1 | — | `materialProps` | tests Matériaux | R |
| N03 | Matériaux | εc2, εcu2, n (bétons > C50) | Tab. 3.1 | — | `materialProps` | M2 | R |
| N04 | Matériaux | Diagramme parabole-rectangle | §3.1.7(1) | — | `sigmaC` | S1 à S4 | R |
| N05 | Matériaux | Acier à palier horizontal, sans limite εud | §3.2.7(2) b | — | `sigmaS` | S1 | R |
| N06 | Matériaux | γc = 1,5 ; γs = 1,15 (situations durables) | §2.4.2.4, tab. 2.1N | valeurs rec. | `materialProps` | M1 | R |
| N07 | Durabilité | cmin,dur selon exposition et classe structurale | §4.4.1.2(5), tab. 4.4N | tab. 4.4N retenu en France | `CMIN_DUR` | M3 | V |
| N08 | Durabilité | Modulation de la classe structurale | tab. 4.3N / tab. 4.3NF | tab. 4.3NF (AN FR) | `materialProps` | E2, E4 | V |
| N09 | Durabilité | cmin,b = Φ (barre isolée) | §4.4.1.2(3), tab. 4.2 | — | `materialProps` | test cmin,b | R |
| N10 | Durabilité | cmin = max(cmin,b ; cmin,dur ; 10 mm) | §4.4.1.2(2) | Δcdur = 0 | `materialProps` | tests | R |
| N11 | Durabilité | Δcdev = 10 mm (réduction avec assurance qualité) | §4.4.1.3 | rec. | `materialProps` | E1 | R |
| N12 | Durabilité | cmin,dur pour XF et XA | — (non donné) | — | `exposureRow` | — | I |
| N13 | Durabilité | Classe de résistance minimale | Annexe E (informative), tab. E.1N | EN 206/CN | `MIN_CLASS_FCK` | test annexe E | I |
| N14 | Analyse | Imperfection ei = θi·l0/2, θi = αh·αm/200 | §5.2(5), §5.2(7) | θ0 = 1/200 | `analyseDirection` | test αh | R |
| N15 | Analyse | Longueur efficace (éléments contreventés / non contreventés) | §5.8.3.2, éq. 5.15 et 5.16 | — | `effectiveLength` | G3, G4 | R |
| N16 | Analyse | Élancement limite λlim = 20·A·B·C/√n | §5.8.3.1, éq. 5.13N | λlim | `analyseDirection` | tests | R |
| N17 | Analyse | C = 1,7 − rm ; rm = 1 (non contreventé, imperfections, charges transversales) | §5.8.3.1 | — | `analyseDirection` | tests rm | R |
| N18 | Analyse | Fluage effectif φef ; φef = 0 sous conditions | §5.8.4(2) et (4) | — | `analyseDirection` | test φef | R |
| N19 | Analyse | Coefficient de fluage φ(∞,t0), âge corrigé (température, ciment) | Annexe B (B.1 à B.10) | — | `creepCoefficient` | G5 | R |
| N20 | Second ordre | Rigidité nominale EI, NB, amplification | §5.8.7.2 et §5.8.7.3 | — | `analyseDirection` | N2 | R |
| N21 | Second ordre | Courbure nominale 1/r = Kr·Kφ·1/r0 ; e2 = (1/r)·l0²/c | §5.8.8.3 | — | `analyseDirection` | tests | R |
| N22 | Second ordre | M0e = max(0,6 M02 + 0,4 M01 ; 0,4 M02), sans charge transversale | §5.8.8.2(2), éq. 5.32 | — | `analyseDirection` | N1, E3 | V |
| N23 | Second ordre | MEd = max(M02 ; M0e + M2 ; M01 + 0,5 M2 ; NEd·e0) | §5.8.8.2, fig. 5.10 | — | `analyseDirection` | N1 | V |
| N24 | Second ordre | c = 8 si moment du 1er ordre constant | §5.8.8.2(4) | — | `analyseDirection` | test c = 8 | R |
| N25 | Flexion déviée | Critères 5.38a/b ; relation 5.39 (exposant a) | §5.8.9 | — | `evaluate` | tests | R |
| N26 | Résistance | Excentricité minimale e0 = max(h/30 ; 20 mm) | §6.1(4) | — | `analyseDirection` | tests | R |
| N27 | Résistance | Diagramme d'interaction N-M (pivots A, B, C) | §6.1, fig. 6.1 | — | `internalForces`, `momentResistance` | S1 à S4 | R |
| N28 | Effort tranchant | VRd,c avec σcp | §6.2.2, éq. 6.2 | CRd,c, vmin, k1 rec. | `calculerPoteau` | V1 | R |
| N29 | Effort tranchant | VRd,max, αcw, ν1, 1 ≤ cot θ ≤ 2,5 | §6.2.3 | rec. | `calculerPoteau` | V2 | R |
| N30 | Torsion | Section creuse équivalente, TRd,max, interaction 6.29, 6.31 | §6.3 | — | `calculerPoteau` | test cot θ | R |
| N31 | ELS | σc ≤ 0,6 fck (caractéristique, XD/XS/XF) ; ≤ 0,45 fck (quasi-permanente) | §7.2(2), §7.2(3) | k1, k2 | `calculerPoteau` | test ELS | R |
| N32 | ELS | wmax | tab. 7.1N / tab. 7.1NF | tab. 7.1NF | `wmax` | test wmax | V |
| N33 | ELS | sr,max ; εsm − εcm | §7.3.4, éq. 7.8 à 7.14 | k3 (AN FR : 3,4·(25/c)^(2/3) si c > 25 mm), k4 | `calculerPoteau` | C1, C2 | V |
| N34 | Dispositions | Φl ≥ 8 mm | §9.5.2(1) | Φmin | `detailingChecks` | tests | R |
| N35 | Dispositions | As,min = max(0,10 NEd/fyd ; 0,002 Ac) | §9.5.2(2) | — | `calculerPoteau` | tests | R |
| N36 | Dispositions | As,max = 4 % hors recouvrement, 8 % au recouvrement | §9.5.2(3) | As,max | `detailingChecks` | test 8 % | R |
| N37 | Dispositions | Une barre par angle ; 4 barres minimum en section circulaire | §9.5.2(4) | — | `detailingChecks` | tests hexagone, cercle | R |
| N38 | Dispositions | Φt ≥ max(6 mm ; Φl/4) | §9.5.3(1) | — | `detailingChecks` | tests | R |
| N39 | Dispositions | scl,tmax = min(20 Φl ; plus petite dimension ; 400 mm) | §9.5.3(3) | scl,tmax | `detailingChecks` | test espacement | R |
| N40 | Dispositions | 0,6 scl,tmax aux abouts et recouvrements (Φl > 14 mm) | §9.5.3(4) | — | `tieSpacing` | test abouts | R |
| N41 | Dispositions | Barres à moins de 150 mm d'une barre tenue | §9.5.3(6) | — | `detailingChecks` | — | R |
| N42 | Dispositions | Espacement libre ≥ max(Φ ; dg + 5 ; 20 mm) | §8.2(2) | k1, k2 | `detailingChecks` | — | R |
| N43 | Dispositions | Poteau si b ≤ 4h, sinon voile | §9.5.1 | — | `calculerPoteau` | test voile | R |
| N44 | Ancrage | fbd, lb,rqd, lbd, lb,min ; fctd limité à C60/75 | §8.4.2 à §8.4.4 | αct = 1 | `anchorage` | A1 | R |
| N45 | Recouvrement | l0, α6, l0,min | §8.7.3 | — | `anchorage` | A2 | R |
| N46 | Recouvrement | Armatures transversales de recouvrement | §8.7.4.1(3), §8.7.4.2(3) | — | `tieSpacing` | test | R |
| N47 | Actions | Combinaison fondamentale 1,35 G + 1,5 Q | EN 1990, éq. 6.10 | AN FR : 6.10 | `calculerPoteau` | test G + Q | R |
| N48 | Actions | ψ1, ψ2 par catégorie d'usage | EN 1990, tab. A1.1 | — | interfaces | — | R |
| N49 | Feu | Méthode A, éq. 5.7, domaine de validité | EN 1992-1-2 §5.3.2 | emax = 0,15 h (rec.) | `calculerPoteau` | F1 | R |
| N50 | Feu | ηfi avec ψfi = ψ1,1 (France) ou ψ2,1 (rec.) | EN 1992-1-2 §2.4.2 ; EN 1991-1-2 §4.3.1(2) | AN FR : ψ1,1 | `calculerPoteau` | test feu | V |
| N51 | Méthode nationale | NRd = kh·ks·α·(Ac fcd + As fyd) | Recommandations professionnelles FFB | — | `calculerPoteau` | P1 | V |
| N52 | Géométrie | Sections polygonales, axes principaux (hors norme : mécanique des sections) | — | — | `src/section.ts` | G1, G2, S4 | V |
