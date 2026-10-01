# Dimensionnement des poteaux aux Eurocodes

Outil de pré-dimensionnement de poteaux isolés en béton armé selon la NF EN 1992-1-1.

## Lancer l'application

Prérequis : Node.js 18 ou plus récent.

```
npm install
npm run dev      # http://localhost:3000
npm test         # tests du moteur de calcul (Vitest)
npm run build && npm run e2e   # tests de bout en bout dans le navigateur (Playwright)
npm run build && npm run manuel # régénère les captures et le manuel (Markdown et PDF)
npm run build    # version de production dans dist/
```

## Organisation

- `src/eurocode.ts` : moteur de calcul (aucune dépendance à l'interface).
- `src/section.ts` : géométrie polygonale générique (toutes formes de section).
- `src/drawing.ts` : plans (SVG) et export DXF R12.
- `src/store.tsx` : projet multi-poteaux, sauvegarde et fichiers `.poteaux.json`.
- `src/compact/` : interface en 4 étapes (seule interface depuis la v3.12).
- `src/note/` : note de calcul paginée ; `src/manuel/` : manuel d'utilisation.
- `src/eurocode.test.ts` : tests de non-régression et de validation.
- `docs/manuel/` : manuel d'utilisation illustré (Markdown et PDF).
- `MANUAL.md` : méthodes de calcul et hypothèses (référence technique).
- `CHANGELOG.md` : corrections apportées en v3.

Les résultats sont des éléments de pré-dimensionnement. Toute étude d'exécution doit
être validée par un ingénieur structure.

## Tests de bout en bout

Première utilisation : `npx playwright install chromium` (téléchargement du navigateur de test).
Ensuite `npm run build` puis `npm run e2e` : la suite démarre l'application, exerce chaque commande
sur quatre formats d'écran et régénère `docs/audit/INVENTAIRE_COMMANDES.md`.
Pour Firefox et Safari (WebKit) : `npx playwright install firefox webkit` puis `npm run e2e:tous`.

## Publication sur un site web

`npm run site` produit `poteaux-ec2-site.zip` : déposer son contenu chez l'hébergeur (FTP, gestionnaire de
fichiers cPanel…), à la racine ou dans un sous-dossier (`/poteaux/` par exemple). Site statique : aucun serveur
applicatif ni base de données. Les données des utilisateurs restent dans leur navigateur.
"# Calcul-Poteaux" 
