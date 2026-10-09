# Registre des anomalies fonctionnelles

## Phase A — panneaux repliables (v3.8.0)

| N° | Gravité | Constat | Correction | Critère d'acceptation | Recette |
|---|---|---|---|---|---|
| F1 | Majeur | « Options avancées » perçu comme inactif : sur un écran de portable, le panneau s'ouvre sous le bas de l'écran sans défilement ; seule la flèche change. Non reproduit comme bouton réellement inactif (Chrome, 1536 × 900 et 1366 × 768). | Défilement automatique vers le contenu à l'ouverture | Premier réglage visible après le clic en 1366 × 768 | A3 ✅ |
| F2 | Mineur | État ouvert ou fermé peu lisible. | Libellé « Afficher » / « Masquer », flèche animée, bordure et fond actifs | Libellé et `aria-expanded` cohérents | A2, A4 ✅ |
| F3 | Mineur | Réglages avancés invisibles quand le panneau est fermé. | Résumé des valeurs et compteur de réglages modifiés | Résumé et compteur affichés | A1, A9 ✅ |
| F4 | Majeur | Une donnée avancée invalide pouvait rester cachée dans le panneau fermé. | Ouverture automatique, pastille « À corriger », champ fautif encadré en rouge | Panneau ouvert et signalé | A8 ✅ |
| F5 | Mineur | Panneau refermé à chaque changement d'étape ou rechargement. | État mémorisé | État conservé | A5, A6 ✅ |
| F6 | Mineur | Accessibilité : pas d'`aria-expanded`, focus peu visible. | `aria-expanded`, `aria-controls`, région nommée, anneau de focus ; Entrée et Espace | Commande au clavier | A7 ✅ |
| F7 | Mineur | Même défaut pour « Ancrages et recouvrements ». | Même composant | Résumé, ouverture, `aria-expanded` | A10 ✅ |

## Phase D — robustesse (v3.8.0)

| N° | Gravité | Constat | Correction | Critère d'acceptation | Recette |
|---|---|---|---|---|---|
| R1 | Majeur | Une erreur d'affichage pouvait laisser une zone ou l'écran entier sans réaction, sans message. | Intercepteur d'erreurs par étape, pour l'interface détaillée et pour l'application : message, « Réessayer », « Recharger », rapport | Le reste de la page reste utilisable, l'erreur est journalisée | Test `ErrorBoundary.test.tsx` ✅ |
| R2 | Majeur | Projets enregistrés sans numéro de version : reprise des anciens projets non contrôlée. | Format 2, migration (moments uniques → tête / pied, nouveaux paramètres, valeurs invalides), sauvegarde de l'original, bandeau de compte rendu | Projet v1 repris, original conservé | D1 à D4 ✅, tests `store.test.ts` ✅ |
| R3 | Majeur | Stockage corrompu : risque de blocage au démarrage. | Nouveau projet, message, contenu d'origine conservé | Démarrage normal | D5 ✅ |
| R4 | Mineur | Aucun moyen de transmettre un diagnostic. | Journal (200 entrées, erreurs non interceptées comprises) et rapport téléchargeable dans les réglages | Rapport avec version, navigateur, écran, journal | D6 ✅ |
| R5 | Mineur | Note de calcul perdue si le navigateur bloque la fenêtre. | Repli : téléchargement du fichier HTML, événement journalisé | Fichier téléchargé | D7, D8 ✅ |
| R6 | Mineur | Import de fichier : messages d'erreur peu précis. | Import par la même migration, messages explicites, journalisation | Fichier invalide refusé clairement | Test `store.test.ts` ✅ |

## Phase B — audit fonctionnel de toutes les commandes (v3.9.0)

Inventaire : **208 commandes** sur 15 écrans (`INVENTAIRE_COMMANDES.md`, généré par les tests).

