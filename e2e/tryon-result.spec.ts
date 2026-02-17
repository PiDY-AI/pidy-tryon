import { test, expect } from '@playwright/test';
import { waitForSdkInit, mockTryOnApi, mockTryOnApiWithDelay } from './fixtures/sdk-helpers';

test.describe('Try-on result (authenticated)', () => {
  test('authenticated user skips popup and goes straight to try-on', async ({ page }) => {
    await mockTryOnApi(page);
    await page.goto('/headless-embed.html');
    await waitForSdkInit(page, '#pidy-widget');

    // Select size and try-on
    await page.locator('.size-btn[data-size="L"]').click();
    await page.locator('#pidy-tryon-btn').click();

    // Should NOT open a popup (already authenticated via storageState)
    // Result should appear directly
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });

    // No popup should have opened
    const pages = page.context().pages();
    expect(pages.length).toBe(1);
  });

  test('processing spinner visible during generation', async ({ page }) => {
    // Use delayed mock to see loading state
    await mockTryOnApiWithDelay(page, 2000);
    await page.goto('/headless-embed.html');
    await waitForSdkInit(page, '#pidy-widget');

    // Select size and try-on
    await page.locator('.size-btn[data-size="M"]').click();
    await page.locator('#pidy-tryon-btn').click();

    // Spinner should be visible
    const btn = page.locator('#pidy-tryon-btn');
    await expect(btn).toContainText('Your look is being prepared');
    await expect(btn).toBeDisabled();

    // Eventually result should appear
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });
  });

  test('retry button works', async ({ page }) => {
    await mockTryOnApi(page);
    await page.goto('/headless-embed.html');
    await waitForSdkInit(page, '#pidy-widget');

    // First try-on
    await page.locator('.size-btn[data-size="M"]').click();
    await page.locator('#pidy-tryon-btn').click();
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });

    // Click retry
    await page.locator('#pidy-retry-btn').click();

    // Should process again and show result
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });
  });

  test('sign out clears everything', async ({ page }) => {
    await mockTryOnApi(page);
    await page.goto('/headless-embed.html');
    await waitForSdkInit(page, '#pidy-widget');

    // Complete a try-on
    await page.locator('.size-btn[data-size="M"]').click();
    await page.locator('#pidy-tryon-btn').click();
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });

    // Sign out
    await page.locator('#pidy-signout-btn').click();

    // Everything should reset
    await expect(page.locator('#pidy-result')).toBeHidden();
    await expect(page.locator('#pidy-tryon-section')).toBeVisible();
    await expect(page.locator('#pidy-tryon-btn')).toContainText('Digital Fitting Room');
  });

  test('result displays correct tried size', async ({ page }) => {
    await mockTryOnApi(page);
    await page.goto('/headless-embed.html');
    await waitForSdkInit(page, '#pidy-widget');

    // Select L and try on
    await page.locator('.size-btn[data-size="L"]').click();
    await page.locator('#pidy-tryon-btn').click();
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });

    // The mock returns recommendedSize: 'M', so it should show M
    await expect(page.locator('#pidy-result-size')).toContainText('M');
  });
});
