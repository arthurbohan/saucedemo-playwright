import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: 'tests/specs/**/*.spec.ts',
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  maxFailures: process.env.CI ? 10 : 0,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['allure-playwright', {
      detail: true,
      outputFolder: 'allure-results',
      suiteTitle: true,
    }],
  ],

  use: {
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
      use: {
        baseURL: 'https://www.saucedemo.com',
      }
    },
    {
      name: 'sd-e2e',
      testDir: './tests/specs/features',
      dependencies: ['setup'],
      use: {
        baseURL: 'https://www.saucedemo.com',
        storageState: 'tests/.auth/standard.json'
      }
    },
    {
      name: 'jp-api',
      testDir: './tests/specs/api',
      use: {
        baseURL: 'https://jsonplaceholder.typicode.com/',
        browserName: undefined,
      },
    }
  ],
})