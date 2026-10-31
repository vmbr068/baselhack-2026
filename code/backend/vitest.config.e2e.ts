import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      ALLOWED_SITE_ORIGINS: 'file:,http://localhost:5173,http://127.0.0.1:9999',
      APPROVER_PASSWORD: 'e2e-approver-password',
    },
  },
});
