import { Page, expect } from '@playwright/test';

const MOCK_IMAGE_URL = 'https://placehold.co/400x600/png?text=MockTryOn';

/**
 * Wait for the SDK to create a hidden iframe inside the container.
 */
export async function waitForSdkInit(page: Page, containerSelector: string) {
  const iframe = page.locator(`${containerSelector} iframe`);
  await expect(iframe).toBeAttached({ timeout: 10_000 });
  return iframe;
}

/**
 * Intercept the try-on API and return a mock response instantly.
 */
export async function mockTryOnApi(page: Page) {
  await page.route('**/functions/v1/tryon**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        images: [MOCK_IMAGE_URL],
        recommendedSize: 'M',
        fitScore: 85,
      }),
    });
  });

  return MOCK_IMAGE_URL;
}

/**
 * Intercept the try-on API with a delay (for testing loading states).
 */
export async function mockTryOnApiWithDelay(page: Page, delayMs: number) {
  await page.route('**/functions/v1/tryon**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        images: [MOCK_IMAGE_URL],
        recommendedSize: 'M',
        fitScore: 85,
      }),
    });
  });

  return MOCK_IMAGE_URL;
}
