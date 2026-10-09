import { test, expect, ouvrirAvance } from './outils';

test.describe('Robustesse des saisies', () => {
  test('valeurs extrêmes dans chaque champ : aucune erreur, application toujours utilisable', async ({ app }) => {
    await app.getByRole('combobox').filter({ hasText: 'Compression centrée' }).selectOption('flexion_composee');
    await ouvrirAvance(app);
    const champs = app.locator('section input[type=number]');
    const n = await champs.count();
    for (let i = 0; i < n; i++) {
      const c = champs.nth(i); const init = await c.inputValue();
      for (const v of ['0', '-5', '1e9', '0.0001']) { await c.fill(v); await c.blur(); }
      await c.fill(init); await c.blur();
    }
    await expect(app.locator('[data-empreinte]')).toBeVisible();
    await expect(app.getByText('Données à corriger')).toHaveCount(0);
  });

  test('stockage corrompu : démarrage sûr', async ({ app }) => {
    await app.evaluate(() => localStorage.setItem('poteaux-ec2-projet-v1', '{pas du JSON'));
    await app.reload();
    await expect(app.getByText(/était illisible/)).toBeVisible();
  });
});

test.describe('Compatibilité des navigateurs', () => {
  test('navigateur trop ancien : bandeau d\'avertissement, application utilisable', async ({ page }) => {
    await page.addInitScript(() => { const orig = CSS.supports.bind(CSS); (CSS as unknown as { supports: typeof CSS.supports }).supports = ((a: string, b?: string) => (String(a) + String(b)).includes('color-mix') ? false : (b === undefined ? orig(a) : orig(a, b))) as typeof CSS.supports; });
    await page.goto('/');
    await expect(page.getByRole('alert').filter({ hasText: 'trop ancien' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer quand même' }).click();
    await expect(page.getByText('trop ancien')).toHaveCount(0);
    await expect(page.locator('[data-empreinte]')).toBeVisible();
  });

  test('navigateur récent : pas de bandeau', async ({ app }) => {
    await expect(app.getByText('trop ancien')).toHaveCount(0);
  });

  test('aucune ressource externe chargée (fonctionnement hors ligne)', async ({ page }) => {
    const externes: string[] = [];
    page.on('request', r => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) externes.push(r.url()); });
    await page.goto('/'); await page.waitForLoadState('networkidle');
    expect(externes).toEqual([]);
  });
});
