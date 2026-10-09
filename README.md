# Dimensionnement des poteaux aux Eurocodes

Dimensionnement de poteaux isolés selon les Eurocodes — version 4.7.1 :

- béton armé (NF EN 1992-1-1, EN 1992-1-2) ;
- acier (EN 1993-1-1, EN 1993-1-2) ;
- bois (EN 1995-1-1, EN 1995-1-2).

En ligne sur le site sel-apps : page `/apps/calcul-poteaux` (application compilée dans `public/tools/poteaux/`).

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

- `src/eurocode.ts` : moteur de calcul béton armé (aucune dépendance à l'interface).
- `src/acier/`, `src/bois/` : moteurs de calcul acier et bois.
- `src/section.ts` : géométrie polygonale générique (toutes formes de section).
- `src/drawing.ts` : plans (SVG) et export DXF R12.
- `src/store.tsx` : projet multi-poteaux, sauvegarde et fichiers `.poteaux.json`.
- `src/compact/` : interface en 4 étapes (seule interface depuis la v3.12).
- `src/note/` : note de calcul paginée ; `src/manuel/` : manuel d'utilisation.
- `src/eurocode.test.ts` : tests de non-régression et de validation.
- `docs/manuel/` : manuel d'utilisation illustré (Markdown et PDF).
- `MANUAL.md` : méthodes de calcul et hypothèses (référence technique).
- `CHANGELOG.md` : historique des versions.

Les résultats sont des éléments de pré-dimensionnement. Toute étude d'exécution doit
être validée par un ingénieur structure.

## Tests de bout en bout

Première utilisation : `npx playwright install chromium` (téléchargement du navigateur de test).
Ensuite `npm run build` puis `npm run e2e` : la suite démarre l'application, exerce chaque commande
sur quatre formats d'écran et régénère `docs/audit/INVENTAIRE_COMMANDES.md`.
Pour Firefox et Safari (WebKit) : `npx playwright install firefox webkit` puis `npm run e2e:tous`.

## Publication sur un site web

Site sel-apps : `npx vite build --base /tools/poteaux/ --outDir dist-sel`, puis remplacer `public/tools/poteaux/`
par le contenu de `dist-sel/` (voir `DEPLOIEMENT.md` du dépôt sel-apps).

Autre hébergeur : `npm run site` produit `poteaux-ec2-site.zip` : déposer son contenu chez l'hébergeur (FTP, gestionnaire de
fichiers cPanel…), à la racine ou dans un sous-dossier (`/poteaux/` par exemple). Site statique : aucun serveur
applicatif ni base de données. Les données des utilisateurs restent dans leur navigateur.

## Bibliothèque commune

`src/eurocodes/` (@sel/eurocodes) regroupe les fonctions Eurocode partagées avec l'application « Poutres continues EC2 ». Voir `src/eurocodes/README.md` pour les règles de maintenance.

## Aperçu direct sous Windows (PowerShell)

| Commande | Effet |
|---|---|
| Double-clic sur `Apercu.cmd` | Sert l'application construite (`dist/` ou `site/`) et ouvre le navigateur, sans Node.js |
| `powershell -ExecutionPolicy Bypass -File .\apercu.ps1 -Construire` | Construit d'abord l'application (Node.js 18+), puis l'ouvre |
| `powershell -ExecutionPolicy Bypass -File .\apercu.ps1 -Port 9000` | Choisit le port (premier port libre à partir de 9000) |
| `powershell -ExecutionPolicy Bypass -File .\dev.ps1` | Mode développement avec rechargement automatique (Node.js 18+) |

Si le script a été téléchargé : `Unblock-File .\apercu.ps1, .\dev.ps1`.

## Unités

Depuis la v4.0, les dimensions de section se saisissent en millimètres (stockage interne en cm inchangé : les projets existants s'ouvrent à l'identique).
