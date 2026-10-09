# @sel/eurocodes

Fonctions Eurocode communes aux applications S.E.L. (poteaux, poutres). Aucune dépendance, aucune référence à
l'interface. Chaque fonction cite son article ; les contrôles figurent dans le cahier de validation de chaque application.

| Fichier | Contenu |
|---|---|
| `beton.ts` | Propriétés du béton (tab. 3.1, §3.1.7), classes de ductilité de l'acier (annexe C) |
| `durabilite.ts` | cmin,dur (tab. 4.4N), expositions, wmax (tab. 7.1N / 7.1NF) |
| `fluageRetrait.ts` | φ(∞, t0) (annexe B), εcs(∞) (§3.1.4, B.11) |
| `ancrage.ts` | fbd (éq. 8.2), lb,rqd (éq. 8.3) |
| `feu.ts` | Poutres : tableaux 5.5 et 5.6 de l'EN 1992-1-2 |
| `ec3.ts` | Acier : nuances, classification, Mcr, χLT, âme sous charges transversales, θcr |
| `ec5.ts` | Bois : classes EN 338 et EN 14080, kmod, kdef, kh, kcrit, kc, carbonisation, kfi |
| `catalogue.ts` | Tubes finis à chaud CHS, SHS, RHS (EN 10210-2, 34 tubes, rayons ro = 1,5t, ri = t) ; profilés laminés IPE, HEA, HEB, HEM (90 profilés) ; propriétés recalculées avec congés, contrôlées contre la masse nominale et des valeurs tabulées |

## Applications utilisatrices (version 1.4.0 : modules ec3, ec5, catalogue des profilés laminés et des tubes finis à chaud)

| Application | Depuis | Fonctions utilisées |
|---|---|---|
| Poutres continues EC2 | v5.1.0 | toutes |
| Poteaux EC2 | v3.16.0 | `proprietesBeton` (fctm, Ecm), `CMIN_DUR` et `ligneExposition`, `wmax`, `coefficientFluage`, `fbd` |

Lors de l'adoption par l'application poteaux, 2 029 valeurs numériques de contrôle (matériaux, enrobages, ancrages,
fluage, calcul complet du poteau par défaut) et son cahier de validation ont été comparés avant et après : identiques.

## Règles de maintenance

1. Le dossier `src/eurocodes/` est identique, octet pour octet, dans chaque application (même `EUROCODES_VERSION`).
2. Toute modification se fait dans une application, puis le dossier est recopié dans les autres ; la version est
   incrémentée et `eurocodes.test.ts` ainsi que les cahiers de validation des deux applications sont relancés.
3. À terme, le dossier peut devenir un paquet d'espace de travail npm (`packages/eurocodes`) sans changement de code.
