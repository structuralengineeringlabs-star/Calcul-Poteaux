import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout (phase B) et compatibilité (phase C).
 *   npm run e2e                → Chromium : portable 1366×768, grand écran 1920×1080, tablette, téléphone
 *   E2E_TOUS=1 npm run e2e     → ajoute Firefox et WebKit (Safari) après « npx playwright install »
 */
const all = !!process.env.E2E_TOUS;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e.json' }]],
  use: { baseURL: 'http://localhost:4173', acceptDownloads: true, trace: 'retain-on-failure', locale: 'fr-FR' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'portable-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'ecran-1920', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } }, grep: /@ecran|@adaptatif/ },
    { name: 'tablette', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true }, grep: /@ecran|@adaptatif/ },
    { name: 'telephone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: false }, grep: /@ecran|@adaptatif/ },
    ...(all ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } } },
      { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1366, height: 768 } } },
    ] : []),
  ],
});
