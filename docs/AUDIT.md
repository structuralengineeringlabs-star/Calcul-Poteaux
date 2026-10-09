# Audit de l'application « Dimensionnement des poteaux aux Eurocodes »

Version auditée : 3.4 (septembre 2026). Ce document fait le point sur l'état de l'application,
propose une interface compacte et fixe la feuille de route vers un outil professionnel.

## 0. Avancement de l'audit

| Lot | Axes | État | Livrables |
|---|---|---|---|
| 1 | Normes, formules et unités, validation numérique | Fait (v3.6.0) | `audit/MATRICE_NORMATIVE.md`, `audit/REGISTRE_FORMULES.md`, `audit/CAHIER_VALIDATION.md`, `audit/REGISTRE_ECARTS.md` |
| 2 | Note de calcul, paramétrage | Fait (v3.7.0) | `src/note/note.ts`, réglages du cartouche |
| 3 | Dessins et DXF | Fait (v3.10.0) | `docs/DESSINS.md`, registre des écarts L3-1 à L3-8 |
| 4 | Ergonomie, manuel | Fait (v3.11.0) | `docs/manuel/` (Markdown, PDF), aide contextuelle, registre des anomalies (E1 à E6) |
| 5 | Qualité logicielle | En continu | — |
| Correctif | Panneaux repliables (A), robustesse (D) | Fait (v3.8.0) | `audit/REGISTRE_ANOMALIES_FONCTIONNELLES.md` (recette reprise par les tests de bout en bout) |
| Décision | Suppression de l'interface détaillée | Fait (v3.12.0) | Journal des modifications |
| Correctif | Audit de la note de calcul (PDF direct, plans A3) | Fait (v3.13.0) | Registre des anomalies, section « Audit de la note » |
| Correctif | Audit fonctionnel (B), compatibilité (C) | Fait (v3.9.0) | `audit/INVENTAIRE_COMMANDES.md`, `audit/MATRICE_COMPATIBILITE.md`, `tests/e2e/` |

## 1. Synthèse

| Domaine | État | Actions de cette version | Reste à faire |
|---|---|---|---|
| Formes de section | Toutes calculées | Modèle polygonal générique, axes principaux, validation indépendante | Effort tranchant, feu et fissuration des formes non rectangulaires |
| Navigation | Menu latéral fixe, barre de synthèse permanente | Fait | Refonte compacte (§4) |
| Normes | EN 1992-1-1:2004, NF EN 1992-1-1/NA, EN 1992-1-2 | Correction §9.5.2(4) (cercle ≥ 4 barres) | Préparer la 2e génération (§5) |
| Équations et unités | 59 tests, dont 25 contrôles manuels ou croisés | Notation MEd au lieu de MSd | Couverture des cas limites (§6) |
| Schémas | Aperçu réel, plan A3 normalisé | Remplacement de l'aperçu factice | Cotes de positionnement des barres, hachures (§7) |
| Documents | Note de calcul imprimable | Figure de coupe dans la note | Note structurée, manuel illustré (§8) |
| Export DXF | DXF R12 validé | Fait | Blocs d'attributs pour le cartouche |

## 2. Formes de section (point 1)

Toutes les formes (rectangle, cercle, hexagone, demi-cercle, quart de cercle, L, T, croix)
sont calculées par le même moteur :

- contour polygonal exact, nettoyé (sommets confondus ou alignés) ;
- repère au centre de gravité, rotation dans les axes principaux d'inertie (L, quart de cercle) ;
  la direction « h » porte l'inertie forte ;
- barres placées sur le contour intérieur (enrobage d'axe d'), une par angle (§9.5.2(4)),
  puis dans les plus grands intervalles ;
- cadres : un cadre périphérique, ou un cadre par rectangle composant pour L, T et croix
  (pas d'angle rentrant dans un même cadre) ;
- résistance par intégration de la largeur de section (cordes) avec la loi
  parabole-rectangle ; pour une section non symétrique, la plus faible résistance des deux
  sens de moment est retenue ;
- second ordre, flexion déviée (heq = i·√12) et dispositions constructives dans les axes
  principaux.

Validations automatiques :
- un T dont la table a la largeur de l'âme donne exactement les résultats du rectangle
  équivalent (6 cas) ;
- un T non symétrique est comparé à un modèle à fibres Python indépendant (écart < 0,2 %) ;
- l'hexagone est isotrope, l'inertie faible du L et du quart de cercle correspond aux
  formules exactes.

Limites : axe neutre supposé parallèle à l'axe principal (hypothèse courante, légèrement
non conservatrice pour les sections très dissymétriques) ; effort tranchant, feu (méthode A)
et fissuration réservés aux sections rectangulaires ou circulaires, ce que l'application signale.

## 3. Mise en forme et navigation (points 2 et 3)

- Menu latéral fixe (sticky) avec défilement propre.
- Barre de synthèse permanente en haut de la zone de travail : verdict, section, NEd, MEd, λ,
  taux de travail, As requis et fourni, nombre d'avertissements.
