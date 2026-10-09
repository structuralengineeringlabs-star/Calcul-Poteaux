import { readFileSync } from 'fs';
import { test, expect } from './outils';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test.describe('Cartouche et réglages', () => {
  test('champs texte mémorisés', async ({ app }) => {
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    const champs = app.locator('section input[type=text]');
    const n = await champs.count();
    expect(n).toBeGreaterThanOrEqual(15);
    await champs.first().fill('Bureau Essai');
    await app.reload();
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    await expect(app.locator('section input[type=text]').first()).toHaveValue('Bureau Essai');
  });

  test('logo S.E.L. : menu de l\'application et icône de l\'onglet', async ({ app }) => {
    await expect(app.getByRole('img', { name: 'Logo Structural & Engineering Labs' }).first()).toBeVisible();
    expect(await app.locator('link[rel="icon"]').getAttribute('href')).toBe('./favicon.svg');
    const r = await app.request.get('./favicon.svg');
    expect(await r.text()).toContain('S.E.L.');
    await expect(app).toHaveTitle(/Structural & Engineering Labs/);
  });

  test('logo : S.E.L. par défaut, import d\'un autre logo, retour au logo S.E.L. ; logo trop lourd refusé', async ({ app }) => {
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    await app.locator('input[type=file][accept^="image"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
    await expect(app.locator('img[alt="Logo"]').first()).toBeVisible();
    await expect(app.getByText('Logo personnalisé')).toBeVisible();
    await app.getByRole('button', { name: 'Rétablir le logo S.E.L.' }).click();
    await expect(app.getByText('Logo S.E.L. (intégré, vectoriel)')).toBeVisible();
    await app.locator('input[type=file][accept^="image"]').setInputFiles({ name: 'gros.png', mimeType: 'image/png', buffer: Buffer.alloc(1_200_000) });
    await expect(app.getByText(/trop volumineux/)).toBeVisible();
  });

  test('tableau des révisions : ajout et suppression', async ({ app }) => {
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    await app.getByRole('button', { name: '+ Ajouter une révision' }).click();
    const lignes = app.locator('table tbody tr');
    await expect(lignes).toHaveCount(2);
    await lignes.nth(1).locator('input').nth(2).fill('Mise à jour des charges');
    await lignes.nth(1).getByRole('button', { name: 'Supprimer' }).click();
    await expect(lignes).toHaveCount(1);
  });

  test('modèle d\'entreprise : enregistrer, appliquer, exporter, importer', async ({ app }) => {
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    const rs = app.locator('section input[type=text]').first();
    await rs.fill('Modèle SA'); await app.getByRole('button', { name: 'Enregistrer comme modèle' }).click();
    await rs.fill('Autre'); await app.getByRole('button', { name: 'Appliquer le modèle' }).click();
    await expect(rs).toHaveValue('Modèle SA');
    const [d] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Exporter' }).click()]);
    const f = (await d.path())!;
    expect(JSON.parse(readFileSync(f, 'utf8')).format).toBe('poteaux-ec2-modele');
    await rs.fill('Encore autre');
    await app.locator('input[type=file][accept=".json"]').setInputFiles(f);
    await expect(rs).toHaveValue('Modèle SA');
  });

  test('diagnostic : rapport et vidage du journal', async ({ app }) => {
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    const [d] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Télécharger le rapport' }).click()]);
    const r = JSON.parse(readFileSync((await d.path())!, 'utf8'));
    expect(r.version).toBeTruthy(); expect(Array.isArray(r.journal)).toBe(true);
    await app.getByRole('button', { name: 'Vider le journal' }).click();
    await expect(app.getByText('Journal vidé.')).toBeVisible();
  });
});
