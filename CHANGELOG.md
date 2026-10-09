# Journal des modifications

## v4.7.1 — Intégration au site sel-apps

- Correction : en mode acier ou bois, la pastille de verdict de l'en-tête affichait le résultat béton armé ; elle
  suit désormais le matériau actif (verdict et taux de travail maximal). Libellé « Poids propre de l'élément ».
- Favicon relatif à la base de publication (`%BASE_URL%`) ; construction pour le site : `npx vite build --base /tools/poteaux/ --outDir dist-sel`.
- Validation : 127 tests unitaires, cahier béton armé 22 / 22 inchangé, 84 tests de bout en bout.

## v4.7.0 — Poteaux en IPN ; catalogue de référence analysé

- Poteaux métalliques en IPN (valeurs tabulées du catalogue fourni ; Wpl, It, Iw estimés de façon sécuritaire).
- Comparaison du catalogue fourni (`docs/audit/COMPARAISON_CATALOGUE.md`, partagé avec les poutres) ;
  `@sel/eurocodes` 1.6.0 (familles IPN, UPN, UAP, cornières).
- Validation : 127 tests unitaires, cahier béton armé 22 / 22 inchangé, tests de bout en bout.

## v4.6.0 — Déversement : Mcr par Rayleigh-Ritz

- Poteaux métalliques fléchis : Mcr calculé par la méthode de Rayleigh-Ritz sur le diagramme linéaire des moments
  d'extrémité (au lieu du coefficient C1 approché), validé dans le cahier de l'application poutres (cas DV1 à DV4).
- `@sel/eurocodes` 1.5.0. Validation : 125 tests unitaires, cahier béton armé 22 / 22 inchangé, 80 tests de bout en bout.

## v4.5.0 — Plans A3 des poteaux métalliques et en bois

- Planche A3 : élévation à l'échelle (pied ±0,00, tête, longueur), coupe de la section à l'échelle (profilé en I,
  PRS, tube rond ou rectangulaire ; bois avec section résiduelle au feu), liste des éléments (masse ou volume),
  notes (résultats principaux, éléments hors note), cartouche ; aperçu, impression A3 paysage (plan seul), SVG et
  DXF R12 (contrôlé sans erreur par ezdxf).
- Module commun `@sel/plans` (primitives, cartouche, SVG, DXF) partagé avec l'application poutres.
- Validation : 125 tests unitaires, cahier béton armé 22 / 22 inchangé, 80 tests de bout en bout (plans et DXF
  vérifiés en acier et en bois).

## v4.4.0 — Notes de calcul acier et bois structurées

- Les notes des poteaux métalliques et en bois reprennent le gabarit commun avec les poutres (`NoteStructuree`) :
  page de garde avec cartouche, verdict et révisions, sommaire, listes des figures, tableaux et équations,
  équations numérotées avec leurs valeurs (flambement, torsion, déversement, coefficients kij et équations 6.61
  et 6.62 ; kc et équations 6.23, 6.24, 6.35 ; feu), périmètre, annexe des données, empreinte, pagination n / N.
- Correction : à l'impression d'une note acier ou bois, l'interface (barre latérale, boutons) s'imprimait aussi ;
  la note s'affiche désormais seule. Correction du libellé « undefined » dans la liste des poteaux tant que le
  profilé n'avait pas été modifié. Sous-titre de l'application mis à jour (béton armé, acier, bois).
- Validation : 125 tests unitaires, cahier béton armé 22 / 22 inchangé, 80 tests de bout en bout.

## v4.3.0 — Poteaux tubulaires

- Catalogue étendu aux tubes finis à chaud (EN 10210-2) : 14 CHS, 13 SHS, 7 RHS ; propriétés calculées depuis la
  géométrie avec les rayons d'angle de calcul (ro = 1,5t, ri = t), constante de torsion de l'annexe B.
- Poteaux tubulaires : classification des tubes (tableau 5.2), courbe de flambement a (a0 en S460), sans
  flambement par torsion ni déversement (sections fermées), interaction de flexion composée selon le tableau B.1.
