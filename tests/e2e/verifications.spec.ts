import { test, expect, etape } from './outils';

test.describe('Étape Vérifications', () => {
  test('filtres et dépliage de chaque vérification', async ({ app }) => {
    await etape(app, 'Vérifications');
    const lignes = app.locator('section button[class*="grid-cols-"]');
    const n = await lignes.count();
    expect(n).toBeGreaterThan(15);
    for (let i = 0; i < n; i++) {
      const l = lignes.nth(i);
      await l.click();
      await expect(l).toBeVisible();
    }
    await app.getByRole('button', { name: /À traiter/ }).click();
    await expect(app.getByRole('button', { name: /Toutes/ })).toBeVisible();
    await app.getByRole('button', { name: /Toutes/ }).click();
    expect(await lignes.count()).toBe(n);
  });

  test('une non-conformité du panneau de résultats mène à sa vérification', async ({ app }) => {
    const esp = app.locator('section input[type=number]').nth(0); // largeur b
    await esp.fill('20'); await esp.blur();
    const h = app.locator('section input[type=number]').nth(1); await h.fill('20'); await h.blur();
    await expect(app.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'KO');
    await app.getByRole('complementary', { name: 'Résultats' }).locator('button.text-red-700').first().click();
    await expect(app.getByRole('button', { name: /À traiter/ })).toHaveClass(/bg-primary/);
  });
});
