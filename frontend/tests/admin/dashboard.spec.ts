/**
 * Admin — Dashboard tests
 * Covers: KPI cards load, chart renders, recent activity section.
 */
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('renders System Analytics title', async ({ page }) => {
    await expect(page.getByText('System Analytics')).toBeVisible();
  });

  test('shows four KPI cards', async ({ page }) => {
    await expect(page.getByText('Total Registered Users')).toBeVisible();
    await expect(page.getByText('Triage Submissions')).toBeVisible();
    await expect(page.getByText('Total Cases Filed')).toBeVisible();
    await expect(page.getByText('Verified Attorneys')).toBeVisible();
  });

  test('KPI values are numeric (not placeholders)', async ({ page }) => {
    const kpiValues = page.locator('[class*="kpiValue"]');
    const count = await kpiValues.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i++) {
      const text = await kpiValues.nth(i).textContent();
      expect(text).toMatch(/[\d,]+/);
    }
  });

  test('renders 7-day registration chart', async ({ page }) => {
    await expect(page.getByText('User Registrations')).toBeVisible();
  });

  test('renders Recent Activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('View Logs button navigates to audit logs', async ({ page }) => {
    await page.getByRole('button', { name: /view logs/i }).click();
    await expect(page).toHaveURL(/\/admin\/logs/);
  });

  test('Last updated timestamp is shown', async ({ page }) => {
    await expect(page.getByText(/last updated/i)).toBeVisible();
  });
});
