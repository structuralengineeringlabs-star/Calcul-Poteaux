# Manuel d'Utilisation : S.E.L. Poteaux Eurocode 2

## 🎯 Introduction Technique
Cette application est un système expert de dimensionnement de poteaux isolés en béton armé, conforme aux prescriptions de la norme **EN 1992-1-1 (Eurocode 2)**. Elle traite les sollicitations à l'État Limite Ultime (ELU) en intégrant les effets du second ordre par la méthode de la courbure nominale.

---

## 🛠️ Description des Modules et Usage Expert

### 1. Module Matériaux (Béton & Acier)
**Rôle de l'interface :** Permet de définir les caractéristiques mécaniques de la section. Le logiciel dérive automatiquement les valeurs de calcul à partir des valeurs caractéristiques.
- **Béton ($f_{ck}$) :** Résistance caractéristique à 28 jours.
- **Acier ($f_{yk}$) :** Limite d'élasticité de l'acier (généralement 500 MPa en France/Cameroun).
- **Coefficient $\alpha_{cc}$ :** 1,0 (valeur recommandée et Annexe nationale française), 0,85 en option prudente.

**Usage Expert :** L'ingénieur doit adapter $\gamma_c$ (1.5) et $\gamma_s$ (1.15) selon les situations (transitoires ou durables).

### 2. Durabilité & Enrobage
**Rôle de l'interface :** Calcule l'épaisseur de béton protecteur ($c_{nom}$) contre la corrosion.
- **Classe d'exposition :** Dépend de l'environnement (ex: XC4 pour une alternance humidité/sècheresse).
- **$c_{nom}$ :** Somme de l'enrobage minimal ($c_{min,dur}$) et de la tolérance d'exécution ($\Delta c_{dev}$, typiquement 10mm ou 5mm avec contrôle).

### 3. Analyse Géométrique
**Rôle de l'interface :** Modélisation de la forme physique du poteau.
- **Aire $A_c$ :** Capacité brute de reprise d'effort.
- **Rayon de giration $i_{min}$ :** Définit la "raideur" géométrique face au flambement.

### 4. Analyse du Flambement & Élancement
**Rôle de l'interface :** Déterminez si le poteau est "élancé" au sens de l'EC2.
- **$\lambda$ (Élancement) :** Rapport entre la longueur efficace $l_0$ et le rayon de giration $i_{min}$.
- **$\lambda_{lim}$ (Élancement limite) :** Seuil en dessous duquel les effets du second ordre peuvent être négligés.
- **Verdict :** Si $\lambda > \lambda_{lim}$, l'application bascule automatiquement en calcul de **Second Ordre**.

**Usage Expert :** Les coefficients A, B, C influencent $\lambda_{lim}$. 
- $A = 1 / (1 + 0.2 \phi_{ef})$ (Influence du fluage)
- $B = \sqrt{1 + 2\omega}$ (Influence du ferraillage, calculé à partir des aciers fournis)
- $C = 1.7 - r_m$ (Influence du moment, par défaut 0.7)

### 5. Sollicitations ELU
**Rôle de l'interface :** Saisie des efforts internes pondérés (Combinaisons fondamentales).
- **$N_{Ed}$ :** Effort normal de compression.
- **$M_{Ed}$ :** Moment fléchissant de premier ordre.
- **$e_i$ (Excentricité géométrique) :** $l_0 / 400$, représente les imperfections de pose.
- **$e_0$ (Excentricité de charge) :** $M_{Ed} / N_{Ed}$.

---

## 🧮 Méthodes de calcul (v3)

### Résistance de section
La résistance est calculée sur le diagramme d'interaction N-M exact : diagramme
parabole-rectangle du béton (§3.1.7, paramètres du tableau 3.1, y compris au-delà de
C50/60), acier élasto-plastique à palier horizontal (§3.2.7), béton déplacé déduit au
droit des barres comprimées. Les barres sont placées à d' = cnom + Φt + Φl/2.

- Section rectangulaire : 4 barres d'angle, barres intermédiaires réparties sur les faces
  pour égaliser les espacements. Un nombre impair de barres est ramené au nombre pair
  inférieur pour le calcul de résistance.
- Section circulaire : barres régulièrement réparties ; la position la plus défavorable
  est retenue.
