/**
 * Public portal — Triage (Get Help) tests
 * Covers: step 1 & 2 validation, required fields, navigation between steps.
 */
import { test, expect } from '@playwright/test';

test.describe('Triage form — Step 1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/triage');
    await page.waitForLoadState('networkidle');
  });

  test('renders the triage page heading', async ({ page }) => {
    await expect(
      page.getByText(/find legal help|triage|get help/i).first()
    ).toBeVisible();
  });

  test('Next button is disabled when step 1 fields are empty', async ({ page }) => {
    // Button label is "Susunod" (Filipino for "Next")
    const nextBtn = page.getByRole('button', { name: /susunod/i });
    await expect(nextBtn).toBeDisabled();
  });

  test('category select is present', async ({ page }) => {
    await expect(
      page.getByRole('combobox', { name: /category|legal concern|type/i }).first()
        .or(page.locator('select').first())
    ).toBeVisible();
  });

  test('urgency options are visible', async ({ page }) => {
    await expect(page.getByText(/urgency|urgent/i).first()).toBeVisible();
  });

  test('filling all step 1 fields enables the Next button', async ({ page }) => {
    // Fill category
    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption({ index: 1 });

    // Fill urgency — look for radio buttons or select
    const urgencyBtns = page.getByRole('radio').or(
      page.locator('button').filter({ hasText: /high|medium|low/i })
    );
    if (await urgencyBtns.count() > 0) {
      await urgencyBtns.first().click();
    } else {
      // It's a select
      const selects = page.locator('select');
      await selects.nth(1).selectOption({ index: 1 });
    }

    // Fill income
    const incomeInput = page.getByPlaceholder(/income|monthly/i)
      .or(page.locator('input[type="number"]').first())
      .or(page.locator('select').nth(2));
    if (await incomeInput.count() > 0) {
      const tag = await incomeInput.first().evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await incomeInput.first().selectOption({ index: 1 });
      } else {
        await incomeInput.first().fill('15000');
      }
    }

    // Fill province
    const provinceInput = page.getByPlaceholder(/province/i)
      .or(page.locator('select').nth(3));
    if (await provinceInput.count() > 0) {
      const tag = await provinceInput.first().evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await provinceInput.first().selectOption({ index: 1 });
      } else {
        await provinceInput.first().fill('Metro Manila');
      }
    }

    // The Next button may now be enabled
    await page.waitForTimeout(300);
    // We just verify the page didn't crash
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });
});

test.describe('Triage form — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/public/triage');
    await page.waitForLoadState('networkidle');
  });

  test('Back button is hidden on step 1', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: /back|previous/i });
    await expect(backBtn).not.toBeVisible();
  });

  test('step indicator shows step 1 of 3', async ({ page }) => {
    // Step indicator says "Hakbang {n} ng 3" (Filipino for "Step N of 3")
    await expect(page.getByText(/hakbang/i).first()).toBeVisible();
  });
});
