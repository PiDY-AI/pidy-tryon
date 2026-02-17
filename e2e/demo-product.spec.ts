import { test, expect } from '@playwright/test';
import { mockTryOnApi } from './fixtures/sdk-helpers';

test.describe('Demo product page', () => {
  test.beforeEach(async ({ page }) => {
    await mockTryOnApi(page);
    // Navigate to the first demo product
    await page.goto('/demo');
    // Click on the first product card
    await page.locator('a[href*="/demo/product/"]').first().click();
    await expect(page).toHaveURL(/\/demo\/product\//);
  });

  test('product page loads with try-on button', async ({ page }) => {
    // Digital Fitting Room button should be visible
    const tryOnBtn = page.getByRole('button', { name: /digital fitting room/i });
    await expect(tryOnBtn).toBeVisible({ timeout: 15_000 });
  });

  test('shows size warning when no size selected', async ({ page }) => {
    // The "Select a size first" tooltip should appear
    const tryOnBtn = page.getByRole('button', { name: /digital fitting room/i });
    await expect(tryOnBtn).toBeVisible({ timeout: 15_000 });

    // Without selecting a size, check for the tooltip text
    await expect(page.getByText('Select a size first')).toBeVisible();
  });

  test('try-on flow works end-to-end', async ({ page }) => {
    // Select a size
    const sizeButtons = page.locator('button').filter({ hasText: /^(S|M|L|XL|XXL)$/ });
    await sizeButtons.first().click();

    // Click try-on
    const tryOnBtn = page.getByRole('button', { name: /digital fitting room/i });
    await expect(tryOnBtn).toBeVisible({ timeout: 15_000 });
    await tryOnBtn.click();

    // Wait for result (button text changes to processing or result image appears)
    await expect(
      page.getByText('Your look is being prepared').or(page.locator('img[alt="Virtual Try-On"]'))
    ).toBeVisible({ timeout: 30_000 });
  });

  test('close button works on result', async ({ page }) => {
    // Select size and try on
    const sizeButtons = page.locator('button').filter({ hasText: /^(S|M|L|XL|XXL)$/ });
    await sizeButtons.first().click();

    const tryOnBtn = page.getByRole('button', { name: /digital fitting room/i });
    await expect(tryOnBtn).toBeVisible({ timeout: 15_000 });
    await tryOnBtn.click();

    // Wait for result image
    const resultImg = page.locator('img[alt="Virtual Try-On"]');
    await expect(resultImg).toBeVisible({ timeout: 30_000 });

    // Click close (the X button near the result)
    const closeBtn = page.locator('button').filter({ hasText: /^[x\u00d7]$/ });
    await closeBtn.click();

    // Try-on button should reappear
    await expect(
      page.getByRole('button', { name: /digital fitting room/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
