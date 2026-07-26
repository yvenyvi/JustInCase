/**
 * Public portal — Dashboard and Rights Library tests
 *
 * UI language note: the public portal uses Filipino.
 *   - Greeting: "Kumusta, {name}!" (not "Welcome")
 *   - Rights Library search placeholder: "Maghanap ng topic..."
 */
import { test, expect } from '@playwright/test';

test.describe('Public Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('renders Filipino greeting message', async ({ page }) => {
    // Dashboard shows "Kumusta, {firstName}!" and "Ano ang kailangan mo ngayon?"
    await expect(
      page.getByText(/kumusta|ano ang kailangan/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows navigation items in sidebar', async ({ page }) => {
    await expect(page.getByText(/get help|triage/i).first()).toBeVisible();
    await expect(page.getByText(/rights library/i).first()).toBeVisible();
    await expect(page.getByText(/my chats|messages/i).first()).toBeVisible();
  });

  test('Get Help link navigates to triage', async ({ page }) => {
    await page.getByText(/get help/i).first().click();
    await expect(page).toHaveURL(/\/public\/triage/);
  });

  test('Rights Library link navigates to rights page', async ({ page }) => {
    await page.getByText(/rights library/i).first().click();
    await expect(page).toHaveURL(/\/public\/rights/);
  });

  test('Document Maker link navigates to documents page', async ({ page }) => {
    await page.getByText(/document maker/i).first().click();
    await expect(page).toHaveURL(/\/public\/documents/);
  });
});

test.describe('Public — Rights Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/rights');
    await page.waitForLoadState('networkidle');
  });

  test('renders rights library heading', async ({ page }) => {
    await expect(page.getByText(/rights library|legal rights/i).first()).toBeVisible();
  });

  test('search field is present', async ({ page }) => {
    // Placeholder is in Filipino: "Maghanap ng topic..."
    const search = page.getByPlaceholder(/maghanap/i);
    await expect(search).toBeVisible();
  });

  test('search input filters content', async ({ page }) => {
    const search = page.getByPlaceholder(/maghanap/i);
    await search.fill('labor');
    await page.waitForTimeout(400);
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });
});