- En-tête réduit (le titre de l'application passe de 30 à 14 px).
- L'encart « Aperçu réel section », qui chevauchait l'en-tête et ne dessinait pas les
  vraies positions de barres, est remplacé par le dessin calculé.
- Nouvel onglet « Plan & Export DXF ».

## 4. Proposition d'interface compacte (point 4)

### Diagnostic
L'application affiche aujourd'hui une cinquantaine de champs et une centaine de résultats
répartis sur sept onglets, avec une présentation « carte par carte » qui laisse beaucoup de
vide (cartes à moitié remplies) et répète les mêmes résultats à plusieurs endroits.
L'utilisateur courant n'a besoin que d'une quinzaine de données.

### Principes
1. **Trois niveaux de détail** : *Essentiel* (visible), *Avancé* (replié), *Expert* (réglages
   de projet). Environ 15 champs essentiels suffisent pour 90 % des poteaux de bâtiment.
2. **Un seul endroit pour les résultats** : un panneau de droite permanent, qui remplace les
   cartes « Résultats analyse » dispersées.
3. **Parcours en 4 étapes** au lieu de 7 onglets.
4. **Saisie en tableau dense** (libellé, valeur, unité sur une ligne de 32 px) plutôt qu'en cartes.
5. **Justification à la demande** : chaque résultat s'ouvre sur son détail (formule,
   valeurs, article de norme) au lieu de tout afficher.

### Maquette (écran 1440 × 900)

```
┌───────────┬───────────────────────────────────────────┬──────────────────────────┐
│ LOGO      │ ① Données  ② Armatures  ③ Vérifications  ④ Documents │ ✓ CONFORME   taux 0,54 │
│           ├───────────────────────────────────────────┤ ┌──────────────────────┐ │
│ Projet    │ Section   [Rect ▾] b [30] h [40] cm       │ │   dessin de section  │ │
│ P1 · R+1  │ Hauteur   l [3,50] m  Structure [Contr.▾] │ │   (SVG réel)         │ │
│           │ Béton     [C30/37▾]  Acier [B500▾]  [XC4▾]│ └──────────────────────┘ │
│ Poteaux   │ Charges   G [700] Q [370] kN   ψ2 [0,3]   │ As req  3,45 / 8,04 cm²  │
│ ▸ P1  ✓   │ Moments   tête [80] pied [40] kNm [simple▾]│ MEd     44,9 kNm         │
│ ▸ P2  ✗   │ ▸ Avancé : fluage, l0 par k1/k2, γ, αcc…  │ λ / λlim 40,4 / 16,5     │
│ + Ajouter │                                           │ Feu     R120 ≥ R60 ✓     │
│           │                                           │ ⚠ 2 avertissements       │
│ ⚙ Réglages│                                           │ [Note PDF] [DXF]         │
└───────────┴───────────────────────────────────────────┴──────────────────────────┘
```

Étapes :
- **① Données** : géométrie, matériaux, charges (G/Q ou valeurs ELU), moments d'extrémité.
  Le reste (fluage, αcc, γ, classe structurale, Annexe) passe en « Avancé ».
- **② Armatures** : choix des barres et cadres avec suggestions automatiques
  (« 4 HA14 suffisent, 4 HA16 retenus ») ; ancrages et recouvrements en « Avancé ».
- **③ Vérifications** : une liste unique de contrôles (ELU, second ordre, flexion déviée,
  effort tranchant, dispositions, ELS, feu, fissuration), chacun dépliable vers sa justification.
- **④ Documents** : note de calcul, plan, exports.

Gains attendus : écran principal sans défilement, moitié moins de clics pour un poteau
courant, et possibilité de traiter **plusieurs poteaux dans un même projet** (liste à gauche),
fonction indispensable en bureau d'études.

## 5. Audit des normes

| Référence | Utilisation | Statut |
|---|---|---|
| NF EN 1992-1-1:2005 (EN 1992-1-1:2004 + AC:2010 + A1:2014) | Calcul général | Référence en vigueur jusqu'au 30 mars 2028 |
| NF EN 1992-1-1/NA:2016-03 | Paramètres nationaux (tableaux 4.3NF, 7.1NF…) | Implémenté (sélecteur) |
| NF EN 1992-1-2 + NA | Feu, méthode A | Implémenté |
| NF EN 1990 + NA | Combinaisons 6.10, ψ2 | Implémenté (charges G, Q) |
| NF EN 206/CN | Classes d'exposition, composition | Annexe E utilisée à titre indicatif |
| Recommandations professionnelles FFB (2007) | Méthode simplifiée | Comparaison uniquement |
| EN 1992-1-1:2023 (2e génération) | — | Non implémenté |
| ISO 5457, 7200, 3098, 129-1, 3766, 4066, 13567 | Dessins | Appliquées au plan (§7) |

**Deuxième génération.** Le calendrier européen fixe la mise à disposition des textes au
30 mars 2026, la publication nationale au 30 septembre 2027 et le retrait de la première
génération au 30 mars 2028. Recommandation : isoler dès maintenant les formules dans des
modules par génération (`ec2-2004`, `ec2-2023`) avec un sélecteur de référentiel, et
démarrer l'implémentation 2023 dès la parution de l'Annexe nationale française.

