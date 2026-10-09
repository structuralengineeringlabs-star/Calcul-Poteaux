import { test, expect } from './outils';

/** Poteau en bois (v4.2). @ecran */
test.describe('Poteau en bois @ecran', () => {
  test('parcours complet en bois', async ({ app }) => {
    await app.getByLabel('Matériau du poteau').selectOption('bois');
    await app.getByLabel('Classe de résistance').selectOption('C24');
    await app.getByLabel('Largeur b (mm)').fill('150');
    await expect(app.getByLabel('Résultats bois')).toContainText('C24 150');
    await app.getByRole('button', { name: 'Paramètres' }).first().click();
    await app.getByLabel('Résistance au feu').selectOption('30');
    await app.getByRole('button', { name: 'Vérifications' }).first().click();
    await expect(app.getByText('Flexion composée, éq. 6.23 (flambement selon y)')).toBeVisible();
    await expect(app.getByText(/Résistance au feu R30/)).toBeVisible();
    await app.getByRole('button', { name: 'Documents' }).first().click();
    await expect(app.getByRole('img', { name: /Planche 1/ })).toBeVisible();
    const [dl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'DXF (CAO)' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/\.dxf$/);
    await app.getByRole('button', { name: 'Imprimer le plan' }).click();
    await expect(app.getByText('Plan A3 — aperçu')).toBeVisible();
    await app.getByRole('button', { name: 'Fermer' }).click();
    await app.getByRole('button', { name: 'Ouvrir la note bois (imprimer / PDF)' }).click();
    await expect(app.getByText('Note de calcul bois — aperçu')).toBeVisible();
    await expect(app.getByRole('heading', { name: 'Sommaire' })).toBeVisible();
    await app.getByRole('button', { name: 'Fermer' }).click();
    expect(await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
});