- As,req est la section, avec la même disposition, qui rend le taux de travail égal à 1.

### Sollicitations
- Saisie par G et Q : NEd = 1,35 G + 1,5 Q, Ncar = G + Q, Nqp = G + ψ2 Q (EN 1990,
  6.10). Le poids propre (25 kN/m³ × Ac × l) peut être ajouté à G.
- Moments : valeurs absolues en tête et en pied dans chaque plan, avec le type de
  courbure (simple : fibres tendues du même côté ; double : signes opposés).

### Longueur efficace et imperfections
- l0 = β·l, ou éq. 5.15 (contreventé) et 5.16 (non contreventé) à partir de k1 et k2
  (minimum 0,1).
- ei = θi·l0/2, θi = αh·αm/200, αh = 2/√l (2/3 ≤ αh ≤ 1), αm = 1.

### Fluage (§5.8.4 et annexe B)
- φ(∞,t0) = φRH·β(fcm)·β(t0), h0 = 2Ac/u, t0 corrigé selon la classe de ciment.
- φef = φ(∞,t0)·M0Eqp/M0Ed, avec M0Eqp/M0Ed ≈ Nqp/NEd.
- φef = 0 si φ(∞,t0) ≤ 2, λ ≤ 75 et M0Ed/NEd ≥ h (vérifié dans chaque direction).

### Second ordre (courbure nominale, §5.8.8)
Chaque direction est traitée séparément :
- λ = l0 / i avec i = h/√12 dans la direction considérée ;
- λlim = 20·A·B·C/√n, A = 1/(1 + 0,2 φef), B = √(1 + 2ω), C = 1,7 − rm ;
- M02 = |M|max + N·ei, M01 = ±|M|min + N·ei (signe négatif en double courbure),
  rm = M01/M02, ou rm = 1 (non contreventé, imperfections ou charges transversales
  prépondérantes) ;
- 1/r0 = εyd / (0,45 d), d = h/2 + is ;
- Kr = (1 + ω − n)/(1 + ω − 0,4) ≤ 1 ; Kφ = 1 + β φef, β = 0,35 + fck/200 − λ/150 ;
- e2 = Kr·Kφ·(1/r0)·l0²/c, c = 8 si le moment du premier ordre est constant, sinon 10 ;
- M0e = max(0,6 M02 + 0,4 M01 ; 0,4 M02) ;
- MEd = max(M02 ; M0e + N·e2 ; M01 + 0,5 N·e2 ; N·e0,min), e0,min = max(h/30 ; 20 mm).

### Ancrages et recouvrements (§8.4, §8.7)
- fbd = 2,25·η1·η2·fctd, fctd = 0,7·fctm/γc (fck plafonné à 60 MPa), η1 = 1 ou 0,7.
- lb,rqd = (Φ/4)·fyd/fbd ; lbd = α2·lb,rqd ≥ lb,min, α2 = 1 − 0,15(cd − Φ)/Φ pour les
  barres tendues (0,7 ≤ α2 ≤ 1), α1 = α3 = α5 = 1.
- l0 = α2·α6·lb,rqd ≥ l0,min = max(0,3 α6 lb,rqd ; 15Φ ; 200 mm), α6 = √(ρ1/25) entre
  1 et 1,5.
- Les barres sont supposées comprimées en compression simple et tendues en flexion
  composée ou traction (hypothèse enveloppe).

### Cadres
- scl,tmax = min(20 Φl ; plus petite dimension ; 400 mm).
- 0,6 scl,tmax sur la plus grande dimension de la section en tête et en pied, et dans
  les recouvrements si Φl > 14 mm (au moins 3 cadres sur l0).
- Si Φl ≥ 20 mm : ΣAst ≥ As d'une barre sur la longueur de recouvrement.

### Effort tranchant et torsion (§6.2, §6.3)
- Dans chaque plan : bw = dimension perpendiculaire, d = h − d', ρl des barres tendues.
- VRd,c = [CRd,c·k·(100 ρl fck)^(1/3) + 0,15 σcp]·bw·d ≥ (vmin + 0,15 σcp)·bw·d,
  σcp = NEd/Ac ≤ 0,2 fcd.
- VRd,max = αcw·bw·z·ν1·fcd/(cot θ + tan θ), αcw selon σcp ; cot θ est le plus grand
  des valeurs entre 1 et 2,5 respectant VEd/VRd,max + TEd/TRd,max ≤ 1.
