import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { exclude: ['tests/e2e/**', 'tests/manuel/**', 'node_modules/**', 'dist/**'] },
});
