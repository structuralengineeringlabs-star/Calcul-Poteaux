import { test, expect, empreinte, etape } from './outils';

test.describe('Étape Armatures', () => {
  test('diamètres, nombre de barres, espacement : effet sur le calcul', async ({ app }) => {
    await etape(app, 'Armatures');
    for (const [liste, val] of [['HA16', '20'], ['HA8', '10']] as const) {
      const avant = await empreinte(app);
      await app.locator('section select').filter({ hasText: liste }).first().selectOption(val);
      expect(await empreinte(app)).not.toBe(avant);
    }
    for (const i of [0, 1]) {
      const c = app.locator('section input[type=number]').nth(i);
      const avant = await empreinte(app);
      await c.fill(i === 0 ? '6' : '150'); await c.blur();
      expect(await empreinte(app)).not.toBe(avant);
    }
  });

  test('proposition automatique puis « Appliquer »', async ({ app }) => {
    await etape(app, 'Armatures');
    await app.getByRole('button', { name: 'Proposer' }).click();
    const appliquer = app.getByRole('button', { name: 'Appliquer' }).first();
    await expect(appliquer).toBeVisible({ timeout: 20_000 });
    const armature = (await app.locator('table tbody tr').first().locator('td').first().innerText()).trim(); // ex. « 4 HA12 »
    await appliquer.click();
    await expect(app.getByText(`${armature.split(' ')[0]} HA${armature.split('HA')[1]}`).first()).toBeVisible();
    await expect(app.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'OK');
  });

  test('panneau Ancrages : ouverture et chaque réglage', async ({ app }) => {
    await etape(app, 'Armatures');
    const b = app.locator('button[aria-controls="ancrages-contenu"]');
    await b.click(); await expect(app.locator('#ancrages-contenu')).toBeVisible();
    const zone = app.locator('#ancrages-contenu');
    const adh = zone.locator('select').filter({ hasText: 'Bonne' });
    let avant = await empreinte(app); await adh.selectOption('mediocre'); expect(await empreinte(app)).not.toBe(avant);
    const nums = zone.locator('input[type=number]');
    for (let i = 0; i < await nums.count(); i++) {
      avant = await empreinte(app); await nums.nth(i).fill('50'); await nums.nth(i).blur();
      expect(await empreinte(app), `champ ${i} du panneau Ancrages sans effet`).not.toBe(avant);
    }
    await zone.locator('select').filter({ hasText: 'Calculées' }).selectOption('saisi');
    await expect(zone.getByRole('button', { name: 'Aide : Ancrage' })).toBeVisible();
  });
});
