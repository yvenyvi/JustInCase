/**
 * Admin — Attorney Verifications tests
 * Covers: page load, tab switching, expand/collapse, approve/reject buttons.
 */
import { test, expect } from '@playwright/test';

test.describe('Attorney Verifications page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/attorney-verifications');
    await page.waitForLoadState('networkidle');
  });

  test('renders page heading', async ({ page }) => {
    await expect(page.getByText(/attorney verifications/i).first()).toBeVisible();
  });

  test('displays Unverified, Verified, Rejected filter tabs', async ({ page }) => {
    // Tabs show counts like "Unverified", "Verified 9", "Rejected 0"
    // Use anchored regex so "Unverified" doesn't match the Verified tab
    await expect(page.getByRole('button', { name: /^unverified/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^verified/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^rejected/i })).toBeVisible();
  });

  test('clicking Verified tab switches to verified list', async ({ page }) => {
    await page.getByRole('button', { name: /^verified/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('clicking Rejected tab switches to rejected list', async ({ page }) => {
    await page.getByRole('button', { name: /^rejected/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('switching back to Unverified tab works', async ({ page }) => {
    await page.getByRole('button', { name: /^verified/i }).click();
    await page.getByRole('button', { name: /^unverified/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('verified attorneys list shows Approve and Reject buttons when expanded', async ({ page }) => {
    const rows = page.locator('[class*="card"], [class*="row"], tr').filter({ hasText: /@/ });
    const count = await rows.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await rows.first().click();
    await expect(page.getByRole('button', { name: /approve/i }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /reject/i }).first()).toBeVisible({ timeout: 5_000 });
  });
});
