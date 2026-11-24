import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 15000,
    globals: true,
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
