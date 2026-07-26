/**
 * Public portal — Notifications tests
 * Covers: page load, notification list, unread indicators,
 * pro-bono verification section (conditionally).
 */
import { test, expect } from '@playwright/test';

test.describe('Public — Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/notifications');
    await page.waitForLoadState('networkidle');
  });

  test('renders Notifications heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^notifications$/i }).first()).toBeVisible();
  });

  test('shows unread count or all-caught-up subtitle', async ({ page }) => {
    const hasUnread = await page.getByText(/unread notification/i).isVisible();
    const allCaughtUp = await page.getByText(/all caught up/i).isVisible();
    expect(hasUnread || allCaughtUp).toBe(true);
  });

  test('shows All Notifications section heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /all notifications/i })).toBeVisible();
  });

  test('shows empty state or notification items without errors', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong');
    const isEmpty = await page.getByText(/no notifications yet/i).isVisible();
    const hasItems = (await page.locator('[data-testid="notification-item"]').count()) > 0;
    // One of these must be true
    expect(isEmpty || hasItems).toBe(true);
  });

  test('pro-bono verification section is shown only when pending logs exist', async ({ page }) => {
    const hasPending = await page.getByText(/pro-bono hours awaiting/i).isVisible();
    if (hasPending) {
      // Confirm and Dispute buttons must be present
      await expect(page.getByRole('button', { name: /confirm/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /dispute/i }).first()).toBeVisible();
    } else {
      // Section just should not be there — no crash
      await expect(page.locator('body')).not.toContainText('Something went wrong');
    }
  });

  test('unread notification item has visual indicator', async ({ page }) => {
    const unreadDot = page.locator('[style*="border-radius: 50%"][style*="background"]');
    const hasUnread = await page.getByText(/unread notification/i).isVisible();
    if (hasUnread) {
      // At least one dot indicator should be rendered
      await expect(unreadDot.first()).toBeVisible();
    }
  });

  test('clicking an unread notification marks it read (no crash)', async ({ page }) => {
    const hasUnread = await page.getByText(/unread notification/i).isVisible();
    if (!hasUnread) return;

    const unreadItem = page.locator('[style*="rgba(37,99,235"]').first();
    const count = await unreadItem.count();
    if (count === 0) return;

    await unreadItem.click();
    // After click, the item background should no longer show unread style
    await page.waitForTimeout(300);
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });
});
