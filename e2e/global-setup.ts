import { test as setup, expect } from '@playwright/test';
import { getTestUser } from './fixtures/test-user';

/**
 * Global setup: sign in with test user and save storage state
 * so authenticated tests can reuse the session.
 */
setup('authenticate', async ({ page }) => {
  const { email, password } = getTestUser();

  await page.goto('/auth');

  // Click "Get started" to show the sign-in form
  await page.getByText('Get started').click();

  // Fill in credentials
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  // Submit the form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation away from /auth (successful sign-in redirects)
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 30_000 });

  // Save signed-in state
  await page.context().storageState({ path: './e2e/.auth/user.json' });
});