- `@sel/eurocodes` 1.4.0. Validation : 125 tests unitaires (dont flambement d'un CHS contre calcul manuel),
  cahier béton armé 22 / 22 inchangé, 80 tests de bout en bout.

## v4.2.0 — Poteaux en bois (EN 1995)

- Matériau « bois » par poteau : classes EN 338:2016 et EN 14080:2013, section rectangulaire b × h.
- Compression et flambement selon y et z (λrel, kc), flexion composée (éq. 6.23 et 6.24, km = 0,7), déversement en
  présence de compression (éq. 6.35), kmod des combinaisons G seul (permanente) et G + Q (durée choisie),
  classe de service, feu par section réduite sur 4 faces (R30 à R90).
- Charges partagées avec l'acier (G et Q ou NEd ; NEd direct traité comme permanent, sécuritaire), note imprimable,
  métré (m³, kg) ; `@sel/eurocodes` 1.3.0 (module `ec5`).
- Validation : 122 tests unitaires (dont kc contre calcul manuel), cahier béton armé 22 / 22 inchangé,
  76 tests de bout en bout (dont 4 bois).

## v4.1.0 — Poteaux métalliques (EN 1993)

- Choix du matériau par poteau : béton armé (inchangé) ou acier. Les poteaux d'un même projet peuvent mélanger
  les deux ; le format de projet reste compatible (champs facultatifs `materiau` et `acier`).
- Profilés du catalogue commun (IPE, HEA, HEB, HEM, propriétés avec congés) ou PRS bisymétrique ; nuances S235 à S460.
- Vérifications : classification en compression (tableau 5.2), résistance de section (§6.2.9), flambement par flexion
  selon y et z avec les courbes du tableau 6.2 (laminés, soudés, S460), flambement par torsion (§6.3.1.4),
  déversement (C1 du diagramme linéaire), flexion composée par la méthode 2 (annexe B, tableaux B.1 à B.3,
  équations 6.61 et 6.62), température critique (EN 1993-1-2, information).
- Charges : G et Q (1,35G + 1,5Q) ou NEd direct, poids propre du profilé, moments d'extrémité selon les deux axes
  avec type de courbure ; longueurs de flambement βy, βz, βT ; maintien contre le déversement.
- Étapes adaptées (Données, Paramètres, Vérifications, Documents), bandeau de résultats acier, note imprimable, métré.
- Validation : 119 tests unitaires (dont 6 poteaux acier, flambement contre calcul manuel), cahier béton armé 22 / 22
  inchangé, 72 tests de bout en bout (dont 8 acier).

## v4.0.2

- Bibliothèque commune `@sel/eurocodes` 1.2.0 : catalogue des profilés laminés IPE, HEA, HEB, HEM (préparation des poteaux métalliques) ; sans effet sur les résultats.
- Kit d'aperçu Windows (Apercu.cmd, apercu.ps1, apercu-tout.ps1).

## v4.0.1

- Bibliothèque commune `@sel/eurocodes` 1.1.0 (ajout du module `ec3` pour l'acier, utilisé par les poutres ; sans effet sur les poteaux, résultats inchangés).

## v4.0.0 — Éditeur de section et dimensions en millimètres

- Éditeur interactif de section pour les 8 formes : dessin coté à l'échelle, cotes actives (clic ou Entrée pour
  saisir, flèches ±1 mm, Maj ±10 mm), cotes à glisser (pas de 5 mm), aire, inertie minimale et rayon de giration
  en direct ; synchronisé avec les champs.
- Dimensions de section saisies et affichées en **mm** (comme l'application poutres) : champs, libellés de section,
  note de calcul, messages. Les projets enregistrés restent au même format (dimensions conservées en cm dans le
  fichier) : aucune migration, aucun résultat modifié.
- Bibliothèque commune `@sel/sections` ajoutée (partagée avec les poutres) ; `@sel/eurocodes` inchangée et identique.
- Plan multi-matériaux (décision D1) : l'acier (v4.1) et le bois (v4.2) suivront.
- Validation : 112 tests unitaires, cahier 22 / 22 inchangé, 64 tests de bout en bout (dont 8 pour l'éditeur).

## v3.16.0 — Bibliothèque Eurocode commune

- Les fonctions Eurocode générales proviennent désormais de la bibliothèque commune `src/eurocodes/`
  (@sel/eurocodes 1.0.0), partagée avec l'application « Poutres continues EC2 » : propriétés du béton (tableau 3.1),
  cmin,dur (tableau 4.4N), wmax (tableaux 7.1N et 7.1NF), coefficient de fluage (annexe B), contrainte
  d'adhérence fbd (éq. 8.2).
- Aucun résultat ne change : 2 029 valeurs de contrôle et le cahier de validation (22 / 22) sont identiques
  avant et après ; 110 tests unitaires (dont 3 de la bibliothèque).

## v3.15.0 — Logo S.E.L. partout

- Le logo Structural & Engineering Labs remplace tout autre logo :
  - menu de l'application : logo S.E.L. vectoriel affiché par défaut ;
  - onglet du navigateur : icône S.E.L. (`public/favicon.svg`) et titre « Poteaux EC2 — Structural & Engineering Labs » ;
  - projets enregistrés : logo remplacé une fois par le logo S.E.L. à l'ouverture (format de projet 3),
    original sauvegardé, bandeau d'information ; la raison sociale et les autres réglages sont conservés ;
  - réglages : aperçu du logo en cours, « Choisir un autre logo… », « Rétablir le logo S.E.L. »
    (le bouton « Retirer » est supprimé : il n'y a plus de document sans logo).
- 107 tests unitaires, 56 tests de bout en bout.

## v3.14.0 — Identité Structural & Engineering Labs

- Intégration des éléments fournis (Cartouche_SEL.html, Logo_SEL, Copyright) :
  - logo S.E.L. reproduit en vectoriel (`src/brand/sel.ts`) ; logo par défaut de l'application ;
  - cartouche à trois cellules (logo | projet et référence dossier | rédacteur, date, « NOTE DE CALCUL »
    et sous-titre) en tête de la note PDF et de l'aperçu, version réduite en en-tête de chaque page ;
    version impression du modèle (fond blanc, bordures noires) ;
  - plans : logo dessiné en entités vectorielles dans le cartouche ISO 7200, **y compris dans le DXF**
    (pavé plein en SOLID, calque S-LOGO) — lève la limite « logo absent du DXF » ;
  - coordonnées et copyright par défaut : Structural & Engineering Labs,
    structuralengineeringlabs@gmail.com, +237 651 135 605.
- Réglages : champ « Sous-titre du cartouche », bouton « Identité S.E.L. ».
- Projets existants : l'identité d'exemple est remplacée automatiquement (identité personnalisée conservée).
- Correctif : nom de l'auteur tronqué dans le cartouche des plans.

## v3.13.0 — Note de calcul en PDF direct, plans A3 séparés

- **Note de calcul téléchargée directement en PDF** (A4), produite par l'application (pdfmake) : plus de
  dépendance à la boîte d'impression du navigateur (signalement Edge). Sommaire et listes des figures,
  tableaux et équations avec numéros de page réels ; en-têtes et pieds « Page n / N » ; métadonnées ;
  nom de fichier normalisé ; génération dans un Web Worker (interface non bloquée).
- **Plans de ferraillage en PDF A3 séparé**, une page par poteau, à l'échelle.
- Note : identifiant de calcul (empreinte des données), date de génération, éditions des normes,
  combinaisons ELS détaillées, annexe des données d'entrée de chaque poteau.
- Aperçu à l'écran dans un vrai onglet ; correction de la barre d'outils recopiée sur chaque page.
- Tests : relecture des PDF par pdf.js (concordance du sommaire et des listes, valeurs, métadonnées) ;
  volumétrie 20 poteaux ; 103 tests unitaires.

## v3.12.0 — Suppression de l'ancienne interface détaillée

- L'interface détaillée (ancienne présentation en onglets) est supprimée : toutes ses fonctions
  existent dans l'interface en 4 étapes (données, armatures, vérifications, documents, réglages,
  manuel). Les projets enregistrés sont inchangés.
- Supprimés : `src/App.tsx` (1 473 lignes), le basculement entre interfaces, les styles `neu-*`,
  la dépendance `motion`, les tests correspondants. Écarts R-04 et E6 clos (sans objet).
- Captures et manuel régénérés.

## v3.11.0 — Audit lot 4 : ergonomie et manuel illustré

- Aide contextuelle sur chaque champ de l'interface compacte (bouton « ? ») : définition, valeur
  usuelle, article de norme ; accessible au clavier, fermeture par Échap ou clic extérieur.
- Manuel d'utilisation refondu, source unique (`src/manuel/contenu.ts`) : 15 chapitres (parcours type,
  référence des écrans, documents, projets, réglages, téléphone, méthodes, dépannage, glossaire,
  versions), 12 captures d'écran.
  - manuel intégré à l'application (sommaire, sections illustrées) ;
  - `npm run manuel` régénère les captures, `docs/manuel/MANUEL_UTILISATEUR.md` et
    `docs/manuel/Manuel_utilisateur.pdf`.
- Raccourcis clavier Alt + 1 à Alt + 4 ; message d'accueil à la première visite.
- Interface détaillée renommée « ancienne » : ses onglets Synthèse et Manuel renvoient vers la
  nouvelle note et le nouveau manuel ; ancienne note imprimable et ancien manuel supprimés
  (App.tsx : 2 257 → 1 473 lignes).
- 94 tests unitaires, 57 tests de bout en bout ; inventaire : 257 commandes.

## v3.10.0 — Audit lot 3 : dessins et DXF

- Coupe : hachures du béton (ISO 128-50), cotes en chaîne de position des barres sur deux faces,
  diamètre du cercle des axes pour les sections circulaires.
- Élévation : cote de la longueur de recouvrement et du premier cadre.
- Nomenclature façonnée : croquis de forme, dimensions de façonnage (axes, crochets 135°), longueur
  développée et masse ; un type de cadre par contour (L, T, croix).
- DXF : cartouche en bloc `CARTOUCHE` à 10 attributs modifiables ; zone réservée au logo.
- Logo dans le cartouche du plan SVG et des annexes de la note ; export « DXF + logo (ZIP) ».
- Conventions de dessin, calques et épaisseurs d'impression : `docs/DESSINS.md`.
- 94 tests unitaires, 51 tests de bout en bout.

## v3.9.0 — Audit fonctionnel (phase B) et compatibilité (phase C)

- **Correction critique** : une valeur démesurée pouvait faire planter le navigateur ; le calcul se
  poursuit désormais sur des valeurs bornées (verdict « non vérifié ») et la validation impose des
  bornes supérieures (barres, dimensions, efforts, moments, espacement, zones).
- Affichage adaptatif : menu du projet en tiroir sur téléphone, bande de résultats condensée et
  tiroir « Détails » sous 1 280 px, étapes défilantes ; nom accessible des étapes.
- Polices embarquées (fonctionnement hors ligne complet) ; bandeau d'avertissement pour les
  navigateurs trop anciens.
- Suite de tests de bout en bout Playwright (`npm run e2e`) : 50 tests sur 4 formats d'écran,
  inventaire automatique des 208 commandes, projets Firefox et WebKit (`npm run e2e:tous`).
- Livrables : inventaire des commandes, matrice de compatibilité, registre des anomalies complété.

## v3.8.0 — Correction des panneaux repliables (phase A) et robustesse (phase D)

- Panneaux « Options avancées » et « Ancrages et recouvrements » : défilement automatique à
  l'ouverture, libellé « Afficher » / « Masquer », résumé des valeurs quand le panneau est
  fermé, compteur de réglages modifiés, ouverture automatique et pastille « À corriger » en cas
  de donnée invalide, état mémorisé, accessibilité clavier (`aria-expanded`).
- Champs en erreur encadrés en rouge ; le moteur rattache chaque erreur à son champ
  (`validateInputsDetailed`).
- Interception des erreurs d'affichage (par étape et globale) avec message et rapport.
- Journal de diagnostic et rapport téléchargeable (réglages → Diagnostic).
- Format de projet version 2 : migration contrôlée des anciens projets, sauvegarde de
  l'original, bandeau de compte rendu ; démarrage sûr en cas de stockage corrompu.
- Note de calcul : téléchargement en HTML si la fenêtre est bloquée.
- Registre des anomalies fonctionnelles (`docs/audit/REGISTRE_ANOMALIES_FONCTIONNELLES.md`),
  scripts de recette (`scripts/recette/`) ; 84 tests.

## v3.7.0 — Audit lot 2 : note de calcul et paramétrage

- Nouvelle note de calcul (`src/note/note.ts`), mise en page par Paged.js (CSS Paged Media) :
  - page de garde : identité et logo, projet, référence, indice, date, intervenants,
    tableau des révisions, zones de visa ;
  - sommaire, listes des figures, des tableaux et des équations, avec numéros de page ;
  - en-têtes (entreprise, référence), pieds de page (copyright, chapitre, « Page n / N ») ;
  - références normatives et hypothèses générales ;
  - un chapitre par poteau : données, résistances et enrobage, élancement et second ordre,
    résistance de la section avec diagrammes d'interaction N-M, flexion déviée, effort
    tranchant, ELS et fissuration, feu, dispositions constructives, ancrages et nomenclature,
    conclusion ;
  - équations numérotées avec forme littérale, application numérique, résultat et unité,
    et renvoi à l'article ; tableaux et figures numérotés et légendés ;
  - synthèse du projet, mentions, plans de ferraillage A3 paysage en annexe ;
  - note d'un poteau ou du projet entier ; enregistrement en PDF par l'impression.
- Réglages du cartouche dans l'interface compacte : raison sociale, coordonnées, logo
  (import, aperçu, retrait), copyright, projet, client, référence, titre, date, indice,
  établi / vérifié / approuvé par, tableau des révisions, mentions ; modèle d'entreprise
  enregistrable, exportable et importable.
- Diagramme d'interaction N-M exposé par le moteur (`interactionDiagram`).
- Paged.js chargé à la demande (fichier séparé) ; 75 tests.

## v3.6.0 — Audit lot 1 : normes, formules, validation

- Relecture ligne à ligne du moteur ; 14 écarts relevés et corrigés (détail dans
  `docs/audit/REGISTRE_ECARTS.md`), dont :
  - Δcdev par défaut porté à 10 mm (§4.4.1.3) ;
  - M0e non appliqué en présence de charges transversales (§5.8.8.2) ;
  - fissuration : k3 de l'Annexe française pour c > 25 mm ;
  - feu : ψ1,1 en France pour ηfi ; catégorie d'usage (EN 1990, tab. A1.1) ;
  - tableaux 4.3N et 4.3NF : seuils par classe d'exposition ;
  - fluage : âge corrigé de la température (annexe B, B.10) ;
  - contrôle des saisies, verdict « non vérifié » en cas de donnée invalide.
- Sections polygonales 3 à 9 fois plus rapides (largeurs précalculées).
- Livrables d'audit : matrice normative (52 règles), registre des formules, cahier de
  validation généré (`npm run validation`, 22 cas conformes), registre des écarts.
- 70 tests.

## v3.5.0 — Interface compacte (phase B)

- Nouvelle interface par défaut (`src/compact/CompactApp.tsx`) :
  - 4 étapes (Données, Armatures, Vérifications, Documents) au lieu de 7 onglets ;
  - saisie dense ligne par ligne (libellé, valeur, unité), options avancées repliées ;
  - panneau de résultats permanent : verdict, taux de travail, dessin de section, valeurs
    clés, décompte des vérifications, accès direct aux non-conformités ;
  - liste unique des vérifications, regroupées et dépliables sur leur justification
    (formule, valeurs, article), avec filtre « À traiter » ;
  - proposition automatique des ferraillages conformes les plus légers ;
  - nomenclature, ancrages et recouvrements dans l'étape Armatures.
- Projets multi-poteaux (`src/store.tsx`) : création, duplication, renommage, suppression ;
  sauvegarde automatique dans le navigateur ; enregistrement et ouverture de fichiers
  `.poteaux.json` ; récapitulatif du projet exportable en CSV.
- L'interface détaillée reste accessible et partage les mêmes données (poteau actif).
- Ajout des types React (`@types/react`, `@types/react-dom`) : typage strict de toute
  l'interface, aucune erreur.

## v3.4.0 — Toutes formes de section, plans et DXF, navigation

- Calcul complet des sections hexagonales, demi-cercle, quart de cercle, L, T et croix par un
  modèle polygonal générique (`src/section.ts`) : axes principaux d'inertie, barres placées
  sur le contour intérieur (une par angle), cadres par rectangle composant, résistance la plus
  faible des deux sens de moment pour les sections non symétriques.
- Validation : T dégénéré = rectangle (identique), T non symétrique contre un modèle à fibres
  Python indépendant (< 0,2 %), invariants d'inertie.
- Correction §9.5.2(4) : 4 barres minimum en section circulaire (et non 6).
- Dessins (`src/drawing.ts`) : aperçu de section réel, plan A3 (coupe cotée, élévation avec
  zones de cadres, nomenclature, notes, cartouche ISO 7200), export DXF R12 et SVG.
- Navigation : menu latéral fixe, barre de synthèse permanente, en-tête réduit, onglet
  « Plan & Export DXF ». Notation MEd au lieu de MSd.
- Audit complet et proposition d'interface compacte : `docs/AUDIT.md`.
- 59 tests.

## v3.3.0 — Paramètres nationaux, feu, méthodes alternatives, fissuration (priorité 3)

- Sélecteur « Annexe nationale France / valeurs recommandées EC2 » :
  - tableau 4.3NF (seuils de résistance par classe d'exposition, minoration de 1 ou 2,
    25 ans et moins, enrobage compact) ou tableau 4.3N ;
  - wmax selon le tableau 7.1NF (0,40 / 0,30 / 0,20 mm ; XA à fixer par le marché)
    ou 7.1N (0,40 / 0,30 mm). En France, le calcul de wk n'est pas requis en X0/XC1
    sauf demande du marché.
  Les autres paramètres utilisés (αcc = 1,0, k1 et k2 du §7.2, γ) ont la même valeur
  dans les deux cas.
- Résistance au feu (EN 1992-1-2, méthode A, éq. 5.7) : ηfi calculé depuis G et Q,
  μfi = ηfi par défaut (sécuritaire), l0,fi paramétrable, contrôle du domaine de
  validité (contreventement, a, b', l0,fi, h ≤ 1,5 b, e ≤ 0,15 h).
- Méthode de la rigidité nominale (§5.8.7) : EI = Kc·Ecd·Ic + Es·Is, NB,
  MEd = M0e·[1 + β/(NB/NEd − 1)] ; choix de la méthode retenue et comparaison
  systématique avec la courbure nominale.
- Méthode simplifiée des Recommandations professionnelles françaises (poteaux
  rectangulaires et circulaires en compression centrée), en comparaison.
- Ouverture des fissures (§7.3.4) sous Nqp et Mqp dans le plan de h : section fissurée
  élastique, sr,max, εsm − εcm (kt = 0,4), comparaison à wmax.
- 9 tests supplémentaires (53 au total), dont feu, méthode RP, rigidité nominale et
  fissuration contrôlés par calcul manuel.

## v3.2.0 — Dispositions constructives, ancrages, effort tranchant (priorité 2)

- Ancrages (§8.4) : fbd = 2,25 η1 η2 fctd (fctd limité à C60/75), lb,rqd avec σsd = fyd,
  α2 selon cd pour les barres tendues, lb,min selon l'état des barres.
- Recouvrements (§8.7.3) : α6 selon le pourcentage de barres recouvertes, l0,min.
  Les longueurs calculées alimentent la nomenclature (mode « saisi » en k·Φ conservé).
- Recouvrements : As ≤ 8 % Ac dans la zone de recouvrement (§9.5.2(3)), au moins
  3 cadres sur l0 si Φl > 14 mm (§9.5.3(4)), ΣAst ≥ As d'une barre si Φl ≥ 20 mm
  (§8.7.4.1(3)), cadre supplémentaire aux extrémités des recouvrements comprimés
  (§8.7.4.2(3)).
- Cadres : espacement réduit à 0,6 scl,tmax sur la plus grande dimension en tête et en
  pied (§9.5.3(4)) et dans les recouvrements ; nombre de cadres de la nomenclature
  calculé par zones.
- Classe de béton indicative minimale selon l'exposition (annexe E, tableau E.1N).
- Classe structurale calculable (tableau 4.3N) : durée d'utilisation 50 ou 100 ans,
  réduction pour classe de résistance élevée et maîtrise de la qualité.
- Élément de rapport b/h > 4 signalé comme voile (§9.5.1) et non vérifié.
- Effort tranchant saisi avec N et M, dans les deux plans ; σcp et αcw issus de NEd ;
  ρl à partir des barres tendues du plan considéré ; cot θ optimisé entre 1 et 2,5
  sous l'interaction V/T (6.29) ; condition (6.31) pour les armatures minimales ;
  TRd,c. L'ancien mode « Cisaillement » est remplacé par ces champs.
- 10 tests supplémentaires (44 au total), dont ancrage et effort tranchant contrôlés
  par calcul manuel.

## v3.1.0 — Second ordre et sollicitations (priorité 1)

### Corrections de la v3
- αcc = 1,0 par défaut (valeur recommandée par l'EC2 et retenue par l'Annexe nationale
  française) ; 0,85 reste disponible.
- ELS : 0,6 fck est vérifiée sous combinaison caractéristique (Ncar, αe = Es/Ecm) et
  0,45 fck sous combinaison quasi-permanente (Nqp, αe = Es/Ec,eff).

### Nouveautés
- Moments du premier ordre saisis en tête et en pied pour chaque direction, avec type
  de courbure. Calcul de M01, M02 (imperfection incluse), M0e = max(0,6 M02 + 0,4 M01 ;
  0,4 M02) et MEd = max(M02 ; M0e + M2 ; M01 + 0,5 M2) (§5.8.8.2).
- C = 1,7 − rm calculé dans chaque direction ; rm = 1 en structure non contreventée,
  si les moments proviennent surtout des imperfections ou de charges transversales.
- Structure contreventée ou non ; longueur efficace par β ou par les souplesses k1, k2
  (éq. 5.15 et 5.16).
- Imperfection ei = θi·l0/2 avec θi = αh/200, αh = 2/√l borné entre 2/3 et 1 (§5.2).
- Fluage : φ(∞,t0) calculé selon l'annexe B (RH, t0, h0, classe de ciment) ;
  φef = φ(∞,t0)·M0Eqp/M0Ed avec M0Eqp/M0Ed ≈ Nqp/NEd ; φef = 0 si les conditions
  du §5.8.4(4) sont remplies (évalué par direction).
- c = 8 au lieu de 10 lorsque le moment du premier ordre est constant (§5.8.8.2(4)).
- Combinaisons EN 1990 à partir de G et Q : NEd = 1,35 G + 1,5 Q, Ncar = G + Q,
  Nqp = G + ψ2 Q ; option poids propre (25 kN/m³).
- 11 tests supplémentaires (34 au total), dont φ(∞,t0) contrôlé par calcul manuel.

### Hypothèses
- Une seule longueur efficace pour les deux directions.
- M0Eqp/M0Ed est approché par Nqp/NEd (moments supposés proportionnels aux charges).

## v3.0.0 — Refonte du moteur de calcul

### Corrections de sécurité
- **Armatures en flexion composée.** L'ancienne formule sous-estimait fortement l'acier
  (jusqu'à 0 cm² pour des cas nécessitant 13 cm²). Elle est remplacée par une
  résolution sur le diagramme d'interaction N-M exact (parabole-rectangle §3.1.7,
  béton déplacé déduit, disposition réelle des barres).
- **Axe de flambement.** Les deux directions sont désormais calculées séparément
  (λ, e₂, emin, MEd et MRd propres à chaque direction). La flexion déviée est traitée
  selon §5.8.9 (critères 5.38a/b et relation 5.39).
- **Formes non gérées.** L, T, croix, hexagone, quart et demi-cercle : caractéristiques
  géométriques exactes (axes principaux), mais verdict « NON VÉRIFIÉ » au lieu d'un
  faux « CONFORME » fondé sur As,min.
- **ELS.** Suppression des valeurs fictives de wk. σc est calculée en compression centrée
  à partir de l'effort quasi-permanent Nqp, sur section homogénéisée (Ec,eff), et
  comparée à 0,45 fck (et 0,6 fck en XD/XS/XF).

### Corrections normatives
- Enrobage : tableau 4.4N complet (classes S1 à S6), ajout de cmin,b.
- Libellés des classes de béton (C30/37, C35/45…) et paramètres des bétons > C50/60
  (tableau 3.1).
- γc et γs modifiables.
- Coefficient B de λlim calculé à partir de ω = As·fyd/(Ac·fcd).
- Courbure nominale : d = h/2 + is, avec is le rayon de giration réel des armatures.
- Effort tranchant : prise en compte de σcp (k₁ = 0,15, αcw), ρl à partir des aciers
  fournis, dimensions réelles de la section.
- Dispositions constructives §9.5 et §8.2 vérifiées : Φl ≥ 8, nombre de barres,
  Φt ≥ max(6 ; Φl/4), scl,tmax, espacement libre, barres intermédiaires tenues.

### Technique
- Moteur isolé dans `src/eurocode.ts` et testé (`npm test`, 23 tests), avec validation
  croisée contre une implémentation Python indépendante.
- Suppression des dépendances inutilisées (`@google/genai`, `express`, `dotenv`) et de
  l'injection de `GEMINI_API_KEY` dans le bundle client.

### Limites connues
- Fissuration calculée dans le plan de h des sections rectangulaires uniquement.
- Section circulaire traitée par un carré équivalent pour l'effort tranchant.
