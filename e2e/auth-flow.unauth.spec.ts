import { test, expect } from '@playwright/test';
import { waitForSdkInit, mockTryOnApi } from './fixtures/sdk-helpers';
import { getTestUser } from './fixtures/test-user';

/**
 * These tests run WITHOUT pre-authenticated state (chromium-no-auth project).
 * They verify the auth popup flow for unauthenticated users.
 */
test.describe('Auth flow (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTryOnApi(page);
    await page.goto('/headless-embed.html');
    await waitForSdkInit(page, '#pidy-widget');
  });

  test('try-on triggers auth popup when not signed in', async ({ page, context }) => {
    // Select a size
    await page.locator('.size-btn[data-size="M"]').click();

    // Listen for new popup
    const popupPromise = context.waitForEvent('page');

    // Click try-on
    await page.locator('#pidy-tryon-btn').click();

    // Auth popup should open
    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Popup should be on the auth page
    expect(popup.url()).toContain('/auth');
    expect(popup.url()).toContain('popup=true');
  });

  test('sign in via popup completes auth flow', async ({ page, context }) => {
    const { email, password } = getTestUser();

    // Select a size
    await page.locator('.size-btn[data-size="M"]').click();

    // Listen for new popup
    const popupPromise = context.waitForEvent('page');

    // Click try-on
    await page.locator('#pidy-tryon-btn').click();

    // Wait for auth popup
    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Sign in via the popup
    await popup.getByText('Get started').click();
    await popup.locator('#email').fill(email);
    await popup.locator('#password').fill(password);
    await popup.getByRole('button', { name: /sign in/i }).click();

    // Popup should close after successful sign-in
    await expect(async () => {
      expect(popup.isClosed()).toBeTruthy();
    }).toPass({ timeout: 30_000 });

    // Back on the main page, result should eventually appear
    await expect(page.locator('#pidy-result')).toBeVisible({ timeout: 30_000 });
  });

  test('cancel auth returns to initial state', async ({ page, context }) => {
    // Select a size
    await page.locator('.size-btn[data-size="M"]').click();

    // Listen for new popup
    const popupPromise = context.waitForEvent('page');

    // Click try-on
    await page.locator('#pidy-tryon-btn').click();

    // Wait for auth popup
    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Close the popup without signing in
    await popup.close();

    // Button should return to initial state (not processing)
    const btn = page.locator('#pidy-tryon-btn');
    await expect(btn).not.toBeDisabled({ timeout: 10_000 });
    await expect(btn).toContainText('Digital Fitting Room');
  });
});
