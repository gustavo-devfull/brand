import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Exercise the production server: `next dev` allows only one instance per
    // directory, and the demo workspace is seeded per cookie, so every run
    // starts from a known state either way.
    command: `npx next build && npx next start --port ${port}`,
    // Os testes rodam no workspace local determinístico. Sem isto, cada teste criaria
    // um usuário anônimo no projeto Supabase de verdade.
    env: { NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
