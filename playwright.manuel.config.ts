import { defineConfig, devices } from '@playwright/test';

/** Génération du manuel illustré : npm run build && npm run manuel */
export default defineConfig({
  testDir: 'tests/manuel',
  timeout: 240_000,
  workers: 1,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173', viewport: { width: 1366, height: 768 }, locale: 'fr-FR' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true, timeout: 60_000 },
});
