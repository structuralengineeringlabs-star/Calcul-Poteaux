# Conventions des plans et du DXF

## Mise en page

| Élément | Convention | Référence |
|---|---|---|
| Format | A3 paysage 420 × 297 mm ; cadre avec marge de reliure de 20 mm | ISO 5457 |
| Cartouche | 180 × 50 mm en bas à droite : propriétaire, titre, projet et client, type de document, auteurs, échelles, numéro, date, révision, format et feuille, zone du logo | ISO 7200 |
| Échelles | Série normalisée 1:5, 1:10, 1:20, 1:25, 1:50, 1:100, choisie automatiquement | ISO 5455 |
| Écritures | 1,8 à 3,5 mm | ISO 3098 |
| Coupe | Contour du béton en trait fort, hachures à 45° en trait fin | ISO 128 et ISO 128-50 |
| Armatures | Barres en coupe : disques pleins ; cadres : trait continu ; repères cerclés | ISO 3766 |
| Cotation | Cotes en chaîne de position des barres (distances au parement et entre barres), cotes d'ensemble, flèches obliques ; cotes en mm | ISO 129-1 |
| Élévation | Zones de cadres cotées (abouts, partie courante, recouvrement), premier cadre, longueur de recouvrement, repère de coupe A-A | ISO 3766 |
| Nomenclature | Repère, croquis de forme, Φ, nombre, dimensions de façonnage, longueur développée, masse, total ; un type de cadre par contour | Esprit ISO 4066 |

Les codes de forme numériques de l'ISO 4066 ne sont pas utilisés : la forme est donnée par un croquis coté,
ce qui reste valable quel que soit le catalogue de façonnage de l'entreprise.

## Calques du DXF et épaisseurs de trait à l'impression

Le format DXF R12 ne transporte pas les épaisseurs de trait : elles sont affectées à l'impression selon
la couleur (table de style CTB). Correspondance recommandée :

| Calque | Contenu | Couleur | Type de trait | Épaisseur conseillée |
|---|---|---|---|---|
| S-COFF-CONTOUR | Contour du béton, planchers | 7 (blanc/noir) | Continu | 0,50 mm |
| S-COFF-HACH | Hachures du béton | 8 (gris) | Continu | 0,13 mm |
| S-ARMA-LONG | Barres longitudinales | 1 (rouge) | Continu | 0,50 mm |
| S-ARMA-CADRE | Cadres et cerces | 5 (bleu) | Continu | 0,35 mm |
| S-COTE | Cotation | 3 (vert) | Continu | 0,18 mm |
| S-TEXTE | Textes, repères, lignes de rappel | 7 | Continu | 0,25 mm |
| S-AXE | Axes | 8 (gris) | Mixte (CENTER) | 0,18 mm |
| S-CADRE-PLAN | Cadre du plan, cartouche, tableaux | 7 | Continu | 0,50 mm |

## Cartouche modifiable

Le cartouche est un bloc `CARTOUCHE` inséré à l'origine, avec 10 attributs : `PROPRIETAIRE`, `PROJET`,
`TITRE`, `TYPE_DOC`, `AUTEURS`, `ECHELLES`, `NUMERO`, `DATE`, `REVISION`, `FORMAT`. Dans le logiciel de DAO,
un double-clic (ou la commande ATTEDIT) permet de les modifier sans éclater le bloc.

## Logo

Le logo S.E.L. intégré est dessiné en **entités vectorielles** dans le cartouche (hexagone, diagonales, pavé plein
en SOLID, textes) : il apparaît dans le SVG, le PDF A3 et le DXF (calque S-LOGO). Un logo personnalisé (image)
apparaît dans le SVG et les PDF ; dans le DXF R12, qui n'incorpore pas d'image, un cadre « LOGO » est réservé et
l'export « DXF + logo (ZIP) » fournit le fichier à insérer (commande IMAGE).

## Contrôles

- Tests automatiques (`src/drawing.test.ts`) : structure DXF, bloc et attributs, calques déclarés, encodage,
  nomenclature, logo, cotes, archive ZIP.
- Validation indépendante pendant l'audit : relecture par `ezdxf` (0 erreur) et rendu graphique du DXF.
- À faire sur poste : ouverture dans AutoCAD, BricsCAD, LibreCAD ou DraftSight (voir registre, L3-8).