- Asw/s = VEd/(z·fyd·cot θ) + 2·TEd/(2·Ak·fyd·cot θ), comparé aux deux brins du cadre
  périphérique.

### Paramètres nationaux
Le sélecteur de l'onglet Matériaux applique l'Annexe nationale française ou les valeurs
recommandées de l'EC2. Il agit sur la modulation de la classe structurale (tableaux 4.3NF
ou 4.3N) et sur l'ouverture de fissure admissible (tableaux 7.1NF ou 7.1N).

### Rigidité nominale (§5.8.7)
- EI = Kc·Ecd·Ic + Ks·Es·Is, Ecd = Ecm/1,2, Ks = 1, Kc = k1·k2/(1 + φef),
  k1 = √(fck/20), k2 = n·λ/170 ≤ 0,20.
- NB = π²·EI/l0² ; MEd = M0e·[1 + β/(NB/NEd − 1)] ≥ M02, β = π²/8 (β = 1 si les
  moments viennent des imperfections ou de charges transversales).

### Recommandations professionnelles (comparaison)
NRd = kh·ks·α·(Ac·fcd + As·fyd), avec α = 0,86/(1 + (λ/62)²) pour λ ≤ 60 et
(32/λ)^1,3 pour 60 < λ ≤ 120 (rectangle) ; α = 0,84/(1 + (λ/52)²) et (27/λ)^1,24
(cercle) ; kh et ks selon le texte. Domaine : compression centrée, structure
contreventée, λ ≤ 120, C20 à C50.

### Résistance au feu (EN 1992-1-2, §5.3.2, méthode A)
R = 120·[(Rηfi + Ra + Rl + Rb + Rn)/120]^1,8 avec Rηfi = 83·[1 − μfi(1 + ω)/(0,85/αcc + ω)],
Ra = 1,6(a − 30), Rl = 9,6(5 − l0,fi), Rb = 0,09·b', Rn = 0 (4 barres) ou 12.
μfi = ηfi = (G + ψfi·Q)/(1,35 G + 1,5 Q) par défaut, ce qui revient à prendre NRd = NEd.

### Fissuration (§7.3.4)
Section fissurée élastique sous Nqp et Mqp (αe = Es/Ec,eff) ;
sr,max = 3,4 c + 0,425·k1·k2·Φ/ρp,eff (ou 1,3(h − x) si les barres sont espacées de plus
de 5(c + Φ/2)) ; εsm − εcm = max{[σs − kt·fctm/ρp,eff·(1 + αe ρp,eff)]/Es ; 0,6 σs/Es}.

### Interface compacte
L'écran se compose de trois zones :
- **à gauche**, le projet et la liste des poteaux (pastille verte, rouge ou orange selon le
  verdict ; double-clic pour renommer ; boutons Nouveau et Dupliquer) ;
- **au centre**, les 4 étapes : Données, Armatures, Vérifications, Documents ;
- **à droite**, le panneau de résultats, toujours visible.

Les options avancées (coefficients, fluage, longueur efficace, effort tranchant, ELS, feu)
sont repliées dans l'étape Données. Le bouton « Proposer » de l'étape Armatures liste les
ferraillages conformes les plus légers. Le projet est sauvegardé automatiquement dans le
navigateur ; l'étape Documents permet de l'enregistrer ou de l'ouvrir en fichier.

### Téléphone et tablette
Sur un écran étroit, le menu du projet s'ouvre par le bouton ☰ en haut à gauche, et les résultats
principaux restent affichés sous l'en-tête ; « Détails » ouvre le panneau complet. L'application
fonctionne hors ligne une fois installée.

### Panneaux repliables et diagnostic
Les panneaux « Options avancées » et « Ancrages et recouvrements » affichent un résumé de leurs
valeurs lorsqu'ils sont fermés, et le nombre de réglages modifiés. Ils s'ouvrent seuls si une
de leurs données est invalide ; le champ fautif est alors encadré en rouge. Leur état ouvert
ou fermé est mémorisé.

