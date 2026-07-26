/**
 * Admin — Account Management tests
 * Covers: page load, search/filter, view modal, edit modal, suspend toggle,
 * delete modal, add user modal validation.
 */
import { test, expect } from '@playwright/test';

test.describe('Account Management page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/accounts');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });
  });

  // ── Page structure ──────────────────────────────────────────────────────────
  test('renders page title and Add New User button', async ({ page }) => {
    await expect(page.getByText('Account Management')).toBeVisible();
    await expect(page.getByRole('button', { name: /add new user/i })).toBeVisible();
  });

  test('displays four stat cards', async ({ page }) => {
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Verified Lawyers')).toBeVisible();
    await expect(page.getByText('Online Rate')).toBeVisible();
    await expect(page.getByText('Suspended')).toBeVisible();
  });

  test('table has correct column headers', async ({ page }) => {
    for (const col of ['User', 'Role', 'Verification', 'Joined', 'Actions']) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
    }
  });

  // ── Search ──────────────────────────────────────────────────────────────────
  test('search filters table rows by name', async ({ page }) => {
    const firstRow = page.getByRole('row').nth(1);
    const nameText = await firstRow.locator('span').first().textContent();
    if (!nameText?.trim()) return;
    await page.getByPlaceholder(/search by name or email/i).fill(nameText.trim());
    await expect(page.getByRole('row').nth(1)).toContainText(nameText.trim());
  });

  test('search with no match shows reset option', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('zzznomatchzzz');
    await expect(page.getByText('No users found.')).toBeVisible();
    await expect(page.getByRole('button', { name: /reset search/i })).toBeVisible();
  });

  test('reset search button clears the filter', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('zzznomatchzzz');
    await page.getByRole('button', { name: /reset search/i }).click();
    await expect(page.getByRole('row').nth(1)).toBeVisible();
  });

  // ── Role filter ─────────────────────────────────────────────────────────────
  test('role filter dropdown shows all options', async ({ page }) => {
    const select = page.getByRole('combobox').first();
    await expect(select).toContainText('All Roles');
    await expect(select).toContainText('Public User');
    await expect(select).toContainText('Legal Professional');
    await expect(select).toContainText('System Admin');
  });

  test('selecting Legal filter shows only Legal rows', async ({ page }) => {
    await page.getByRole('combobox').first().selectOption('Legal');
    const dataRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    const count = await dataRows.count();
    for (let i = 0; i < count; i++) {
      await expect(dataRows.nth(i)).toContainText('Legal');
    }
  });

  // ── View modal ──────────────────────────────────────────────────────────────
  test('view button opens User Details modal', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('View Details').click();
    // Modal is portal-rendered at document.body — look for the modal heading
    await expect(page.getByRole('heading', { name: 'User Details' })).toBeVisible();
    // Check for field labels inside the modal (use exact div match)
    await expect(page.locator('div').filter({ hasText: /^Role$/ }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^Verification$/ }).first()).toBeVisible();
  });

  test('closing view modal removes it', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('View Details').click();
    await expect(page.getByRole('heading', { name: 'User Details' })).toBeVisible();
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('heading', { name: 'User Details' })).not.toBeVisible();
  });

  test('Edit User button in view modal opens edit modal', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('View Details').click();
    await expect(page.getByRole('heading', { name: 'User Details' })).toBeVisible();
    // Click the "Edit User" button inside the modal footer (not the table action buttons)
    await page.locator('[class*="modalFooter"]').getByRole('button', { name: /edit user/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
    await expect(page.locator('[class*="modalBody"] select').first()).toBeVisible();
  });

  // ── Edit modal ──────────────────────────────────────────────────────────────
  test('edit modal has Role and Verification dropdowns', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('Edit User').click();
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
    // Selects live inside the modal body — grab them by position
    const selects = page.locator('[class*="modalBody"] select');
    await expect(selects.nth(0)).toBeVisible(); // System Role
    await expect(selects.nth(1)).toBeVisible(); // Verification Status
    await expect(selects.nth(0)).toContainText('Public User (Indigent)');
    await expect(selects.nth(0)).toContainText('Legal Professional (Lawyer)');
    await expect(selects.nth(0)).toContainText('System Administrator');
  });

  test('edit modal Cancel button closes without saving', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('Edit User').click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: 'Edit User' })).not.toBeVisible();
  });

  // ── Delete modal ─────────────────────────────────────────────────────────────
  test('more menu (⋮) appears on each row', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('More').click();
    await expect(page.getByText('Delete Account')).toBeVisible();
  });

  test('Delete Account option opens confirmation modal', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('More').click();
    await page.getByText('Delete Account').click();
    await expect(page.getByText('This will permanently delete')).toBeVisible();
    await expect(page.getByRole('button', { name: /delete account/i })).toBeVisible();
  });

  test('delete modal Cancel button closes without deleting', async ({ page }) => {
    await page.getByRole('row').nth(1).getByTitle('More').click();
    await page.getByText('Delete Account').click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText('This will permanently delete')).not.toBeVisible();
  });

  // ── Add user modal ───────────────────────────────────────────────────────────
  test('Add New User opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /add new user/i }).click();
    // Use heading role to avoid ambiguity with the page-level button
    await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();
    await expect(page.getByPlaceholder(/e.g. juan dela cruz/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email@example.com/i)).toBeVisible();
  });

  test('Create Account button is disabled when fields are empty', async ({ page }) => {
    await page.getByRole('button', { name: /add new user/i }).click();
    await expect(page.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  test('Create Account button enables when name and email are filled', async ({ page }) => {
    await page.getByRole('button', { name: /add new user/i }).click();
    await page.getByPlaceholder(/e.g. juan dela cruz/i).fill('Test Person');
    await page.getByPlaceholder(/email@example.com/i).fill('test_person@example.com');
    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  test('add modal Cancel button closes', async ({ page }) => {
    await page.getByRole('button', { name: /add new user/i }).click();
    await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    // The modal heading should be gone; the page button can remain
    await expect(page.getByRole('heading', { name: 'Add New User' })).not.toBeVisible();
  });
});
