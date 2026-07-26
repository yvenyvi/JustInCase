/**
 * Screenshot capture script — navigates every portal page for each role
 * and saves screenshots to documentation/screenshots/.
 * Run with: npx playwright test tests/screenshots.spec.ts --project=screenshots
 */
import { test, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '../documentation/screenshots');

/** Wait for the page to be fully settled — data loaded, spinners gone, animations done. */
async function waitForFullLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  // Dismiss any loading spinners / skeletons
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll(
      '[class*="spinner"], [class*="skeleton"], [class*="loading"], [aria-label*="loading"], [class*="shimmer"]'
    );
    return spinners.length === 0;
  }, { timeout: 10_000 }).catch(() => {/* spinner selector might not match — that's fine */});
  // Let any CSS transitions / chart renders finish
  await page.waitForTimeout(1200);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function goto(page: Page, url: string) {
  await page.goto(url);
  await waitForFullLoad(page);
}

// ── Public / unauthenticated pages ──────────────────────────────────────────

test.describe('Public pages', () => {
  test('landing page', async ({ page }) => {
    await goto(page, '/');
    await shot(page, '00_landing');
  });

  test('login page', async ({ page }) => {
    await goto(page, '/login');
    await shot(page, '01_login');
  });

  test('register page', async ({ page }) => {
    await goto(page, '/register');
    await shot(page, '02_register');
  });

  test('forgot password page', async ({ page }) => {
    await goto(page, '/forgot-password');
    await shot(page, '03_forgot_password');
  });
});

// ── Citizen portal ────────────────────────────────────────────────────────────

test.describe('Citizen portal', () => {
  test.use({ storageState: 'tests/.auth/public.json' });

  const pages = [
    { url: '/public/dashboard',     name: '10_citizen_dashboard' },
    { url: '/public/triage',        name: '11_citizen_triage' },
    { url: '/public/rights',        name: '12_citizen_rights_library' },
    { url: '/public/documents',     name: '13_citizen_document_generator' },
    { url: '/public/messages',      name: '14_citizen_messages' },
    { url: '/public/notifications', name: '15_citizen_notifications' },
    { url: '/public/profile',       name: '16_citizen_profile' },
  ];

  for (const { url, name } of pages) {
    test(name, async ({ page }) => {
      await goto(page, url);
      await shot(page, name);
    });
  }
});

// ── Attorney portal ───────────────────────────────────────────────────────────

test.describe('Attorney portal', () => {
  test.use({ storageState: 'tests/.auth/legal.json' });

  const pages = [
    { url: '/legal/dashboard',    name: '20_attorney_dashboard' },
    { url: '/legal/cases',        name: '21_attorney_cases' },
    { url: '/legal/clients',      name: '22_attorney_clients' },
    { url: '/legal/notifications', name: '23_attorney_notifications' },
    { url: '/legal/probono',      name: '24_attorney_probono_hub' },
    { url: '/legal/service-logs', name: '25_attorney_service_logs' },
    { url: '/legal/messages',     name: '26_attorney_messages' },
    { url: '/legal/profile',      name: '27_attorney_profile' },
  ];

  for (const { url, name } of pages) {
    test(name, async ({ page }) => {
      await goto(page, url);
      await shot(page, name);
    });
  }
});

// ── Admin portal ──────────────────────────────────────────────────────────────

test.describe('Admin portal', () => {
  test.use({ storageState: 'tests/.auth/admin.json' });

  const pages = [
    { url: '/admin/dashboard',              name: '30_admin_dashboard' },
    { url: '/admin/accounts',               name: '31_admin_accounts' },
    { url: '/admin/attorney-verifications', name: '32_admin_attorney_verifications' },
    { url: '/admin/logs',                   name: '33_admin_audit_logs' },
    { url: '/admin/settings',               name: '34_admin_system_settings' },
    { url: '/admin/cases',                  name: '35_admin_case_management' },
  ];

  for (const { url, name } of pages) {
    test(name, async ({ page }) => {
      await goto(page, url);
      await shot(page, name);
    });
  }
});
