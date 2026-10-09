import { test, expect, etape } from './outils';

test.describe('Ergonomie (lot 4)', () => {
  test('aide contextuelle : bulle, contenu, fermeture par Échap et clic extérieur', async ({ app }) => {
    const aides = app.getByRole('button', { name: /^Aide : / });
    expect(await aides.count()).toBeGreaterThan(15);
    await app.getByRole('button', { name: "Aide : Classe d'exposition" }).click();
    const bulle = app.getByRole('tooltip');
    await expect(bulle).toContainText('XC4');
    await expect(bulle).toContainText('tab. 4.1');
    await app.keyboard.press('Escape');
    await expect(bulle).toHaveCount(0);
    await app.getByRole('button', { name: 'Aide : Béton' }).click();
    await expect(app.getByRole('tooltip')).toBeVisible();
    await app.locator('header').click({ position: { x: 5, y: 5 } });
    await expect(app.getByRole('tooltip')).toHaveCount(0);
  });

  test('raccourcis Alt + 1 à 4', async ({ app }) => {
    await app.keyboard.press('Alt+3');
    await expect(app.getByRole('button', { name: /À traiter/ })).toBeVisible();
    await app.keyboard.press('Alt+4');
    await expect(app.getByRole('button', { name: 'Télécharger la note (PDF)' })).toBeVisible();
    await app.keyboard.press('Alt+1');
    await expect(app.getByRole('heading', { name: 'Géométrie' })).toBeVisible();
  });

  test('message d\'accueil : lien vers le parcours type, masquage mémorisé', async ({ app }) => {
    await app.evaluate(() => localStorage.removeItem('poteaux-ec2-bienvenue')); await app.reload();
    await expect(app.getByText('Bienvenue.')).toBeVisible();
    await app.getByRole('button', { name: 'Masquer' }).first().click();
    await app.reload();
    await expect(app.getByText('Bienvenue.')).toHaveCount(0);
  });

  test('manuel intégré : sommaire, sections, images chargées', async ({ app }) => {
    await app.getByRole('button', { name: "Manuel d'utilisation" }).first().click();
    const sommaire = app.getByRole('navigation', { name: 'Sommaire du manuel' });
    await expect(sommaire.getByRole('link')).toHaveCount(15);
    await sommaire.getByRole('link', { name: /Parcours type/ }).click();
    await expect(app.getByRole('heading', { name: /Parcours type/ })).toBeInViewport();
    const imgs = app.locator('article.manuel img');
    expect(await imgs.count()).toBe(12);
    for (let i = 0; i < 12; i++) {
      await imgs.nth(i).scrollIntoViewIfNeeded();
      await expect.poll(() => imgs.nth(i).evaluate(im => (im as HTMLImageElement).naturalWidth)).toBeGreaterThan(300);
    }
    await app.getByRole('button', { name: '← Retour au calcul' }).click();
    await expect(app.getByRole('heading', { name: 'Géométrie' })).toBeVisible();
  });

  test('l\'ancienne interface détaillée n\'existe plus', async ({ app }) => {
    await expect(app.getByRole('button', { name: /Interface détaillée/ })).toHaveCount(0);
  });

  test('étape Données : sans défilement horizontal, aide accessible au clavier', async ({ app }) => {
    await etape(app, 'Données');
    const b = app.getByRole('button', { name: 'Aide : Largeur b' });
    await b.focus(); await app.keyboard.press('Enter');
    await expect(app.getByRole('tooltip')).toBeVisible();
  });
});
