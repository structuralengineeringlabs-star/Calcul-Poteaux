import { expect, type Page, test as base } from '@playwright/test';

/** Page propre (stockage vidé) avec capture des erreurs JavaScript ; échec du test si une erreur survient. */
export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); if (!location.hash.includes('accueil')) localStorage.setItem('poteaux-ec2-bienvenue', 'vu'); });
    await page.goto('/');
    await expect(page.locator('[data-empreinte]')).toBeVisible();
    await use(page);
    expect(errors, `Erreurs JavaScript : ${errors.join(' | ')}`).toEqual([]);
    await expect(page.getByText("Une erreur d'affichage est survenue")).toHaveCount(0);
  },
});
export { expect };

export const empreinte = (p: Page) => p.locator('[data-empreinte]').getAttribute('data-empreinte');
export const etape = (p: Page, nom: 'Données' | 'Armatures' | 'Vérifications' | 'Documents') =>
  p.getByRole('navigation', { name: 'Étapes du calcul' }).getByRole('button', { name: nom }).click();
export async function ouvrirAvance(p: Page) {
  const b = p.locator('button[aria-controls="options-avancees-contenu"]');
  if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click();
  await expect(p.locator('#options-avancees-contenu')).toBeVisible();
}
/** Libellé de la ligne (colonne de gauche) contenant un champ. */
export const libelle = (p: Page, i: number) =>
  p.locator('section input[type=number]').nth(i).evaluate(el => (el.closest('.grid')?.firstElementChild as HTMLElement | null)?.innerText.split('\n')[0] ?? '?');
