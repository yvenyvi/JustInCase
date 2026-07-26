/**
 * Global auth setup — runs once before the role-specific test projects.
 * Saves browser storage state (cookies + localStorage) for each role so
 * individual tests don't need to log in themselves.
 *
 * Also handles the TermsAndConditionsGate: if a test account hasn't accepted
 * terms yet, the setup accepts them automatically so portal pages render.
 */
import { test as setup, expect } from '@playwright/test';

const ACCOUNTS = [
  { role: 'admin',  email: 'admin.test@justice.link',   password: 'TestPassword123!', file: 'tests/.auth/admin.json',  redirect: '/admin/dashboard'  },
  { role: 'legal',  email: 'legal.test@justice.link',   password: 'TestPassword123!', file: 'tests/.auth/legal.json',  redirect: '/legal/dashboard'  },
  { role: 'public', email: 'public.test@justice.link',  password: 'TestPassword123!', file: 'tests/.auth/public.json', redirect: '/public/dashboard' },
];

for (const { role, email, password, file, redirect } of ACCOUNTS) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    // Wait for either the dashboard or any authenticated URL (terms gate stays at the redirect URL)
    await page.waitForURL(`**${redirect}`, { timeout: 20_000 });

    // Handle the TermsAndConditionsGate if it's blocking the portal.
    // The gate renders at the redirect URL without changing the URL itself.
    const agreeBtn = page.getByRole('button', { name: /I Agree.*Continue/i });
    if (await agreeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const checkbox = page.getByRole('checkbox');
      await checkbox.check();
      await agreeBtn.click();
      // Wait for the gate to dismiss and the portal to render
      await page.waitForFunction(
        () => !document.querySelector('button[class*="agree"], [data-testid="terms-gate"]') &&
              document.title !== 'Terms and Conditions',
        { timeout: 10_000 }
      ).catch(() => {/* gate dismissed but title check may not apply */});
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveURL(new RegExp(redirect));
    await page.context().storageState({ path: file });
  });
}
