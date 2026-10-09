import { test, expect, etape } from './outils';

test.describe('Navigation', () => {
  test('les 4 étapes s\'affichent, précédente / suivante', async ({ app }) => {
    for (const [nom, repere] of [['Armatures', 'Armatures longitudinales'], ['Vérifications', 'Résistance'], ['Documents', 'Note de calcul'], ['Données', 'Géométrie']] as const) {
      await etape(app, nom);
      await expect(app.getByRole('heading', { name: repere }).first()).toBeVisible();
    }
    await app.getByRole('button', { name: 'Étape suivante →' }).click();
    await expect(app.getByRole('heading', { name: 'Armatures longitudinales' })).toBeVisible();
    await app.getByRole('button', { name: '← Étape précédente' }).click();
    await expect(app.getByRole('heading', { name: 'Géométrie' })).toBeVisible();
  });

  test('réglages et retour au calcul', async ({ app }) => {
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    await expect(app.getByRole('heading', { name: 'Entreprise (en-tête et cartouche)' })).toBeVisible();
    await app.getByRole('button', { name: '← Retour au calcul' }).click();
    await expect(app.getByRole('heading', { name: 'Géométrie' })).toBeVisible();
  });

  test('manuel accessible', async ({ app }) => {
    await app.getByRole('button', { name: "Manuel d'utilisation" }).first().click();
    await expect(app.getByRole('navigation', { name: 'Sommaire du manuel' })).toBeVisible();
  });
});