| N° | Gravité | Constat | Correction | Test |
|---|---|---|---|---|
| B1 | **Critique** | Une valeur démesurée (par exemple une hauteur de 1e9 m, ou 1e9 barres) faisait planter l'onglet du navigateur : bien que signalée invalide, elle était utilisée par le dessin de l'élévation (boucle sur des milliards de cadres) et par la construction de la section. | Calcul poursuivi sur des valeurs ramenées dans des bornes sûres, verdict « non vérifié » ; borne de sécurité dans la boucle de dessin | `robustesse.spec` (valeurs extrêmes dans chaque champ), test unitaire B1 |
| B2 | Majeur | Pas de borne supérieure en validation : nombre de barres, dimensions, efforts, moments, zones d'ancrage ; espacement des cadres sans minimum. | Bornes : barres ≤ 200, dimensions ≤ 1 000 cm, efforts et moments ≤ 10⁶, espacement 20 à 1 000 mm, zones 0 à 10 | idem |
| B3 | Mineur | Sur téléphone, les étapes non actives n'affichaient que leur numéro : nom accessible « 2 », « 3 »… | `aria-label` et infobulle avec le nom de l'étape | `adaptatif.spec` |
| B4 | Info | Toutes les autres commandes (208) répondent conformément : effet sur le calcul vérifié pour chaque champ et chaque liste de l'étape Données (empreinte des résultats), persistance après rechargement, téléchargements valides (DXF, SVG, CSV, projet, modèle, rapport), note paginée, liste des poteaux, réglages, interface détaillée. | — | 50 tests |

## Phase C — compatibilité (v3.9.0)

| N° | Gravité | Constat | Correction | Test |
|---|---|---|---|---|
| C1 | Majeur | Sous 1 280 px de large, le panneau de résultats disparaissait ; seul le verdict restait visible. | Bande de résultats condensée sous l'en-tête et tiroir « Détails » avec le panneau complet | `adaptatif.spec` |
| C2 | Majeur | Sur téléphone, le menu latéral fixe (240 px) écrasait la zone de saisie. | Menu en tiroir (bouton, fermeture par Échap, clic à l'extérieur ou choix d'un poteau) | `adaptatif.spec` |
| C3 | Mineur | Étapes tronquées sur écran étroit. | Défilement horizontal, libellés abrégés | `adaptatif.spec` |
| C4 | Majeur | Polices chargées depuis Google Fonts : présentation dégradée hors ligne. | Polices embarquées | « aucune ressource externe » |
| C5 | Mineur | Aucun avertissement sur un navigateur trop ancien. | Bandeau explicite, application utilisable | « navigateur trop ancien » |
| C6 | Info | Firefox et Safari (WebKit) non testés dans l'environnement d'audit (téléchargement impossible). | Projets prêts : `npm run e2e:tous` | À exécuter sur poste |

## Lot 4 — ergonomie et manuel (v3.11.0)

