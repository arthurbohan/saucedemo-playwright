import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: 'tests/specs/**/*.spec.ts',
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  maxFailures: process.env.CI ? 10 : 0,

  reporter: process.env.CI
    ? [
      ['blob'],
      ['list'],
      ['allure-playwright', {
        detail: true,
        outputFolder: 'allure-results',
        suiteTitle: true,
      }],
    ]
    : [
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
    testIdAttribute: 'data-test',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        baseURL: 'https://www.saucedemo.com',
      },
    },
    {
      name: 'sd-e2e',
      testDir: './tests/specs/features',
      dependencies: ['setup'],
      use: {
        baseURL: 'https://www.saucedemo.com',
        storageState: 'tests/.auth/standard.json',
      },
    },
    {
      name: 'jp-api',
      testDir: './tests/specs/api',
      use: {
        baseURL: 'https://jsonplaceholder.typicode.com/',
        browserName: undefined,
      },
    },
    {
      // AI-generated UI specs (npm run ai:generate) — run and review here
      // before promoting a file into tests/specs/features/. Not part of `npm test`.
      // testIgnore excludes api.generated.spec.ts, which belongs to jp-api-generated.
      name: 'sd-e2e-generated',
      testDir: './tests/specs/generated',
      testIgnore: /api\.generated\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        baseURL: 'https://www.saucedemo.com',
        storageState: 'tests/.auth/standard.json',
      },
    },
    {
      // AI-generated API specs (npm run ai:generate:api) — same idea as
      // sd-e2e-generated, but for tests/specs/api. Not part of `npm test`.
      name: 'jp-api-generated',
      testDir: './tests/specs/generated',
      testMatch: /api\.generated\.spec\.ts$/,
      use: {
        baseURL: 'https://jsonplaceholder.typicode.com/',
        browserName: undefined,
      },
    },
    {
      // A different app entirely (rabbit-hole, a separate local repo) —
      // Docker/cross-repo practice project, see rabbit-hole-e2e/. .spec.js
      // (that app has no TypeScript setup) and data-testid (its own,
      // standard convention — deliberately NOT changed to data-test just
      // to match this repo's config) both override the top-level defaults
      // above, which only apply to the saucedemo/jsonplaceholder projects.
      // baseURL defaults to localhost for a plain local run;
      // docker-compose.yml overrides it to the `app` service's hostname.
      name: 'rabbit-hole',
      testDir: './rabbit-hole-e2e/tests',
      testMatch: '**/*.spec.js',
      use: {
        baseURL: process.env.RABBIT_HOLE_BASE_URL || 'http://localhost:3000',
        testIdAttribute: 'data-testid',
      },
    },
  ],
})