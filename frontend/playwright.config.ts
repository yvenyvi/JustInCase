import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Auto-start Vite before any test; reuse it if already running (e.g. during active dev).
  // stdout: 'pipe' lets Playwright detect the "ready" message from Vite.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
  },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    // 30s gives enough headroom for the first page load after a cold Vite start
    navigationTimeout: 30_000,
  },

  projects: [
    // Auth state setup — runs before role-specific suites
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Unauthenticated tests (login page, registration, forgot password)
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Admin portal tests
    {
      name: 'admin',
      testMatch: /admin\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/admin.json',
      },
    },

    // Public user portal tests
    {
      name: 'public',
      testMatch: /public\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/public.json',
      },
    },

    // Legal attorney portal tests
    {
      name: 'legal',
      testMatch: /legal\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/legal.json',
      },
    },

    // Screenshot capture — no auth dependency for public pages
    {
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },

    // Targeted T&C gate verification (manages its own login flow; needs auth files pre-generated)
    {
      name: 'verify-tc',
      testMatch: /verify_tc\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
