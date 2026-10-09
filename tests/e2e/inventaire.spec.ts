import { writeFileSync, mkdirSync } from 'fs';
import type { Page } from '@playwright/test';
import { test, expect, etape, ouvrirAvance } from './outils';

/** Inventaire des commandes de chaque écran → docs/audit/INVENTAIRE_COMMANDES.md (projet portable-1366 uniquement). */
type Ligne = { ecran: string; type: string; nom: string; couverture: string };

async function relever(p: Page, ecran: string, portee: string, couverture: (type: string, nom: string) => string): Promise<Ligne[]> {
  const items = await p.locator(`${portee} :is(button, select, input, textarea)`).evaluateAll(els => els
    .filter(e => (e as HTMLElement).offsetParent !== null || (e as HTMLInputElement).type === 'file')
    .map(e => {
      const el = e as HTMLInputElement;
      const type = el.tagName === 'INPUT' ? `champ ${el.type || 'texte'}` : el.tagName === 'SELECT' ? 'liste' : el.tagName === 'TEXTAREA' ? 'zone de texte' : 'bouton';
      const row = el.closest('.grid.items-center')?.firstElementChild as HTMLElement | null;
      // libellé le plus proche : ligne compacte, sinon <label> dans les 3 conteneurs parents
      let near = '';
      for (let n = el.parentElement, k = 0; n && k < 3 && !near; n = n.parentElement, k++) near = (n.querySelector('label') as HTMLElement | null)?.innerText ?? '';
      const lab = el.getAttribute('aria-label') || el.getAttribute('title') || (el.tagName === 'BUTTON' ? el.innerText : '') || el.closest('label')?.innerText || row?.innerText.split('\n')[0] || near || el.getAttribute('accept') || '';
      return { type, nom: lab.replace(/\s+/g, ' ').trim().slice(0, 70) };
    }));
  return items.map(i => ({ ecran, ...i, couverture: couverture(i.type, i.nom) }));
}

test('inventaire des commandes', async ({ app }, info) => {
  test.skip(info.project.name !== 'portable-1366', 'inventaire généré une seule fois');
  test.setTimeout(120_000);
  const L: Ligne[] = [];
  const parType = (spec: string) => (t: string, n: string) =>
    t === 'champ number' ? `${spec} (boucle sur tous les champs), robustesse.spec` : t === 'liste' ? `${spec} (boucle sur toutes les listes)` : t === 'champ checkbox' ? spec : n ? spec : spec;
  await app.getByRole('combobox').filter({ hasText: 'Compression centrée' }).selectOption('flexion_composee');
  await ouvrirAvance(app);
  L.push(...await relever(app, 'Rail (projet et poteaux)', 'aside[aria-label="Projet et poteaux"]', () => 'projet.spec, navigation.spec, reglages.spec'));
  L.push(...await relever(app, 'En-tête et étapes', 'header', () => 'navigation.spec, adaptatif.spec'));
  L.push(...await relever(app, 'Étape 1 — Données', 'section', parType('donnees.spec')));
  await etape(app, 'Armatures');
  await app.locator('button[aria-controls="ancrages-contenu"]').click();
  L.push(...await relever(app, 'Étape 2 — Armatures', 'section', parType('armatures.spec')));
  await etape(app, 'Vérifications');
  L.push(...await relever(app, 'Étape 3 — Vérifications', 'section', () => 'verifications.spec (dépliage de chaque ligne, filtres)'));
  await etape(app, 'Documents');
  L.push(...await relever(app, 'Étape 4 — Documents', 'section', () => 'documents.spec'));
  L.push(...await relever(app, 'Panneau de résultats', 'aside[aria-label="Résultats"]', () => 'verifications.spec, adaptatif.spec'));
  await app.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
  L.push(...await relever(app, 'Cartouche et réglages', 'section', () => 'reglages.spec'));
  const parEcran = new Map<string, number>(); for (const l of L) parEcran.set(l.ecran, (parEcran.get(l.ecran) ?? 0) + 1);
  const md = [
    '# Inventaire des commandes', '',
    `Généré par \`npm run e2e\` (tests/e2e/inventaire.spec.ts) le ${new Date().toLocaleDateString('fr-FR')} : **${L.length} commandes** relevées.`,
    'La colonne « Couverture » indique le ou les tests de bout en bout qui exercent la commande.', '',
    '| Écran | Commandes |', '|---|---|', ...[...parEcran].map(([e, n]) => `| ${e} | ${n} |`), '',
    '| Écran | Type | Commande | Couverture |', '|---|---|---|---|',
    ...L.map(l => `| ${l.ecran} | ${l.type} | ${l.nom.replace(/\|/g, '/') || '—'} | ${l.couverture} |`), '',
  ].join('\n');
  mkdirSync('docs/audit', { recursive: true });
  writeFileSync('docs/audit/INVENTAIRE_COMMANDES.md', md);
  expect(L.length).toBeGreaterThan(150);
});
