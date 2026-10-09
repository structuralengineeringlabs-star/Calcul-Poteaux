import { test, expect, etape } from './outils';

// @ecran @adaptatif : exécutés sur portable, grand écran, tablette et téléphone
test.describe('Affichage selon la taille d\'écran @adaptatif', () => {
  test('pas de débordement horizontal, sur chaque étape @ecran', async ({ app }) => {
    for (const e of ['Données', 'Armatures', 'Vérifications', 'Documents'] as const) {
      await etape(app, e);
      const over = await app.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `débordement horizontal à l'étape ${e}`).toBeLessThanOrEqual(1);
    }
  });

  test('résultats toujours accessibles (panneau ou bande + tiroir) @ecran', async ({ app }) => {
    const w = app.viewportSize()!.width;
    if (w >= 1280) await expect(app.getByRole('complementary', { name: 'Résultats' })).toBeVisible();
    else {
      await expect(app.getByLabel('Résultats principaux')).toBeVisible();
      await app.getByRole('button', { name: 'Détails' }).click();
      const t = app.getByRole('dialog', { name: 'Résultats du calcul' });
      await expect(t).toBeVisible();
      await expect(t.getByText('Taux de travail ELU')).toBeVisible();
      await app.keyboard.press('Escape');
      await expect(t).toHaveCount(0);
    }
  });

  test('menu du projet : rail ou tiroir @ecran', async ({ app }) => {
    const w = app.viewportSize()!.width;
    if (w >= 768) await expect(app.getByRole('complementary', { name: 'Projet et poteaux' })).toBeVisible();
    else {
      await app.getByRole('button', { name: 'Ouvrir le menu' }).click();
      const m = app.getByRole('dialog', { name: 'Menu du projet' });
      await expect(m).toBeVisible();
      await m.getByRole('button', { name: /Nouveau/ }).click();
      await m.getByText('P1').click();
      await expect(m).toHaveCount(0);
    }
  });

  test('panneau « Options avancées » visible après ouverture @ecran', async ({ app }) => {
    await app.locator('button[aria-controls="options-avancees-contenu"]').click();
    await app.waitForTimeout(800);
    const top = await app.locator('#options-avancees-contenu h3').first().evaluate(el => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(app.viewportSize()!.height - 40);
  });
});
