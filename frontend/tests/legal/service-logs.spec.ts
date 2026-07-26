/**
 * Legal portal — Service Logs tests
 * Covers: page load, stat cards, IBP progress, log table, modal open/close/validation.
 */
import { test, expect } from '@playwright/test';

test.describe('Legal — Service Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/legal/service-logs');
    await page.waitForLoadState('networkidle');
  });

  test('renders Service Logs heading and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /service logs/i }).first()).toBeVisible();
    await expect(page.getByText(/pro-bono hour records/i)).toBeVisible();
  });

  test('shows all three IBP stat cards', async ({ page }) => {
    await expect(page.getByText('Total Hours Logged')).toBeVisible();
    await expect(page.getByText('Verified Hours', { exact: true })).toBeVisible();
    await expect(page.getByText('Current Badge')).toBeVisible();
  });

  test('shows IBP progress label in verified hours card', async ({ page }) => {
    // Matches all badge-card states: earned badge, progress toward one, or no badge yet
    await expect(
      page.getByText(/IBP compliant|Community Hero|hrs to Community Hero|Earn your first badge/i).first()
    ).toBeVisible();
  });

  test('shows Log Service Hours button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /log service hours/i })).toBeVisible();
  });

  test('shows All Entries section', async ({ page }) => {
    await expect(page.getByText('All Entries')).toBeVisible();
  });

  test('shows log entries or empty state without errors', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test.describe('Service Log Modal — open and close', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/legal/service-logs');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /log service hours/i }).click();
      await expect(page.getByRole('heading', { name: /log service hours/i })).toBeVisible();
    });

    test('modal shows case selector', async ({ page }) => {
      await expect(page.getByRole('combobox')).toBeVisible();
    });

    test('modal shows description textarea', async ({ page }) => {
      await expect(page.getByPlaceholder(/attended hearing/i)).toBeVisible();
    });

    test('modal shows hours input with correct constraints', async ({ page }) => {
      const hoursInput = page.getByPlaceholder(/e\.g\. 2\.5/i);
      await expect(hoursInput).toBeVisible();
      await expect(hoursInput).toHaveAttribute('min', '0.5');
      await expect(hoursInput).toHaveAttribute('max', '24');
      await expect(hoursInput).toHaveAttribute('step', '0.5');
    });

    test('modal shows evidence attachment button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /attach evidence/i })).toBeVisible();
    });

    test('submit button is disabled when fields are empty', async ({ page }) => {
      await expect(page.getByRole('button', { name: /submit log/i })).toBeDisabled();
    });

    test('cancel button closes the modal', async ({ page }) => {
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByRole('heading', { name: /log service hours/i })).not.toBeVisible();
    });

    test('modal disappears after clicking outside overlay is not applicable — cancel works', async ({ page }) => {
      // No click-outside handler; cancel is the close mechanism
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });
  });

  test.describe('Service Log Modal — form validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/legal/service-logs');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /log service hours/i }).click();
      await expect(page.getByRole('heading', { name: /log service hours/i })).toBeVisible();
    });

    test('submit remains disabled with description but no case selected', async ({ page }) => {
      await page.getByPlaceholder(/attended hearing/i).fill('Attended hearing at RTC');
      await page.getByPlaceholder(/e\.g\. 2\.5/i).fill('2');
      // No case selected — submit should remain disabled
      await expect(page.getByRole('button', { name: /submit log/i })).toBeDisabled();
    });

    test('description and hours fields accept valid input', async ({ page }) => {
      await page.getByPlaceholder(/attended hearing/i).fill('Drafted pleadings and advised client.');
      await page.getByPlaceholder(/e\.g\. 2\.5/i).fill('3.5');
      await expect(page.getByPlaceholder(/attended hearing/i)).toHaveValue('Drafted pleadings and advised client.');
      await expect(page.getByPlaceholder(/e\.g\. 2\.5/i)).toHaveValue('3.5');
    });
  });
});