| N° | Gravité | Constat | Correction | Test |
|---|---|---|---|---|
| E1 | Majeur | Aucune aide sur les champs : sens des paramètres (ψ, k1/k2, Δcdev, l0,fi…) et valeurs usuelles à chercher dans les normes. | Aide contextuelle sur chaque champ (définition, valeur usuelle, article) | `ergonomie.spec` |
| E2 | Majeur | Manuel obsolète (v2), sans captures, sans parcours type, distinct de MANUAL.md. | Manuel refondu, source unique, 12 captures régénérées automatiquement ; versions intégrée, Markdown et PDF | `ergonomie.spec`, `npm run manuel` |
| E3 | Majeur | Interface détaillée : ancienne note de calcul toujours imprimable (écart D6), incohérente avec la nouvelle. | Onglets Synthèse et Manuel redirigés vers la nouvelle note et le nouveau manuel ; ancien code supprimé | `ergonomie.spec` |
| E4 | Mineur | Navigation entre étapes uniquement à la souris. | Raccourcis Alt + 1 à 4 | `ergonomie.spec` |
| E5 | Mineur | Aucune orientation à la première utilisation. | Message d'accueil avec lien vers le parcours type | `ergonomie.spec` |
| E6 | Mineur | Interface détaillée : unités et séparateurs décimaux hétérogènes (R-04). | Interface supprimée en v3.12 (décision du maître d'ouvrage) | Clos — `ergonomie.spec` |

## Audit de la note de calcul (v3.13.0)

Signalement : sous Microsoft Edge, la note s'ouvrait dans une fenêtre qui ne permettait pas de l'enregistrer en PDF.
Diagnostic : non reproduit sous Chromium (moteur d'Edge) ; ouverture fragile par conception (fenêtre `about:blank`
écrite par script, dépendance à la boîte d'impression du navigateur et à sa configuration). Correction indépendante de la cause.

| N° | Axe | Constat | Correction | Contrôle | Statut |
|---|---|---|---|---|---|
| N-A1 | Génération | PDF obtenu uniquement par la boîte d'impression du navigateur. | PDF produit par l'application (pdfmake, texte vectoriel) : « Télécharger la note (PDF) » | `pdf.test.ts`, `documents.spec` | Clos |
| N-A2 | Génération | Sommaire et listes paginés seulement dans l'aperçu. | Sommaire, listes des figures, tableaux, équations avec numéros de page réels ; pieds « Page n / N » | Concordance vérifiée : 28 titres, 6 figures, 16 tableaux, 70 équations | Clos |
| N-A3 | Aperçu | Fenêtre `about:blank` ; barre d'outils recopiée sur chaque page par Paged.js et bouton jamais réactivé (défaut présent depuis la v3.7). | Onglet réel (adresse `blob:`) ; barre unique créée après la pagination | `documents.spec` | Clos |
| N-A4 | Repli | Note perdue si l'impression est interdite par stratégie d'entreprise. | Le PDF ne dépend plus de l'impression ; aperçu téléchargé en HTML si l'onglet est bloqué | — | Clos |
| N-A5 | Nommage | Nom de fichier non normalisé. | `référence_poteau_note-de-calcul_indice_date.pdf` (sans accent ni caractère interdit) | `pdf.test.ts` | Clos |
| N-A6 | Métadonnées | Aucune. | Titre, auteur, sujet, mots-clés (dont l'identifiant), logiciel et version | `pdf.test.ts` | Clos |
| N-A7 | Volumétrie | Génération sur le fil principal : interface figée pour les gros projets. | Web Worker ; 20 poteaux : 161 pages en environ 13 s, interface réactive | `documents.spec` (volumétrie) | Clos |
| N-B1 | Contenu | Page de garde sans identifiant ni date de génération. | Identifiant de calcul, date et heure, version du logiciel | `pdf.test.ts` | Clos |
| N-B2 | Contenu | Références normatives sans édition. | Éditions EN et date de l'Annexe nationale ; mention de vérification d'applicabilité | `pdf.test.ts` | Clos |
| N-B4 | Contenu | Données d'entrée non reproduites : calcul non rejouable par un vérificateur. | Annexe « Données d'entrée » par poteau, avec identifiant | `pdf.test.ts` | Clos |
| N-B5 | Contenu | Combinaisons ELS non détaillées. | Équations Ncar = G + Q et Nqp = G + ψ2·Q | — | Clos |
| N-B8 | Cohérence | Pas de contrôle automatique entre la note et le calcul affiché. | Test : MEd, taux de travail, identifiant identiques | `pdf.test.ts` | Clos |
| N-C1 | Présentation | — | Équations encadrées, numérotées, libellées, indices et exposants | Contrôle visuel | Clos |
| N-C3 | Présentation | Risque de titres isolés en bas de page, tableaux coupés. | Règle « pas de titre en fin de page », lignes de tableau insécables, tableaux courts insécables | Contrôle visuel | Clos |
| N-C5 | Présentation | Polices dépendant du navigateur. | Police Roboto incorporée (sous-ensemble) ; symboles absents remplacés (→, espace fine) | `pdf.test.ts` | Clos |
| N-C6 | Plans | Plans en annexe de la note, à l'échelle du navigateur. | PDF A3 paysage séparé, une page par poteau, à l'échelle du cartouche (décision du maître d'ouvrage) | `pdf.test.ts`, `documents.spec` | Clos |
| N-D2 | Traçabilité | — | Identifiant FNV-1a des données d'entrée par poteau et pour le projet ; en en-tête de chaque page | `pdf.test.ts` | Clos |
| N-E3 | Recette | Edge non disponible dans l'environnement d'audit. | À réaliser sur poste : téléchargement de la note et des plans sous Edge | — | Ouvert (recette utilisateur) |
