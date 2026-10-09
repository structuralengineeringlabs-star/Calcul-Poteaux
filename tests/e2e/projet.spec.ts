import { test, expect, empreinte } from './outils';

test.describe('Liste des poteaux', () => {
  test('nouveau, dupliquer, renommer, changer de poteau, supprimer', async ({ app }) => {
    const rail = app.getByRole('complementary', { name: 'Projet et poteaux' });
    const b = app.locator('section input[type=number]').first(); await b.fill('35'); await b.blur();
    const e1 = await empreinte(app);
    await rail.getByRole('button', { name: 'Dupliquer le poteau actif' }).click();
    await expect(rail.getByText('P2')).toBeVisible();
    expect(await empreinte(app)).toBe(e1);                      // copie conforme
    await rail.getByRole('button', { name: /Nouveau/ }).click();
    await expect(rail.getByText('P3')).toBeVisible();
    expect(await empreinte(app)).not.toBe(e1);                  // valeurs par défaut
    await rail.getByRole('button', { name: 'Renommer' }).last().click({ force: true });
    await rail.locator('input').fill('P3-angle'); await rail.locator('input').press('Enter');
    await expect(rail.getByText('P3-angle')).toBeVisible();
    await rail.getByText('P1').click();
    expect(await empreinte(app)).toBe(e1);
    app.once('dialog', d => d.accept());
    await rail.getByRole('button', { name: 'Supprimer' }).last().click({ force: true });
    await expect(rail.getByText('P3-angle')).toHaveCount(0);
  });
});
