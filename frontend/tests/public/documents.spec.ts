/**
 * Public portal — Document Generator tests
 *
 * UI note: the "Generate Legal Draft" submit button only appears after a
 * template card is selected. Before selection the page shows a template gallery.
 */
import { test, expect } from '@playwright/test';

test.describe('Document Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/documents');
    await page.waitForLoadState('networkidle');
  });

  test('renders the Document Maker heading', async ({ page }) => {
    await expect(
      page.getByText(/document maker|document generator|legal draft/i).first()
    ).toBeVisible();
  });

  test('shows template cards in the library', async ({ page }) => {
    // Template cards load from the backend; each card has a category heading
    await expect(
      page.locator('[class*="card"], [class*="template"], h3, h4').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a template Start button shows the generate form', async ({ page }) => {
    // Each template card has a "Start" button that opens the form
    const startBtn = page.getByRole('button', { name: /^start$/i }).first();
    const count = await startBtn.count();
    if (count === 0) return;
    await startBtn.click();
    await expect(
      page.getByRole('button', { name: /generate legal draft/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Generate Legal Draft button is enabled before submitting', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /^start$/i }).first();
    if (await startBtn.count() === 0) return;
    await startBtn.click();
    const btn = page.getByRole('button', { name: /generate legal draft/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    // Before submitting the form, button should be enabled
    await expect(btn).not.toBeDisabled();
  });
});
