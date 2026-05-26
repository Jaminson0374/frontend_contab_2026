import { defineConfig } from 'vitest/config';
import { angularVitestPlugin } from './angular-vitest-plugin';

export default defineConfig({
  plugins: [angularVitestPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/setup-vitest.ts'],
    globals: true,
  },
});
