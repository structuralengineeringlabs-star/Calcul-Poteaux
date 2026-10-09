import { test, expect, empreinte, ouvrirAvance, libelle } from './outils';

test.describe('Étape Données', () => {
  test('chaque champ numérique agit sur le calcul et reste mémorisé après rechargement', async ({ app }) => {
    await app.getByRole('combobox').filter({ hasText: 'Compression centrée' }).selectOption('flexion_composee');
    await ouvrirAvance(app);
    await app.getByRole('combobox').filter({ hasText: 'Coefficient β' }).selectOption('k');
    const champs = app.locator('section input[type=number]');
    const n = await champs.count();
    expect(n).toBeGreaterThanOrEqual(20);
    const sansEffet: string[] = [];
    for (let i = 0; i < n; i++) {
      const c = champs.nth(i);
      const avant = await empreinte(app);
      const v = parseFloat(await c.inputValue()) || 0;
      const nouv = v === 0 ? 5 : Math.round(v * 1.2 * 100) / 100 + (Number.isInteger(v) ? 1 : 0);
      await c.fill(String(nouv)); await c.blur();
      if ((await empreinte(app)) === avant) sansEffet.push(`${await libelle(app, i)} (${v} → ${nouv})`);
    }
    // ψ2 ou valeurs sans effet visible sur ce cas : tolérées, mais listées
    expect(sansEffet, `Champs sans effet : ${sansEffet.join(' ; ')}`).toHaveLength(0);
    const avant = await empreinte(app);
    await app.reload();
    await expect(app.locator('[data-empreinte]')).toHaveAttribute('data-empreinte', avant!);
  });

  test('chaque liste déroulante accepte toutes ses valeurs sans erreur', async ({ app }) => {
    await app.getByRole('combobox').filter({ hasText: 'Compression centrée' }).selectOption('flexion_composee');
    await ouvrirAvance(app);
    // poignées liées aux éléments (le masquage d'une liste ne décale pas les suivantes)
    // le choix du matériau remplace toute l'étape : il est testé à part (acier.spec.ts)
    const listes = await app.locator('section select:not(#materiau-poteau)').elementHandles();
    let testees = 0;
    for (const l of listes) {
      if (!(await l.isVisible())) continue;
      const initial = await l.inputValue();
      const options = await l.$$eval('option', os => os.map(o => (o as HTMLOptionElement).value));
      for (const o of options) {
        if (!(await l.isVisible())) break; // la liste a pu être masquée par un choix précédent
        await l.selectOption(o, { timeout: 3000 });
        await expect(app.locator('[data-empreinte]')).toBeVisible();
      }
      if (await l.isVisible()) await l.selectOption(initial, { timeout: 3000 });
      testees++;
    }
    expect(testees).toBeGreaterThanOrEqual(12);
  });

  test('les 8 formes de section se calculent et se dessinent', async ({ app }) => {
    const forme = app.getByRole('combobox').filter({ hasText: 'Rectangulaire' });
    for (const s of ['circ', 'hex', 'demi', 'quart', 'L', 'T', 'croix', 'rect']) {
      await forme.selectOption(s);
      await expect(app.locator('[data-verdict]')).not.toHaveAttribute('data-verdict', '');
      await expect(app.locator('svg polygon').first()).toBeVisible();
    }
  });

  test('cases à cocher : poids propre et charges transversales', async ({ app }) => {
    const pp = app.getByRole('checkbox', { name: 'Ajouter le poids propre du poteau' });
    const avant = await empreinte(app);
    await pp.uncheck(); expect(await empreinte(app)).not.toBe(avant);
    await pp.check(); expect(await empreinte(app)).toBe(avant);
    await app.getByRole('combobox').filter({ hasText: 'Compression centrée' }).selectOption('flexion_composee');
    const tr = app.getByRole('checkbox', { name: 'Moments dus à des charges transversales' });
    const a2 = await empreinte(app); await tr.check(); expect(await empreinte(app)).not.toBe(a2);
  });

  test('catégorie d\'usage : ψ1 et ψ2 remplis automatiquement', async ({ app }) => {
    await app.getByRole('combobox').filter({ hasText: 'A — Habitation' }).selectOption('E');
    const psi = app.locator('div.grid', { hasText: 'ψ1 / ψ2' }).last().locator('input');
    await expect(psi.nth(0)).toHaveValue('0.9');
    await expect(psi.nth(1)).toHaveValue('0.8');
  });

  test('saisie invalide : message, champ en rouge, verdict « non vérifié »', async ({ app }) => {
    const largeur = app.locator('section input[type=number]').first();
    await largeur.fill('0'); await largeur.blur();
    await expect(app.getByText('Données à corriger')).toBeVisible();
    await expect(largeur).toHaveAttribute('aria-invalid', 'true');
    await expect(app.locator('[data-verdict]')).toHaveAttribute('data-verdict', 'NV');
    await largeur.fill('30'); await largeur.blur();
    await expect(app.getByText('Données à corriger')).toHaveCount(0);
  });
});
