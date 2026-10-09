import { test, expect, empreinte } from './outils';

/** Éditeur interactif de section (v4.0) : saisie en mm, cotes au clavier, saisie directe, glisser. @ecran */
test.describe('Éditeur de section @ecran', () => {
  test('cotes au clavier et saisie directe, synchronisées avec les champs en mm', async ({ app }) => {
    const editeur = app.getByRole('group', { name: 'Éditeur de section' });
    await expect(editeur).toBeVisible();
    const avant = await empreinte(app);
    const coteB = editeur.locator('[data-cote="b"]');
    await coteB.focus();
    await app.keyboard.press('Shift+ArrowUp');
    await expect(editeur.locator('[data-cote="b"] text')).toHaveText('310');
    expect(await empreinte(app)).not.toBe(avant);
    await app.keyboard.press('Enter');
    await app.getByLabel('Largeur b (mm)').fill('350');
    await app.keyboard.press('Enter');
    await expect(editeur.locator('[data-cote="b"] text')).toHaveText('350');
  });

  test('glisser une cote et changer de forme', async ({ app }) => {
    const editeur = app.getByRole('group', { name: 'Éditeur de section' });
    const poignee = editeur.locator('[data-poignee="h"]');
    await poignee.scrollIntoViewIfNeeded();
    const bb = await poignee.boundingBox();
    if (bb) {
      await app.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await app.mouse.down();
      await app.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 + 25, { steps: 5 });
      await app.mouse.up();
    }
    expect(Number(await editeur.locator('[data-cote="h"] text').textContent())).toBeGreaterThan(400);
    const liste = app.getByRole('combobox').filter({ hasText: 'Rectangulaire' });
    for (const forme of ['circ', 'hex', 'demi', 'quart', 'L', 'T', 'croix']) {
      await liste.selectOption(forme);
      await expect(editeur.locator('[data-cote]').first()).toBeVisible();
    }
  });
});
