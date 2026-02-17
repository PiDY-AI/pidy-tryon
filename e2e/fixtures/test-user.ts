/**
 * Test user credentials loaded from environment variables.
 *
 * Local dev: create .env.test in project root
 * CI: set as GitHub Actions secrets
 */
export function getTestUser() {
  const email = process.env.PIDY_TEST_EMAIL;
  const password = process.env.PIDY_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Test user credentials not set. Set PIDY_TEST_EMAIL and PIDY_TEST_PASSWORD.\n' +
      'Local: create .env.test in project root.\n' +
      'CI: add as GitHub Actions secrets.'
    );
  }

  return { email, password };
}
