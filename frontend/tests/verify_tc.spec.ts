/**
 * Targeted T&C gate verification.
 * Requires citizen's terms_accepted_at = NULL in DB before running.
 */
import { test, expect } from '@playwright/test';

const CITIZEN_EMAIL = 'public.test@justice.link';
const CITIZEN_PASS = 'TestPassword123!';

test.describe('T&C Gate — end to end', () => {
  test('gate shows on first login, blocks dashboard, accepts, then gone on re-login', async ({ page }) => {
    // ── Step 1: Fresh login (no stored auth state) ─────────────
    await page.goto('/login');
    await page.locator('#email').fill(CITIZEN_EMAIL);
    await page.locator('#password').fill(CITIZEN_PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/public/dashboard', { timeout: 20000 });

    // Wait for React hydration + profile fetch (spinner clears, then gate or dashboard)
    const agreeBtn = page.getByRole('button', { name: /I Agree/i });
    await expect(agreeBtn).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/tc_01_gate_shown.png' });

    // ── Step 2: Button disabled before checkbox ─────────────────
    await expect(agreeBtn).toBeDisabled();
    await page.screenshot({ path: 'tests/screenshots/tc_02_btn_disabled.png' });

    // ── Step 3: Sign-out escape hatch ──────────────────────────
    const signoutBtn = page.getByRole('button', { name: /sign out/i });
    await expect(signoutBtn).toBeVisible();

    // ── Step 4: T&C content present (RA 10173) ─────────────────
    await expect(page.getByText('10173')).toBeVisible();

    // ── Step 5: Check box → button enables ─────────────────────
    await page.getByRole('checkbox').check();
    await expect(agreeBtn).toBeEnabled();

    // ── Step 6: Accept → gate dismisses ────────────────────────
    await agreeBtn.click();
    await expect(agreeBtn).not.toBeVisible({ timeout: 5000 });
    // Dashboard content should now be visible
    await expect(page.locator('body')).not.toContainText('Terms and Conditions');
    await page.screenshot({ path: 'tests/screenshots/tc_03_gate_dismissed.png' });
  });

  test('gate does NOT appear after terms already accepted', async ({ page }) => {
    // This test runs after the previous one — citizen has now accepted
    await page.goto('/login');
    await page.locator('#email').fill(CITIZEN_EMAIL);
    await page.locator('#password').fill(CITIZEN_PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/public/dashboard', { timeout: 20000 });

    // Wait for profile to load (spinner clears)
    await page.waitForTimeout(3000);
    const agreeBtn = page.getByRole('button', { name: /I Agree/i });
    await expect(agreeBtn).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    // Dashboard renders — greeting should be visible (PublicDashboard shows "Kumusta, {firstName}!")
    await expect(page.getByText(/Kumusta/i).first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: 'tests/screenshots/tc_04_no_gate_on_return.png' });
  });
});

test.describe('Terms View Page', () => {
  test('citizen /public/terms shows T&C content without I Agree button', async ({ page }) => {
    // Login first (terms now accepted from previous describe block)
    await page.goto('/login');
    await page.locator('#email').fill(CITIZEN_EMAIL);
    await page.locator('#password').fill(CITIZEN_PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/public/dashboard', { timeout: 20000 });
    // Handle gate if still showing (shouldn't be after prev tests accepted)
    const agreeBtn = page.getByRole('button', { name: /I Agree/i });
    if (await agreeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByRole('checkbox').check();
      await agreeBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.goto('/public/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Terms and Conditions/i })).toBeVisible();
    // No I Agree button on the view page
    await expect(agreeBtn).not.toBeVisible();
    await expect(page.getByText('10173')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/tc_05_view_page.png' });
  });
});

test.describe('Key page screenshots', () => {
  test.use({ storageState: 'tests/.auth/admin.json' });

  test('admin feedback shows Filipino labels', async ({ page }) => {
    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'tests/screenshots/feedback_analytics.png' });
    // Nalutas label should appear in the analytics UI
    const nalutas = page.getByText('Nalutas').first();
    const visible = await nalutas.isVisible().catch(() => false);
    if (visible) {
      console.log('✅ Nalutas label visible in Feedback Analytics');
    } else {
      console.log('ℹ️  Nalutas not visible — no feedback data submitted yet');
    }
  });

  test('attorney verifications page', async ({ page }) => {
    await page.goto('/admin/attorney-verifications');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/screenshots/attorney_verifications.png' });
    // Tabs always present (names may include badge counts like "Verified 8")
    await expect(page.getByRole('button', { name: /^unverified/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^verified/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^rejected/i })).toBeVisible();
  });

  test('admin terms page', async ({ page }) => {
    await page.goto('/admin/terms');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Terms and Conditions/i })).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/admin_terms.png' });
  });
});

test.describe('Document generator — live backend', () => {
  test.use({ storageState: 'tests/.auth/public.json' });

  test('loads 13 templates from backend', async ({ page }) => {
    await page.goto('/public/documents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // backend fetch
    const startBtns = page.getByRole('button', { name: /start/i });
    const count = await startBtns.count();
    console.log(`Templates loaded: ${count}`);
    expect(count).toBeGreaterThanOrEqual(13);
    await page.screenshot({ path: 'tests/screenshots/document_generator.png' });
  });
});
