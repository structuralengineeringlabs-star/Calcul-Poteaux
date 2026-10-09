# Matrice de compatibilité

Version 3.9.0 — suite de bout en bout `npm run e2e` (Playwright), 50 tests, aucun échec, aucun test instable.

## Navigateurs

| Navigateur | Version minimale | Testé | Résultat | Remarque |
|---|---|---|---|---|
| Chrome | 111 | Oui (Chromium 141, moteur de test) | 50 / 50 | Référence |
| Edge | 111 | Indirectement (même moteur que Chrome) | — | À confirmer sur poste |
| Firefox | 128 | Non exécuté dans l'environnement d'audit | — | `npx playwright install firefox` puis `npm run e2e:tous` |
| Safari | 16.4 | Non exécuté dans l'environnement d'audit | — | Moteur WebKit : `npx playwright install webkit` puis `npm run e2e:tous` |
| Navigateur plus ancien | — | Simulé (CSS `color-mix` indisponible) | Bandeau d'avertissement, application utilisable | Test « navigateur trop ancien » |

Les versions minimales découlent de la feuille de style (Tailwind CSS 4 : `color-mix`, couches de cascade, `@property`).
La note de calcul paginée est optimisée pour Chrome et Edge (en-têtes et pieds de page de Paged.js).

## Formats d'écran

| Format | Taille | Tests | Menu du projet | Résultats | Débordement horizontal |
|---|---|---|---|---|---|
| Grand écran | 1920 × 1080 | 4 (affichage) | Rail latéral | Panneau permanent | Aucun |
| Portable | 1366 × 768 | 38 (suite complète) | Rail latéral | Panneau permanent | Aucun |
| Tablette | 820 × 1180 | 4 (affichage) | Rail latéral | Bande condensée + tiroir « Détails » | Aucun |
| Téléphone | 390 × 844 | 4 (affichage) | Tiroir (bouton menu) | Bande condensée + tiroir « Détails » | Aucun |

Tests d'affichage exécutés sur chaque format : absence de débordement horizontal à chaque étape, accès aux
résultats, accès au menu du projet, visibilité du panneau « Options avancées » après ouverture.
L'interface détaillée (ancienne présentation) est conçue pour ordinateur ; elle n'est pas adaptée au téléphone.

## Fonctionnement hors ligne

Aucune ressource externe n'est chargée (test « aucune ressource externe ») : polices Inter et JetBrains Mono
embarquées, Paged.js inclus dans l'application. Une connexion n'est nécessaire que pour `npm install`.
