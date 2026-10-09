import { readFileSync } from 'fs';
import { test, expect, etape } from './outils';

test.describe('Étape Documents', () => {
  test('note de calcul en PDF téléchargée directement (poteau et projet), plans A3 séparés', async ({ app }) => {
    await etape(app, 'Documents');
    for (const portee of ['actif', 'projet']) {
      await app.locator('section select').filter({ hasText: 'Poteau' }).first().selectOption(portee);
      const [d] = await Promise.all([app.waitForEvent('download', { timeout: 60_000 }), app.getByRole('button', { name: 'Télécharger la note (PDF)' }).click()]);
      expect(d.suggestedFilename()).toMatch(/_note-de-calcul_ind-[A-Z]+_\d{4}-\d{2}-\d{2}\.pdf$/);
      const pdf = readFileSync((await d.path())!);
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdf.length).toBeGreaterThan(100_000);
    }
    await expect(app.getByRole('status').filter({ hasText: 'téléchargé' })).toBeVisible();
    const [p] = await Promise.all([app.waitForEvent('download', { timeout: 60_000 }), app.getByRole('button', { name: 'Plans A3 (PDF)' }).click()]);
    expect(p.suggestedFilename()).toMatch(/_plans-A3_/);
    expect(readFileSync((await p.path())!).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('volumétrie : 20 poteaux, interface réactive pendant la génération (Web Worker)', async ({ app }) => {
    test.setTimeout(120_000);
    const rail = app.getByRole('complementary', { name: 'Projet et poteaux' });
    for (let i = 0; i < 19; i++) await rail.getByRole('button', { name: 'Dupliquer le poteau actif' }).click();
    await expect(rail.getByText('P20')).toBeVisible();
    await etape(app, 'Documents');
    await app.locator('section select').filter({ hasText: 'Poteau' }).first().selectOption('projet');
    const t0 = Date.now();
    const telechargement = app.waitForEvent('download', { timeout: 90_000 });
    await app.getByRole('button', { name: 'Télécharger la note (PDF)' }).click();
    await expect(app.getByRole('button', { name: 'Génération de la note…' })).toBeVisible();
    // pendant la génération, l'interface répond (fil principal libre)
    const t1 = Date.now();
    await etape(app, 'Données');
    await expect(app.getByRole('heading', { name: 'Géométrie' })).toBeVisible({ timeout: 1500 });
    expect(Date.now() - t1).toBeLessThan(1500);
    await etape(app, 'Documents');
    const d = await telechargement;
    const pdf = readFileSync((await d.path())!);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    expect(pages).toBeGreaterThan(140);
    // Borne tolérante : la suite complète exécute 4 navigateurs en parallèle. La mesure de performance
    // (critère A7 : moins de 15 s) se fait seule : npx playwright test -g volumétrie --workers=1
    expect(Date.now() - t0).toBeLessThan(process.env.E2E_PERF ? 15_000 : 90_000);
  });

  test('aperçu à l\'écran : vrai onglet (blob:), impression active après la mise en page', async ({ app, context }) => {
    await etape(app, 'Documents');
    const [note] = await Promise.all([context.waitForEvent('page'), app.getByRole('button', { name: "Aperçu à l'écran" }).click()]);
    await note.waitForLoadState();
    expect(note.url()).toMatch(/^blob:/);
    await expect.poll(() => note.locator('.pagedjs_page').count(), { timeout: 30_000 }).toBeGreaterThan(5);
    await expect(note.locator('#btn-print')).toBeEnabled({ timeout: 30_000 });
    await expect(note.locator('#btn-print')).toHaveText('Imprimer / PDF');
    await expect(note.getByText('Identifiant de calcul').first()).toBeVisible();
    await note.close();
  });

  test('téléchargements : DXF, SVG, CSV', async ({ app }) => {
    await etape(app, 'Documents');
    const dl = async (nom: RegExp | string) => {
      const [d] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: nom }).first().click()]);
      return readFileSync((await d.path())!, 'latin1');
    };
    expect(await dl('DXF')).toMatch(/^0\r\nSECTION[\s\S]*AC1009[\s\S]*EOF\r\n$/);
    expect(await dl('SVG')).toContain('<svg');
    expect(await dl('Exporter en CSV')).toContain('"Poteau";"Section"');
  });

  test('DXF + logo en archive ZIP (lisible, contenu attendu)', async ({ app }) => {
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
    await app.locator('input[type=file][accept^="image"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
    await app.getByRole('button', { name: '← Retour au calcul' }).click();
    await etape(app, 'Documents');
    const [d] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'DXF + logo (ZIP)' }).click()]);
    const z = readFileSync((await d.path())!);
    expect(z.readUInt32LE(0)).toBe(0x04034b50);
    const txt = z.toString('latin1');
    for (const f of ['.dxf', 'LISEZMOI.txt', 'logo.png']) expect(txt).toContain(f);
  });

  test('projet : enregistrer, modifier, rouvrir', async ({ app }) => {
    await etape(app, 'Documents');
    const [d] = await Promise.all([app.waitForEvent('download'), app.getByRole('button', { name: 'Enregistrer' }).click()]);
    const fichier = (await d.path())!;
    await app.getByRole('button', { name: /Nouveau/ }).first().click();
    await expect(app.getByText('P2').first()).toBeVisible();
    await app.locator('input[type=file][accept*="json"]').first().setInputFiles(fichier);
    await expect(app.getByText('Projet chargé.')).toBeVisible();
    await expect(app.getByText('P2')).toHaveCount(0);
  });

  test('import d\'un fichier invalide : message clair', async ({ app }) => {
    await etape(app, 'Documents');
    await app.locator('input[type=file][accept*="json"]').first().setInputFiles({ name: 'faux.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"autre"}') });
    await expect(app.getByText(/non reconnu/)).toBeVisible();
  });
});
