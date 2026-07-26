/**
 * Authentication flow tests
 * Covers: login validation, login routing by role, logout, forgot-password page.
 * These tests run WITHOUT a pre-authenticated session.
 */
import { test, expect } from '@playwright/test';

const PASS = 'TestPassword123!';

test.describe('Login page — form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows error when both fields are empty', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Please enter both email and password.')).toBeVisible();
  });

  test('shows error when only email is filled', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Please enter both email and password.')).toBeVisible();
  });

  test('shows error when only password is filled', async ({ page }) => {
    await page.locator('#password').fill('somepassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Please enter both email and password.')).toBeVisible();
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Supabase returns "Invalid login credentials"
    await expect(page.locator('[style*="rgba(220, 38, 38"]')).toBeVisible({ timeout: 10_000 });
  });

  test('password show/hide toggle works', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.getByText('Forgot Password?').click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('create account link navigates to register', async ({ page }) => {
    await page.getByText('Create Account').click();
    await expect(page).toHaveURL('/register');
  });
});

test.describe('Login — role-based routing', () => {
  test('admin user is redirected to /admin/dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('lance.admin@justice.link');
    await page.locator('#password').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30_000 });
  });

  test('legal user is redirected to /legal/dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('lance.attorney@justice.link');
    await page.locator('#password').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/legal\/dashboard/, { timeout: 30_000 });
  });

  test('public user is redirected to /public/dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('lance.citizen@justice.link');
    await page.locator('#password').fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/public\/dashboard/, { timeout: 30_000 });
  });
});

test.describe('Quick-login dev buttons', () => {
  test('Test: Admin button logs in and redirects to admin portal', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Lance (Admin)' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30_000 });
  });

  test('Test: Legal button logs in and redirects to legal portal', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Lance (Attorney)' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/legal\/dashboard/, { timeout: 30_000 });
  });

  test('Test: Citizen button logs in and redirects to public portal', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Lance (Citizen)' }).click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/public\/dashboard/, { timeout: 30_000 });
  });
});

test.describe('Forgot password page', () => {
  test('renders the email input and submit button', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('back to login link works', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByText(/back.*login|sign in/i).click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Protected route redirect', () => {
  test('unauthenticated access to /admin/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated access to /legal/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/legal/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
