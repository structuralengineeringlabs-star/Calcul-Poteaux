import { test, expect } from './outils';

/** Poteau métallique (v4.1) : matériau, profilé du catalogue, paramètres, vérifications, note. @ecran */
test.describe('Poteau métallique @ecran', () => {
  test('parcours complet en acier', async ({ app }) => {
    await app.getByLabel('Matériau du poteau').selectOption('acier');
    await expect(app.locator('[data-materiau="acier"]')).toBeVisible();
    await app.getByLabel('Famille').selectOption('HEA');
    await app.getByLabel('Profilé', { exact: true }).selectOption('HEA 240');
    await expect(app.getByLabel('Résultats acier')).toContainText('HEA 240');
    const verdict = await app.locator('[data-verdict]').getAttribute('data-verdict');
    expect(['OK', 'KO']).toContain(verdict);
    await app.getByRole('button', { name: 'Paramètres' }).first().click();
    await app.getByLabel('βz').fill('0,7');
    await app.getByRole('button', { name: 'Vérifications' }).first().click();
    await expect(app.getByText('Flexion composée, éq. 6.61 (axe y)')).toBeVisible();
    await app.getByRole('button', { name: 'Documents' }).first().click();
    await expect(app.getByRole('img', { name: /Planche 1/ })).toBeVisible();
    const [dl] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'DXF (CAO)' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/\.dxf$/);
    await app.getByRole('button', { name: 'Imprimer le plan' }).click();
    await expect(app.getByText('Plan A3 — aperçu')).toBeVisible();
    await app.getByRole('button', { name: 'Fermer' }).click();
    await app.getByRole('button', { name: 'Ouvrir la note acier (imprimer / PDF)' }).click();
    await expect(app.getByText('Note de calcul acier — aperçu')).toBeVisible();
    await expect(app.getByRole('heading', { name: 'Sommaire' })).toBeVisible();
    await expect(app.getByText(/\(1\) §6.3.1.2/).first()).toBeVisible();
    await app.getByRole('button', { name: 'Fermer' }).click();
    expect(await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });
  test('retour au béton armé : résultats d\'origine', async ({ app }) => {
    const avant = await app.locator('[data-verdict]').getAttribute('data-verdict');
    await app.getByLabel('Matériau du poteau').selectOption('acier');
    await app.getByLabel('Matériau du poteau').selectOption('ba');
    expect(await app.locator('[data-verdict]').getAttribute('data-verdict')).toBe(avant);
  });
});

test.describe('Poteau tubulaire @ecran', () => {
  test('tube carré du catalogue EN 10210-2', async ({ app }) => {
    await app.getByLabel('Matériau du poteau').selectOption('acier');
    await app.getByLabel('Famille').selectOption('SHS');
    await app.getByLabel('Profilé', { exact: true }).selectOption('SHS 200×200×10');
    await expect(app.getByText(/Tube fini à chaud/)).toBeVisible();
    await expect(app.getByLabel('Résultats acier')).toContainText('SHS 200×200×10');
    await app.getByRole('button', { name: 'Vérifications' }).first().click();
    await expect(app.getByText(/courbes de flambement y : a, z : a/)).toBeVisible();
  });
});

test.describe('Pastille de verdict @ecran', () => {
  test('en acier et en bois, la pastille de l\'en-tête suit le matériau actif', async ({ app }) => {
    await app.getByLabel('Matériau du poteau').selectOption('bois');
    const pastille = app.locator('[data-pastille="materiau"]');
    const verdict = await app.locator('[data-verdict]').getAttribute('data-verdict');
    await expect(pastille).toContainText(verdict === 'OK' ? 'Conforme' : 'Non conforme');
    await app.getByLabel('Matériau du poteau').selectOption('acier');
    const v2 = await app.locator('[data-verdict]').getAttribute('data-verdict');
    await expect(pastille).toContainText(v2 === 'OK' ? 'Conforme' : 'Non conforme');
  });
});
