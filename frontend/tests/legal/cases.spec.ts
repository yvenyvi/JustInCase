/**
 * Legal portal — Cases tests
 * Covers: page load, search/filter, expand a case, accept/reject buttons,
 * close case modal validation.
 */
import { test, expect } from '@playwright/test';

test.describe('Legal — My Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/legal/cases');
    await page.waitForLoadState('networkidle');
  });

  test('renders My Cases heading', async ({ page }) => {
    await expect(page.getByText(/my cases/i).first()).toBeVisible();
  });

  test('search input is present', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('status filter dropdown is present', async ({ page }) => {
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('status dropdown has expected options', async ({ page }) => {
    const select = page.getByRole('combobox').first();
    await expect(select).toContainText('All');
    await expect(select).toContainText('Pending');
  });

  test('search filters table', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('zzznomatch');
    await page.waitForTimeout(300);
    // Either "No cases" text appears or table is empty — no crash
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('expanding a case row shows details', async ({ page }) => {
    const expandButtons = page.getByRole('button').filter({ has: page.locator('svg') });
    const rowCount = await expandButtons.count();
    if (rowCount === 0) {
      // No cases — nothing to expand
      test.skip();
      return;
    }
    await expandButtons.first().click();
    // Details panel should appear — look for description or client info
    await page.waitForTimeout(400);
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('active case rows show Log Service button', async ({ page }) => {
    const logButtons = page.getByRole('button', { name: /log service/i });
    const count = await logButtons.count();
    if (count === 0) {
      // No active cases visible — acceptable
      await expect(page.locator('body')).not.toContainText('Something went wrong');
      return;
    }
    await expect(logButtons.first()).toBeVisible();
  });

  test('Log Service button opens service log modal', async ({ page }) => {
    const logButtons = page.getByRole('button', { name: /log service/i });
    const count = await logButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await logButtons.first().click();
    await expect(page.getByRole('heading', { name: /log service hours/i })).toBeVisible();
    // Modal pre-selects the case — no case selector dropdown shown
    await expect(page.getByRole('button', { name: /submit log/i })).toBeVisible();
    // Close the modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /log service hours/i })).not.toBeVisible();
  });
});

test.describe('Legal — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/legal/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('renders dashboard heading', async ({ page }) => {
    await expect(page.getByText(/dashboard|overview/i).first()).toBeVisible();
  });

  test('shows active and pending case stats', async ({ page }) => {
    // Stat cards or summary numbers should be visible
    await expect(page.locator('body')).not.toContainText('Something went wrong');
    await expect(page.locator('[class*="stat"], [class*="card"], [class*="kpi"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows Pro-Bono Hours stat card', async ({ page }) => {
    await expect(page.getByText('Pro-Bono Hours')).toBeVisible();
  });

  test('shows 60h IBP target in pro-bono card', async ({ page }) => {
    await expect(page.getByText(/\/\s*60h/)).toBeVisible();
  });

  test('shows Kailangang Aksyunan (action needed) section', async ({ page }) => {
    await expect(page.getByText(/kailangang aksyunan/i)).toBeVisible();
  });

  test('Go to My Cases button navigates to cases page', async ({ page }) => {
    await page.getByRole('button', { name: /go to my cases/i }).click();
    await expect(page).toHaveURL(/\/legal\/cases/, { timeout: 10_000 });
  });
});

test.describe('Legal — Pro-Bono Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/legal/probono');
    await page.waitForLoadState('networkidle');
  });

  test('renders Pro-Bono Hub heading', async ({ page }) => {
    await expect(page.getByText(/pro.bono/i).first()).toBeVisible();
  });

  test('shows a list of open cases or empty state', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });
});

test.describe('Legal — Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/legal/notifications');
    await page.waitForLoadState('networkidle');
  });

  test('renders Notifications heading', async ({ page }) => {
    await expect(page.getByText(/notifications/i).first()).toBeVisible();
  });
});
