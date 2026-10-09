# Registre des écarts

Gravité : **critique** (résultat non sécuritaire ou faux), **majeur** (non-conformité normative,
document inexploitable), **mineur** (présentation, confort, cas marginal).

## Lot 1 — normes, formules, validation (v3.6.0)

| N° | Gravité | Constat | Référence | Correction | Contrôle | Statut |
|---|---|---|---|---|---|---|
| E1 | Majeur | Tolérance d'exécution Δcdev réglée par défaut à 5 mm : la valeur recommandée (et retenue en France) est 10 mm ; 5 mm suppose une assurance qualité. Enrobage sous-estimé de 5 mm. | §4.4.1.3 | Défaut porté à 10 mm ; avertissement si Δcdev < 10 mm | Test E1 | Clos |
| E2 | Mineur | Tableau 4.3N : XS2 rangé avec XD2 (seuil C40/50) au lieu de la colonne XD3/XS2/XS3 (C45/55). | tab. 4.3N | Seuils définis par classe d'exposition | Test E2 | Clos |
| E3 | Majeur | Avec charges transversales, le moment équivalent M0e (5.32) était encore appliqué alors qu'il est réservé aux éléments sans charge transversale : moment sous-estimé. | §5.8.8.2(2) | M0e = M02 (moment maximal saisi) si charges transversales | Test E3 | Clos |
| E4 | Mineur | Tableau 4.3NF : XA1 à XA3 non rattachées aux colonnes XD/XS de l'Annexe française. | tab. 4.3NF | Seuils par classe, XA incluses | Test E4 | Clos |
| E5 | Mineur | Commentaire d'en-tête du moteur obsolète (formes « non calculées »). | — | Réécrit, renvoi à la matrice | — | Clos |
| E6 | Majeur | Fissuration : k3 = 3,4 appliqué en toute situation ; l'Annexe française impose k3 = 3,4·(25/c)^(2/3) pour c > 25 mm et ne retient (7.14) que si plus défavorable. | §7.3.4(3) et AN | Paramètre national appliqué selon l'annexe choisie | C2, tests fissuration | Clos |
| E7 | Majeur | Feu : ηfi calculé avec ψ2,1 ; en France, la valeur à utiliser est ψ1,1 (plus défavorable). | EN 1991-1-2 §4.3.1(2) et AN | ψ1 saisi (catégorie d'usage), utilisé en mode AN France | Test feu | Clos |
| E8 | Mineur | Fluage : correction de l'âge par la température (B.10) non prise en compte ; pertinente en climat chaud (Cameroun). | annexe B | Température moyenne paramétrable (20 °C par défaut) | Test B.10 | Clos |
| E9 | Mineur | Aire et inertie affichées pour L, T et croix calculées sur un contour différent de celui du calcul lorsque la table est plus étroite que l'âme. | — | Propriétés issues du même polygone | Test E9 | Clos |
| E10 | Mineur | Aide intégrée de l'interface détaillée : valeurs et formules héritées de la v2 (αcc = 0,85 par défaut, C30/36, MSd, ei = l0/400). | — | Textes corrigés | Relecture | Clos |
| E11 | Majeur | Aucune validation des saisies : dimensions nulles ou négatives, espacement nul, etc. produisaient des résultats incohérents sans alerte. | — | `validateInputs` ; verdict « non vérifié » et liste des données à corriger | Test E11, test de robustesse | Clos |
| E12 | Mineur | Numéro de version affiché « v2.0.4 » dans l'interface détaillée. | — | Version unique `src/version.ts` (3.6.0) | — | Clos |
| E13 | Mineur | Performances : sections polygonales 3 à 9 fois plus lentes (recalcul de la largeur à chaque pas d'intégration). | — | Largeurs précalculées et interpolées ; résultats identiques | Temps : T 46 → 14 ms ; demi-cercle 129 → 14 ms | Clos |
| E14 | Mineur | Arcs des demi- et quart de cercle approchés par 32 et 48 segments (écart d'inertie 0,1 %). | — | 90 et 120 segments | G1, tests | Clos |

## Lot 2 — note de calcul et paramétrage (v3.7.0)

| N° | Gravité | Constat | Correction | Statut |
|---|---|---|---|---|
| D1 | Majeur | Note sans sommaire, listes, numérotation des équations, tableaux et figures, ni pagination « n / N ». | Nouvelle note paginée (Paged.js) | Clos |
| D2 | Majeur | Équations sans application numérique ni renvoi systématique à l'article. | Forme littérale, valeurs, résultat, unité et article pour chaque équation | Clos |
| D3 | Majeur | Pas de tableau des révisions, ni de champs vérificateur et approbateur, ni de zone de visa. | Page de garde complète | Clos |
| D4 | Mineur | Identité (logo, copyright, mentions) à ressaisir pour chaque projet. | Modèle d'entreprise | Clos |
| D5 | Mineur | Diagramme d'interaction absent des justifications. | Figure par direction avec le point de calcul | Clos |
| D6 | Mineur | La note de l'interface détaillée (ancienne présentation) reste accessible. | Redirigée vers la nouvelle note, ancien code supprimé (lot 4, E3) | Clos |
| D7 | Mineur | Logo non repris dans le cartouche du DXF (le format R12 ne gère pas les images simplement). | Voir L3-6 | Clos (lot 3) |

## Lot 3 — dessins et DXF (v3.10.0)

| N° | Gravité | Constat | Correction | Statut |
|---|---|---|---|---|
| L3-1 | Majeur | Coupe sans cotes de position des barres : implantation non exécutable sur chantier. | Cotes en chaîne sur deux faces (parement → barres → parement) ; diamètre du cercle des axes pour les sections circulaires | Clos |
| L3-2 | Mineur | Béton en coupe non hachuré. | Hachures à 45° en trait fin (calque S-COFF-HACH) | Clos |
| L3-3 | Majeur | Nomenclature sans forme ni dimensions de façonnage ; un seul type de cadre même pour L, T, croix. | Croquis de forme, dimensions (axes, crochets), longueur développée et masse par type de barre ; un cadre par contour | Clos |
| L3-4 | Mineur | Longueur de recouvrement et premier cadre non cotés en élévation. | Cotes ajoutées | Clos |
| L3-5 | Majeur | Cartouche DXF en textes libres : non modifiable proprement dans un logiciel de DAO. | Bloc CARTOUCHE à 10 attributs (ATTDEF/ATTRIB) | Clos |
| L3-6 | Mineur | Logo absent du plan (écart D7). | Image dans le SVG et la note ; zone réservée dans le DXF ; export ZIP avec le logo | Clos (limite du format R12) |
| L3-7 | Mineur | Épaisseurs de trait non définies pour l'impression du DXF. | Table de correspondance couleur → épaisseur (docs/DESSINS.md) | Clos |
| L3-8 | Info | Ouverture non testée dans AutoCAD, BricsCAD, LibreCAD, DraftSight (logiciels indisponibles dans l'environnement d'audit) ; relecture `ezdxf` sans erreur et rendu graphique vérifié. | Essai sur poste à réaliser | Ouvert |

## Écarts ouverts ou hypothèses à arbitrer

| N° | Gravité | Constat | Action proposée | Lot |
|---|---|---|---|---|
| R-01 | Majeur | Aucun exemple **publié** complet n'a pu être rejoué : la validation repose sur des calculs manuels et des modèles indépendants. | Fournir 5 à 10 notes de calcul de référence (logiciel commercial ou calcul manuel vérifié) à intégrer au cahier de validation. | 1 (complément) |
| R-02 | Majeur | Paramètres nationaux non vérifiés sur le **texte officiel** de l'Annexe française : λlim (5.8.3.1), As,min, Φmin, scl,tmax, emax feu, k1/k2 (7.2), valeurs de ψ. | Contrôle sur l'exemplaire AFNOR de NF EN 1992-1-1/NA, NF EN 1992-1-2/NA et NF EN 1990/NA. | 1 (complément) |
| R-03 | Mineur | Hypothèses de calcul : M0Eqp/M0Ed ≈ Nqp/NEd ; une seule longueur efficace pour les deux directions ; μfi = ηfi ; carré équivalent pour l'effort tranchant circulaire ; barres tendues pour l'ancrage en flexion ; axe neutre parallèle à l'axe principal (sections dissymétriques) ; dg ≤ 32 mm. | Signalées dans la note ; certaines peuvent être levées (l0 par direction, Mqp saisi). | 2 |
| R-04 | Mineur | Unités et séparateurs décimaux hétérogènes dans l'interface détaillée (cm et mm, point et virgule). | Clos : interface supprimée en v3.12. | — |
| R-05 | Mineur | Effort tranchant, feu et fissuration non traités pour les formes non rectangulaires ni circulaires. | Extension ou blocage documenté. | 3 |
| R-06 | Info | EN 1992-1-1:2023 (seconde génération) non implémentée ; retrait de la première génération prévu le 30 mars 2028. | Module par génération, sélecteur de référentiel. | Ultérieur |

## Historique — écarts corrigés dans les versions 3.0 à 3.5

| N° | Gravité | Constat initial | Version |
|---|---|---|---|
| H1 | Critique | Section d'acier en flexion composée sous-estimée (jusqu'à 0 cm² au lieu de 13 cm²). | 3.0 |
| H2 | Critique | Second ordre calculé autour de l'axe fort au lieu de l'axe faible. | 3.0 |
| H3 | Critique | Formes non rectangulaires déclarées conformes sur la seule base de As,min. | 3.0 puis 3.4 |
| H4 | Majeur | Vérifications ELS fictives (wk constant). | 3.0 |
| H5 | Majeur | Tableau 4.4N erroné, cmin,b absent, libellés de classes de béton faux. | 3.0 |
| H6 | Majeur | Limite 0,6 fck comparée sous combinaison quasi-permanente. | 3.1 |
| H7 | Majeur | Minimum de 6 barres en section circulaire au lieu de 4. | 3.4 |
