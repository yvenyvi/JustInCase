/**
 * Admin — System Settings tests
 * Covers: page load, maintenance mode toggle, save button, backup download,
 * restore from backup flow.
 *
 * The maintenance mode toggle is a CSS custom switch:
 *   <label class="switch"><input type="checkbox" /><span class="slider" /></label>
 * The real <input> is visually hidden. We interact via the <label> wrapper.
 */
import { test, expect } from '@playwright/test';

test.describe('System Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
  });

  test('renders System Settings title', async ({ page }) => {
    await expect(page.getByText('System Settings')).toBeVisible();
  });

  test('shows System Status and Backup & Restore cards', async ({ page }) => {
    await expect(page.getByText('System Status')).toBeVisible();
    await expect(page.getByText('Backup & Restore')).toBeVisible();
  });

  test('maintenance mode toggle (slider) is present', async ({ page }) => {
    // The visible element is the <span class="slider">, not the hidden <input>
    const slider = page.locator('[class*="slider"]');
    await expect(slider).toBeVisible();
  });

  test('clicking maintenance mode toggle changes its checked state', async ({ page }) => {
    const toggle = page.locator('input[type="checkbox"]');
    const slider = page.locator('[class*="slider"]');
    const initialState = await toggle.isChecked();
    // Click the visible slider span, not the hidden input
    await slider.click();
    await expect(toggle).toBeChecked({ checked: !initialState });
    // Toggle back to avoid leaving maintenance mode on
    await slider.click();
    await expect(toggle).toBeChecked({ checked: initialState });
  });

  test('turning on maintenance mode shows alert warning', async ({ page }) => {
    const toggle = page.locator('input[type="checkbox"]');
    const slider = page.locator('[class*="slider"]');
    const wasOn = await toggle.isChecked();
    if (!wasOn) {
      await slider.click();
      await expect(page.getByText(/platform will be restricted/i)).toBeVisible();
      await slider.click();
    }
  });

  test('Save Changes button is present and clickable', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /save changes/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.getByRole('button', { name: /saving|saved/i })).toBeVisible({ timeout: 5_000 });
  });

  test('Download Backup button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /download backup/i })).toBeVisible();
  });

  test('Download Backup triggers a file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download backup/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/justicelink-settings.*\.json/);
  });

  test('Restore from Backup button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /restore from backup/i })).toBeVisible();
  });

  test('uploading an invalid restore file shows an error', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ "bad": "file" }'),
    });
    await expect(page.getByText(/invalid backup file/i)).toBeVisible({ timeout: 5_000 });
  });

  test('uploading a valid backup file shows preview with Confirm and Cancel buttons', async ({ page }) => {
    const validBackup = JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      platform: 'JusticeLink PH',
      settings: { maintenance_mode: false },
    });
    await page.locator('input[type="file"]').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(validBackup),
    });
    await expect(page.getByText(/preview.*settings to restore/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /confirm restore/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('Cancel on restore preview hides the preview', async ({ page }) => {
    const validBackup = JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      platform: 'JusticeLink PH',
      settings: { maintenance_mode: false },
    });
    await page.locator('input[type="file"]').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(validBackup),
    });
    await expect(page.getByText(/preview/i)).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText(/preview/i)).not.toBeVisible();
  });
});
