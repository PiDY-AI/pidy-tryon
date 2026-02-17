import { test, expect } from '@playwright/test';
import { waitForSdkInit, mockTryOnApi } from './fixtures/sdk-helpers';

test.describe('Headless embed page', () => {
  test.beforeEach(async ({ page }) => {
    await mockTryOnApi(page);
    await page.goto('/headless-embed.html');
  });

  test('SDK loads and creates hidden iframe', async ({ page }) => {
    const iframe = await waitForSdkInit(page, '#pidy-widget');
    await expect(iframe).toBeAttached();

    // Container should be visually hidden
    const container = page.locator('#pidy-widget');
    await expect(container).toHaveCSS('opacity', '0');
  });

  test('try-on button is visible', async ({ page }) => {
    const btn = page.locator('#pidy-tryon-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Digital Fitting Room');
  });

  test('shows tooltip when no size selected', async ({ page }) => {
    const tooltip = page.locator('#pidy-size-tooltip');
    await expect(tooltip).toBeHidden();

    // Click try-on without selecting a size
    await page.locator('#pidy-tryon-btn').click();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Please select a size first');
  });

  test('size selection works', async ({ page }) => {
    const sizeBtn = page.locator('.size-btn[data-size="M"]');
    await sizeBtn.click();
    await expect(sizeBtn).toHaveClass(/selected/);
  });

  test('try-on triggers processing state', async ({ page }) => {
    await waitForSdkInit(page, '#pidy-widget');

    // Select a size first
    await page.locator('.size-btn[data-size="M"]').click();

    // Click try-on
    await page.locator('#pidy-tryon-btn').click();

    // Button should show processing state
    const btn = page.locator('#pidy-tryon-btn');
    await expect(btn).toContainText('Your look is being prepared');
    await expect(btn).toBeDisabled();
  });

  test('result image appears after try-on', async ({ page }) => {
    await waitForSdkInit(page, '#pidy-widget');

    // Select size and trigger try-on
    await page.locator('.size-btn[data-size="M"]').click();
    await page.locator('#pidy-tryon-btn').click();

    // Wait for result to appear (mock API returns instantly)
    const resultContainer = page.locator('#pidy-result');
    await expect(resultContainer).toBeVisible({ timeout: 30_000 });

    // Result image should be present
    const resultImage = page.locator('#pidy-result-image');
    await expect(resultImage).toBeVisible();

    // Tried size should show
    const sizeDisplay = page.locator('#pidy-result-size');
    await expect(sizeDisplay).toBeVisible();
  });

  test('close button hides result and shows button again', async ({ page }) => {
    await waitForSdkInit(page, '#pidy-widget');

    // Run try-on flow
    await page.locator('.size-btn[data-size="M"]').click();
    await page.locator('#pidy-tryon-btn').click();

    // Wait for result
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });

    // Click close
    await page.locator('.pidy-close-btn').click();

    // Result should hide, button should reappear
    await expect(page.locator('#pidy-result')).toBeHidden();
    await expect(page.locator('#pidy-tryon-section')).toBeVisible();
  });

  test('sign out resets state', async ({ page }) => {
    await waitForSdkInit(page, '#pidy-widget');

    // Run try-on flow
    await page.locator('.size-btn[data-size="M"]').click();
    await page.locator('#pidy-tryon-btn').click();
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });

    // Sign out button should be visible
    const signOutBtn = page.locator('#pidy-signout-btn');
    await expect(signOutBtn).toBeVisible();

    // Click sign out
    await signOutBtn.click();

    // Should reset to initial state
    await expect(page.locator('#pidy-result')).toBeHidden();
    await expect(page.locator('#pidy-tryon-section')).toBeVisible();
  });
});