**Correction faite** : le minimum de barres en section circulaire est de 4 (§9.5.2(4)),
et non 6 comme dans la v3 ; 6 barres restent l'hypothèse de la méthode simplifiée des
Recommandations professionnelles.

## 6. Audit des équations et des unités

Principe : unités internes N, mm, MPa ; conversion aux interfaces (kN, kNm, cm, cm², m).
Chaque formule est rattachée à son article dans le code.

Formules contrôlées par test automatique (calcul manuel ou référence indépendante) :
résistance N-M (Python indépendant), compression centrée, fluage annexe B, longueurs
efficaces 5.15/5.16, αh, M0e et MEd, ancrage et recouvrement, VRd,c et VRd,max, feu
(éq. 5.7), méthode RP, rigidité nominale (EI, NB), fissuration (x, σs, sr,max, wk),
propriétés des polygones (A, I, axes principaux).

Points relevés :
1. Notation « MSd » (héritée du BAEL/ENV) remplacée par MEd, conformément à l'EC2.
2. Le résultat « M total » mélange les deux directions : il affiche désormais la direction
   déterminante, avec le détail par direction.
3. Cohérence des unités affichées : les excentricités sont en cm dans la carte de résultats
   mais en mm dans le tableau par direction. À harmoniser en mm (recommandation ISO 80000).
4. Séparateur décimal : virgule dans le plan et la note, point dans certaines valeurs
   d'interface. À harmoniser (virgule, usage français).

## 7. Audit des schémas et dessins

Avant : l'aperçu de section était un dessin fixe (barres placées à des pourcentages
arbitraires, sans lien avec le calcul), sans échelle ni cotes.

Maintenant : un modèle de dessin unique alimente l'aperçu, la note et le plan.
- Format A3 paysage, cadre avec marge de reliure (ISO 5457).
- Cartouche 180 × 50 mm avec les champs de l'ISO 7200 : propriétaire, titre, type de
  document, numéro d'identification, révision, date, auteur, approbateur, échelles, format.
- Représentation simplifiée des armatures (ISO 3766) : barres en coupe en disques pleins,
  cadres en trait continu, repères cerclés.
- Cotation ISO 129-1 : lignes d'attache, flèches obliques, cotes en mm.
- Écritures ISO 3098 : 2,5 / 3,5 mm.
- Échelles de la série normalisée (1:5, 1:10, 1:20, 1:25, 1:50…).
- Nomenclature des aciers (ISO 4066 simplifiée) : repère, désignation, Φ, nombre, longueur,
  masse.
- DXF R12 (AC1009) validé sans erreur par `ezdxf`, calques inspirés de l'ISO 13567
  (couleur et type de trait par calque).

Reste à faire : cotes de position des barres et des cadres, codes de forme ISO 4066 pour
les façonnages, hachure béton en coupe, logo dans le cartouche du DXF (bloc image),
bloc d'attributs de cartouche pour la mise à jour dans le logiciel de DAO.

## 8. Audit des documents

### Note de calcul — structure cible
1. Page de garde : cartouche complet, logo modifiable, visa, indice de révision et
   tableau des révisions.
2. Sommaire automatique, **liste des figures**, **liste des tableaux**, **liste des équations**.
3. Hypothèses et références normatives (avec l'Annexe nationale retenue).
4. Données : matériaux, géométrie, actions et combinaisons.
5. Calculs numérotés par section (5.1, 5.2…), équations numérotées (Éq. 5.3) avec renvoi à
   l'article EC2, valeurs numériques substituées, unités.
6. Vérifications ELU, ELS, feu, dispositions, avec tableau récapitulatif.
7. Plan et nomenclature en annexe.
8. Pied de page : copyright, numéro de page « n / N », référence du document.

Techniquement : génération HTML paginée (CSS Paged Media) avec compteurs CSS pour les
numéros de figures, tableaux et équations, puis export PDF.

### Manuel d'utilisation
- Structure : prise en main, parcours type pas à pas, référence des champs, méthodes de
  calcul (reprise de MANUAL.md), foire aux questions, glossaire.
- **Captures d'écran générées automatiquement** par un script Playwright à chaque version,
  pour qu'elles restent à jour.

### Paramétrage
- Cartouche, en-tête et pied de page configurables : raison sociale, adresse, logo
  (import d'image, déjà disponible dans Paramètres), mentions de copyright.
- Sauvegarde et chargement de projets (fichier JSON) et de modèles d'entreprise.

## 9. Feuille de route proposée

| Phase | Contenu |
|---|---|
| A (faite, v3.4) | Toutes formes calculées, menu fixe, barre de synthèse, aperçu réel, plan A3, DXF |
| B (faite, v3.5) | Interface compacte en 4 étapes, panneau de résultats, projets multi-poteaux, sauvegarde JSON |
| C | Note de calcul structurée (sommaire, listes, équations numérotées, PDF) et cartouche paramétrable complet |
| D | Manuel illustré avec captures automatiques, aide contextuelle champ par champ |
| E | Compléments dessin (cotes de barres, codes de forme, blocs DXF), effort tranchant des formes générales |
| F | Référentiel EC2 2e génération |
