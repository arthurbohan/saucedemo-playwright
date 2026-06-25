import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'tests/specs/**/*.spec.ts',
  // fullyParallel: true,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  maxFailures: process.env.CI ? 10 : 0,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: process.env.CI ? true : false,
    ignoreHTTPSErrors: true,
    testIdAttribute: 'data-test'
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        storageState: 'tests/.auth/standard.json'
      }
    }
  ],
})