En cas d'anomalie, ouvrez « Cartouche et réglages » puis « Diagnostic » et téléchargez le
rapport (version, navigateur, taille d'écran, journal des erreurs) pour le joindre à votre
signalement. Les projets enregistrés avec une version antérieure sont mis à jour
automatiquement ; un bandeau résume les changements et l'original est conservé.

### Note de calcul et cartouche
Le bouton « Cartouche et réglages » (menu de gauche) règle l'identité de l'entreprise (logo,
coordonnées, copyright), le projet, les intervenants, le tableau des révisions et les
mentions. Ces réglages peuvent être enregistrés comme modèle d'entreprise.

À l'étape Documents, « Télécharger la note (PDF) » produit directement la note A4 (poteau actif ou
projet entier) et « Plans A3 (PDF) » les plans de ferraillage, sans passer par la boîte d'impression
du navigateur. « Aperçu à l'écran » ouvre la note paginée dans un nouvel onglet pour relecture.

### Sections de forme quelconque
Hexagone, demi-cercle, quart de cercle, L, T et croix sont calculés dans leurs axes
principaux d'inertie (plan I : inertie forte, plan II : inertie faible). Les moments se
saisissent dans ces plans. Une barre est exigée dans chaque angle ; les sections en L, T et
croix reçoivent un cadre par rectangle composant.

### Plan et export DXF
L'onglet « Plan & Export DXF » produit un plan A3 (coupe, élévation, nomenclature,
cartouche ISO 7200) exportable en DXF R12 (calques S-COFF-CONTOUR, S-ARMA-LONG,
S-ARMA-CADRE, S-COTE, S-TEXTE, S-AXE, S-CADRE-PLAN) et en SVG.

### Flexion déviée (§5.8.9)
Si les critères 5.38a et 5.38b ne sont pas satisfaits, la relation
(MEdz/MRdz)^a + (MEdy/MRdy)^a ≤ 1 est vérifiée, les imperfections étant appliquées
dans la seule direction la plus défavorable.

### Enrobage (§4.4.1)
cnom = max(cmin,b ; cmin,dur ; 10 mm) + Δcdev, mesuré au nu des cadres, avec cmin,dur
selon le tableau 4.4N et cmin,b = max(Φt ; Φl − Φt). Pour XF et XA, la valeur retenue
est indicative (voir l'Annexe nationale).

### ELS (§7.2)
- σc,qp = Nqp / (Ac + (αe − 1)·As), αe = Es/Ec,eff, Ec,eff = Ecm/(1 + φ) : ≤ 0,45 fck.
- σc,car = Ncar / (Ac + (αe − 1)·As), αe = Es/Ecm : ≤ 0,6 fck en classes XD, XS et XF.
- L'ouverture des fissures est calculée séparément (voir Fissuration).

### Limites
- Calcul d'armatures limité aux sections rectangulaires et circulaires.
- Section circulaire traitée par un carré de même aire pour l'effort tranchant.
- Une seule longueur efficace pour les deux directions.

| Paramètre | Formule EC2 |
| :--- | :--- |
| Résistance de calcul du béton | fcd = αcc · fck / γc |
| Résistance de calcul de l'acier | fyd = fyk / γs |
| Ferraillage minimal | As,min = max(0,10 NEd/fyd ; 0,002 Ac) |
| Ferraillage maximal | As,max = 0,04 Ac hors recouvrement |
| Espacement des cadres | scl,tmax = min(20 Φl ; b ; 400 mm), × 0,6 aux extrémités et recouvrements |

---

## 📖 Glossaire Technique

- **ELU :** État Limite Ultime - Sécurité des personnes et de l'ouvrage.
- **Flambement :** Instabilité provoquée par la compression d'un élément long.
- **Fluage ($\phi_{ef}$) :** Déformation différée du béton sous charge constante.
- **HA :** Haute Adhérence (Aciers nervurés).
- **MSd :** Moment total de calcul intégrant le second ordre.

---

## ⚠️ Avertissement Légal (S.E.L.)
Les résultats fournis par cet outil sont donnés à titre indicatif pour pré-dimensionnement. Toute étude d'exécution doit faire l'objet d'une note de calcul officielle validée par un **Bureau de Contrôle** ou un **Ingénieur Conseil** agréé. Structural & Engineering Labs décline toute responsabilité en cas d'utilisation non conforme.

---
*© 2026 Structural & Engineering Labs - Expertise Digitale pour le Génie Civil*
