import { test, expect, type Page, type Locator } from '@playwright/test';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { manuelHTML, manuelMarkdown } from '../../src/manuel/rendu';
import { MANUEL } from '../../src/manuel/contenu';
import { APP_VERSION } from '../../src/version';

const DIR = 'public/manuel';
const shot = (cible: Page | Locator, nom: string) => cible.screenshot({ path: `${DIR}/${nom}`, type: 'jpeg', quality: 82 });
const etape = (p: Page, nom: string) => p.getByRole('navigation', { name: 'Étapes du calcul' }).getByRole('button', { name: nom }).click();

test('captures d\'écran, manuel Markdown et PDF', async ({ page, context, browser }) => {
  mkdirSync(DIR, { recursive: true }); mkdirSync('docs/manuel', { recursive: true });
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('poteaux-ec2-bienvenue', 'vu'); });
  await page.goto('/');
  await expect(page.locator('[data-empreinte]')).toBeVisible();

  // Écran général et aide
  await shot(page, 'ecran-general.jpg');
  await page.getByRole('button', { name: "Aide : Classe d'exposition" }).click();
  await shot(page, 'aide-contextuelle.jpg');
  await page.keyboard.press('Escape');

  // Options avancées (flexion composée pour un cas représentatif)
  await page.getByRole('combobox').filter({ hasText: 'Compression centrée' }).selectOption('flexion_composee');
  await page.locator('button[aria-controls="options-avancees-contenu"]').click();
  await page.waitForTimeout(900);
  await shot(page, 'donnees-avancees.jpg');
  await page.locator('button[aria-controls="options-avancees-contenu"]').click();

  // Erreur de saisie
  const b = page.locator('section input[type=number]').first();
  await page.evaluate(() => window.scrollTo(0, 0));
  await b.fill('0'); await b.blur(); await page.waitForTimeout(300);
  await shot(page, 'erreur-saisie.jpg');
  await b.fill('300'); await b.blur(); // mm depuis la v4.0

  // Armatures : proposition
  await etape(page, 'Armatures');
  await page.getByRole('button', { name: 'Proposer' }).click();
  await expect(page.getByRole('button', { name: 'Appliquer' }).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'armatures-proposition.jpg');

  // Vérifications
  await etape(page, 'Vérifications');
  await page.locator('section button[class*="grid-cols-"]').first().click();
  await shot(page, 'verifications.jpg');

  // Projet à plusieurs poteaux
  const rail = page.getByRole('complementary', { name: 'Projet et poteaux' });
  await rail.getByRole('button', { name: 'Dupliquer le poteau actif' }).click();
  await rail.getByRole('button', { name: /Nouveau/ }).click();
  const h = page.locator('section input[type=number]');
  await etape(page, 'Données');
  await h.nth(0).fill('25'); await h.nth(1).fill('25'); await h.nth(1).blur();
  await etape(page, 'Documents');
  await shot(page, 'documents.jpg');
  // liste des poteaux (P3 non conforme, en cours de renommage) et récapitulatif en haut de l'écran
  await page.evaluate(() => { const el = [...document.querySelectorAll('h3')].find(h => h.textContent?.startsWith('Récapitulatif')); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 150); });
  await rail.getByRole('button', { name: 'Renommer' }).last().click({ force: true });
  await shot(page, 'projet-poteaux.jpg');
  await rail.locator('input').press('Escape'); await rail.locator('input').fill('P3').catch(() => {}); await page.keyboard.press('Enter');

  // Plan
  const apercu = page.locator('section').getByText('Aperçu du plan').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await apercu.scrollIntoViewIfNeeded();
  await shot(apercu.locator('div.min-w-\\[760px\\]'), 'plan.jpg');

  // Note de calcul (page de calcul)
  await rail.getByText('P1').click();
  const [note] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: "Aperçu à l'écran" }).click()]);
  await expect.poll(() => note.locator('.pagedjs_page').count(), { timeout: 60_000 }).toBeGreaterThan(8);
  await note.waitForTimeout(1500);
  await shot(note.locator('.pagedjs_page').nth(8), 'note-calcul.jpg');
  await note.close();

  // Réglages
  await page.getByRole('button', { name: 'Cartouche et réglages' }).first().click();
  await shot(page, 'reglages.jpg');

  // Téléphone
  const tel = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await tel.goto('/'); await tel.evaluate(() => localStorage.setItem('poteaux-ec2-bienvenue', 'vu')); await tel.reload();
  await expect(tel.locator('[data-empreinte]')).toBeVisible();
  await shot(tel, 'telephone.jpg');
  await tel.close();

  // Contrôle : chaque image citée dans le contenu existe
  const images = MANUEL.flatMap(s => s.blocs.flatMap(b => ('image' in b ? [b.image] : [])));
  for (const i of images) expect(readFileSync(`${DIR}/${i}`).length, `capture manquante : ${i}`).toBeGreaterThan(5000);

  // Markdown
  writeFileSync('docs/manuel/MANUEL_UTILISATEUR.md', manuelMarkdown(f => `../../public/manuel/${f}`, APP_VERSION));

  // PDF (images intégrées en base64)
  const pdf = await browser.newPage();
  await pdf.setContent(manuelHTML(f => `data:image/jpeg;base64,${readFileSync(`${DIR}/${f}`).toString('base64')}`, APP_VERSION), { waitUntil: 'load' });
  await pdf.pdf({ path: 'docs/manuel/Manuel_utilisateur.pdf', format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7px;width:100%;padding:0 16mm;color:#777;font-family:Arial">Manuel d'utilisation — Poteaux EC2 v${APP_VERSION}</div>`,
    footerTemplate: '<div style="font-size:7px;width:100%;text-align:right;padding:0 16mm;color:#777;font-family:Arial">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '18mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  await pdf.close();
});
